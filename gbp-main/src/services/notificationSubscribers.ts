import { supabaseClient } from '../lib/supabase';

export interface NotificacaoInscrito {
  uid: string;
  empresa_uid: string;
  eleitor_uid?: string | null;
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
  storage?: string | null;
}

interface RegistrarInscritoParams {
  empresa_uid: string;
  eleitor_uid?: string;
  nome?: string;
  telefone?: string;
  token?: string | null;
  permissao: 'granted' | 'denied' | 'default';
}

class NotificationSubscribersService {
  gerarLinkConvite(empresaUid: string, eleitorUid?: string): string {
    const baseLink = `${window.location.origin}/notificacoes/aceitar/${empresaUid}`;
    return eleitorUid ? `${baseLink}/${eleitorUid}` : baseLink;
  }

  async buscarEmpresaPublica(empresaUid: string): Promise<EmpresaPublica | null> {
    const { data, error } = await supabaseClient
      .from('gbp_empresas')
      .select('nome, logo, storage')
      .eq('uid', empresaUid)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar empresa: ${error.message}`);
    }
    return (data as EmpresaPublica | null) ?? null;
  }

  // Busca cadastros que já representam esta mesma pessoa. O token FCM rotaciona
  // (reinstalação, refresh do service worker), então o "mesmo usuário" pode chegar
  // com um token novo — identificamos por eleitor_uid, telefone ou o token atual.
  private async buscarExistentes(params: RegistrarInscritoParams): Promise<NotificacaoInscrito[]> {
    const encontrados = new Map<string, NotificacaoInscrito>();
    const add = (rows: NotificacaoInscrito[] | null | undefined) =>
      (rows || []).forEach((r) => encontrados.set(r.uid, r));

    if (params.eleitor_uid) {
      const { data } = await supabaseClient
        .from('gbp_notificacoes_inscritos')
        .select('*')
        .eq('empresa_uid', params.empresa_uid)
        .eq('eleitor_uid', params.eleitor_uid);
      add(data as NotificacaoInscrito[] | null);
    }

    // Telefone: compara só os últimos 9 dígitos (ignora DDI/DDD/máscara)
    const fone9 = (params.telefone || '').replace(/\D/g, '').slice(-9);
    if (fone9.length >= 8) {
      const { data } = await supabaseClient
        .from('gbp_notificacoes_inscritos')
        .select('*')
        .eq('empresa_uid', params.empresa_uid)
        .not('telefone', 'is', null);
      add((data as NotificacaoInscrito[] | null)?.filter((i) =>
        (i.telefone || '').replace(/\D/g, '').slice(-9) === fone9
      ));
    }

    if (params.token) {
      const { data } = await supabaseClient
        .from('gbp_notificacoes_inscritos')
        .select('*')
        .eq('empresa_uid', params.empresa_uid)
        .eq('token', params.token);
      add(data as NotificacaoInscrito[] | null);
    }

    return [...encontrados.values()];
  }

  // Transfere o histórico de conversa dos duplicados para o canônico e remove
  // as linhas extras — a pessoa fica com UM cadastro e UMA conversa.
  private async fundirDuplicados(canonicoUid: string, duplicados: NotificacaoInscrito[]) {
    const extras = duplicados.filter((d) => d.uid !== canonicoUid).map((d) => d.uid);
    if (!extras.length) return;

    await supabaseClient
      .from('gbp_notificacoes_log')
      .update({ inscrito_uid: canonicoUid })
      .in('inscrito_uid', extras);

    await supabaseClient
      .from('gbp_notificacoes_inscritos')
      .delete()
      .in('uid', extras);
  }

  private primeiro<T>(...valores: (T | null | undefined)[]): T | null {
    return (valores.find((v) => v != null && v !== '') as T) ?? null;
  }

  async registrar(params: RegistrarInscritoParams) {
    // Mesma pessoa já cadastrada (token rotacionou ou novo convite): atualiza o
    // registro existente com o token atual em vez de criar um inscrito novo.
    const existentes = await this.buscarExistentes(params);
    if (existentes.length > 0) {
      const ordenados = [...existentes].sort(
        (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
      );
      const canonico = ordenados[0];
      const extras = ordenados.slice(1);

      if (extras.length) {
        await this.fundirDuplicados(canonico.uid, extras);
      }

      const { data: atualizado, error: updErr } = await supabaseClient
        .from('gbp_notificacoes_inscritos')
        .update({
          eleitor_uid: this.primeiro(params.eleitor_uid, canonico.eleitor_uid, ...extras.map((e) => e.eleitor_uid)),
          nome: this.primeiro(params.nome, canonico.nome, ...extras.map((e) => e.nome)),
          telefone: this.primeiro(params.telefone, canonico.telefone, ...extras.map((e) => e.telefone)),
          token: this.primeiro(params.token, canonico.token, ...extras.map((e) => e.token)),
          permissao: params.permissao,
          plataforma: navigator.platform || null,
          user_agent: navigator.userAgent,
          ativo: params.permissao === 'granted',
          atualizado_em: new Date().toISOString()
        })
        .eq('uid', canonico.uid)
        .select()
        .single();

      if (updErr) {
        throw new Error(`Erro ao atualizar inscrição: ${updErr.message}`);
      }
      return atualizado as NotificacaoInscrito;
    }

    const { data, error } = await supabaseClient
      .from('gbp_notificacoes_inscritos')
      .insert({
        empresa_uid: params.empresa_uid,
        eleitor_uid: params.eleitor_uid || null,
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
        // Pode haver linhas duplicadas com o mesmo token — atualiza todas e retorna a primeira
        const { data: atualizados, error: updateError } = await supabaseClient
          .from('gbp_notificacoes_inscritos')
          .update({
            nome: params.nome || null,
            telefone: params.telefone || null,
            eleitor_uid: params.eleitor_uid || null,
            permissao: params.permissao,
            ativo: params.permissao === 'granted',
            atualizado_em: new Date().toISOString()
          })
          .eq('empresa_uid', params.empresa_uid)
          .eq('token', params.token)
          .select();

        if (updateError) {
          throw new Error(`Erro ao atualizar inscrição: ${updateError.message}`);
        }
        if (!atualizados || atualizados.length === 0) {
          // Conflito de token, mas nenhuma linha atualizável — já está inscrito
          const jaRegistrado = new Error('Você já está inscrito neste dispositivo.') as any;
          jaRegistrado.code = 'JA_REGISTRADO';
          throw jaRegistrado;
        }
        // Mesmo token em mais de uma linha: funde tudo no mais antigo atualizado
        if (atualizados.length > 1) {
          const ordenados = [...atualizados].sort(
            (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
          );
          await this.fundirDuplicados(ordenados[0].uid, ordenados);
          return ordenados[0] as NotificacaoInscrito;
        }
        return atualizados[0] as NotificacaoInscrito;
      }
      if (error.code === '23505') {
        // Violação de unicidade sem token para atualizar — já está inscrito
        const jaRegistrado = new Error('Você já está inscrito neste dispositivo.') as any;
        jaRegistrado.code = 'JA_REGISTRADO';
        throw jaRegistrado;
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
