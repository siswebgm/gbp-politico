import { supabaseClient } from '../lib/supabase';

export interface ExtensaoCredencial {
  id: string;
  usuario: string;
  ativo: boolean;
  created_at: string;
  whatsapp_conectado: boolean | null;
  whatsapp_numero: string | null;
  heartbeat_em: string | null;
}

export interface CredencialCriada {
  id: string;
  usuario: string;
  ativo: boolean;
  created_at: string;
}

// Traduz erros vindos do banco (RAISE EXCEPTION com "using message = ...") em mensagens amigáveis.
function traduzErro(error: any): string {
  const msg = (error?.message || '').toString();
  if (/usuario_em_uso/i.test(msg) || /já está em uso/i.test(msg)) {
    return 'Esse nome de usuário já está em uso. Escolha outro.';
  }
  if (/usuario_vazio/i.test(msg)) return 'O nome de usuário é obrigatório.';
  if (/senha_vazia/i.test(msg)) return 'A senha é obrigatória.';
  if (/credencial_nao_encontrada/i.test(msg)) return 'Credencial não encontrada.';
  return msg || 'Ocorreu um erro. Tente novamente.';
}

export const extensaoCredenciaisService = {
  async listar(empresaUid: string): Promise<ExtensaoCredencial[]> {
    const { data, error } = await supabaseClient.rpc('listar_credenciais_extensao', {
      p_empresa_id: empresaUid,
    });
    if (error) throw new Error(traduzErro(error));
    return (data || []) as ExtensaoCredencial[];
  },

  async criar(empresaUid: string, usuario: string, senha: string): Promise<CredencialCriada> {
    const { data, error } = await supabaseClient.rpc('criar_credencial_extensao', {
      p_empresa_id: empresaUid,
      p_usuario: usuario,
      p_senha: senha,
    });
    if (error) throw new Error(traduzErro(error));
    const row = Array.isArray(data) ? data[0] : data;
    return row as CredencialCriada;
  },

  async atualizarSenha(empresaUid: string, id: string, senha: string): Promise<void> {
    const { error } = await supabaseClient.rpc('atualizar_senha_extensao', {
      p_empresa_id: empresaUid,
      p_id: id,
      p_senha: senha,
    });
    if (error) throw new Error(traduzErro(error));
  },

  async definirStatus(empresaUid: string, id: string, ativo: boolean): Promise<void> {
    const { error } = await supabaseClient.rpc('definir_status_credencial_extensao', {
      p_empresa_id: empresaUid,
      p_id: id,
      p_ativo: ativo,
    });
    if (error) throw new Error(traduzErro(error));
  },

  async excluir(empresaUid: string, id: string): Promise<void> {
    const { error } = await supabaseClient.rpc('excluir_credencial_extensao', {
      p_empresa_id: empresaUid,
      p_id: id,
    });
    if (error) throw new Error(traduzErro(error));
  },
};
