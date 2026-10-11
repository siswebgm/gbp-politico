import { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';
import { useAuthStore } from '../store/useAuthStore';

export type DocumentoTipo = 'oficio' | 'projeto_lei' | 'requerimento' | 'emenda';

// 'livre' = documento criado diretamente na pasta (título + observação), sem vínculo
export type PastaItemTipo = DocumentoTipo | 'livre';

export interface DocumentoPasta {
  uid: string;
  empresa_uid: string;
  nome: string;
  descricao: string | null;
  cor: string;
  icone: string;
  created_by: string | null;
  created_at: string;
}

export interface ItemAnexo {
  url: string;
  nome: string;
  path: string;
}

export interface DocumentoPastaItem {
  uid: string;
  pasta_uid: string;
  empresa_uid: string;
  documento_tipo: PastaItemTipo;
  documento_uid: string | null;
  titulo: string | null;
  observacao: string | null;
  arquivo_url: string | null;   // legado
  arquivo_nome: string | null;  // legado
  arquivo_path: string | null;  // legado
  arquivos: ItemAnexo[] | null;
  created_at: string;
}

interface NovaPastaInput {
  nome: string;
  descricao?: string;
  cor: string;
  icone: string;
}

interface PastasState {
  pastas: DocumentoPasta[];
  contagens: Record<string, number>;
  isLoading: boolean;
  empresaUid: string | null;
  canalAtivo: boolean;
  carregar: (empresaUid: string) => Promise<void>;
  criarPasta: (empresaUid: string, userUid: string | null, pasta: NovaPastaInput) => Promise<DocumentoPasta | null>;
  excluirPasta: (pastaUid: string) => Promise<void>;
  inscrever: (empresaUid: string) => void;
}

// Store compartilhada: todos os componentes veem o mesmo estado
// (criar uma pasta no modal atualiza os cards na hora)
const usePastasStore = create<PastasState>((set, get) => ({
  pastas: [],
  contagens: {},
  isLoading: true,
  empresaUid: null,
  canalAtivo: false,

  carregar: async (empresaUid) => {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_documentos_pastas')
        .select('*')
        .eq('empresa_uid', empresaUid)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const lista = (data || []) as DocumentoPasta[];
      set({ pastas: lista, empresaUid, isLoading: false });

      if (lista.length > 0) {
        const { data: itens } = await supabaseClient
          .from('gbp_documentos_pasta_itens')
          .select('pasta_uid')
          .eq('empresa_uid', empresaUid);
        const mapa: Record<string, number> = {};
        (itens || []).forEach((i: any) => {
          mapa[i.pasta_uid] = (mapa[i.pasta_uid] || 0) + 1;
        });
        set({ contagens: mapa });
      } else {
        set({ contagens: {} });
      }
    } catch (e) {
      console.warn('[pastas] erro ao carregar:', e);
      set({ isLoading: false });
    }
  },

  criarPasta: async (empresaUid, userUid, pasta) => {
    const { data, error } = await supabaseClient
      .from('gbp_documentos_pastas')
      .insert({
        empresa_uid: empresaUid,
        nome: pasta.nome.trim(),
        descricao: pasta.descricao?.trim() || null,
        cor: pasta.cor,
        icone: pasta.icone,
        created_by: userUid,
      })
      .select()
      .single();
    if (error) throw error;
    // Atualização otimista: reflete na hora, mesmo se o realtime não estiver ativo
    set({ pastas: [...get().pastas, data as DocumentoPasta] });
    return data as DocumentoPasta;
  },

  excluirPasta: async (pastaUid) => {
    const { error } = await supabaseClient
      .from('gbp_documentos_pastas')
      .delete()
      .eq('uid', pastaUid);
    if (error) throw error;
    set({ pastas: get().pastas.filter((p) => p.uid !== pastaUid) });
  },

  // Inscreve no Realtime uma única vez por empresa
  inscrever: (empresaUid) => {
    const { canalAtivo } = get();
    if (canalAtivo && get().empresaUid === empresaUid) return;

    supabaseClient
      .channel(`documentos-pastas-${empresaUid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gbp_documentos_pastas', filter: `empresa_uid=eq.${empresaUid}` },
        () => get().carregar(empresaUid)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gbp_documentos_pasta_itens', filter: `empresa_uid=eq.${empresaUid}` },
        () => get().carregar(empresaUid)
      )
      .subscribe();

    set({ canalAtivo: true });
  },
}));

export function useDocumentosPastas() {
  const company = useCompanyStore((state) => state.company);
  const { user } = useAuthStore();
  const store = usePastasStore();

  useEffect(() => {
    if (!company?.uid) return;
    store.carregar(company.uid);
    store.inscrever(company.uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.uid]);

  const criarPasta = useCallback(
    (pasta: NovaPastaInput) => {
      if (!company?.uid) return Promise.resolve(null);
      return store.criarPasta(company.uid, user?.uid || null, pasta);
    },
    [company?.uid, user?.uid, store]
  );

  return { ...store, criarPasta };
}

// ---- Itens de uma pasta específica ----

export function useDocumentosPastaItens(pastaUid: string | undefined) {
  const company = useCompanyStore((state) => state.company);
  const { user } = useAuthStore();
  const [itens, setItens] = useState<DocumentoPastaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!company?.uid || !pastaUid) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('gbp_documentos_pasta_itens')
        .select('*')
        .eq('pasta_uid', pastaUid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItens((data || []) as DocumentoPastaItem[]);
    } catch (e) {
      console.warn('[pastas] erro ao carregar itens:', e);
    } finally {
      setIsLoading(false);
    }
  }, [company?.uid, pastaUid]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Realtime: reflete itens adicionados/removidos em outra aba ou por outro usuário
  useEffect(() => {
    if (!pastaUid) return;
    const channel = supabaseClient
      .channel(`pasta-itens-${pastaUid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gbp_documentos_pasta_itens', filter: `pasta_uid=eq.${pastaUid}` },
        () => carregar()
      )
      .subscribe();
    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [pastaUid, carregar]);

  const adicionarItem = useCallback(
    async (documentoTipo: DocumentoTipo, documentoUid: string) => {
      if (!company?.uid || !pastaUid) return;
      const { error } = await supabaseClient
        .from('gbp_documentos_pasta_itens')
        .insert({
          pasta_uid: pastaUid,
          empresa_uid: company.uid,
          documento_tipo: documentoTipo,
          documento_uid: documentoUid,
          created_by: user?.uid || null,
        });
      if (error) {
        // Violação de unique = já está na pasta; ignora silenciosamente
        if (error.code === '23505') return;
        throw error;
      }
      await carregar();
    },
    [company?.uid, pastaUid, user?.uid, carregar]
  );

  // Item livre: documento criado na pasta (sem vínculo com módulo existente)
  // Aceita até 3 anexos (arquivos enviados para o storage da empresa)
  const adicionarItemLivre = useCallback(
    async (item: { titulo: string; observacao?: string; tipo: PastaItemTipo; arquivos?: File[] }) => {
      if (!company?.uid || !pastaUid) return;

      const anexos: ItemAnexo[] = [];
      const bucket = (company as any)?.storage || 'gbp_oficios';

      for (const file of (item.arquivos || []).slice(0, 3)) {
        const nomeLimpo = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const path = `${company.uid}/pastas/${pastaUid}/${Date.now()}_${nomeLimpo}`;
        const { error: uploadError } = await supabaseClient.storage
          .from(bucket)
          .upload(path, file, { cacheControl: '3600' });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabaseClient.storage
          .from(bucket)
          .getPublicUrl(path);
        anexos.push({ url: publicUrl, nome: file.name, path });
      }

      const { error } = await supabaseClient
        .from('gbp_documentos_pasta_itens')
        .insert({
          pasta_uid: pastaUid,
          empresa_uid: company.uid,
          documento_tipo: item.tipo,
          documento_uid: null,
          titulo: item.titulo.trim(),
          observacao: item.observacao?.trim() || null,
          arquivos: anexos,
          created_by: user?.uid || null,
        });
      if (error) throw error;
      await carregar();
    },
    [company, pastaUid, user?.uid, carregar]
  );

  const removerItem = useCallback(
    async (itemUid: string) => {
      // Remove todos os anexos do storage antes de apagar o registro
      const item = itens.find((i) => i.uid === itemUid);
      if (item) {
        const bucket = (company as any)?.storage || 'gbp_oficios';
        const paths = [
          ...(item.arquivos || []).map((a) => a.path),
          ...(item.arquivo_path ? [item.arquivo_path] : []),
        ];
        if (paths.length > 0) {
          await supabaseClient.storage.from(bucket).remove(paths).catch(() => {});
        }
      }

      const { error } = await supabaseClient
        .from('gbp_documentos_pasta_itens')
        .delete()
        .eq('uid', itemUid);
      if (error) throw error;
      // Atualização otimista
      setItens((prev) => prev.filter((i) => i.uid !== itemUid));
    },
    [itens, company]
  );

  return { itens, isLoading, carregar, adicionarItem, adicionarItemLivre, removerItem };
}
