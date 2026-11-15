import { supabaseClient } from '@/lib/supabase';

export interface Empresa {
  uid: string;
  nome: string;
  link_demanda_disponivel: boolean;
  feedback_demanda_registrada?: string;
  feedback_demanda_protocolada?: string;
  // Adicione outros campos conforme necessário
}

export const empresaService = {
  // Buscar dados da empresa
  getEmpresa: async (empresaUid: string): Promise<Empresa | null> => {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_empresas')
        .select('*')
        .eq('uid', empresaUid)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar dados da empresa:', error);
      return null;
    }
  },

  // Atualizar visibilidade do link de demanda
  atualizarVisibilidadeLinkDemanda: async (
    empresaUid: string, 
    visivel: boolean
  ): Promise<boolean> => {
    try {
      const { error } = await supabaseClient
        .from('gbp_empresas')
        .update({ link_demanda_disponivel: visivel })
        .eq('uid', empresaUid);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao atualizar visibilidade do link de demanda:', error);
      return false;
    }
  },

  // Atualizar mensagens de feedback de demanda
  atualizarMensagensFeedback: async (
    empresaUid: string,
    feedbackRegistrada: string,
    feedbackProtocolada: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabaseClient
        .from('gbp_empresas')
        .update({
          feedback_demanda_registrada: feedbackRegistrada,
          feedback_demanda_protocolada: feedbackProtocolada
        })
        .eq('uid', empresaUid);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao atualizar mensagens de feedback:', error);
      return false;
    }
  }
};
