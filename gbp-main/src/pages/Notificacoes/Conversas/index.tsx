import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Send, ArrowLeft, MessageCircle, FileText, Download, Search, Smile,
  Maximize2, Minimize2, MoreVertical, Tag, Check,
  Paperclip, Loader2, PlayCircle, Music, X
} from 'lucide-react';
import { useCompanyStore } from '../../../store/useCompanyStore';
import {
  notificationLogsService, MidiaAnexo, RespostaItem
} from '../../../services/notificationLogs';
import { notificationService } from '../../../services/notificationService';
import { supabaseClient } from '../../../lib/supabase';
import { toast } from 'react-toastify';

const ACEITA_MIDIA = 'image/*,video/*,audio/*,application/pdf';

interface AnexoResp {
  file: File;
  tipo: MidiaAnexo['tipo'];
  preview: string;
}

interface MsgTimeline extends RespostaItem {
  de: 'destinatario' | 'admin';
}

// Etiquetas de gerenciamento do atendimento
const ETIQUETAS = [
  { id: 'pendente', nome: 'Pendente', cor: 'bg-amber-100 text-amber-800', dot: 'bg-amber-400' },
  { id: 'em_atendimento', nome: 'Em atendimento', cor: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
  { id: 'urgente', nome: 'Urgente', cor: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
  { id: 'aguardando', nome: 'Aguardando resposta', cor: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500' },
  { id: 'resolvido', nome: 'Resolvido', cor: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  { id: 'arquivado', nome: 'Arquivado', cor: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
] as const;

const etiquetaInfo = (id: string) => ETIQUETAS.find((e) => e.id === id);

// Emojis mais comuns (insere no input de resposta)
const EMOJIS = [
  '😀','😁','😂','🤣','😊','😍','😘','😜','🤔','🤝','🙏','👍','👎','👏','💪','✌️',
  '🤙','👋','✅','❌','⚠️','❤️','💙','💚','🔥','⭐','🎉','🎊','💡','📌','📅','🕐',
  '📍','🚗','🏠','🏢','📞','📧','📝','🗳️','🇧🇷','💰','📊','📈','😢','😡','🤗','😴'
];

// Caixa de entrada das respostas das notificações: o admin vê cada conversa
// e pode responder com texto + anexos (o destinatário recebe push).
export default function ConversasNotificacoes() {
  const { company } = useCompanyStore();

  const [conversas, setConversas] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [ativa, setAtiva] = useState<any | null>(null);
  const [resposta, setResposta] = useState('');
  const [emojiAberto, setEmojiAberto] = useState(false);
  const [menuOpcoes, setMenuOpcoes] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [anexos, setAnexos] = useState<AnexoResp[]>([]);
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [alturaCard, setAlturaCard] = useState<number | null>(null);

  // Mede o espaço livre abaixo do card e usa como altura — preenche até o fim sem scroll
  useEffect(() => {
    const medir = () => {
      const el = cardRef.current;
      if (!el) return;
      const topo = el.getBoundingClientRect().top;
      // Limite: fundo da área de conteúdo (main), não a viewport
      const main = el.closest('main');
      const fundo = main ? main.getBoundingClientRect().bottom : window.innerHeight;
      // -16px: altura toda, mas sem encostar no fim
      setAlturaCard(Math.max(400, Math.floor(fundo - topo - 16)));
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [ativa?.uid, fullscreen]);

  const carregar = async () => {
    if (!company?.uid) return;
    setLoading(true);
    try {
      const dados = await notificationLogsService.listarConversas(company.uid);
      setConversas(dados);
      if (ativa) {
        const atual = dados.find((d) => d.uid === ativa.uid);
        if (atual) setAtiva(atual);
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, [company?.uid]);
  // Scroll só no container de mensagens (scrollIntoView rolava a página inteira)
  useEffect(() => {
    const el = msgsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ativa]);

  // Som curto ao chegar resposta nova
  const beep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch { /* sem áudio */ }
  };

  // Tempo real: qualquer atualização no log recarrega a caixa de entrada
  const contagemRef = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!company?.uid) return;
    const channel = supabaseClient
      .channel('conversas-notificacoes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'gbp_notificacoes_log',
        filter: `empresa_uid=eq.${company.uid}`
      }, (payload: any) => {
        const novo = payload.new;
        // Beep só quando chega resposta nova do destinatário
        const resp = Array.isArray(novo?.respostas) ? novo.respostas : [];
        const qtd = resp.length;
        const anterior = contagemRef.current[novo?.uid] ?? qtd;
        if (qtd > anterior) {
          beep();
          toast.info('Nova resposta recebida');
        }
        contagemRef.current[novo?.uid] = qtd;
        carregar();
      })
      .subscribe();
    return () => { supabaseClient.removeChannel(channel); };
  }, [company?.uid]);

  const hora = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

  const dataHora = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const hoje = new Date();
    const mesmoDia = d.toDateString() === hoje.toDateString();
    if (mesmoDia) return hora(iso);
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);
    if (d.toDateString() === ontem.toDateString()) return 'Ontem ' + hora(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + hora(iso);
  };

  // Separador de data estilo WhatsApp (Hoje / Ontem / data)
  const rotuloDia = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const hoje = new Date();
    if (d.toDateString() === hoje.toDateString()) return 'Hoje';
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);
    if (d.toDateString() === ontem.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const mesmoDia = (a?: string | null, b?: string | null) =>
    a && b && new Date(a).toDateString() === new Date(b).toDateString();

  const detectarTipo = (file: File): MidiaAnexo['tipo'] | null => {
    if (file.type.startsWith('image/')) return 'imagem';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
    return null;
  };

  const handleAnexos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const novos: AnexoResp[] = [];
    for (const file of files) {
      const tipo = detectarTipo(file);
      if (tipo) novos.push({ file, tipo, preview: URL.createObjectURL(file) });
    }
    setAnexos((prev) => [...prev, ...novos]);
    e.target.value = '';
  };

  // Monta a linha do tempo: notificação original + respostas de ambos os lados
  const timeline = (log: any): MsgTimeline[] => {
    const usuarioMsgs: MsgTimeline[] = Array.isArray(log.respostas) && log.respostas.length
      ? log.respostas.map((r: RespostaItem) => ({ ...r, de: 'destinatario' as const }))
      : (log.resposta ? [{ texto: log.resposta, midias: log.resposta_midias || [], data: log.data_resposta, de: 'destinatario' as const }] : []);
    const adminMsgs: MsgTimeline[] = Array.isArray(log.respostas_admin)
      ? log.respostas_admin.map((r: RespostaItem) => ({ ...r, de: 'admin' as const }))
      : [];
    return [...usuarioMsgs, ...adminMsgs].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
    );
  };

  const ultimaMsg = (log: any) => {
    const t = timeline(log);
    const ultima = t[t.length - 1];
    if (!ultima) return '';
    const prefixo = ultima.de === 'admin' ? 'Você: ' : '';
    return prefixo + (ultima.texto || '📎 Anexo');
  };

  const tokenDestino = (log: any): string | null =>
    log.inscrito?.token || log.usuario?.notification_token || null;

  const enviarResposta = async () => {
    const texto = resposta.trim();
    if ((!texto && anexos.length === 0) || !ativa || enviando) return;
    if (!company?.uid) return;

    setEnviando(true);
    try {
      // Upload dos anexos no bucket da empresa
      const midias: MidiaAnexo[] = [];
      const bucket = (company as any)?.storage ? String((company as any).storage).toLowerCase() : null;
      if (anexos.length > 0) {
        if (!bucket) throw new Error('Bucket de armazenamento não configurado para esta empresa');
        for (const anexo of anexos) {
          const safeName = anexo.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filePath = `notificacoes/admin/${Date.now()}_${safeName}`;
          const { error: upErr } = await supabaseClient.storage
            .from(bucket)
            .upload(filePath, anexo.file, { cacheControl: '3600', upsert: false });
          if (upErr) throw upErr;
          const { data: { publicUrl } } = supabaseClient.storage.from(bucket).getPublicUrl(filePath);
          midias.push({ tipo: anexo.tipo, url: publicUrl, nome: anexo.file.name });
        }
      }

      const novo = await notificationLogsService.saveRespostaAdmin(ativa.uid, texto, midias);
      const conversaAtualizada = {
        ...ativa,
        respostas_admin: [...(ativa.respostas_admin || []), novo]
      };
      setAtiva(conversaAtualizada);
      setConversas((prev) => prev.map((c) => (c.uid === ativa.uid ? conversaAtualizada : c)));
      setResposta('');
      setAnexos([]);

      // Avisa o destinatário via push (não bloqueia se falhar) — mesmo padrão do disparo
      const token = tokenDestino(ativa);
      if (token) {
        notificationService.enviarParaTokens({
          tokens: [token],
          title: empresaNome(),
          body: texto || 'Você recebeu um anexo',
          icon_url: (company as any)?.logo || undefined,
          badge_url: (company as any)?.logo || undefined,
          empresa_nome: company?.nome || undefined,
          link: `/notificacao/${ativa.uid}`,
          data: { id: ativa.uid }
        }).catch((e) => console.error('[Conversas] Falha no push da resposta:', e));
      }
    } catch (e: any) {
      toast.error(e.message || 'Não foi possível enviar a resposta');
    } finally {
      setEnviando(false);
    }
  };

  const empresaNome = () => company?.nome || 'Gabinete';

  const renderMidias = (midias: MidiaAnexo[], invertido: boolean) => (
    <div className="mt-2 space-y-3 w-[260px] sm:w-[440px] max-w-full">
      {midias.map((m, i) => (
        <div key={i} className="rounded-xl overflow-hidden border border-gray-200/60">
          {m.tipo === 'imagem' && (
            <a href={m.url} target="_blank" rel="noopener noreferrer" className="w-full block">
              <img src={m.url} alt={m.nome || 'Imagem'} className="w-full h-auto max-h-52 sm:max-h-72 object-cover" />
            </a>
          )}
          {m.tipo === 'video' && (
            <video src={m.url} controls playsInline preload="metadata" className="w-full h-40 sm:h-52 object-cover bg-black" />
          )}
          {m.tipo === 'audio' && (
            <div className={`p-2 ${invertido ? 'bg-white/60' : 'bg-gray-50 dark:bg-gray-700'}`}>
              <audio src={m.url} controls className="w-full" />
            </div>
          )}
          {m.tipo === 'pdf' && (
            <a href={m.url} target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-3 p-3 transition-colors ${invertido ? 'bg-white/60 hover:bg-white/80' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}`}>
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-800 truncate">{m.nome || 'Documento PDF'}</p>
                <p className="text-xs text-gray-500">PDF</p>
              </div>
              <Download className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </a>
          )}
          {m.legenda && (
            <p className="px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 border-t border-gray-200">
              {m.legenda}
            </p>
          )}
        </div>
      ))}
    </div>
  );

  const nomeDestino = (log: any) =>
    log.inscrito?.nome || log.usuario?.nome || 'Destinatário';

  // Só primeiro + último nome (ex.: "Josuel Queiroz")
  const nomeCurto = (nome: string) => {
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (partes.length <= 2) return partes.join(' ');
    return `${partes[0]} ${partes[partes.length - 1]}`;
  };

  // Quantas mensagens seguidas do destinatário aguardam resposta (estilo não lidas)
  const naoLidas = (log: any) => {
    const t = timeline(log);
    let n = 0;
    for (let i = t.length - 1; i >= 0 && t[i].de === 'destinatario'; i--) n++;
    return n;
  };

  const conversasFiltradas = busca.trim()
    ? conversas.filter((c) =>
        nomeDestino(c).toLowerCase().includes(busca.trim().toLowerCase()))
    : conversas;

  // Marca/desmarca etiqueta na conversa ativa e salva no banco
  const alternarEtiqueta = async (tagId: string) => {
    if (!ativa) return;
    const atuais: string[] = Array.isArray(ativa.etiquetas) ? ativa.etiquetas : [];
    const novas = atuais.includes(tagId)
      ? atuais.filter((t) => t !== tagId)
      : [...atuais, tagId];
    const atualizado = { ...ativa, etiquetas: novas };
    setAtiva(atualizado);
    setConversas((prev) => prev.map((c) => (c.uid === ativa.uid ? atualizado : c)));
    try {
      await notificationLogsService.salvarEtiquetas(ativa.uid, novas);
    } catch {
      toast.error('Não foi possível salvar a etiqueta. Rode o SQL add_etiquetas_notificacoes_log.sql');
    }
  };

  // ---------- Render ----------
  const conteudo = (
    <div
      ref={cardRef}
      className={fullscreen
        ? 'fixed inset-0 z-[110] bg-gray-100 dark:bg-gray-900'
        : 'px-3 sm:px-5 pt-4'}
      style={{ height: fullscreen ? '100%' : (alturaCard ?? 'calc(100vh - 80px)') }}
    >
      <div className={`bg-white dark:bg-gray-800 overflow-hidden flex flex-col h-full ${fullscreen ? '' : 'rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm'}`}>

        <div className="flex flex-1 min-h-0">
          {/* Lista de conversas */}
          <div className={`w-full sm:w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex-col overflow-hidden ${ativa ? 'hidden sm:flex' : 'flex'}`}>
            {/* Topo da lista: título + busca (estilo WhatsApp) */}
            <div className="px-4 py-3 bg-[#008069] sm:bg-white dark:sm:bg-gray-900 border-b border-[#01796a] sm:border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-white/15 sm:bg-[#f0f2f5] dark:sm:bg-gray-700 flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-white sm:text-gray-600 dark:sm:text-gray-300" />
                </div>
                <h1 className="text-base font-bold text-white sm:text-gray-900 dark:text-white">Conversas</h1>
                {conversas.length > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-white text-[#008069] sm:text-gray-600 sm:border sm:border-gray-200 dark:sm:text-gray-300 dark:sm:bg-gray-700 dark:sm:border-gray-600">
                    {conversas.length}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setFullscreen((f) => !f)}
                  className="ml-auto w-8 h-8 rounded-full text-white/80 sm:text-gray-500 flex items-center justify-center hover:bg-white/20 sm:hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                  title={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                >
                  {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2.5 bg-white sm:bg-[#f0f2f5] dark:bg-gray-800 rounded-full px-4 py-2 border border-gray-200 sm:border-transparent dark:border-gray-700">
                <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Pesquisar conversa"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 dark:text-white"
                />
                {busca && (
                  <button
                    type="button"
                    onClick={() => setBusca('')}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Limpar busca"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {loading && conversas.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-400">Carregando...</p>
            ) : conversas.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-400">
                Nenhuma resposta recebida ainda.
              </p>
            ) : conversasFiltradas.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-400">
                Nenhuma conversa encontrada.
              </p>
            ) : (
              conversasFiltradas.map((c) => (
                <button
                  key={c.uid}
                  onClick={() => setAtiva(c)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors ${ativa?.uid === c.uid ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-[#dfe5e7] dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-300">
                        {nomeDestino(c).trim()[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {nomeCurto(nomeDestino(c))}
                          </p>
                          {(Array.isArray(c.etiquetas) ? c.etiquetas : []).map((t: string) => {
                            const info = etiquetaInfo(t);
                            return info ? (
                              <span key={t} className={`w-2 h-2 rounded-full flex-shrink-0 ${info.dot}`} title={info.nome} />
                            ) : null;
                          })}
                        </div>
                        <span className={`text-[10px] flex-shrink-0 ${naoLidas(c) > 0 ? 'text-[#25d366] font-semibold' : 'text-gray-400'}`}>
                          {dataHora(c.data_resposta)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {ultimaMsg(c)}
                        </p>
                        {naoLidas(c) > 0 && (
                          <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 text-[11px] font-bold rounded-full bg-[#25d366] text-white flex items-center justify-center">
                            {naoLidas(c)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

          {/* Chat */}
          <div
            className={`flex-1 bg-[#efeae2] dark:bg-gray-900 flex-col min-w-0 overflow-hidden ${ativa ? 'flex' : 'hidden sm:flex'}`}
            style={{
              backgroundImage:
                'radial-gradient(rgba(0,0,0,0.06) 1.2px, transparent 1.2px), radial-gradient(rgba(0,0,0,0.035) 1.2px, transparent 1.2px)',
              backgroundSize: '24px 24px, 24px 24px',
              backgroundPosition: '0 0, 12px 12px',
            }}
          >
            {!ativa ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 px-6">
                <div className="w-16 h-16 rounded-full bg-white/60 dark:bg-gray-800 flex items-center justify-center mb-4 shadow-sm">
                  <MessageCircle className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhuma conversa selecionada</p>
                <p className="text-xs text-gray-400 mt-1 text-center">Escolha uma conversa na lista para ver as mensagens e responder</p>
              </div>
            ) : (
              <>
                {/* Cabeçalho do chat */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-[0_1px_3px_rgba(11,20,26,0.08)]">
                  <div className={`${fullscreen ? 'max-w-5xl' : 'max-w-3xl'} mx-auto w-full flex items-center gap-3 px-4 py-3`}>
                    <button
                      onClick={() => setAtiva(null)}
                      className="sm:hidden text-gray-400 hover:text-gray-600"
                      aria-label="Voltar"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-[#dfe5e7] dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-300">
                        {nomeDestino(ativa).trim()[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{nomeCurto(nomeDestino(ativa))}</p>
                      <div className="flex items-center gap-1.5 min-w-0">
                        {ativa.inscrito?.telefone && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-shrink-0">
                            {ativa.inscrito.telefone}
                          </p>
                        )}
                        {(() => {
                          const tags: string[] = Array.isArray(ativa.etiquetas) ? ativa.etiquetas : [];
                          const chip = (t: string, extra = '') => {
                            const info = etiquetaInfo(t);
                            return info ? (
                              <span key={t} className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full ${info.cor} ${extra}`}>
                                {info.nome}
                              </span>
                            ) : null;
                          };
                          return (
                            <>
                              {/* Mobile: só a 1ª tag + contador; desktop: todas */}
                              {tags[0] && chip(tags[0])}
                              {tags.length > 1 && (
                                <span className="sm:hidden flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                  +{tags.length - 1}
                                </span>
                              )}
                              {tags.slice(1).map((t) => chip(t, 'hidden sm:inline-flex'))}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        className="hidden sm:flex w-9 h-9 rounded-full text-gray-500 items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Pesquisar na conversa"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setMenuOpcoes((o) => !o)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${menuOpcoes ? 'text-[#00a884] bg-gray-200 dark:bg-gray-700' : 'text-gray-500'}`}
                          aria-label="Mais opções"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menuOpcoes && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setMenuOpcoes(false)} />
                            <div className="absolute right-0 top-11 z-50 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5">
                              <p className="px-4 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                <Tag className="h-3 w-3" /> Etiquetas
                              </p>
                              {ETIQUETAS.map((e) => {
                                const marcada = (Array.isArray(ativa.etiquetas) ? ativa.etiquetas : []).includes(e.id);
                                return (
                                  <button
                                    key={e.id}
                                    type="button"
                                    onClick={() => alternarEtiqueta(e.id)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    <span className={`w-2.5 h-2.5 rounded-full ${e.dot}`} />
                                    <span className="flex-1 text-left">{e.nome}</span>
                                    {marcada && <Check className="h-4 w-4 text-[#00a884]" />}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setFullscreen((f) => !f)}
                        className="sm:hidden w-9 h-9 rounded-full text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        aria-label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                      >
                        {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                      </button>
                    </div>
                    </div>
                </div>

              {/* Mensagens */}
              <div ref={msgsRef} className="flex-1 min-h-0 overflow-y-auto">
                <div className={`${fullscreen ? 'max-w-5xl' : 'max-w-3xl'} mx-auto w-full px-3 sm:px-8 pt-6 pb-5 space-y-4`}>
                {/* Notificação original (sempre a 1ª mensagem da conversa) */}
                <div className="flex">
                  <div className="max-w-[92%] sm:max-w-[560px] bg-white dark:bg-gray-800 rounded-xl rounded-tl-none px-4 py-3 shadow-[0_1px_1px_rgba(11,20,26,0.15)]">
                    <p className="text-xs font-semibold text-[#008069] mb-0.5">{ativa.titulo}</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {ativa.mensagem}
                    </p>
                    {ativa.midias?.length > 0 && renderMidias(ativa.midias, false)}
                    <div className="flex items-center justify-end mt-1">
                      <span className="text-[11px] text-gray-400">{dataHora(ativa.data_criacao)}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline de respostas (com separadores de data) */}
                {timeline(ativa).map((m, i, arr) => {
                  const anterior = i === 0 ? ativa.data_criacao : arr[i - 1].data;
                  return (
                  <div key={i}>
                    {!mesmoDia(anterior, m.data) && (
                      <div className="flex justify-center my-1">
                        <span className="px-3 py-1 text-[11px] font-medium text-gray-500 bg-white/70 dark:bg-gray-700 rounded-full shadow-sm">
                          {rotuloDia(m.data)}
                        </span>
                      </div>
                    )}
                  <div className={`flex ${m.de === 'destinatario' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[92%] sm:max-w-[560px] rounded-xl px-4 py-2.5 shadow-[0_1px_1px_rgba(11,20,26,0.15)] ${m.de === 'destinatario'
                      ? 'bg-[#d9fdd3] dark:bg-[#005c4b] rounded-tr-none'
                      : 'bg-white dark:bg-gray-800 rounded-tl-none'}`}>
                      {m.de === 'admin' && (
                        <p className="text-[10px] font-semibold text-blue-600 mb-0.5">Você</p>
                      )}
                      {m.midias && m.midias.length > 0 && renderMidias(m.midias, m.de === 'destinatario')}
                      {m.texto && (
                        <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap mt-1">
                          {m.texto}
                        </p>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[11px] text-gray-500 dark:text-gray-300">{dataHora(m.data)}</span>
                        {m.de === 'admin' && (
                          <svg viewBox="0 0 16 15" className="h-3.5 w-3.5 text-gray-400" fill="currentColor"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.033L1.892 7.77a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/></svg>
                        )}
                      </div>
                    </div>
                  </div>
                  </div>
                  );
                })}
                <div ref={fimRef} />
                </div>
              </div>

              {/* Campo de resposta do admin */}
              <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className={`${fullscreen ? 'max-w-5xl' : 'max-w-3xl'} mx-auto w-full px-3 py-3`}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACEITA_MIDIA}
                  multiple
                  onChange={handleAnexos}
                  className="hidden"
                />
                {anexos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-1">
                    {anexos.map((a, i) => (
                      <div key={i} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-gray-300 bg-gray-100">
                        {a.tipo === 'imagem' ? (
                          <img src={a.preview} alt={a.file.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                            {a.tipo === 'video' && <PlayCircle className="h-5 w-5" />}
                            {a.tipo === 'audio' && <Music className="h-5 w-5" />}
                            {a.tipo === 'pdf' && <FileText className="h-5 w-5" />}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setAnexos((p) => p.filter((_, idx) => idx !== i))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center"
                          aria-label="Remover anexo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {emojiAberto && (
                  <div className="mb-2 bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 p-2 max-w-sm">
                    <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setResposta((r) => r + e)}
                          className="w-8 h-8 text-lg hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEmojiAberto((o) => !o)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors ${emojiAberto ? 'text-[#00a884]' : 'text-gray-400'}`}
                    aria-label="Emoji"
                    title="Emojis"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={enviando}
                    className="w-10 h-10 rounded-full text-gray-500 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    aria-label="Anexar arquivo"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    value={resposta}
                    onChange={(e) => setResposta(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && enviarResposta()}
                    placeholder="Responder..."
                    className="flex-1 rounded-full bg-[#f0f2f5] dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 px-4 py-2.5 text-sm outline-none placeholder:text-gray-400"
                  />
                  <button
                    onClick={enviarResposta}
                    disabled={(!resposta.trim() && anexos.length === 0) || enviando}
                    className="w-11 h-11 rounded-full bg-[#00a884] text-white flex items-center justify-center disabled:opacity-50 transition-opacity"
                    aria-label="Enviar resposta"
                  >
                    {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
                </div>
              </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Tela cheia: portal direto no body (fixed relativo à viewport, sem ancestrais)
  return fullscreen ? createPortal(conteudo, document.body) : conteudo;
}
