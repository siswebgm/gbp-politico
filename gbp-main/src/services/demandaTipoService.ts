import { supabaseClient } from '@/lib/supabase';

export interface DemandaTipo {
  id: number;
  created_at: string;
  uid: string;
  empresa_uid: string | null;
  nome_tipo: string[];
  updated_at: string | null;
  tipo_demanda_rua: string[];
}

export const demandaTipoService = {
  // Buscar todos os tipos de demanda
  async getTiposDemanda(empresaUid: string): Promise<DemandaTipo[]> {
    console.log(`[getTiposDemanda] Buscando tipos de demanda para empresa ${empresaUid}`);
    const { data, error } = await supabaseClient
      .from('gbp_demanda_tipo')
      .select('*')
      .eq('empresa_uid', empresaUid);

    if (error) {
      console.error('[getTiposDemanda] Erro ao buscar tipos de demanda:', error);
      throw error;
    }

    console.log(`[getTiposDemanda] Tipos encontrados:`, data);
    return data || [];
  },

  // Atualizar os tipos de demanda
  async atualizarTiposDemanda(empresaUid: string, tipos: string[]): Promise<DemandaTipo> {
    console.log(`[atualizarTiposDemanda] Iniciando atualização para empresa ${empresaUid}`, { tipos });
    
    // Verifica se já existe um registro para a empresa
    const { data: existing, error: fetchError } = await supabaseClient
      .from('gbp_demanda_tipo')
      .select('*')
      .eq('empresa_uid', empresaUid)
      .single();

    console.log(`[atualizarTiposDemanda] Verificação de registro existente:`, { existing, fetchError });

    if (existing) {
      console.log(`[atualizarTiposDemanda] Atualizando registro existente`);
      // Atualiza o registro existente
      const { data, error } = await supabaseClient
        .from('gbp_demanda_tipo')
        .update({
          tipo_demanda_rua: tipos,
          updated_at: new Date().toISOString(),
        })
        .eq('empresa_uid', empresaUid)
        .select()
        .single();

      if (error) {
        console.error('[atualizarTiposDemanda] Erro ao atualizar tipos de demanda:', error);
        throw error;
      }
      
      console.log(`[atualizarTiposDemanda] Tipos de demanda atualizados com sucesso:`, data);
      return data;
    } else {
      // Cria um novo registro
      console.log(`[atualizarTiposDemanda] Criando novo registro para empresa ${empresaUid}`);
      const { data, error } = await supabaseClient
        .from('gbp_demanda_tipo')
        .insert([
          {
            empresa_uid: empresaUid,
            tipo_demanda_rua: tipos,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('[atualizarTiposDemanda] Erro ao criar novo registro de tipos de demanda:', error);
        throw error;
      }
      
      console.log(`[atualizarTiposDemanda] Novo registro criado com sucesso:`, data);
      return data;
    }
  },

  // Obter os tipos de demanda formatados em uma única lista
  async getTiposDemandaFormatados(empresaUid: string): Promise<string[]> {
    console.log(`[getTiposDemandaFormatados] Iniciando busca por tipos formatados para empresa ${empresaUid}`);
    try {
      const tipos = await this.getTiposDemanda(empresaUid);
      console.log(`[getTiposDemandaFormatados] Tipos brutos recebidos:`, tipos);
      
      if (tipos.length === 0) {
        console.log(`[getTiposDemandaFormatados] Nenhum tipo encontrado para a empresa ${empresaUid}`);
        return [];
      }
      
      // Retorna o primeiro registro encontrado (deveria ter apenas um por empresa)
      const tiposFormatados = tipos[0]?.tipo_demanda_rua || [];
      console.log(`[getTiposDemandaFormatados] Tipos formatados:`, tiposFormatados);
      return tiposFormatados;
    } catch (error) {
      console.error('[getTiposDemandaFormatados] Erro ao obter tipos de demanda formatados:', error);
      return [];
    }
  },
};
