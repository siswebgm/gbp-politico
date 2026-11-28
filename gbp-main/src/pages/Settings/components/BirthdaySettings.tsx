import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { Loader2, Trash2, Save, MessageSquare, Plus, Tag } from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase';
import { useToast } from "../../../components/ui/use-toast";
import { useAuth } from '../../../providers/AuthProvider';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel
} from '../../../components/ui/alert-dialog';

const birthdaySchema = z.object({ saudacao_niver: z.boolean().default(true) });
type BirthdayFormData = z.infer<typeof birthdaySchema>;

interface ConteudoItem {
  uid?: string;
  tipo: 'texto' | 'imagem' | 'video' | 'audio';
  conteudo: string;
  bloco: number;
  ordem: number;
  ativo: boolean;
  isNew?: boolean;
  file?: File;
  previewUrl?: string;
  updated_at?: string;
}

interface Bloco {
  id: number;
  itens: ConteudoItem[];
  genero: string | null;
  ativo: boolean;
}

export function BirthdaySettings() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [blocoToDelete, setBlocoToDelete] = useState<number | null>(null);
  const company = useCompanyStore((state) => state.company);
  const { setValue, watch } = useForm<BirthdayFormData>({
    resolver: zodResolver(birthdaySchema),
    defaultValues: { saudacao_niver: true }
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const sub = watch((_, { type }) => { if (type === 'change') setHasUnsavedChanges(true); });
    return () => sub.unsubscribe();
  }, [watch]);

  useEffect(() => {
    if (blocos.some(b => b.itens.some(i => i.file))) setHasUnsavedChanges(true);
  }, [blocos]);

  const sanitizeFileName = (n: string) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9.]/g, '_').replace(/_+/g, '_').toLowerCase();

  const handleAddBloco = () => {
    const id = blocos.length > 0 ? Math.max(...blocos.map(b => b.id)) + 1 : 0;
    setBlocos(prev => [{
      id,
      itens: [{ tipo: 'texto', conteudo: '', bloco: id, ordem: 0, ativo: true, isNew: true }],
      genero: null, ativo: true
    }, ...prev]);
    setHasUnsavedChanges(true);
  };

  const removeBlocoFromState = (id: number) => {
    setBlocos(prev => {
      const b = prev.find(x => x.id === id);
      b?.itens.forEach(i => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
      return prev.filter(x => x.id !== id);
    });
    setHasUnsavedChanges(true);
  };

  const handleRemoveBloco = (id: number) => {
    const bloco = blocos.find(x => x.id === id);
    const existsInDb = !!bloco?.itens.some(i => i.uid);

    if (existsInDb) {
      setBlocoToDelete(id);
      return;
    }

    removeBlocoFromState(id);
  };

  const confirmRemoveBloco = async () => {
    const id = blocoToDelete;
    setBlocoToDelete(null);
    if (id === null) return;

    removeBlocoFromState(id);

    if (!company?.uid) return;
    try {
      const { error } = await supabaseClient.from('gbp_aniversario_conteudos')
        .delete()
        .eq('empresa_uid', company.uid)
        .eq('bloco', id);
      if (error) throw error;

      const newBlocos = blocos.filter(b => b.id !== id);
      await syncLegacyColumns(newBlocos);
      toast({ description: `✨ Bloco #${id + 1} excluído.`, variant: "success" });
    } catch (err) {
      console.error('Erro ao excluir bloco:', err);
      toast({ variant: "error", description: `Erro ao excluir bloco: ${err.message}` });
    }
  };

  const handleToggleBloco = (id: number) => {
    setBlocos(prev => prev.map(b => b.id === id ? { ...b, ativo: !b.ativo } : b));
    setHasUnsavedChanges(true);
  };

  const handleUpdateBloco = (id: number, field: 'genero', value: string | null) => {
    setBlocos(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    setHasUnsavedChanges(true);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<{ blocoId: number; tipo: 'imagem' | 'video' | 'audio' } | null>(null);

  const handleAddMediaClick = (blocoId: number, tipo: 'imagem' | 'video' | 'audio') => {
    pendingFileRef.current = { blocoId, tipo };
    const input = fileInputRef.current;
    if (input) {
      input.accept = tipo === 'imagem' ? '.jpg,.jpeg,.png,.gif,.webp,image/*' : `${tipo}/*`;
      input.click();
    }
  };

  const handleUpdateItem = (blocoId: number, idx: number, conteudo: string) => {
    setBlocos(prev => prev.map(b => {
      if (b.id !== blocoId) return b;
      return { ...b, itens: b.itens.map((item, i) => i === idx ? { ...item, conteudo, isNew: true } : item) };
    }));
    setHasUnsavedChanges(true);
  };

  // Variáveis disponíveis para inserção nas tags
  const variaveisDisponiveis = [
    { tag: '{nome}', label: 'Nome do Eleitor', cor: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
    { tag: '{saudacao}', label: 'Saudação (bom dia/tarde/noite)', cor: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
    { tag: '{cliente}', label: 'Gabinete / Mandato', cor: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
  ];

  const textareaRefs = useRef<Record<string, HTMLTextAreaElement>>({});

  const handleInsertTag = (blocoId: number, idx: number, tag: string) => {
    const key = `${blocoId}-${idx}`;
    const textarea = textareaRefs.current[key];
    const bloco = blocos.find(b => b.id === blocoId);
    const item = bloco?.itens[idx];
    if (!item) return;

    const textoAtual = item.conteudo || '';
    const start = textarea?.selectionStart ?? textoAtual.length;
    const end = textarea?.selectionEnd ?? textoAtual.length;

    const novoTexto = textoAtual.substring(0, start) + tag + textoAtual.substring(end);
    handleUpdateItem(blocoId, idx, novoTexto);

    setTimeout(() => {
      textarea?.focus();
      const novaPos = start + tag.length;
      textarea?.setSelectionRange(novaPos, novaPos);
    }, 0);
  };

  const handleFileSelect = (file: File, tipo: 'imagem' | 'video' | 'audio', blocoId: number, itemIdx?: number) => {
    try {
      if (file.size > 70 * 1024 * 1024) throw new Error('Arquivo muito grande. Máximo 70MB.');
      if (tipo === 'imagem') {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowed.includes(file.type)) throw new Error('Use JPG, PNG, GIF ou WEBP.');
      }
      const previewUrl = URL.createObjectURL(file);
      setBlocos(prev => prev.map(b => {
        if (b.id !== blocoId) return b;
        if (itemIdx !== undefined) {
          return { ...b, itens: b.itens.map((item, i) => i === itemIdx ? { ...item, file, previewUrl, isNew: true } : item) };
        }
        return { ...b, itens: [...b.itens, { tipo, conteudo: '', bloco: blocoId, ordem: 0, ativo: true, isNew: true, file, previewUrl }] };
      }));
      setHasUnsavedChanges(true);
    } catch (err) {
      toast({ variant: "error", description: `Erro: ${err.message}` });
      setError(err.message);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!company?.uid) return;
      try {
        setIsLoading(true);
        setError(null);

        const { data: emp } = await supabaseClient.from('gbp_empresas').select('saudacao_niver').eq('uid', company.uid).single();
        setValue('saudacao_niver', emp?.saudacao_niver ?? true);

        const { data: conteudos, error: cErr } = await supabaseClient
          .from('gbp_aniversario_conteudos')
          .select('*')
          .eq('empresa_uid', company.uid)
          .order('bloco').order('tipo').order('ordem');

        if (cErr) {
          // Fallback legado
          const { data: leg } = await supabaseClient.from('gbp_empresas')
            .select('texto_aniversario, imagem_aniversario, video_aniversario, audio_aniversario')
            .eq('uid', company.uid).single();
          if (leg) {
            const itens: ConteudoItem[] = [];
            if (leg.texto_aniversario) itens.push({ tipo: 'texto', conteudo: leg.texto_aniversario, bloco: 0, ordem: 0, ativo: true, isNew: true });
            if (leg.imagem_aniversario) itens.push({ tipo: 'imagem', conteudo: leg.imagem_aniversario, bloco: 0, ordem: 0, ativo: true, isNew: true });
            if (leg.video_aniversario) itens.push({ tipo: 'video', conteudo: leg.video_aniversario, bloco: 0, ordem: 0, ativo: true, isNew: true });
            if (leg.audio_aniversario) itens.push({ tipo: 'audio', conteudo: leg.audio_aniversario, bloco: 0, ordem: 0, ativo: true, isNew: true });
            if (itens.length) setBlocos([{ id: 0, itens, genero: null, ativo: true }]);
          }
        } else {
          const map = new Map<number, Bloco>();
          (conteudos || []).forEach((c: any) => {
            if (!map.has(c.bloco)) {
              map.set(c.bloco, { id: c.bloco, itens: [], genero: c.genero, ativo: c.ativo });
            }
            map.get(c.bloco)!.itens.push({
              uid: c.uid, tipo: c.tipo, conteudo: c.conteudo, bloco: c.bloco,
              ordem: c.ordem, ativo: c.ativo, genero: c.genero, isNew: false,
              updated_at: c.updated_at
            });
          });
          setBlocos(Array.from(map.values()).sort((a, b) => a.id - b.id));
        }
      } catch (err) {
        console.error('Erro ao carregar:', err);
        toast({ variant: "error", description: "Erro ao carregar configurações" });
        setError('Erro ao carregar');
      } finally {
        setIsLoading(false);
      }
    };
    load();
    return () => blocos.forEach(b => b.itens.forEach(i => i.previewUrl && URL.revokeObjectURL(i.previewUrl)));
  }, [company?.uid]);

  const [savingBloco, setSavingBloco] = useState<number | null>(null);
  const [testingBloco, setTestingBloco] = useState<number | null>(null);

  const getBucket = async () => {
    const { data: emp } = await supabaseClient.from('gbp_empresas').select('storage').eq('uid', company!.uid).single();
    if (!emp?.storage) throw new Error('Storage não configurado');
    return emp.storage;
  };

  // Faz upload dos arquivos do bloco e retorna itens com URLs públicas
  const persistBloco = async (bloco: Bloco): Promise<ConteudoItem[]> => {
    const bucket = await getBucket();
    const savedItens: ConteudoItem[] = [];
    for (const item of bloco.itens) {
      let conteudoFinal = item.conteudo;
      if (item.file) {
        const ts = Date.now();
        const fn = `${ts}_${sanitizeFileName(item.file.name)}`;
        const { error: upErr, data: upData } = await supabaseClient.storage.from(bucket).upload(fn, item.file, { cacheControl: '3600', upsert: false });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabaseClient.storage.from(bucket).getPublicUrl(upData.path);
        conteudoFinal = publicUrl;
      }
      savedItens.push({ ...item, conteudo: conteudoFinal, isNew: false, file: undefined });
    }

    await supabaseClient.from('gbp_aniversario_conteudos')
      .delete()
      .eq('empresa_uid', company!.uid)
      .eq('bloco', bloco.id);

    if (savedItens.length > 0) {
      const toInsert = savedItens.map((c, idx) => ({
        empresa_uid: company!.uid, tipo: c.tipo, conteudo: c.conteudo,
        bloco: bloco.id, ordem: idx, ativo: c.ativo, genero: bloco.genero
      }));
      const { error: insErr } = await supabaseClient.from('gbp_aniversario_conteudos').insert(toInsert);
      if (insErr) throw insErr;
    }
    return savedItens;
  };

  // Sincroniza colunas legadas do gbp_empresas com o primeiro bloco ativo
  const syncLegacyColumns = async (blocosState: Bloco[]) => {
    const primeiroBloco = blocosState.find(b => b.ativo) || blocosState[0];
    const url = (item?: ConteudoItem) => (!item || item.file ? null : (item.conteudo || null));
    const t = primeiroBloco?.itens.find(i => i.tipo === 'texto' && i.ativo);
    const img = primeiroBloco?.itens.find(i => i.tipo === 'imagem' && i.ativo);
    const vid = primeiroBloco?.itens.find(i => i.tipo === 'video' && i.ativo);
    const aud = primeiroBloco?.itens.find(i => i.tipo === 'audio' && i.ativo);

    const { error: syncErr } = await supabaseClient.from('gbp_empresas').update({
      texto_aniversario: t?.conteudo || null,
      imagem_aniversario: url(img),
      video_aniversario: url(vid),
      audio_aniversario: url(aud),
    }).eq('uid', company!.uid);
    if (syncErr) throw syncErr;
  };

  const handleSaveBloco = async (bloco: Bloco) => {
    if (!company?.uid) return;
    try {
      setError(null);
      setSavingBloco(bloco.id);
      const savedItens = await persistBloco(bloco);
      const updatedBloco = { ...bloco, itens: savedItens };
      const newBlocos = blocos.map(b => b.id === bloco.id ? updatedBloco : b);
      setBlocos(newBlocos);
      await syncLegacyColumns(newBlocos);
      setHasUnsavedChanges(newBlocos.some(b => b.itens.some(i => i.file)));
      toast({ description: `✨ Bloco #${bloco.id + 1} salvo com sucesso!`, variant: "success" });
    } catch (err) {
      console.error('Erro ao salvar bloco:', err);
      toast({ variant: "error", description: `Erro ao salvar bloco: ${err.message}` });
      setError('Erro ao salvar bloco');
    } finally {
      setSavingBloco(null);
    }
  };

  const handleTestBloco = async (bloco: Bloco) => {
    if (!company?.uid) return;
    try {
      setError(null);
      setTestingBloco(bloco.id);
      let itens = bloco.itens;
      let newBlocos = blocos;

      // Se houver arquivo novo, salva o bloco antes de testar (n8n precisa de URL pública)
      if (itens.some(i => i.file)) {
        const savedItens = await persistBloco(bloco);
        const updatedBloco = { ...bloco, itens: savedItens };
        newBlocos = blocos.map(b => b.id === bloco.id ? updatedBloco : b);
        setBlocos(newBlocos);
        await syncLegacyColumns(newBlocos);
        itens = savedItens;
      }

      const t = itens.find(i => i.tipo === 'texto' && i.ativo);
      const img = itens.find(i => i.tipo === 'imagem' && i.ativo);
      const vid = itens.find(i => i.tipo === 'video' && i.ativo);
      const aud = itens.find(i => i.tipo === 'audio' && i.ativo);

      const res = await fetch('https://whkn8n.guardia.work/webhook/gbp_disparo_aniversario_teste_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: { uid: user?.uid, email: user?.email, nome: user?.nome, nivel_acesso: user?.nivel_acesso, telefone: user?.telefone, contato: user?.contato || user?.telefone },
          company: { uid: company?.uid, nome: company?.nome, storage: company?.storage, plano: company?.plano, token: company?.token, porta: company?.porta, instancia: company?.instancia },
          texto_aniversario: t?.conteudo || '',
          imagem_aniversario: img?.conteudo || '',
          video_aniversario: vid?.conteudo || '',
          audio_aniversario: aud?.conteudo || '',
          saudacao_niver: watch('saudacao_niver'),
        }),
      });
      if (!res.ok) throw new Error('Erro ao testar');
      toast({ description: `✨ Teste do Bloco #${bloco.id + 1} enviado!`, variant: "success" });
    } catch (err) {
      toast({ variant: "error", description: `Erro: ${err.message}` });
      setError('Erro ao testar');
    } finally {
      setTestingBloco(null);
    }
  };

  const renderItem = (item: ConteudoItem, blocoId: number, idx: number) => {
    const icon = item.tipo === 'imagem' ? '🖼️' : item.tipo === 'video' ? '🎥' : item.tipo === 'audio' ? '🎵' : '📝';
    const label = item.tipo === 'imagem' ? 'Imagem' : item.tipo === 'video' ? 'Vídeo' : item.tipo === 'audio' ? 'Áudio' : 'Texto';
    const accept = item.tipo === 'imagem' ? '.jpg,.jpeg,.png,.gif,.webp,image/*' : `${item.tipo}/*`;

    return (
      <div key={idx} className={`border rounded-lg p-2 bg-white hover:bg-gray-50 transition-colors ${item.tipo !== 'texto' ? 'h-full flex flex-col' : ''}`}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">{icon}</span>
            <span className="text-xs font-medium text-gray-600">{label}</span>
          </div>
        </div>
        {item.tipo === 'texto' ? (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1">
              <Tag className="w-3 h-3 text-gray-400" />
              {variaveisDisponiveis.map(v => (
                <button key={v.tag} type="button" onClick={() => handleInsertTag(blocoId, idx, v.tag)}
                  title={v.label}
                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${v.cor}`}>
                  {v.tag}
                </button>
              ))}
            </div>
            <textarea
              ref={(el) => { if (el) textareaRefs.current[`${blocoId}-${idx}`] = el; }}
              value={item.conteudo} onChange={(e) => handleUpdateItem(blocoId, idx, e.target.value)} rows={6}
              className="w-full rounded border border-gray-200 p-2 text-xs resize-none focus:border-blue-400 focus:ring-blue-400 min-h-[120px]"
              placeholder="Digite o texto... Use as tags acima para inserir dados dinâmicos" />
          </div>
        ) : (
          <div className="space-y-2 flex-1 flex flex-col">
            {(item.previewUrl || item.conteudo) && (
              <div className="relative flex-1 flex items-center justify-center bg-gray-50 rounded border border-gray-200 min-h-[80px]">
                {item.tipo === 'imagem' && (
                  <img src={item.previewUrl || item.conteudo} alt="Preview" className="max-h-32 max-w-full object-contain rounded" />
                )}
                {item.tipo === 'video' && (
                  <video src={item.previewUrl || item.conteudo} controls className="max-h-32 max-w-full rounded" />
                )}
                {item.tipo === 'audio' && (
                  <div className="w-full p-2">
                    <audio src={item.previewUrl || item.conteudo} controls className="w-full h-8" />
                  </div>
                )}
                {item.file && (
                  <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] px-1 py-0.5 rounded">
                    Novo
                  </div>
                )}
              </div>
            )}
            <label className="cursor-pointer text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Plus className="w-3 h-3" />
              {item.file || item.conteudo ? 'Substituir arquivo' : 'Selecionar arquivo'}
              <input type="file" accept={accept} className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, item.tipo as 'imagem' | 'video' | 'audio', blocoId, idx); }} />
            </label>
          </div>
        )}
      </div>
    );
  };

  const renderBloco = (bloco: Bloco) => {
    const hasImg = bloco.itens.some(i => i.tipo === 'imagem');
    const hasVid = bloco.itens.some(i => i.tipo === 'video');
    const hasAud = bloco.itens.some(i => i.tipo === 'audio');
    const lastUpdate = bloco.itens
      .map(i => i.updated_at)
      .filter(Boolean)
      .sort()
      .pop();
    const formattedDate = lastUpdate
      ? new Date(lastUpdate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : null;

    return (
      <div className={`border rounded-xl transition-all ${bloco.ativo ? 'border-blue-200 shadow-sm' : 'border-gray-200 opacity-60'}`}>
        {/* Header do bloco */}
        <div className={`px-4 py-3 flex items-center justify-between ${bloco.ativo ? 'bg-blue-50' : 'bg-gray-100'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${bloco.ativo ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'}`}>
              {bloco.id + 1}
            </div>
            <span className="font-medium text-gray-800 text-sm">Bloco #{bloco.id + 1}</span>
            {!bloco.ativo && <span className="text-[10px] bg-gray-300 text-gray-600 px-1.5 py-0.5 rounded">Inativo</span>}
            {formattedDate && <span className="text-[10px] text-gray-400">· {formattedDate}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => handleToggleBloco(bloco.id)}
              className={`text-[11px] px-2 py-1 rounded transition-colors ${bloco.ativo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
              {bloco.ativo ? '✓ Ativo' : 'Inativo'}
            </button>
            <button type="button" onClick={() => handleRemoveBloco(bloco.id)} 
              className="text-red-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conteúdo do bloco */}
        <div className="p-4 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            {/* Texto - ocupa 3 colunas */}
            <div className="md:col-span-3">
              {bloco.itens.filter(i => i.tipo === 'texto').map(item => renderItem(item, bloco.id, bloco.itens.indexOf(item)))}
            </div>
            
            {/* Imagem/Vídeo - ocupa 1 coluna, mesma altura do texto */}
            <div className="md:col-span-1">
              {!hasImg && !hasVid && (
                <div className="flex flex-col gap-2 h-full min-h-[140px]">
                  <button type="button" onClick={() => handleAddMediaClick(bloco.id, 'imagem')}
                    className="flex-1 py-3 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all">
                    + Imagem
                  </button>
                  <button type="button" onClick={() => handleAddMediaClick(bloco.id, 'video')}
                    className="flex-1 py-3 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all">
                    + Vídeo
                  </button>
                </div>
              )}
              {hasImg && bloco.itens.filter(i => i.tipo === 'imagem').map(item => renderItem(item, bloco.id, bloco.itens.indexOf(item)))}
              {hasVid && bloco.itens.filter(i => i.tipo === 'video').map(item => renderItem(item, bloco.id, bloco.itens.indexOf(item)))}
            </div>
          </div>

          {/* Áudio */}
          <div className="mb-4">
            {!hasAud ? (
              <button type="button" onClick={() => handleAddMediaClick(bloco.id, 'audio')}
                className="w-full py-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2">
                <Plus className="w-3.5 h-3.5" />
                Adicionar áudio (opcional)
              </button>
            ) : (
              bloco.itens.filter(i => i.tipo === 'audio').map(item => renderItem(item, bloco.id, bloco.itens.indexOf(item)))
            )}
          </div>

          {/* Filtros e ações */}
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Gênero:</label>
              <select value={bloco.genero || ''} onChange={(e) => handleUpdateBloco(bloco.id, 'genero', e.target.value || null)}
                className="rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:ring-blue-400 bg-gray-50">
                <option value="">Todos</option>
                <option value="Masculino">♂ Masculino</option>
                <option value="Feminino">♀ Feminino</option>
                <option value="Outro">⚧ Outro</option>
              </select>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button type="button" onClick={() => handleTestBloco(bloco)} disabled={testingBloco === bloco.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                {testingBloco === bloco.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                Testar
              </button>
              <button type="button" onClick={() => handleSaveBloco(bloco)} disabled={savingBloco === bloco.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {savingBloco === bloco.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Salvar
              </button>
            </div>
            {bloco.genero && (
              <p className="w-full text-[10px] leading-tight bg-yellow-100 border border-yellow-300 text-yellow-800 rounded px-2 py-1">
                Este bloco será enviado apenas para o gênero <strong>{bloco.genero}</strong>.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 px-0 py-6">
      {/* Header informativo */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-400 p-4 rounded-r-lg shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Mensagem de Aniversário</h3>
            <p className="text-sm text-gray-600">
              Mensagens automáticas de aniversário
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            const pending = pendingFileRef.current;
            if (f && pending) {
              handleFileSelect(f, pending.tipo, pending.blocoId);
            }
            e.target.value = '';
            pendingFileRef.current = null;
          }}
        />
        {/* Seção de blocos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-medium text-gray-800 text-sm">Blocos de Mensagem</h4>
              <p className="text-xs text-gray-500 mt-0.5">{blocos.length} bloco{blocos.length !== 1 ? 's' : ''} configurado{blocos.length !== 1 ? 's' : ''}</p>
            </div>
            <button type="button" onClick={handleAddBloco}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap">
              <Plus className="w-4 h-4" />
              Adicionar Bloco
            </button>
          </div>
          
          <div className="p-6">
            {blocos.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Plus className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">Nenhum bloco adicionado</p>
                <p className="text-xs text-gray-400 mt-1">Clique em "Adicionar Bloco" para começar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {blocos.map(bloco => renderBloco(bloco))}
              </div>
            )}
          </div>
        </div>

      </form>

      <AlertDialog open={blocoToDelete !== null} onOpenChange={(open) => !open && setBlocoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Bloco #{blocoToDelete !== null ? blocoToDelete + 1 : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o Bloco #{blocoToDelete !== null ? blocoToDelete + 1 : ''} permanentemente? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveBloco} className="bg-red-600 hover:bg-red-700 text-white">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
