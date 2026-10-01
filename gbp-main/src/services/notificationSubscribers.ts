import { supabaseClient } from '../lib/supabase';

export interface NotificacaoInscrito {
  uid: string;
  empresa_uid: string;
  nome: string | null;
  telefone: string | null;
  token: string | null;
  permissao: 'granted' | 'denied' | 'default';
  plataforma: string | null;
  ativo: boolean;
  criado_em: string;
}

export interface EmpresaPublica {
  nome: string | null;
  logo: string | null;
}

interface RegistrarInscritoParams {
  empresa_uid: string;
  nome?: string;
  telefone?: string;
  token?: string | null;
  permissao: 'granted' | 'denied' | 'default';
}

class NotificationSubscribersService {
  gerarLinkConvite(empresaUid: string): string {
    return `${window.location.origin}/notificacoes/aceitar/${empresaUid}`;
  }

  async buscarEmpresaPublica(empresaUid: string): Promise<EmpresaPublica | null> {
    const { data, error } = await supabaseClient
      .from('gbp_empresas')
      .select('nome, logo')
      .eq('uid', empresaUid)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar empresa: ${error.message}`);
    }
    return (data as EmpresaPublica | null) ?? null;
  }

  async registrar(params: RegistrarInscritoParams) {
    const { data, error } = await supabaseClient
      .from('gbp_notificacoes_inscritos')
      .insert({
        empresa_uid: params.empresa_uid,
        nome: params.nome || null,
        telefone: params.telefone || null,
        token: params.token || null,
        permissao: params.permissao,
        plataforma: navigator.platform || null,
        user_agent: navigator.userAgent,
        ativo: params.permissao === 'granted'
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505' && params.token) {
        const { data: existente, error: updateError } = await supabaseClient
          .from('gbp_notificacoes_inscritos')
          .update({
            nome: params.nome || null,
            telefone: params.telefone || null,
            permissao: params.permissao,
            ativo: params.permissao === 'granted',
            atualizado_em: new Date().toISOString()
          })
          .eq('empresa_uid', params.empresa_uid)
          .eq('token', params.token)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Erro ao atualizar inscrição: ${updateError.message}`);
        }
        return existente as NotificacaoInscrito;
      }
      throw new Error(`Erro ao registrar inscrição: ${error.message}`);
    }
    return data as NotificacaoInscrito;
  }

  async listarPorEmpresa(empresaUid: string) {
    const { data, error } = await supabaseClient
      .from('gbp_notificacoes_inscritos')
      .select('*')
      .eq('empresa_uid', empresaUid)
      .order('criado_em', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar inscritos: ${error.message}`);
    }
    return (data || []) as NotificacaoInscrito[];
  }

  async alterarAtivo(uid: string, ativo: boolean) {
    const { error } = await supabaseClient
      .from('gbp_notificacoes_inscritos')
      .update({ ativo, atualizado_em: new Date().toISOString() })
      .eq('uid', uid);

    if (error) {
      throw new Error(`Erro ao atualizar inscrito: ${error.message}`);
    }
  }

  async excluir(uid: string) {
    const { data, error } = await supabaseClient
      .from('gbp_notificacoes_inscritos')
      .delete()
      .eq('uid', uid)
      .select('uid');

    if (error) {
      throw new Error(`Erro ao excluir inscrito: ${error.message}`);
    }
    if (!data || data.length === 0) {
      throw new Error('Não foi possível excluir o inscrito (sem permissão). Execute o SQL de política DELETE.');
    }
  }
}

export const notificationSubscribersService = new NotificationSubscribersService();
