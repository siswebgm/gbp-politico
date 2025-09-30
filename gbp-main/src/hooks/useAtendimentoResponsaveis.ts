import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';

export function useAtendimentoResponsaveis() {
  const company = useCompanyStore((state) => state.company);

  const query = useQuery({
    queryKey: ['atendimento-responsaveis', company?.uid],
    queryFn: async () => {
      if (!company?.uid) {
        console.log('Sem empresa definida');
        return [];
      }

      console.log('Buscando responsáveis dos atendimentos para empresa:', company.uid);

      // Primeiro busca os usuários relacionados aos atendimentos
      const { data: atendimentos, error: atendimentosError } = await supabaseClient
        .from('gbp_atendimentos')
        .select('usuario_uid')
        .eq('empresa_uid', company.uid)
        .not('usuario_uid', 'is', null);

      if (atendimentosError) {
        console.error('Erro ao buscar atendimentos:', atendimentosError);
        throw atendimentosError;
      }

      // Extrai os UIDs únicos dos usuários
      const usuarioUids = [...new Set(atendimentos.map(a => a.usuario_uid))].filter(Boolean);

      if (usuarioUids.length === 0) {
        return [];
      }

      // Busca os dados dos usuários
      const { data: usuarios, error: usuariosError } = await supabaseClient
        .from('gbp_usuarios')
        .select('uid, nome')
        .in('uid', usuarioUids)
        .order('nome');

      if (usuariosError) {
        console.error('Erro ao buscar usuários:', usuariosError);
        throw usuariosError;
      }

      console.log('Responsáveis únicos encontrados:', usuarios?.length);
      return usuarios || [];
    },
    enabled: !!company?.uid,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  return query;
}
