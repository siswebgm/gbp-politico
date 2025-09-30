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
        .order('data_atendimento', { ascending: false });

      if (atendimentosError) {
        console.error('Error fetching atendimentos:', atendimentosError);
        throw atendimentosError;
      }

      // Buscar dados relacionados em queries separadas
      // Coletar UIDs de eleitores e indicados
      const usuarioUids = atendimentosData
        ?.map(a => a.usuario_uid)
        .filter((uid): uid is string => uid !== null) || [];

      // Buscar usuários
      const usuariosResponse = await supabaseClient
        .from('gbp_usuarios')
        .select('uid, nome')
        .in('uid', usuarioUids);

      // Log dos dados
      console.log('Dados dos atendimentos:', atendimentosData);
      console.log('Erro dos atendimentos:', atendimentosError);
      console.log('Dados dos usuários:', usuariosResponse.data);
      console.log('Erro dos usuários:', usuariosResponse.error);

      const atendimentosCompletos = atendimentosData?.map(atendimento => {
        console.log('Processando atendimento:', atendimento);
        return {
          ...atendimento,
          eleitor: atendimento.eleitor || null,
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
