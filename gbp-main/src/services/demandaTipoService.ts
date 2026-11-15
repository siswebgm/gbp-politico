import { supabaseClient } from '@/lib/supabase';
import type { CamposConfigDemanda, CabecalhoConfig } from '@/config/demandaCampos';

export interface DemandaTipo {
  id: number;
  created_at: string;
  uid: string;
  empresa_uid: string | null;
  nome_tipo: string[];
  updated_at: string | null;
  tipo_demanda_rua: string[];
  campos_config?: CamposConfigDemanda | null;
  cabecalho_config?: CabecalhoConfig | null;
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

  // Buscar a configuração de campos do formulário público
  async getCamposConfig(empresaUid: string): Promise<CamposConfigDemanda | null> {
    const { data, error } = await supabaseClient
      .from('gbp_demanda_tipo')
      .select('campos_config')
      .eq('empresa_uid', empresaUid)
      .maybeSingle();

    if (error) {
      console.error('[getCamposConfig] Erro ao buscar campos_config:', error);
      throw error;
    }

    return (data?.campos_config as CamposConfigDemanda) || null;
  },

  // Salvar a configuração de campos do formulário público
  async atualizarCamposConfig(empresaUid: string, camposConfig: CamposConfigDemanda): Promise<void> {
    const { data: existing, error: fetchError } = await supabaseClient
      .from('gbp_demanda_tipo')
      .select('uid')
      .eq('empresa_uid', empresaUid)
      .maybeSingle();

    if (fetchError) {
      console.error('[atualizarCamposConfig] Erro ao verificar registro:', fetchError);
      throw fetchError;
    }

    if (existing) {
      const { error } = await supabaseClient
        .from('gbp_demanda_tipo')
        .update({
          campos_config: camposConfig,
          updated_at: new Date().toISOString(),
        })
        .eq('empresa_uid', empresaUid);

      if (error) {
        console.error('[atualizarCamposConfig] Erro ao atualizar campos_config:', error);
        throw error;
      }
    } else {
      const { error } = await supabaseClient
        .from('gbp_demanda_tipo')
        .insert([{ empresa_uid: empresaUid, campos_config: camposConfig }]);

      if (error) {
        console.error('[atualizarCamposConfig] Erro ao criar registro de campos_config:', error);
        throw error;
      }
    }
  },

  // Buscar a configuração do cabeçalho do formulário público
  async getCabecalhoConfig(empresaUid: string): Promise<CabecalhoConfig | null> {
    const { data, error } = await supabaseClient
      .from('gbp_demanda_tipo')
      .select('cabecalho_config')
      .eq('empresa_uid', empresaUid)
      .maybeSingle();

    if (error) {
      console.error('[getCabecalhoConfig] Erro ao buscar cabecalho_config:', error);
      throw error;
    }

    return (data?.cabecalho_config as CabecalhoConfig) || null;
  },

  // Salvar a configuração do cabeçalho do formulário público
  async atualizarCabecalhoConfig(empresaUid: string, cabecalhoConfig: CabecalhoConfig): Promise<void> {
    const { data: existing, error: fetchError } = await supabaseClient
      .from('gbp_demanda_tipo')
      .select('uid')
      .eq('empresa_uid', empresaUid)
      .maybeSingle();

    if (fetchError) {
      console.error('[atualizarCabecalhoConfig] Erro ao verificar registro:', fetchError);
      throw fetchError;
    }

    if (existing) {
      const { error } = await supabaseClient
        .from('gbp_demanda_tipo')
        .update({
          cabecalho_config: cabecalhoConfig,
          updated_at: new Date().toISOString(),
        })
        .eq('empresa_uid', empresaUid);

      if (error) {
        console.error('[atualizarCabecalhoConfig] Erro ao atualizar cabecalho_config:', error);
        throw error;
      }
    } else {
      const { error } = await supabaseClient
        .from('gbp_demanda_tipo')
        .insert([{ empresa_uid: empresaUid, cabecalho_config: cabecalhoConfig }]);

      if (error) {
        console.error('[atualizarCabecalhoConfig] Erro ao criar registro de cabecalho_config:', error);
        throw error;
      }
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
