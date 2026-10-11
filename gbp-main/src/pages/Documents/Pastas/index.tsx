import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  BookOpen,
  ChevronLeft,
  DollarSign,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Link2,
  Loader2,
  Paperclip,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useAuth } from '../../../providers/AuthProvider';
import { useToast } from '../../../components/ui/use-toast';
import {
  DocumentoPasta,
  DocumentoTipo,
  ItemAnexo,
  PastaItemTipo,
  useDocumentosPastas,
  useDocumentosPastaItens,
} from '../../../hooks/useDocumentosPastas';
import { corPadrao, iconePadrao, pastaCores, pastaIcones } from '../components/pastaConfig';

const tipoConfig: Record<
  PastaItemTipo,
  { label: string; icon: any; badge: string; tabela: string | null }
> = {
  oficio: { label: 'Ofício', icon: FileText, badge: 'bg-blue-50 text-blue-700 ring-blue-200', tabela: 'gbp_oficios' },
  projeto_lei: { label: 'Projeto de Lei', icon: BookOpen, badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', tabela: 'gbp_projetos_lei' },
  requerimento: { label: 'Requerimento', icon: FileSpreadsheet, badge: 'bg-violet-50 text-violet-700 ring-violet-200', tabela: 'gbp_requerimentos' },
  emenda: { label: 'Emenda', icon: DollarSign, badge: 'bg-amber-50 text-amber-700 ring-amber-200', tabela: 'gbp_emendas_parlamentares' },
  livre: { label: 'Documento', icon: FilePlus2, badge: 'bg-gray-100 text-gray-700 ring-gray-300', tabela: null },
};

// Rótulo amigável de um documento conforme o tipo
function docLabel(tipo: DocumentoTipo, d: any): { titulo: string; subtitulo: string } {
  switch (tipo) {
    case 'oficio':
      return {
        titulo: d.numero_oficio ? `Ofício ${d.numero_oficio}` : 'Ofício',
        subtitulo: d.requerente_nome || '-',
      };
    case 'projeto_lei':
      return {
        titulo: d.titulo || `PL ${d.numero || ''}/${d.ano || ''}`,
        subtitulo: d.autor || '-',
      };
    case 'requerimento':
      return {
        titulo: d.titulo || `Requerimento ${d.numero || ''}`,
        subtitulo: d.solicitante || '-',
      };
    case 'emenda':
      return {
        titulo: `Emenda ${d.numero_emenda || ''}${d.ano ? `/${d.ano}` : ''}`,
        subtitulo: d.beneficiario || '-',
      };
  }
}

const selectsPorTipo: Record<DocumentoTipo, string> = {
  oficio: 'uid, numero_oficio, requerente_nome, created_at',
  projeto_lei: 'uid, numero, ano, titulo, autor, created_at',
  requerimento: 'uid, numero, titulo, solicitante, created_at',
  emenda: 'uid, numero_emenda, ano, beneficiario, created_at',
};

interface DocResolvido {
  itemUid: string;
  tipo: PastaItemTipo;
  documentoUid: string | null;
  titulo: string;
  subtitulo: string;
  arquivos: ItemAnexo[];
  created_at: string;
}

export function PastaDocumentos() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const company = useCompanyStore((state) => state.company);
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.nivel_acesso === 'admin';

  const { excluirPasta } = useDocumentosPastas();
  const { itens, isLoading, adicionarItem, adicionarItemLivre, removerItem } = useDocumentosPastaItens(uid);

  const [pasta, setPasta] = useState<DocumentoPasta | null>(null);
  const [docsResolvidos, setDocsResolvidos] = useState<DocResolvido[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [itemRemovendo, setItemRemovendo] = useState<DocResolvido | null>(null);
  const [pagina, setPagina] = useState(1);

  const ITENS_POR_PAGINA = 20;
  const itensVisiveis = docsResolvidos.slice(0, pagina * ITENS_POR_PAGINA);
  const restantes = docsResolvidos.length - itensVisiveis.length;

  // Carrega a pasta
  useEffect(() => {
    if (!uid || !company?.uid) return;
    supabaseClient
      .from('gbp_documentos_pastas')
      .select('*')
      .eq('uid', uid)
      .eq('empresa_uid', company.uid)
      .single()
      .then(({ data }) => setPasta(data as DocumentoPasta | null));
  }, [uid, company?.uid]);

  // Resolve título/subtítulo dos documentos vinculados
  useEffect(() => {
    async function resolver() {
      if (itens.length === 0) {
        setDocsResolvidos([]);
        return;
      }
      // Apenas itens vinculados (documento_uid preenchido) precisam ser resolvidos
      const porTipo: Record<string, string[]> = {};
      itens.forEach((i) => {
        if (!i.documento_uid) return;
        porTipo[i.documento_tipo] = porTipo[i.documento_tipo] || [];
        porTipo[i.documento_tipo].push(i.documento_uid);
      });

      const mapa = new Map<string, any>();
      await Promise.all(
        (Object.keys(porTipo) as DocumentoTipo[]).map(async (tipo) => {
          const tabela = tipoConfig[tipo].tabela;
          if (!tabela) return;
          let q = supabaseClient
            .from(tabela)
            .select(selectsPorTipo[tipo])
            .in('uid', porTipo[tipo]);
          if (tipo !== 'oficio') q = q.is('deleted_at', null);
          const { data } = await q;
          (data || []).forEach((d: any) => mapa.set(d.uid, { tipo, d }));
        })
      );

      setDocsResolvidos(
        itens.map((i) => {
          // Item livre: usa título/observação gravados no próprio item
          let rotulo: { titulo: string; subtitulo: string };
          if (!i.documento_uid) {
            rotulo = { titulo: i.titulo || 'Documento', subtitulo: i.observacao || '-' };
          } else {
            const doc = mapa.get(i.documento_uid);
            rotulo = doc ? docLabel(doc.tipo, doc.d) : { titulo: 'Documento removido', subtitulo: '-' };
          }
          return {
            itemUid: i.uid,
            tipo: i.documento_tipo,
            documentoUid: i.documento_uid,
            titulo: rotulo.titulo,
            subtitulo: rotulo.subtitulo,
            arquivos:
              i.arquivos && i.arquivos.length > 0
                ? i.arquivos
                : i.arquivo_url
                  ? [{ url: i.arquivo_url, nome: i.arquivo_nome || 'Anexo', path: i.arquivo_path || '' }]
                  : [],
            created_at: i.created_at,
          };
        })
      );
    }
    resolver();
  }, [itens]);

  const handleExcluirPasta = async () => {
    try {
      // Remove anexos dos itens livres do storage (a cascade do banco não apaga arquivos)
      const bucket = (company as any)?.storage || 'gbp_oficios';
      const paths = itens.flatMap((i) => [
        ...(i.arquivos || []).map((a) => a.path),
        ...(i.arquivo_path ? [i.arquivo_path] : []),
      ]);
      if (paths.length > 0) {
        await supabaseClient.storage.from(bucket).remove(paths).catch(() => {});
      }
      await excluirPasta(uid!);
      toast({ title: 'Pasta excluída', variant: 'success' });
      navigate('/app/documentos');
    } catch {
      toast({ title: 'Erro ao excluir pasta', variant: 'destructive' });
    }
  };

  const cor = pastaCores[pasta?.cor || corPadrao] || pastaCores[corPadrao];
  const Icone = pastaIcones[pasta?.icone || iconePadrao]?.icon || FolderOpen;

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex-1 py-2 md:py-6 px-4 flex flex-col">
        <div className="flex flex-col space-y-4 flex-1">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex items-center gap-3">
            <button
              onClick={() => navigate('/app/documentos')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-6 h-6 text-gray-500" />
            </button>
            <div className={`p-2.5 rounded-xl ${cor.bg} ring-1 ring-black/5`}>
              <Icone className={`w-6 h-6 ${cor.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {pasta?.nome || 'Pasta'}
              </h1>
              {pasta?.descricao && (
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{pasta.descricao}</p>
              )}
            </div>
            <span className="text-sm text-gray-400 shrink-0">
              {itens.length} {itens.length === 1 ? 'documento' : 'documentos'}
            </span>
            <button
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
            {isAdmin && (
              <button
                onClick={() => setConfirmarExclusao(true)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md"
                title="Excluir pasta"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Lista — ocupa toda a altura restante da página */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex-1 flex flex-col">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : docsResolvidos.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Pasta vazia. Clique em <strong>Adicionar</strong> para vincular documentos.
                </p>
              </div>
            ) : (
              <>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {itensVisiveis.map((doc) => {
                  const cfg = tipoConfig[doc.tipo];
                  const Icon = cfg.icon;
                  return (
                    <li
                      key={doc.itemUid}
                      className="group flex items-center gap-3 py-3 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                    >
                      {/* Tile do ícone — mesma linguagem visual dos cards */}
                      <div className={`p-2.5 rounded-xl ring-1 ring-inset shrink-0 ${cfg.badge}`} title={cfg.label}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {doc.titulo}
                        </span>
                        <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="truncate">{doc.subtitulo !== '-' ? doc.subtitulo : cfg.label}</span>
                          {doc.arquivos.map((anexo) => (
                            <a
                              key={anexo.path || anexo.url}
                              href={anexo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 shrink-0 transition-colors"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span className="max-w-[140px] truncate">{anexo.nome}</span>
                            </a>
                          ))}
                        </span>
                      </span>

                      <span className="text-xs text-gray-400 shrink-0 hidden sm:block">
                        {format(new Date(doc.created_at), 'dd/MM/yyyy')}
                      </span>
                      <button
                        onClick={() => setItemRemovendo(doc)}
                        className="p-1.5 text-gray-300 group-hover:text-gray-400 hover:!text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md shrink-0 transition-colors"
                        title="Remover da pasta"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              {restantes > 0 && (
                <div className="pt-4 flex justify-center">
                  <button
                    onClick={() => setPagina((p) => p + 1)}
                    className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    Mostrar mais {restantes > ITENS_POR_PAGINA ? ITENS_POR_PAGINA : restantes} de {restantes} restantes
                  </button>
                </div>
              )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal adicionar documentos */}
      {pickerOpen && (
        <AdicionarDocumentosModal
          empresaUid={company!.uid}
          itensExistentes={itens
            .filter((i) => i.documento_uid)
            .map((i) => `${i.documento_tipo}:${i.documento_uid}`)}
          isAdmin={isAdmin}
          onAdd={async (tipo, docUid) => {
            await adicionarItem(tipo, docUid);
          }}
          onAddLivre={async (item) => {
            await adicionarItemLivre(item);
            toast({ title: 'Documento adicionado à pasta', variant: 'success' });
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* Confirmação de remoção de item */}
      {itemRemovendo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setItemRemovendo(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Remover documento?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <strong className="text-gray-700 dark:text-gray-200">{itemRemovendo.titulo}</strong> será removido desta pasta.
              {itemRemovendo.documentoUid
                ? ' O documento original não será apagado — apenas o vínculo.'
                : itemRemovendo.arquivos.length > 0
                  ? ` O documento e seus ${itemRemovendo.arquivos.length} anexo(s) serão apagados permanentemente.`
                  : ' O documento será apagado permanentemente.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setItemRemovendo(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const item = itemRemovendo;
                  setItemRemovendo(null);
                  try {
                    await removerItem(item.itemUid);
                  } catch {
                    toast({ title: 'Erro ao remover documento', variant: 'destructive' });
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de exclusão */}
      {confirmarExclusao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmarExclusao(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Excluir pasta?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Documentos dos módulos apenas perdem o vínculo. Documentos criados nesta pasta{' '}
              <strong>serão apagados permanentemente</strong>, junto com seus anexos.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmarExclusao(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleExcluirPasta}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Modal para escolher documentos e adicionar à pasta ----

interface PickerProps {
  empresaUid: string;
  itensExistentes: string[];
  isAdmin: boolean;
  onAdd: (tipo: DocumentoTipo, documentoUid: string) => Promise<void>;
  onAddLivre: (item: { titulo: string; observacao?: string; tipo: PastaItemTipo; arquivos?: File[] }) => Promise<void>;
  onClose: () => void;
}

function AdicionarDocumentosModal({ empresaUid, itensExistentes, isAdmin, onAdd, onAddLivre, onClose }: PickerProps) {
  const { toast } = useToast();
  const [modo, setModo] = useState<'novo' | 'vincular'>('novo');

  // ---- modo "Criar novo" ----
  const tiposLivre = useMemo(() => (Object.keys(tipoConfig) as PastaItemTipo[]), []);
  const [livreTipo, setLivreTipo] = useState<PastaItemTipo>('livre');
  const [livreTitulo, setLivreTitulo] = useState('');
  const [livreObservacao, setLivreObservacao] = useState('');
  const [livreArquivos, setLivreArquivos] = useState<File[]>([]);
  const [salvandoLivre, setSalvandoLivre] = useState(false);
  const arquivoInputRef = useRef<HTMLInputElement>(null);

  const MAX_ANEXOS = 3;

  const salvarLivre = async () => {
    if (!livreTitulo.trim()) return;
    setSalvandoLivre(true);
    try {
      await onAddLivre({ titulo: livreTitulo, observacao: livreObservacao, tipo: livreTipo, arquivos: livreArquivos });
      setLivreTitulo('');
      setLivreObservacao('');
      setLivreArquivos([]);
      if (arquivoInputRef.current) arquivoInputRef.current.value = '';
      onClose();
    } catch (err: any) {
      console.error('[pastas] erro ao adicionar documento livre:', err);
      toast({
        title: 'Erro ao adicionar documento',
        description: err?.code === 'PGRST204'
          ? 'Execute o script alter_documentos_pasta_itens_livre.sql no banco.'
          : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSalvandoLivre(false);
    }
  };

  // ---- modo "Vincular existente" ----
  const tiposDisponiveis = useMemo(
    () =>
      (Object.keys(tipoConfig) as PastaItemTipo[]).filter(
        (t): t is DocumentoTipo => tipoConfig[t].tabela !== null && (isAdmin || t === 'oficio')
      ),
    [isAdmin]
  );
  const [tipoAtivo, setTipoAtivo] = useState<DocumentoTipo>(tiposDisponiveis[0]);
  const [busca, setBusca] = useState('');
  const [docs, setDocs] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [adicionando, setAdicionando] = useState<string | null>(null);

  const carregarDocs = useCallback(async () => {
    const tabela = tipoConfig[tipoAtivo].tabela;
    if (!tabela) {
      setDocs([]);
      return;
    }
    setCarregando(true);
    try {
      let q = supabaseClient
        .from(tabela)
        .select(selectsPorTipo[tipoAtivo])
        .eq('empresa_uid', empresaUid)
        .order('created_at', { ascending: false })
        .limit(100);
      if (tipoAtivo !== 'oficio') q = q.is('deleted_at', null);
      const { data } = await q;
      setDocs(data || []);
    } finally {
      setCarregando(false);
    }
  }, [empresaUid, tipoAtivo]);

  useEffect(() => {
    carregarDocs();
  }, [carregarDocs]);

  const filtrados = docs.filter((d) => {
    if (itensExistentes.includes(`${tipoAtivo}:${d.uid}`)) return false;
    if (!busca.trim()) return true;
    const { titulo, subtitulo } = docLabel(tipoAtivo, d);
    const termo = busca.toLowerCase();
    return titulo.toLowerCase().includes(termo) || subtitulo.toLowerCase().includes(termo);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-5 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Adicionar documento</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Alternador de modo */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setModo('novo')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              modo === 'novo'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            Criar novo
          </button>
          <button
            onClick={() => setModo('vincular')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              modo === 'vincular'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            Vincular existente
          </button>
        </div>

        {modo === 'novo' ? (
          /* ---- Criar documento livre ---- */
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tipo</label>
              <div className="flex gap-2 flex-wrap">
                {tiposLivre.map((tipo) => {
                  const cfg = tipoConfig[tipo];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={tipo}
                      onClick={() => setLivreTipo(tipo)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        livreTipo === tipo
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={livreTitulo}
                onChange={(e) => setLivreTitulo(e.target.value)}
                placeholder="Ex: Ata da reunião com lideranças"
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Observações</label>
              <textarea
                value={livreObservacao}
                onChange={(e) => setLivreObservacao(e.target.value)}
                placeholder="Anotações, detalhes, contexto..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Anexos (até 3) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Anexos <span className="text-xs font-normal text-gray-400">(até {MAX_ANEXOS})</span>
              </label>
              <input
                ref={arquivoInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  const selecionados = Array.from(e.target.files || []);
                  setLivreArquivos((prev) => [...prev, ...selecionados].slice(0, MAX_ANEXOS));
                  e.target.value = '';
                }}
                className="hidden"
              />
              <div className="flex flex-wrap gap-2">
                {livreArquivos.map((arq, i) => (
                  <div key={`${arq.name}-${i}`} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 rounded-md max-w-full">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-xs text-gray-700 dark:text-gray-200 truncate max-w-[160px]">{arq.name}</span>
                    <button
                      type="button"
                      onClick={() => setLivreArquivos((prev) => prev.filter((_, j) => j !== i))}
                      className="p-0.5 text-gray-400 hover:text-red-500 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {livreArquivos.length < MAX_ANEXOS && (
                  <button
                    type="button"
                    onClick={() => arquivoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    Anexar arquivo
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={salvarLivre}
              disabled={!livreTitulo.trim() || salvandoLivre}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {salvandoLivre ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Adicionar à pasta
            </button>
          </div>
        ) : (
          /* ---- Vincular documento existente ---- */
          <>
            <div className="flex gap-2 mb-3 flex-wrap">
              {tiposDisponiveis.map((tipo) => {
                const cfg = tipoConfig[tipo];
                const Icon = cfg.icon;
                return (
                  <button
                    key={tipo}
                    onClick={() => setTipoAtivo(tipo)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      tipoAtivo === tipo
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar documento..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
              {carregando ? (
                <div className="flex items-center justify-center py-10 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : filtrados.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  Nenhum documento disponível.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filtrados.map((d) => {
                    const { titulo, subtitulo } = docLabel(tipoAtivo, d);
                    const key = `${tipoAtivo}:${d.uid}`;
                    return (
                      <li key={key} className="flex items-center gap-3 py-2.5">
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">
                            {titulo}
                          </span>
                          <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                            {subtitulo}
                          </span>
                        </span>
                        <button
                          disabled={adicionando === key}
                          onClick={async () => {
                            setAdicionando(key);
                            try {
                              await onAdd(tipoAtivo, d.uid);
                            } catch (err) {
                              console.error('[pastas] erro ao vincular:', err);
                              toast({ title: 'Erro ao vincular documento', variant: 'destructive' });
                            } finally {
                              setAdicionando(null);
                            }
                          }}
                          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 disabled:opacity-50"
                        >
                          {adicionando === key ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                          Adicionar
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
