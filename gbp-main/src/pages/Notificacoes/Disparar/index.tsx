import { useState, useEffect, useRef } from 'react';
import { Send, Users, CheckCircle, AlertCircle, ArrowLeft, Settings, History, FileUp, FileText, Music, PlayCircle, X, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { notificationLogsService, MidiaAnexo } from '../../../services/notificationLogs';
import { notificationService } from '../../../services/notificationService';
import { notificationSubscribersService } from '../../../services/notificationSubscribers';
import { supabaseClient } from '../../../lib/supabase';
import { toast } from 'react-toastify';

interface Anexo {
  file: File;
  tipo: 'imagem' | 'video' | 'audio' | 'pdf';
  preview: string;
  legenda: string;
}

export default function DispararNotificacao() {
  const { company } = useCompanyStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Formulário
  // Título não é mais editável: usa sempre o nome da empresa
  const titulo = company?.nome || 'Notificação';
  const [mensagem, setMensagem] = useState('');
  // Identificação interna do disparo (não é enviada ao usuário):
  // preenchida no modal de confirmação, aparece só no histórico
  const [nomeDisparo, setNomeDisparo] = useState('');
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACEITA_MIDIA = 'image/*,video/*,audio/*,application/pdf';

  const detectarTipo = (file: File): Anexo['tipo'] | null => {
    if (file.type.startsWith('image/')) return 'imagem';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type === 'application/pdf') return 'pdf';
    return null;
  };

  const handleAnexos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const novos: Anexo[] = [];
    for (const file of files) {
      const tipo = detectarTipo(file);
      if (!tipo) {
        toast.error(`Arquivo não suportado: ${file.name}`);
        continue;
      }
      novos.push({ file, tipo, preview: URL.createObjectURL(file), legenda: '' });
    }
    if (novos.length) setAnexos(prev => [...prev, ...novos]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const alterarLegenda = (idx: number, legenda: string) => {
    setAnexos(prev => prev.map((a, i) => (i === idx ? { ...a, legenda } : a)));
  };

  const removerAnexo = (idx: number) => {
    setAnexos(prev => {
      const alvo = prev[idx];
      if (alvo) URL.revokeObjectURL(alvo.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const limparAnexos = () => {
    anexos.forEach(a => URL.revokeObjectURL(a.preview));
    setAnexos([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  // Seleção de usuários
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Resultados
  const [resultados, setResultados] = useState<any>(null);

  // Modal de confirmação antes do envio (ação irreversível)
  const [confirmando, setConfirmando] = useState(false);
  const [progresso, setProgresso] = useState<{ etapa: string; atual: number; total: number } | null>(null);

  // Filtros de eleitores (aplicados sobre os inscritos)
  const filtrosIniciais = {
    cidade: '', bairro: '', indicado_uid: '', categoria_uid: '',
    confiabilidade: '', genero: '', faixa: ''
  };
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  
  // Carregar usuários com notificação ativa
  useEffect(() => {
    loadUsers();
  }, [company?.uid]);
  
  const loadUsers = async () => {
    if (!company?.uid) return;
    
    setLoadingUsers(true);
    try {
      const [usuariosData, inscritosData] = await Promise.all([
        notificationLogsService.getUsersWithNotificationByEmpresa(company.uid),
        notificationSubscribersService.listarPorEmpresa(company.uid)
      ]);

      const listaUsuarios = usuariosData.map((u: any) => ({
        key: `u:${u.uid}`,
        tipo: 'usuario',
        uid: u.uid,
        nome: u.nome || u.email,
        detalhe: u.email,
        token: u.notification_token as string | null
      }));

      // Dados do eleitor vinculado a cada inscrito (para filtros)
      const eleitorUids = inscritosData.map(i => i.eleitor_uid).filter(Boolean) as string[];
      const eleitoresMap = new Map<string, any>();
      if (eleitorUids.length > 0) {
        const { data: eleitoresData } = await supabaseClient
          .from('gbp_eleitores')
          .select(`uid, bairro, cidade, genero, nascimento, confiabilidade_do_voto, indicado_uid, categoria_uid,
            gbp_indicado!indicado_uid(nome),
            gbp_categorias!categoria_uid(nome)`)
          .eq('empresa_uid', company.uid)
          .in('uid', eleitorUids);
        (eleitoresData || []).forEach((e: any) => {
          eleitoresMap.set(e.uid, {
            bairro: e.bairro,
            cidade: e.cidade,
            genero: e.genero,
            nascimento: e.nascimento,
            confiabilidade: e.confiabilidade_do_voto,
            indicado_uid: e.indicado_uid,
            indicado_nome: e.gbp_indicado?.nome || null,
            categoria_uid: e.categoria_uid,
            categoria_nome: e.gbp_categorias?.nome || null
          });
        });
      }

      // Deduplica: a mesma pessoa pode ter mais de um registro de inscrito
      // (tokens antigos do FCM). Mantém só o cadastro mais recente — a lista
      // vem ordenada por criado_em desc, então o primeiro encontrado vence.
      const chavesVistas = new Set<string>();
      const listaInscritos = inscritosData
        .filter((i) => i.ativo && i.permissao === 'granted')
        .filter((i) => {
          const fone9 = (i.telefone || '').replace(/\D/g, '').slice(-9);
          const chaves = [
            i.eleitor_uid ? `e:${i.eleitor_uid}` : null,
            fone9.length >= 8 ? `t:${fone9}` : null,
            i.token ? `k:${i.token}` : null
          ].filter(Boolean) as string[];
          if (chaves.length > 0 && chaves.some((c) => chavesVistas.has(c))) return false;
          chaves.forEach((c) => chavesVistas.add(c));
          return true;
        })
        .map((i) => ({
          key: `i:${i.uid}`,
          tipo: 'inscrito',
          uid: i.uid,
          nome: i.nome || 'Inscrito sem nome',
          detalhe: i.telefone || 'Via link de convite',
          token: i.token,
          eleitor: i.eleitor_uid ? eleitoresMap.get(i.eleitor_uid) || null : null
        }));

      console.log('[Disparar] Destinatários carregados:');
      console.table([...listaUsuarios, ...listaInscritos].map(d => ({
        tipo: d.tipo, nome: d.nome, uid: d.uid, token: d.token?.substring(0, 20)
      })));
      setUsuarios([...listaUsuarios, ...listaInscritos]);
    } catch (error: any) {
      toast.error('Erro ao carregar usuários: ' + error.message);
    } finally {
      setLoadingUsers(false);
    }
  };
  
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(usuarios.map(u => u.key));
    }
    setSelectAll(!selectAll);
  };
  
  const handleSelectUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  // --- Filtros de eleitores ---
  const calcIdade = (nascimento?: string | null): number | null => {
    if (!nascimento) return null;
    const [ano, mes, dia] = nascimento.split('T')[0].split('-').map(Number);
    if (!ano || !mes || !dia) return null;
    const hoje = new Date();
    let idade = hoje.getFullYear() - ano;
    const m = hoje.getMonth() + 1 - mes;
    if (m < 0 || (m === 0 && hoje.getDate() < dia)) idade--;
    return idade;
  };

  const temFiltroAtivo = (f = filtros) => Object.values(f).some(v => v !== '');

  const passaFiltro = (u: any, f = filtros): boolean => {
    if (!temFiltroAtivo(f)) return true;
    const e = u.eleitor;
    if (!e) return false; // sem filtro só aparece quando nada está filtrado
    if (f.cidade && e.cidade !== f.cidade) return false;
    if (f.bairro && e.bairro !== f.bairro) return false;
    if (f.indicado_uid && e.indicado_uid !== f.indicado_uid) return false;
    if (f.categoria_uid && e.categoria_uid !== f.categoria_uid) return false;
    if (f.confiabilidade && e.confiabilidade !== f.confiabilidade) return false;
    if (f.genero && e.genero !== f.genero) return false;
    if (f.faixa) {
      const idade = calcIdade(e.nascimento);
      if (idade === null) return false;
      if (f.faixa === '0-18' && idade > 18) return false;
      if (f.faixa === '19-45' && (idade < 19 || idade > 45)) return false;
      if (f.faixa === '46+' && idade < 46) return false;
    }
    return true;
  };

  const aplicarFiltro = (patch: Partial<typeof filtros>) => {
    const novos = { ...filtros, ...patch };
    setFiltros(novos);
    // Marca automaticamente todos os inscritos que passam no filtro
    setSelectedUsers(prev => {
      const foraInscritos = prev.filter(k => !k.startsWith('i:'));
      const visiveis = usuarios
        .filter(u => u.tipo === 'inscrito' && passaFiltro(u, novos))
        .map(u => u.key);
      return [...foraInscritos, ...visiveis];
    });
  };

  const limparFiltros = () => aplicarFiltro(filtrosIniciais);
  
  const handleClickEnviar = () => {
    if (!mensagem) {
      toast.error('Preencha a mensagem');
      return;
    }
    if (selectedUsers.length === 0) {
      toast.error('Selecione pelo menos um destinatário');
      return;
    }
    setConfirmando(true);
  };

  const handleEnviar = async () => {
    if (!mensagem) {
      toast.error('Preencha a mensagem');
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error('Selecione pelo menos um usuário');
      return;
    }
    
    if (!company?.uid) {
      toast.error('Empresa não selecionada');
      return;
    }
    
    setLoading(true);
    setResultados(null);
    
    try {
      const selecionadosBase = usuarios.filter(u => selectedUsers.includes(u.key));

      // Recarrega os tokens no momento do envio — a lista pode ter ficado
      // desatualizada se o token do destinatário rotacionou (evita NotRegistered)
      const [usuariosFresh, inscritosFresh] = await Promise.all([
        notificationLogsService.getUsersWithNotificationByEmpresa(company.uid),
        notificationSubscribersService.listarPorEmpresa(company.uid)
      ]);
      const freshTokens = new Map<string, string | null>();
      usuariosFresh.forEach((u: any) => freshTokens.set(`u:${u.uid}`, u.notification_token ?? null));
      inscritosFresh
        .filter((i) => i.ativo && i.permissao === 'granted')
        .forEach((i) => freshTokens.set(`i:${i.uid}`, i.token));
      const selecionados = selecionadosBase.map(d => ({
        ...d,
        token: freshTokens.has(d.key) ? (freshTokens.get(d.key) as string | null) : d.token
      }));

      // Upload de todos os anexos para o bucket da empresa (mesmo padrão do UploadProjeto)
      const midias: MidiaAnexo[] = [];
      if (anexos.length > 0) {
        const { data: empresaData } = await supabaseClient
          .from('gbp_empresas')
          .select('storage')
          .eq('uid', company.uid)
          .single();

        if (!empresaData?.storage) {
          throw new Error('Bucket de armazenamento não configurado para esta empresa');
        }

        const storageBucket = String(empresaData.storage).toLowerCase();

        for (let i = 0; i < anexos.length; i++) {
          const anexo = anexos[i];
          setProgresso({ etapa: 'Enviando anexos...', atual: i, total: anexos.length });
          const safeName = anexo.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const filePath = `notificacoes/${Date.now()}_${safeName}`;

          const { error: uploadError } = await supabaseClient.storage
            .from(storageBucket)
            .upload(filePath, anexo.file, { cacheControl: '3600', upsert: false });

          if (uploadError) {
            throw new Error(`Erro ao fazer upload de ${anexo.file.name}: ${uploadError.message}`);
          }

          const { data: { publicUrl } } = supabaseClient.storage
            .from(storageBucket)
            .getPublicUrl(filePath);

          midias.push({
            tipo: anexo.tipo,
            url: publicUrl,
            nome: anexo.file.name,
            ...(anexo.legenda.trim() ? { legenda: anexo.legenda.trim() } : {})
          });

          setProgresso({ etapa: 'Enviando anexos...', atual: i + 1, total: anexos.length });
        }
      }

      // Campos legados: primeira imagem embute na notificação; primeira mídia
      // não-imagem segue como url_midia (compatibilidade com versões antigas)
      const primeiraImagem = midias.find(m => m.tipo === 'imagem');
      const primeiraNaoImagem = midias.find(m => m.tipo !== 'imagem');
      const imagemUrlFinal = primeiraImagem?.url;
      const urlMidiaFinal = primeiraNaoImagem?.url;
      const tipoMidiaFinal = primeiraNaoImagem ? primeiraNaoImagem.tipo : (primeiraImagem ? 'imagem' : 'texto');

      setProgresso({ etapa: 'Preparando envios...', atual: 0, total: selecionados.length });

      // Identificador único do disparo — todos os logs deste envio compartilham
      // o mesmo campanha_uid, então o histórico pode filtrar/analisar por disparo
      const campanhaUid = crypto.randomUUID();
      const campanhaNome = nomeDisparo.trim() || `Disparo ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

      // Criar logs para cada destinatário
      const logs = await Promise.all(
        selecionados.map(dest =>
          notificationLogsService.createLog({
            empresa_uid: company.uid,
            campanha_uid: campanhaUid,
            campanha_nome: campanhaNome,
            ...(dest.tipo === 'usuario' ? { usuario_uid: dest.uid } : { inscrito_uid: dest.uid }),
            titulo,
            mensagem,
            imagem_url: imagemUrlFinal,
            tipo_midia: tipoMidiaFinal !== 'texto' ? tipoMidiaFinal : undefined,
            url_midia: urlMidiaFinal,
            midias: midias.length > 0 ? midias : undefined
          })
        )
      );
      
      // Sem link personalizado: o clique abre a página de chat /notificacao/:uid

      const comToken = selecionados.filter(d => !!d.token);
      const semToken = selecionados.filter(d => !d.token);

      await Promise.all(
        selecionados.map((dest, idx) =>
          !dest.token
            ? notificationLogsService.markError(logs[idx].uid, 'Destinatário sem token de notificação')
            : Promise.resolve()
        )
      );

      let enviados = 0;
      let falhas = semToken.length;
      let mensagemResultado = '';

      if (comToken.length > 0) {
        // Envio individual: cada destinatário recebe o uid do seu log em data.id,
        // usado para abrir a página de visualização ao clicar na notificação
        let enviadosProgresso = 0;
        const resultadosEnvio = (
          await Promise.all(
            selecionados.map((dest, idx) =>
              !dest.token
                ? Promise.resolve([])
                : notificationService.enviarParaTokens({
                    tokens: [dest.token as string],
                    title: titulo,
                    body: mensagem,
                    imagem_url: imagemUrlFinal,
                    icon_url: company.logo || undefined,
                    badge_url: company.logo || undefined,
                    empresa_nome: company.nome || undefined,
                    link: undefined,
                    data: {
                      id: logs[idx].uid,
                      tipo_midia: tipoMidiaFinal,
                      url_midia: urlMidiaFinal || ''
                    }
                  }).then(r => {
                    enviadosProgresso++;
                    setProgresso({ etapa: 'Enviando notificações...', atual: enviadosProgresso, total: comToken.length });
                    return r;
                  })
            )
          )
        ).flat();

        await Promise.all(
          selecionados.map((dest, idx) => {
            if (!dest.token) return Promise.resolve();
            const r = resultadosEnvio.find(x => x.token === dest.token);
            if (r?.success) {
              enviados++;
              return notificationLogsService.markAsSent(logs[idx].uid);
            }
            falhas++;
            // Token inválido NÃO desativa mais o destinatário — a falha fica
            // registrada apenas no log, e a pessoa segue disponível para
            // futuros disparos (o token pode rotacionar e voltar a funcionar).
            return notificationLogsService.markError(logs[idx].uid, r?.error || 'Falha no envio');
          })
        );
      }

      mensagemResultado =
        falhas === 0
          ? 'Todas as notificações foram enviadas'
          : `${falhas} falha(s). Veja o histórico para detalhes`;

      setResultados({
        total: selecionados.length,
        enviados,
        sucesso: falhas === 0,
        mensagem: mensagemResultado
      });
      setConfirmando(false);

      if (enviados > 0) {
        toast.success(`${enviados} notificação(ões) enviada(s)`);
      } else {
        toast.error('Nenhuma notificação foi enviada');
      }
      
      // Se o disparo foi apenas para usuários de teste, mantém mensagem e
      // anexos preenchidos — o próximo envio será o disparo geral
      const somenteTeste = selecionados.length > 0 && selecionados.every(d => d.tipo === 'usuario');

      if (somenteTeste) {
        toast.info('Campos mantidos — agora selecione os inscritos para o disparo geral');
      } else {
        setMensagem('');
        setNomeDisparo('');
        limparAnexos();
      }
      setSelectedUsers([]);
      setSelectAll(false);
      
    } catch (error: any) {
      toast.error('Erro ao enviar notificações: ' + error.message);
      console.error(error);
      setSelectedUsers([]);
      setSelectAll(false);
      loadUsers();
    } finally {
      setLoading(false);
      setProgresso(null);
    }
  };
  
  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="space-y-4 pb-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            title="Voltar"
            aria-label="Voltar"
            className="inline-flex items-center justify-center w-10 h-10 flex-shrink-0 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold leading-tight text-gray-900 dark:text-white">
              Disparar Notificações
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Envie avisos para sua equipe
            </p>
          </div>
          </div>
          <div className="grid grid-cols-2 md:flex md:items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/app/notificacoes/historico')}
              className="inline-flex items-center justify-center whitespace-nowrap px-3 sm:px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <History className="h-4 w-4 mr-2" />
              Histórico
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/notificacoes/configuracao')}
              className="inline-flex items-center justify-center whitespace-nowrap px-3 sm:px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configuração
            </button>
          </div>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Formulário */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Conteúdo da Notificação
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mensagem *
                </label>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  className="w-full px-4 py-2.5 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                  placeholder="Digite a mensagem da notificação..."
                  rows={4}
                  maxLength={4096}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Anexos (opcional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACEITA_MIDIA}
                  onChange={handleAnexos}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 px-4 py-5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <FileUp className="h-6 w-6" />
                  <span className="text-sm">Clique para anexar imagens, vídeos, áudios ou PDFs</span>
                </button>

                {anexos.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {anexos.map((anexo, idx) => (
                      <div key={idx} className="relative group border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700">
                        {anexo.tipo === 'imagem' && (
                          <img src={anexo.preview} alt={anexo.file.name} className="w-full h-24 object-cover" />
                        )}
                        {anexo.tipo === 'video' && (
                          <div className="relative w-full h-24 bg-black">
                            <video src={anexo.preview} className="w-full h-24 object-cover" muted />
                            <PlayCircle className="absolute inset-0 m-auto h-8 w-8 text-white/80" />
                          </div>
                        )}
                        {(anexo.tipo === 'audio' || anexo.tipo === 'pdf') && (
                          <div className="flex flex-col items-center justify-center h-24 gap-1.5">
                            {anexo.tipo === 'audio'
                              ? <Music className="h-8 w-8 text-purple-500" />
                              : <FileText className="h-8 w-8 text-red-500" />}
                            <span className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              {anexo.tipo === 'audio' ? 'Áudio' : 'PDF'}
                            </span>
                          </div>
                        )}
                        <div className="px-2 py-1 text-[11px] text-gray-500 dark:text-gray-400 truncate bg-white dark:bg-gray-800">
                          {anexo.file.name}
                        </div>
                        <input
                          type="text"
                          value={anexo.legenda}
                          onChange={(e) => alterarLegenda(idx, e.target.value)}
                          placeholder="Legenda (opcional)"
                          className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-600 outline-none placeholder:text-gray-400"
                        />
                        <button
                          type="button"
                          onClick={() => removerAnexo(idx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remover anexo"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Seleção de Usuários */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Destinatários
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {selectedUsers.length} selecionados
                </span>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Selecionar todos
                </label>
              </div>
            </div>
            
            {loadingUsers ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Carregando usuários...
              </div>
            ) : usuarios.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Nenhum destinatário com notificação ativa
              </div>
            ) : (
              (() => {
                const usuariosTeste = usuarios.filter(u => u.tipo === 'usuario');
                const todosInscritos = usuarios.filter(u => u.tipo === 'inscrito');
                const usuariosInscritos = todosInscritos.filter(u => passaFiltro(u));

                // Opções de filtro (sempre exibindo nomes, nunca UIDs)
                const unicos = (fn: (e: any) => string | null) =>
                  [...new Set(todosInscritos.map(u => u.eleitor && fn(u.eleitor)).filter(Boolean))].sort() as string[];
                const pares = (uidFn: (e: any) => string | null, nomeFn: (e: any) => string | null) => {
                  const map = new Map<string, string>();
                  todosInscritos.forEach(u => {
                    if (u.eleitor && uidFn(u.eleitor) && nomeFn(u.eleitor)) {
                      map.set(uidFn(u.eleitor)!, nomeFn(u.eleitor)!);
                    }
                  });
                  return [...map.entries()].map(([uid, nome]) => ({ uid, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
                };
                const opcoesCidade = unicos(e => e.cidade);
                const opcoesBairro = unicos(e => e.bairro);
                const opcoesGenero = unicos(e => e.genero);
                const opcoesConfiabilidade = unicos(e => e.confiabilidade);
                const opcoesIndicado = pares(e => e.indicado_uid, e => e.indicado_nome);
                const opcoesCategoria = pares(e => e.categoria_uid, e => e.categoria_nome);

                const toggleGrupo = (lista: any[]) => {
                  const keys = lista.map(u => u.key);
                  const todosSelecionados = keys.every(k => selectedUsers.includes(k));
                  if (todosSelecionados) {
                    setSelectedUsers(selectedUsers.filter(k => !keys.includes(k)));
                  } else {
                    setSelectedUsers([...new Set([...selectedUsers, ...keys])]);
                  }
                };

                const renderGrupo = (
                  titulo: string,
                  descricao: string,
                  lista: any[],
                  badge: string
                ) => {
                  if (lista.length === 0) return null;
                  const todos = lista.every(u => selectedUsers.includes(u.key));
                  return (
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{titulo}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{descricao}</p>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={todos}
                            onChange={() => toggleGrupo(lista)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          Todos
                        </label>
                      </div>
                      <div className="space-y-2">
                        {lista.map((usuario) => (
                          <div
                            key={usuario.key}
                            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(usuario.key)}
                              onChange={() => handleSelectUser(usuario.key)}
                              className="h-5 w-5 flex-shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white break-words min-w-0">
                                  {usuario.nome}
                                </p>
                                <span className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                  {badge}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                                {usuario.detalhe}
                              </p>
                            </div>
                            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="space-y-5 max-h-96 overflow-y-auto">
                    {renderGrupo(
                      'Teste (usuários do sistema)',
                      'Use este grupo para envios de teste antes do disparo geral',
                      usuariosTeste,
                      'Usuário'
                    )}

                    {/* Filtros de eleitores */}
                    {todosInscritos.length > 0 && (
                      <div className="rounded-lg border border-gray-200 dark:border-gray-600">
                        <button
                          type="button"
                          onClick={() => setFiltrosAbertos(!filtrosAbertos)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg"
                        >
                          <span className="flex items-center gap-2">
                            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                            Filtrar eleitores
                            {temFiltroAtivo() && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-700">
                                ativo
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-gray-500">
                            {usuariosInscritos.length} de {todosInscritos.length}
                          </span>
                        </button>
                        {filtrosAbertos && (
                          <div className="p-3 border-t border-gray-200 dark:border-gray-600 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <select value={filtros.cidade} onChange={e => aplicarFiltro({ cidade: e.target.value })} className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white">
                                <option value="">Cidade</option>
                                {opcoesCidade.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <select value={filtros.bairro} onChange={e => aplicarFiltro({ bairro: e.target.value })} className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white">
                                <option value="">Bairro</option>
                                {opcoesBairro.map(b => <option key={b} value={b}>{b}</option>)}
                              </select>
                              <select value={filtros.indicado_uid} onChange={e => aplicarFiltro({ indicado_uid: e.target.value })} className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white">
                                <option value="">Indicado por</option>
                                {opcoesIndicado.map(i => <option key={i.uid} value={i.uid}>{i.nome}</option>)}
                              </select>
                              <select value={filtros.categoria_uid} onChange={e => aplicarFiltro({ categoria_uid: e.target.value })} className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white">
                                <option value="">Categoria</option>
                                {opcoesCategoria.map(c => <option key={c.uid} value={c.uid}>{c.nome}</option>)}
                              </select>
                              <select value={filtros.genero} onChange={e => aplicarFiltro({ genero: e.target.value })} className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white">
                                <option value="">Gênero</option>
                                {opcoesGenero.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                              <select value={filtros.confiabilidade} onChange={e => aplicarFiltro({ confiabilidade: e.target.value })} className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white">
                                <option value="">Confiabilidade</option>
                                {opcoesConfiabilidade.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <select value={filtros.faixa} onChange={e => aplicarFiltro({ faixa: e.target.value })} className="col-span-2 w-full px-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white">
                                <option value="">Faixa etária</option>
                                <option value="0-18">Até 18 anos</option>
                                <option value="19-45">19 a 45 anos</option>
                                <option value="46+">46+ anos</option>
                              </select>
                            </div>
                            {temFiltroAtivo() && (
                              <button
                                type="button"
                                onClick={limparFiltros}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Limpar filtros
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {renderGrupo(
                      temFiltroAtivo()
                        ? `Inscritos (${usuariosInscritos.length} de ${todosInscritos.length})`
                        : 'Inscritos',
                      'Pessoas que aceitaram notificações via link de convite',
                      usuariosInscritos,
                      'Inscrito'
                    )}
                  </div>
                );
              })()
            )}
            
            {/* Botão Enviar */}
            <button
              onClick={handleClickEnviar}
              disabled={loading || selectedUsers.length === 0}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3.5 text-base font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-5 w-5" />
              {loading ? 'Enviando...' : 'Enviar Notificações'}
            </button>
          </div>
        </div>
        
        {/* Resultados */}
        {resultados && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Resultado do Envio
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                    Total de Usuários
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {resultados.total}
                </p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-200">
                    Enviados
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {resultados.enviados}
                </p>
              </div>
              
              <div className={`${resultados.sucesso ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'} rounded-lg p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  {resultados.sucesso ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  )}
                  <span className={`text-sm font-medium ${resultados.sucesso ? 'text-green-900 dark:text-green-200' : 'text-yellow-900 dark:text-yellow-200'}`}>
                    Status
                  </span>
                </div>
                <p className={`text-sm font-medium break-words ${resultados.sucesso ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                  {resultados.mensagem}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmação - ação irreversível */}
      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 pb-6 sm:p-4">
          <div className="w-full sm:max-w-md max-h-[85dvh] flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Cabeçalho */}
            <div className="flex items-center gap-3 px-4 sm:px-6 py-3 bg-blue-600 text-white flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Send className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold leading-tight">Confirmar envio</h3>
                <p className="text-[11px] text-white/80 leading-tight">
                  Ação irreversível
                </p>
              </div>
              {!loading && (
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  className="ml-auto p-1.5 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
              {loading ? (
                /* Tela de progresso durante o envio */
                <div className="py-8 flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-200 dark:border-gray-600 border-t-blue-600" />
                    <Send className="absolute inset-0 m-auto h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {progresso?.etapa || 'Processando...'}
                    </p>
                    {progresso && progresso.total > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {progresso.atual} de {progresso.total}
                      </p>
                    )}
                  </div>
                  {progresso && progresso.total > 0 && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.round((progresso.atual / progresso.total) * 100)}%` }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Não feche esta janela
                  </p>
                </div>
              ) : (
              <>
              {/* Destinatários */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                    {selectedUsers.length} destinatário{selectedUsers.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 truncate">
                    {usuarios
                      .filter(u => selectedUsers.includes(u.key))
                      .map(u => u.nome)
                      .join(', ')}
                  </p>
                </div>
              </div>

              {/* Preview da notificação */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700">
                  {company?.logo ? (
                    <img src={company.logo} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                      {(titulo || 'N')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{titulo}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">agora</p>
                  </div>
                </div>
                <div className="px-2.5 py-2 bg-white dark:bg-gray-800">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-20 overflow-y-auto">
                    {mensagem}
                  </p>
                  {anexos.length > 0 && (
                    <div className="mt-2 grid grid-cols-6 gap-1.5">
                      {anexos.slice(0, 12).map((a, i) => (
                        <div key={i} className="relative aspect-square rounded-md overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                          {a.tipo === 'imagem' && (
                            <img src={a.preview} alt="" className="w-full h-full object-cover" />
                          )}
                          {a.tipo === 'video' && (
                            <PlayCircle className="h-4 w-4 text-gray-400" />
                          )}
                          {a.tipo === 'audio' && (
                            <Music className="h-4 w-4 text-purple-500" />
                          )}
                          {a.tipo === 'pdf' && (
                            <FileText className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Identificação interna do disparo — NÃO é enviada ao usuário */}
              <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-2.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  <History className="h-3.5 w-3.5" />
                  Identificação interna do disparo
                  <span className="font-normal text-gray-400">(não aparece na notificação)</span>
                </label>
                <input
                  type="text"
                  value={nomeDisparo}
                  onChange={(e) => setNomeDisparo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Se vazio, usa data e hora do envio"
                  maxLength={80}
                />
                <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                  Uso exclusivo no histórico para acompanhar o resultado deste envio.
                </p>
              </div>

              {/* Aviso */}
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-800 dark:text-yellow-300">
                  <strong>Ação irreversível:</strong> as notificações serão entregues
                  imediatamente nos dispositivos dos destinatários.
                </p>
              </div>
              </>
              )}
            </div>

            {/* Ações */}
            <div className="flex gap-2 px-4 sm:px-6 py-3 bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                disabled={loading}
                className="flex-1 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEnviar}
                disabled={loading}
                className="flex-1 px-3 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Send className="h-4 w-4" />
                {loading ? 'Enviando...' : 'Enviar agora'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
