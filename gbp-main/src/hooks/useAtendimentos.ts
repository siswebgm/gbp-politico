import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';
import { useCallback } from 'react';
import { updateAttendance } from '../services/attendance';

export type AtendimentoStatus = 'Pendente' | 'Em Andamento' | 'Concluído' | 'Cancelado';

export function useAtendimentos() {
  const queryClient = useQueryClient();
  const company = useCompanyStore((state) => state.company);
  const companyUid = company?.uid;

  const fetchAtendimentos = useCallback(async () => {
    if (!companyUid) {
      console.log('Company UID is missing');
      throw new Error('Company UID is required');
    }

    console.log('Fetching atendimentos for company:', companyUid);

    try {
      console.log('Iniciando busca de atendimentos...');

      const { data: atendimentosData, error: atendimentosError } = await supabaseClient
        .from('gbp_atendimentos')
        .select(`
          uid,
          eleitor_uid,
          usuario_uid,
          categoria_uid,
          descricao,
          data_atendimento,
          empresa_uid,
          status,
          responsavel,
          indicado,
          tipo_de_atendimento,
          whatsapp,
          numero,
          bairro,
          cidade,
          logradouro,
          uf,
          cep,
          eleitor,
          cpf,
          numero_do_sus,
          gbp_categorias:gbp_categorias!gbp_atendimentos_categoria_uid_fkey (uid, nome, tipo:gbp_categoria_tipos!gbp_categorias_tipo_uid_fkey(uid, nome))
        `)
        .eq('empresa_uid', companyUid)
        // Só atendimentos visíveis (oculto = false ou NULL — coluna nullable)
        .or('oculto.is.null,oculto.eq.false')
        .order('data_atendimento', { ascending: false });

      if (atendimentosError) {
        console.error('Error fetching atendimentos:', atendimentosError);
        throw atendimentosError;
      }

      // Buscar dados relacionados em queries separadas
      const usuarioUids = (atendimentosData || [])
        .map(a => a.usuario_uid)
        .filter((uid): uid is string => Boolean(uid));

      // .in() com centenas de uids derruba o PostgREST (502 Bad Gateway).
      // Alternativa estável: paginar por empresa_uid (coluna indexada),
      // 1000 linhas por vez — query simples que o servidor aguenta.
      const buscarEleitoresDaEmpresa = async (select: string) => {
        const linhas: any[] = [];
        let erro: any = null;
        const PAGINA = 1000;
        for (let offset = 0; ; offset += PAGINA) {
          const resp = await supabaseClient
            .from('gbp_eleitores')
            .select(select)
            .eq('empresa_uid', companyUid)
            .range(offset, offset + PAGINA - 1);
          if (resp.error) {
            erro = resp.error;
            console.error(`[gbp_eleitores] página ${offset / PAGINA + 1} falhou:`, resp.error);
            break;
          }
          linhas.push(...(resp.data || []));
          if ((resp.data || []).length < PAGINA) break;
        }
        return { data: linhas, error: erro };
      };

      // Query simples (sem embeds) — embeds com hint de FK falham inteiro se
      // qualquer relacionamento/coluna estiver diferente no schema
      let eleitoresResponse = await buscarEleitoresDaEmpresa(
        `uid, nome, cpf, nascimento, whatsapp, genero,
         cep, logradouro, cidade, uf, bairro, numero, complemento,
         numero_do_sus, foto_url, indicado_uid, categoria_uid`
      );

      // Fallback: se alguma coluna não existir no schema, tenta o mínimo
      if (eleitoresResponse.error) {
        console.error('Eleitores (select completo) falhou:', eleitoresResponse.error);
        eleitoresResponse = await buscarEleitoresDaEmpresa(
          'uid, nome, cpf, whatsapp, bairro, cidade, uf, foto_url'
        );
      }

      // .in() em listas pequenas (indicados/categorias/usuários) é seguro
      const buscarPorLotes = async (tabela: string, select: string, uids: string[], tamanhoLote = 100) => {
        const linhas: any[] = [];
        let erro: any = null;
        for (let i = 0; i < uids.length; i += tamanhoLote) {
          const lote = uids.slice(i, i + tamanhoLote);
          const resp = await supabaseClient.from(tabela).select(select).in('uid', lote);
          if (resp.error) {
            erro = resp.error;
            console.error(`[${tabela}] lote ${i / tamanhoLote + 1} falhou:`, resp.error);
            continue; // continua nos demais lotes — dado parcial > nada
          }
          linhas.push(...(resp.data || []));
        }
        return { data: linhas, error: erro };
      };

      // Relacionamentos do eleitor em queries separadas (padrão dos usuários)
      const indicadoUids = [...new Set(
        (eleitoresResponse.data || []).map((e: any) => e.indicado_uid).filter(Boolean)
      )];
      const categoriaEleitorUids = [...new Set(
        (eleitoresResponse.data || []).map((e: any) => e.categoria_uid).filter(Boolean)
      )];

      // gbp_atendimentos.indicado é texto: pode guardar o uid do
      // gbp_indicado (relacionamento) ou o nome direto — coleta os uids
      const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const indicadoAtendUids = [...new Set(
        (atendimentosData || [])
          .map((a: any) => a.indicado)
          .filter((v: any): v is string => typeof v === 'string' && REGEX_UUID.test(v))
      )] as string[];

      const [indicadosResponse, categoriasEleitorResponse, indicadosAtendResponse] = await Promise.all([
        buscarPorLotes('gbp_indicado', 'uid, nome', indicadoUids as string[]),
        buscarPorLotes('gbp_categorias', 'uid, nome', categoriaEleitorUids as string[]),
        buscarPorLotes('gbp_indicado', 'uid, nome', indicadoAtendUids),
      ]);

      // Anexa indicado/categoria em cada eleitor
      const eleitoresData = (eleitoresResponse.data || []).map((e: any) => ({
        ...e,
        gbp_indicado: indicadosResponse.data?.find((i: any) => i.uid === e.indicado_uid) || null,
        gbp_categorias: categoriasEleitorResponse.data?.find((c: any) => c.uid === e.categoria_uid) || null,
      }));

      // Buscar usuários (também em lotes)
      const usuariosResponse = await buscarPorLotes('gbp_usuarios', 'uid, nome', usuarioUids);

      // Log dos dados
      console.log('Dados dos atendimentos:', atendimentosData);
      console.log('Erro dos atendimentos:', atendimentosError);
      console.log('Dados dos usuários:', usuariosResponse.data);
      console.log('Erro dos usuários:', usuariosResponse.error);
      console.log('Dados dos eleitores:', eleitoresData);
      console.log('Erro dos eleitores:', eleitoresResponse.error);
      console.log('Erro dos indicados:', indicadosResponse.error);
      console.log('Indicados (uids nos atendimentos):', indicadoAtendUids);
      console.log('Indicados resolvidos:', indicadosAtendResponse.data, 'erro:', indicadosAtendResponse.error);
      console.log('Erro das categorias do eleitor:', categoriasEleitorResponse.error);

      const atendimentosCompletos = atendimentosData?.map(atendimento => {
        // indicado (texto): uuid → resolve no gbp_indicado; texto → usa direto
        const indicadoNome =
          typeof atendimento.indicado === 'string' && REGEX_UUID.test(atendimento.indicado)
            ? indicadosAtendResponse.data?.find((i: any) => i.uid === atendimento.indicado)?.nome
              || eleitoresData.find((e: any) => e.uid === atendimento.indicado)?.nome // pode apontar p/ eleitor
              || null
            : atendimento.indicado || null;
        return {
          ...atendimento,
          eleitor: atendimento.eleitor || null,
          indicado_nome: indicadoNome,
          gbp_eleitores: eleitoresData.find(e => e.uid === atendimento.eleitor_uid) || null,
          gbp_usuarios: usuariosResponse.data?.find(u => u.uid === atendimento.usuario_uid) || null,
          gbp_categorias: atendimento.gbp_categorias || null
        };
      });

      return atendimentosCompletos || [];
    } catch (error) {
      console.error('Erro ao buscar atendimentos:', error);
      throw error;
    }
  }, [companyUid]);

  const updateAtendimentoStatus = useMutation({
    mutationFn: async ({ uid, status, user }: { uid: string; status: AtendimentoStatus; user: any }) => {
      if (!companyUid) throw new Error('Company UID is required');
      if (!user) throw new Error('User is required');

      // Usa a função updateAttendance em vez de atualizar diretamente
      await updateAttendance(uid, { 
        status,
        empresa_uid: companyUid,
        updated_by: user.uid,
        updated_by_user: {
          uid: user.uid,
          nome: user.nome,
          email: user.email,
          cargo: user.cargo
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atendimentos', companyUid] });
    },
  });

  const query = useQuery({
    queryKey: ['atendimentos', companyUid],
    queryFn: fetchAtendimentos,
    enabled: !!companyUid,
    staleTime: 1000 * 60 * 1, // 1 minuto
    refetchInterval: 1000 * 60 * 5, // 5 minutos
  });

  // Log para debug do resultado da query
  console.log('Query result:', {
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    dataLength: query.data?.length || 0,
    companyUid
  });

  return {
    ...query,
    updateAtendimentoStatus
  };
}
