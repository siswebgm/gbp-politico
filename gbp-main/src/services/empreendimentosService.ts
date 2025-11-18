import { supabaseClient } from '../lib/supabase';

export interface Empreendimento {
  uid: string;
  nome: string;
  cidade: string;
  endereco?: string;
  cep?: string;
  total_blocos: number;
  total_apartamentos: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Bloco {
  uid: string;
  empreendimento_uid: string;
  nome: string;
  total_andares: number;
  apartamentos_por_andar: number;
  created_at: string;
  updated_at: string;
}

export interface Apartamento {
  uid: string;
  bloco_uid: string;
  numero: string;
  andar?: number;
  metragem?: number;
  quartos?: number;
  ocupado: boolean;
  created_at: string;
  updated_at: string;
}

export const empreendimentosService = {
  // Listar empreendimentos ativos
  async listarEmpreendimentos(): Promise<Empreendimento[]> {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_empreendimentos')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao listar empreendimentos:', error);
      throw error;
    }
  },

  // Listar blocos de um empreendimento
  async listarBlocos(empreendimento_uid: string): Promise<Bloco[]> {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_blocos')
        .select('*')
        .eq('empreendimento_uid', empreendimento_uid)
        .order('nome');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao listar blocos:', error);
      throw error;
    }
  },

  // Listar apartamentos de um bloco
  async listarApartamentos(bloco_uid: string): Promise<Apartamento[]> {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_apartamentos')
        .select('*')
        .eq('bloco_uid', bloco_uid)
        .order('numero');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao listar apartamentos:', error);
      throw error;
    }
  },

  // Criar empreendimento
  async criarEmpreendimento(dados: Omit<Empreendimento, 'uid' | 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_empreendimentos')
        .insert(dados)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao criar empreendimento:', error);
      throw error;
    }
  },

  // Criar bloco
  async criarBloco(dados: Omit<Bloco, 'uid' | 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_blocos')
        .insert(dados)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao criar bloco:', error);
      throw error;
    }
  },

  // Criar apartamento
  async criarApartamento(dados: Omit<Apartamento, 'uid' | 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_apartamentos')
        .insert(dados)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao criar apartamento:', error);
      throw error;
    }
  },

  // Buscar dados completos (empreendimento + bloco + apartamento)
  async buscarDadosCompletos(apartamento_uid: string) {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_apartamentos')
        .select(`
          *,
          bloco:gbp_blocos(
            *,
            empreendimento:gbp_empreendimentos(*)
          )
        `)
        .eq('uid', apartamento_uid)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar dados completos:', error);
      throw error;
    }
  },

  // Marcar apartamento como ocupado
  async marcarApartamentoComoOcupado(apartamento_uid: string) {
    try {
      const { error } = await supabaseClient
        .from('gbp_apartamentos')
        .update({ ocupado: true })
        .eq('uid', apartamento_uid);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Erro ao marcar apartamento como ocupado:', error);
      throw error;
    }
  }
};
