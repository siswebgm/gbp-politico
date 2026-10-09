import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, CheckCheck, AlertCircle, FileText, Download, X, Paperclip, Loader2, PlayCircle, Music } from 'lucide-react';
import { notificationLogsService, NotificationLog, MidiaAnexo, RespostaItem } from '../../../services/notificationLogs';
import { notificationSubscribersService, EmpresaPublica } from '../../../services/notificationSubscribers';
import { supabaseClient } from '../../../lib/supabase';

const ACEITA_MIDIA = 'image/*,video/*,audio/*,application/pdf';

interface AnexoResp {
  file: File;
  tipo: MidiaAnexo['tipo'];
  preview: string;
}

// Item da linha do tempo: uma notificação recebida ou uma resposta de um dos lados
type ItemTimeline =
  | { tipo: 'notificacao'; notif: NotificationLog; data: string }
  | (RespostaItem & { tipo: 'resposta'; de: 'destinatario' | 'admin' });

// Página pública: a conversa inteira da pessoa aparece como um chat único
// (notificações recebidas + respostas dos dois lados, em ordem cronológica)
export default function VisualizarNotificacao() {
  const { uid } = useParams<{ uid: string }>();
  const [log, setLog] = useState<NotificationLog | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [empresa, setEmpresa] = useState<EmpresaPublica | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [resposta, setResposta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [respostas, setRespostas] = useState<ItemTimeline[]>([]);
  const [anexos, setAnexos] = useState<AnexoResp[]>([]);
  const [ampliada, setAmpliada] = useState<MidiaAnexo | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const carregar = async () => {
      if (!uid) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      try {
        const conversa = await notificationLogsService.getConversaByLogUid(uid);
        if (!conversa) {
          setNotFound(true);
          return;
        }
        const { log: aberto, logs: thread } = conversa;
        setLog(aberto);
        setLogs(thread);

        // Timeline unificada: todas as notificações recebidas por esta pessoa
        // + respostas dela e do gabinete, ordenadas por data
        const itens: ItemTimeline[] = [];
        thread.forEach((l) => {
          itens.push({ tipo: 'notificacao', notif: l, data: l.data_envio || l.data_criacao });
          const minhas: RespostaItem[] =
            Array.isArray(l.respostas) && l.respostas.length > 0
              ? l.respostas
              : (l.resposta
                  ? [{ texto: l.resposta, midias: l.resposta_midias || [], data: l.data_resposta || l.data_criacao }]
                  : []);
          minhas.forEach((r) => itens.push({ ...r, tipo: 'resposta', de: 'destinatario' }));
          (Array.isArray(l.respostas_admin) ? l.respostas_admin : []).forEach((r) =>
            itens.push({ ...r, tipo: 'resposta', de: 'admin' })
          );
        });
        itens.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
        setRespostas(itens);

        if (aberto.empresa_uid) {
          notificationSubscribersService
            .buscarEmpresaPublica(aberto.empresa_uid)
            .then(setEmpresa)
            .catch(() => {});
        }

        notificationLogsService.markAsViewed(uid).catch(() => {});
        notificationLogsService.markAsClicked(uid).catch(() => {});
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [uid]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log, respostas]);

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
      if (tipo) {
        novos.push({ file, tipo, preview: URL.createObjectURL(file) });
      }
    }
    setAnexos((prev) => [...prev, ...novos]);
    e.target.value = '';
  };

  const removerAnexo = (i: number) => {
    setAnexos((prev) => prev.filter((_, idx) => idx !== i));
  };

  const enviarResposta = async () => {
    const texto = resposta.trim();
    if ((!texto && anexos.length === 0) || !uid || enviando) return;

    setEnviando(true);
    try {
      // Upload dos anexos para o bucket da empresa (pasta de respostas)
      const midias: MidiaAnexo[] = [];
      const bucket = empresa?.storage ? String(empresa.storage).toLowerCase() : null;
      if (anexos.length > 0) {
        if (!bucket) throw new Error('Armazenamento não configurado.');
        for (const anexo of anexos) {
          const safeName = anexo.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filePath = `notificacoes/respostas/${Date.now()}_${safeName}`;
          const { error: upErr } = await supabaseClient.storage
            .from(bucket)
            .upload(filePath, anexo.file, { cacheControl: '3600', upsert: false });
          if (upErr) throw upErr;
          const { data: { publicUrl } } = supabaseClient.storage.from(bucket).getPublicUrl(filePath);
          midias.push({ tipo: anexo.tipo, url: publicUrl, nome: anexo.file.name });
        }
      }

      // A resposta vai para o log mais recente da conversa — é ele que o
      // painel usa como canônico quando os lados se falam na mesma thread
      const logResposta = logs.length ? logs[logs.length - 1].uid : uid!;
      const novo = await notificationLogsService.saveResposta(logResposta, texto, midias);
      setRespostas((prev) => [...prev, { ...novo, tipo: 'resposta', de: 'destinatario' } as ItemTimeline]);
      setResposta('');
      setAnexos([]);
    } catch (e: any) {
      console.error(e);
      alert('Não foi possível enviar sua resposta. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const hora = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#efeae2] dark:bg-gray-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00a884]" />
      </div>
    );
  }

  if (notFound || !log) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#efeae2] dark:bg-gray-900 px-4 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Notificação não encontrada
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Este aviso não existe ou o link é inválido.
        </p>
      </div>
    );
  }

  const linkDe = (l: NotificationLog) =>
    l.link_direcionar
      ? /^https?:\/\//i.test(l.link_direcionar)
        ? l.link_direcionar
        : `${window.location.origin}${l.link_direcionar.startsWith('/') ? '' : '/'}${l.link_direcionar}`
      : null;

  // Bolha de uma notificação recebida (cada disparo vira uma bolha na conversa)
  const renderNotificacao = (n: NotificationLog, key: number) => {
    const linkCompleto = linkDe(n);
    return (
      <div key={`n-${n.uid}-${key}`} className="flex">
        <div className="max-w-[92%] sm:max-w-[720px] bg-white dark:bg-gray-800 rounded-lg rounded-tl-none px-3 py-2 shadow-sm">
          <p className="text-xs font-semibold text-[#008069] mb-0.5">{n.titulo}</p>
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
            {n.mensagem}
          </p>

          {n.midias && n.midias.length > 0 ? (
            <div className="mt-2 space-y-3 w-[260px] sm:w-[440px] max-w-full">
              {n.midias.map((m, i) => (
                  <div
                    key={i}
                    className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600"
                  >
                    {m.tipo === 'imagem' && (
                      <button
                        type="button"
                        onClick={() => setAmpliada(m)}
                        className="w-full block cursor-zoom-in"
                        aria-label="Ampliar imagem"
                      >
                        <img
                          src={m.url}
                          alt={m.legenda || m.nome || n.titulo}
                          className="w-full h-auto max-h-52 sm:max-h-72 object-cover"
                        />
                      </button>
                    )}
                    {m.tipo === 'video' && (
                      <button
                        type="button"
                        onClick={() => setAmpliada(m)}
                        className="w-full relative block cursor-pointer bg-black"
                        aria-label="Abrir vídeo"
                      >
                        <video
                          src={m.url}
                          className="w-full h-40 sm:h-52 object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6 ml-0.5">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </span>
                        </span>
                      </button>
                    )}
                    {m.tipo === 'audio' && (
                      <div className="p-2 bg-gray-50 dark:bg-gray-700">
                        <audio src={m.url} controls className="w-full" />
                      </div>
                    )}
                    {m.tipo === 'pdf' && (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                            {m.nome || 'Documento PDF'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">PDF</p>
                        </div>
                        <Download className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      </a>
                    )}
                    {m.legenda && (
                      <p className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                        {m.legenda}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <>
                {n.imagem_url && (
                  <button
                    type="button"
                    onClick={() => setAmpliada({ tipo: 'imagem', url: n.imagem_url!, nome: n.titulo })}
                    className="mt-2 w-[260px] sm:w-[440px] max-w-full block cursor-zoom-in"
                    aria-label="Ampliar imagem"
                  >
                    <img
                      src={n.imagem_url}
                      alt={n.titulo}
                      className="w-full h-auto max-h-52 sm:max-h-72 rounded-md object-cover"
                    />
                  </button>
                )}
                {n.tipo_midia === 'video' && n.url_midia && (
                  <video src={n.url_midia} controls className="mt-2 w-full rounded-md" />
                )}
                {n.tipo_midia === 'audio' && n.url_midia && (
                  <audio src={n.url_midia} controls className="mt-2 w-full" />
                )}
                {n.tipo_midia === 'pdf' && n.url_midia && (
                  <a
                    href={n.url_midia}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-sm text-[#008069] underline"
                  >
                    Abrir PDF
                  </a>
                )}
              </>
            )}
            {linkCompleto && (
              <a
                href={linkCompleto}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#008069] underline"
              >
                Acessar link
              </a>
            )}

            <div className="flex items-center justify-end mt-1">
              <span className="text-[11px] text-gray-400">
                {hora(n.data_envio || n.data_criacao)}
              </span>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="flex flex-col h-screen bg-[#efeae2] dark:bg-gray-900">
        {/* Cabeçalho estilo WhatsApp */}
        <header className="flex items-center gap-3 px-4 py-3 bg-[#008069] dark:bg-gray-800 shadow-sm">
          {empresa?.logo ? (
            <img
              src={empresa.logo}
              alt={empresa.nome || 'Empresa'}
              className="w-10 h-10 rounded-full bg-white object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
              {(empresa?.nome || 'N')[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">{empresa?.nome || 'Notificações'}</p>
            <p className="text-white/70 text-xs">online</p>
          </div>
        </header>

        {/* Área de mensagens: conversa unificada (notificações + respostas) */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-8 py-4 space-y-3">
          {respostas.map((item, idx) => item.tipo === 'notificacao' ? (
            renderNotificacao(item.notif, idx)
          ) : (
            <div key={idx} className={`flex ${item.de === 'admin' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[92%] sm:max-w-[720px] rounded-lg px-3 py-2 shadow-sm ${
                item.de === 'admin'
                  ? 'bg-white dark:bg-gray-800 rounded-tl-none'
                  : 'bg-[#d9fdd3] dark:bg-[#005c4b] rounded-tr-none'
              }`}>
                {item.de === 'admin' && (
                  <p className="text-[10px] font-semibold text-[#008069] mb-0.5">{empresa?.nome || 'Gabinete'}</p>
                )}
                {item.midias && item.midias.length > 0 && (
                <div className="space-y-3 w-[260px] sm:w-[440px] max-w-full">
                  {item.midias.map((m, i) => (
                    <div key={i} className="rounded-xl overflow-hidden border border-gray-200/60">
                      {m.tipo === 'imagem' && (
                        <button type="button" onClick={() => setAmpliada(m)} className="w-full block cursor-zoom-in" aria-label="Ampliar imagem">
                          <img src={m.url} alt={m.nome || 'Imagem'} className="w-full h-auto max-h-52 sm:max-h-72 object-cover" />
                        </button>
                      )}
                      {m.tipo === 'video' && (
                        <button type="button" onClick={() => setAmpliada(m)} className="w-full relative block cursor-pointer bg-black" aria-label="Abrir vídeo">
                          <video src={m.url} className="w-full h-40 sm:h-52 object-cover" muted playsInline preload="metadata" />
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                              <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6 ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                            </span>
                          </span>
                        </button>
                      )}
                      {m.tipo === 'audio' && (
                        <div className="p-2 bg-white/60">
                          <audio src={m.url} controls className="w-full" />
                        </div>
                      )}
                      {m.tipo === 'pdf' && (
                        <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white/60 hover:bg-white/80 transition-colors">
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
                    </div>
                  ))}
                </div>
              )}

              {item.texto && (
                <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap mt-2">
                  {item.texto}
                </p>
              )}

              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[11px] text-gray-500 dark:text-gray-300">
                  {hora(item.data)}
                </span>
                <CheckCheck className="h-4 w-4 text-[#53bdeb]" />
              </div>
            </div>
          </div>
        ))}

        <div ref={fimRef} />
      </div>

      {/* Lightbox - mídia em tela cheia */}
      {ampliada && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setAmpliada(null)}
        >
          <button
            type="button"
            onClick={() => setAmpliada(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
            aria-label="Fechar"
          >
            <X className="h-6 w-6" />
          </button>
          {ampliada.tipo === 'video' ? (
            <video
              src={ampliada.url}
              controls
              autoPlay
              className="max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={ampliada.url}
              alt={ampliada.legenda || ampliada.nome || 'Imagem ampliada'}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {ampliada.legenda && (
            <p className="absolute bottom-6 left-4 right-4 text-center text-sm text-white/90 bg-black/40 rounded-md px-3 py-2">
              {ampliada.legenda}
            </p>
          )}
        </div>
      )}

      {/* Campo de resposta */}
      <footer className="px-3 py-2 bg-[#f0f2f5] dark:bg-gray-800">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACEITA_MIDIA}
          multiple
          onChange={handleAnexos}
          className="hidden"
        />

        {/* Pré-visualização dos anexos */}
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
                  onClick={() => removerAnexo(i)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center"
                  aria-label="Remover anexo"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={enviando}
            className="w-11 h-11 rounded-full text-gray-500 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50 transition-colors"
            aria-label="Anexar arquivo"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviarResposta()}
            placeholder="Digite uma mensagem"
            className="flex-1 rounded-full bg-white dark:bg-gray-700 dark:text-white px-4 py-2.5 text-sm outline-none placeholder:text-gray-400"
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
      </footer>
    </div>
  );
}
