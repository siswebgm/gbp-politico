import { supabaseClient as supabase } from '../lib/supabase';

export interface CadastroToken {
  uid: string;
  token: string;
  empreendimento_uid: string;
  status: 'pendente' | 'usado' | 'expirado';
  usado_em?: string;
  expira_em?: string;
  created_at: string;
  updated_at: string;
}

class CadastroTokensService {
  // Gerar token único
  private gerarToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) +
           Date.now().toString(36);
  }

  // Criar novo token
  async criarToken(empreendimento_uid: string, diasExpiracao: number = 30): Promise<CadastroToken> {
    const token = this.gerarToken();
    const expira_em = new Date();
    expira_em.setDate(expira_em.getDate() + diasExpiracao);

    const { data, error } = await supabase
      .from('gbp_cadastro_tokens')
      .insert({
        token,
        empreendimento_uid,
        status: 'pendente',
        expira_em: expira_em.toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Validar token
  async validarToken(token: string): Promise<{
    valido: boolean;
    mensagem: string;
    empreendimento_uid?: string;
  }> {
    const { data, error } = await supabase
      .from('gbp_cadastro_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) {
      return {
        valido: false,
        mensagem: 'Token inválido ou não encontrado.'
      };
    }

    // Verificar se já foi usado
    if (data.status === 'usado') {
      return {
        valido: false,
        mensagem: 'Este link já foi utilizado. Você já realizou seu cadastro.'
      };
    }

    // Verificar se expirou
    if (data.expira_em && new Date(data.expira_em) < new Date()) {
      // Marcar como expirado
      await supabase
        .from('gbp_cadastro_tokens')
        .update({ status: 'expirado' })
        .eq('uid', data.uid);

      return {
        valido: false,
        mensagem: 'Este link expirou. Solicite um novo link de cadastro.'
      };
    }

    return {
      valido: true,
      mensagem: 'Token válido',
      empreendimento_uid: data.empreendimento_uid
    };
  }

  // Marcar token como usado
  async marcarComoUsado(token: string): Promise<void> {
    const { error } = await supabase
      .from('gbp_cadastro_tokens')
      .update({
        status: 'usado',
        usado_em: new Date().toISOString()
      })
      .eq('token', token);

    if (error) throw error;
  }

  // Gerar URL de cadastro
  gerarUrlCadastro(token: string, empreendimento_nome: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/cadastro-moradores?token=${token}&empreendimento=${encodeURIComponent(empreendimento_nome)}`;
  }

  // Listar tokens de um empreendimento
  async listarTokensPorEmpreendimento(empreendimento_uid: string): Promise<CadastroToken[]> {
    const { data, error } = await supabase
      .from('gbp_cadastro_tokens')
      .select('*')
      .eq('empreendimento_uid', empreendimento_uid)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

export const cadastroTokensService = new CadastroTokensService();
