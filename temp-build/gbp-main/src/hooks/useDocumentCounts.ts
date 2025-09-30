import { useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';

interface DocumentCounts {
  oficiosCount: number;
  projetosLeiCount: number;
  requerimentosCount: number;
  emendasCount: number;
  demandasRuasCount: number; // Adicionado contagem de demandas de rua
  isLoading: boolean;
  error: string | null;
}

export function useDocumentCounts() {
  const [counts, setCounts] = useState<DocumentCounts>({
    oficiosCount: 0,
    projetosLeiCount: 0,
    requerimentosCount: 0,
    emendasCount: 0,
    demandasRuasCount: 0, // Inicializando contador de demandas de rua
    isLoading: true,
    error: null
  });

  const company = useCompanyStore((state) => state.company);

  useEffect(() => {
    async function fetchCounts() {
      if (!company?.uid) return;

      try {
        // Buscar contagem de ofícios
        const { count: oficiosCount, error: oficiosError } = await supabaseClient
          .from('gbp_oficios')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_uid', company.uid);

        if (oficiosError) throw oficiosError;

        // Buscar contagem de projetos de lei
        const { count: projetosLeiCount, error: projetosError } = await supabaseClient
          .from('gbp_projetos_lei')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_uid', company.uid)
          .is('deleted_at', null);

        if (projetosError) throw projetosError;

        // Buscar contagem de requerimentos
        const { count: requerimentosCount, error: requerimentosError } = await supabaseClient
          .from('gbp_requerimentos')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_uid', company.uid);

        if (requerimentosError) throw requerimentosError;

        // Buscar contagem de emendas parlamentares
        const { count: emendasCount, error: emendasError } = await supabaseClient
          .from('gbp_emendas_parlamentares')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_uid', company.uid)
          .is('deleted_at', null);

        if (emendasError) throw emendasError;

        // Buscar contagem de demandas de rua
        const { count: demandasRuasCount, error: demandasError } = await supabaseClient
          .from('gbp_demandas_ruas')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_uid', company.uid);

        if (demandasError) throw demandasError;

        setCounts({
          oficiosCount: oficiosCount || 0,
          projetosLeiCount: projetosLeiCount || 0,
          requerimentosCount: requerimentosCount || 0,
          emendasCount: emendasCount || 0,
          demandasRuasCount: demandasRuasCount || 0, // Adicionando contagem de demandas de rua
          isLoading: false,
          error: null
        });
      } catch (error) {
        setCounts(prev => ({
          ...prev,
          isLoading: false,
          error: 'Erro ao carregar contagens de documentos'
        }));
      }
    }

    fetchCounts();
  }, [company?.uid]);

  return counts;
}
