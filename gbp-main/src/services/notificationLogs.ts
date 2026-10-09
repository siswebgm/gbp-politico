import { supabaseClient } from '../lib/supabase';

export interface MidiaAnexo {
  tipo: 'imagem' | 'video' | 'audio' | 'pdf';
  url: string;
  nome?: string;
  legenda?: string;
}

export interface RespostaItem {
  texto?: string | null;
  midias?: MidiaAnexo[];
  data: string;
}

export interface NotificationLog {
  uid: string;
  empresa_uid: string;
  usuario_uid?: string | null;
  inscrito_uid?: string | null;
  titulo: string;
  mensagem: string;
  imagem_url?: string;
  link_direcionar?: string;
  tipo_midia?: string;
  url_midia?: string;
  midias?: MidiaAnexo[];
  enviada: boolean;
  entregue: boolean;
  visualizada: boolean;
  clicada: boolean;
  erro?: string;
  data_criacao: string;
  data_envio?: string;
  data_entrega?: string;
  data_visualizacao?: string;
  data_clique?: string;
  plataforma?: string;
  dispositivo_modelo?: string;
  versao_app?: string;
  resposta?: string;
  data_resposta?: string;
  resposta_midias?: MidiaAnexo[];
  respostas?: RespostaItem[];
  respostas_admin?: RespostaItem[];
  etiquetas?: string[];
  campanha_uid?: string | null;
  campanha_nome?: string | null;
}

export interface CreateNotificationLogParams {
  empresa_uid: string;
  usuario_uid?: string;
  inscrito_uid?: string;
  titulo: string;
  mensagem: string;
  imagem_url?: string;
  link_direcionar?: string;
  tipo_midia?: string;
  url_midia?: string;
  midias?: MidiaAnexo[];
  plataforma?: string;
  campanha_uid?: string;
  campanha_nome?: string;
}

export interface NotificationStats {
  total: number;
  enviadas: number;
  entregues: number;
  visualizadas: number;
  clicadas: number;
  erros: number;
  taxa_entrega: number;
  taxa_visualizacao: number;
  taxa_clique: number;
}

class NotificationLogsService {
  // Criar log de notificação
  async createLog(params: CreateNotificationLogParams): Promise<NotificationLog> {
    const { data, error } = await supabaseClient
      .from('gbp_notificacoes_log')
      .insert({
        ...params,
        data_criacao: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar log de notificação:', error);
      throw new Error(`Erro ao criar log: ${error.message}`);
    }

    return data;
  }

  // Marcar como enviada
  async markAsSent(uid: string): Promise<void> {
    const { error } = await supabaseClient
      .from('gbp_notificacoes_log')
      .update({ 
        enviada: true,
        data_envio: new Date().toISOString()
      })
      .eq('uid', uid);

    if (error) {
      console.error('Erro ao marcar notificação como enviada:', error);
    }
  }

  // Marcar como entregue
  async markAsDelivered(uid: string): Promise<void> {
    const { error } = await supabaseClient
      .from('gbp_notificacoes_log')
      .update({ 
        entregue: true,
        data_entrega: new Date().toISOString()
      })
      .eq('uid', uid);

    if (error) {
      console.error('Erro ao marcar notificação como entregue:', error);
    }
  }

  // Marcar como visualizada
  async markAsViewed(uid: string): Promise<void> {
    const { error } = await supabaseClient
      .from('gbp_notificacoes_log')
      .update({ 
        visualizada: true,
        data_visualizacao: new Date().toISOString()
      })
      .eq('uid', uid);

    if (error) {
      console.error('Erro ao marcar notificação como visualizada:', error);
    }
  }

  // Marcar como clicada
  async markAsClicked(uid: string): Promise<void> {
    const { error } = await supabaseClient
      .from('gbp_notificacoes_log')
      .update({ 
        clicada: true,
        data_clique: new Date().toISOString()
      })
      .eq('uid', uid);

    if (error) {
      console.error('Erro ao marcar notificação como clicada:', error);
    }
  }

  // Registrar erro
  async markError(uid: string, erro: string): Promise<void> {
    const { error } = await supabaseClient
      .from('gbp_notificacoes_log')
      .update({ 
        erro: erro
      })
      .eq('uid', uid);

    if (error) {
      console.error('Erro ao registrar erro de notificação:', error);
    }
  }

  // Registrar resposta do usuário (chat na página pública /notificacao/:uid)
  // Cada envio vira um novo item no array `respostas` (histórico de conversa)
  async saveResposta(uid: string, resposta: string, midias?: MidiaAnexo[]): Promise<RespostaItem> {
    const agora = new Date().toISOString();

    // Busca o histórico atual para acrescentar a nova mensagem
    const { data: atual } = await supabaseClient
      .from('gbp_notificacoes_log')
      .select('respostas')
      .eq('uid', uid)
      .single();

    const lista: RespostaItem[] = Array.isArray(atual?.respostas) ? atual.respostas : [];
    const novo: RespostaItem = { texto: resposta || null, midias: midias || [], data: agora };

    const { error } = await supabaseClient
      .from('gbp_notificacoes_log')
      .update({
        resposta: resposta || null,
        data_resposta: agora,
        resposta_midias: midias || [],
        respostas: [...lista, novo]
      })
      .eq('uid', uid);

    if (error) {
      console.error('Erro ao salvar resposta:', error);
      throw new Error(`Erro ao salvar resposta: ${error.message}`);
    }
    return novo;
  }

  // Registrar resposta do ADMIN na conversa (página /app/notificacoes/conversas)
  async saveRespostaAdmin(uid: string, resposta: string, midias?: MidiaAnexo[]): Promise<RespostaItem> {
    const agora = new Date().toISOString();

    const { data: atual } = await supabaseClient
      .from('gbp_notificacoes_log')
      .select('respostas_admin')
      .eq('uid', uid)
      .single();

    const lista: RespostaItem[] = Array.isArray(atual?.respostas_admin) ? atual.respostas_admin : [];
    const novo: RespostaItem = { texto: resposta || null, midias: midias || [], data: agora };

    const { error } = await supabaseClient
      .from('gbp_notificacoes_log')
      .update({ respostas_admin: [...lista, novo] })
      .eq('uid', uid);

    if (error) {
      console.error('Erro ao salvar resposta do admin:', error);
      throw new Error(`Erro ao salvar resposta: ${error.message}`);
    }
    return novo;
  }

  // Salvar etiquetas de gerenciamento da conversa (página Conversas)
  async salvarEtiquetas(uid: string, etiquetas: string[]): Promise<void> {
    const { error } = await supabaseClient
      .from('gbp_notificacoes_log')
      .update({ etiquetas })
      .eq('uid', uid);

    if (error) {
      console.error('Erro ao salvar etiquetas:', error);
      throw new Error(`Erro ao salvar etiquetas: ${error.message}`);
    }
  }

  // Listar conversas: UMA conversa por pessoa (estilo WhatsApp).
  // Cada notificação enviada gera um log próprio, mas respostas do mesmo
  // inscrito/usuário são mescladas numa única thread — mesmo quando o token
  // rotacionou e a pessoa já teve mais de um registro de inscrito.
  async listarConversas(empresaUid: string, limit = 200): Promise<any[]> {
    const { data, error } = await supabaseClient
      .from('gbp_notificacoes_log')
      .select(`
        uid, titulo, mensagem, midias, resposta, resposta_midias, respostas, respostas_admin, etiquetas,
        data_resposta, data_criacao, usuario_uid, inscrito_uid,
        usuario:gbp_usuarios!usuario_uid(uid, nome, notification_token),
        inscrito:gbp_notificacoes_inscritos!inscrito_uid(uid, nome, telefone, token)
      `)
      .eq('empresa_uid', empresaUid)
      .or('resposta.not.is.null,respostas_admin.not.is.null')
      .order('data_resposta', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao listar conversas:', error);
      throw new Error(`Erro ao listar conversas: ${error.message}`);
    }
    return this.agruparPorPessoa(data || []);
  }

  // Mescla os logs da mesma pessoa num único objeto de conversa.
  // O log mais recente vira o "canônico" (uid, inscrito, etiquetas, token),
  // e as respostas/notificações de todos os logs compõem a linha do tempo.
  private agruparPorPessoa(logs: any[]): any[] {
    const grupos = new Map<string, any[]>();
    for (const log of logs) {
      const chave = log.inscrito_uid
        ? `i:${log.inscrito_uid}`
        : log.usuario_uid
          ? `u:${log.usuario_uid}`
          : `log:${log.uid}`;
      const lista = grupos.get(chave) || [];
      lista.push(log);
      grupos.set(chave, lista);
    }

    return [...grupos.values()].map((lista) => {
      const ordenados = [...lista].sort(
        (a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime()
      );
      const canonico = ordenados[0];

      const respostas = ordenados.flatMap((l) =>
        Array.isArray(l.respostas) && l.respostas.length
          ? l.respostas
          : (l.resposta
              ? [{ texto: l.resposta, midias: l.resposta_midias || [], data: l.data_resposta }]
              : [])
      );
      const respostas_admin = ordenados.flatMap((l) =>
        Array.isArray(l.respostas_admin) ? l.respostas_admin : []
      );

      // Notificações que a pessoa recebeu, em ordem cronológica — cada uma
      // vira uma "bolha" na conversa, como as mensagens recebidas no WhatsApp
      const notificacoes = ordenados
        .map((l) => ({
          uid: l.uid,
          titulo: l.titulo,
          mensagem: l.mensagem,
          midias: l.midias,
          data_criacao: l.data_criacao
        }))
        .sort((a, b) => new Date(a.data_criacao).getTime() - new Date(b.data_criacao).getTime());

      const datas = [...respostas, ...respostas_admin]
        .map((r: any) => r?.data)
        .filter(Boolean)
        .map((d: string) => new Date(d).getTime());
      const ultimaAtividade = Math.max(
        ...(datas.length ? datas : [0]),
        new Date(canonico.data_resposta || 0).getTime(),
        new Date(canonico.data_criacao).getTime()
      );

      return {
        ...canonico,
        respostas,
        respostas_admin,
        notificacoes,
        log_uids: ordenados.map((l) => l.uid),
        data_resposta: new Date(ultimaAtividade).toISOString()
      };
    }).sort((a, b) => new Date(b.data_resposta).getTime() - new Date(a.data_resposta).getTime());
  }

  // Conversa completa da pessoa dona do log informado: todos os logs do mesmo
  // inscrito/usuário em ordem cronológica. Usada pela página pública
  // /notificacao/:uid para exibir a thread inteira em vez de um aviso isolado.
  async getConversaByLogUid(logUid: string): Promise<{ log: NotificationLog; logs: NotificationLog[] } | null> {
    const log = await this.getLogByUid(logUid);
    if (!log) return null;

    const pessoaUid = (log as any).inscrito_uid || (log as any).usuario_uid;
    const campo = (log as any).inscrito_uid ? 'inscrito_uid' : 'usuario_uid';
    if (!pessoaUid) return { log, logs: [log] };

    const { data, error } = await supabaseClient
      .from('gbp_notificacoes_log')
      .select('*')
      .eq(campo, pessoaUid)
      .order('data_criacao', { ascending: true });

    if (error || !data || data.length === 0) {
      return { log, logs: [log] };
    }
    return { log, logs: data as NotificationLog[] };
  }

  // 

  // Buscar log por uid
  async getLogByUid(uid: string): Promise<NotificationLog | null> {
    const { data, error } = await supabaseClient
      .from('gbp_notificacoes_log')
      .select('*')
      .eq('uid', uid)
      .single();

    if (error) {
      console.error('Erro ao buscar log de notificação:', error);
      return null;
    }

    return data;
  }

  // Buscar logs por empresa
  async getLogsByEmpresa(
    empresaUid: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<NotificationLog[]> {
    const { data, error } = await supabaseClient
      .from('gbp_notificacoes_log')
      .select('*')
      .eq('empresa_uid', empresaUid)
      .order('data_criacao', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erro ao buscar logs por empresa:', error);
      throw new Error(`Erro ao buscar logs: ${error.message}`);
    }

    return data || [];
  }

  // Buscar logs por usuário
  async getLogsByUsuario(
    usuarioUid: string,
    limit: number = 50
  ): Promise<NotificationLog[]> {
    const { data, error } = await supabaseClient
      .from('gbp_notificacoes_log')
      .select('*')
      .eq('usuario_uid', usuarioUid)
      .order('data_criacao', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar logs por usuário:', error);
      throw new Error(`Erro ao buscar logs: ${error.message}`);
    }

    return data || [];
  }

  // Buscar estatísticas por empresa
  async getStatsByEmpresa(empresaUid: string): Promise<NotificationStats> {
    const { data, error } = await supabaseClient
      .from('gbp_notificacoes_log')
      .select('enviada, entregue, visualizada, clicada, erro')
      .eq('empresa_uid', empresaUid);

    if (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }

    const logs = data || [];
    const total = logs.length;
    const enviadas = logs.filter(l => l.enviada).length;
    const entregues = logs.filter(l => l.entregue).length;
    const visualizadas = logs.filter(l => l.visualizada).length;
    const clicadas = logs.filter(l => l.clicada).length;
    const erros = logs.filter(l => l.erro).length;

    return {
      total,
      enviadas,
      entregues,
      visualizadas,
      clicadas,
      erros,
      taxa_entrega: total > 0 ? (entregues / total) * 100 : 0,
      taxa_visualizacao: total > 0 ? (visualizadas / total) * 100 : 0,
      taxa_clique: total > 0 ? (clicadas / total) * 100 : 0
    };
  }

  // Buscar usuários com notificação ativa por empresa
  async getUsersWithNotificationByEmpresa(empresaUid: string) {
    const { data, error } = await supabaseClient
      .from('gbp_usuarios')
      .select('uid, nome, email, notification_token, notification_status')
      .eq('empresa_uid', empresaUid)
      .not('notification_token', 'is', null)
      .or('notification_status.is.null,notification_status.neq.invalid_token');

    if (error) {
      console.error('Erro ao buscar usuários com notificação:', error);
      throw new Error(`Erro ao buscar usuários: ${error.message}`);
    }

    return data || [];
  }

  // Buscar estatísticas de usuários com notificação por empresa
  async getNotificationUserStats(empresaUid: string) {
    const { data, error } = await supabaseClient
      .from('gbp_usuarios')
      .select('notification_token, notification_status')
      .eq('empresa_uid', empresaUid);

    if (error) {
      console.error('Erro ao buscar estatísticas de usuários:', error);
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }

    const usuarios = data || [];
    const total = usuarios.length;
    const ativos = usuarios.filter(u => u.notification_token).length;
    const invalidos = usuarios.filter(u => u.notification_status === 'invalid_token').length;
    const sem_permissao = usuarios.filter(u => !u.notification_token).length;

    return {
      total,
      ativos,
      invalidos,
      sem_permissao,
      taxa_ativacao: total > 0 ? (ativos / total) * 100 : 0
    };
  }
}

export const notificationLogsService = new NotificationLogsService();
