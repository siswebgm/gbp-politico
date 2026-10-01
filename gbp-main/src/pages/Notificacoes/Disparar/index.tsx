import { useState, useEffect } from 'react';
import { Send, Users, CheckCircle, AlertCircle, ArrowLeft, Settings, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { notificationLogsService } from '../../../services/notificationLogs';
import { notificationService } from '../../../services/notificationService';
import { notificationSubscribersService } from '../../../services/notificationSubscribers';
import { toast } from 'react-toastify';

export default function DispararNotificacao() {
  const { company } = useCompanyStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Formulário
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [linkDirecionar, setLinkDirecionar] = useState('');
  const [tipoMidia, setTipoMidia] = useState<'texto' | 'imagem' | 'video' | 'audio' | 'pdf'>('texto');
  const [urlMidia, setUrlMidia] = useState('');
  
  // Seleção de usuários
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Resultados
  const [resultados, setResultados] = useState<any>(null);
  
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

      const listaInscritos = inscritosData
        .filter((i) => i.ativo && i.permissao === 'granted')
        .map((i) => ({
          key: `i:${i.uid}`,
          tipo: 'inscrito',
          uid: i.uid,
          nome: i.nome || 'Inscrito sem nome',
          detalhe: i.telefone || 'Via link de convite',
          token: i.token
        }));

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
  
  const handleEnviar = async () => {
    if (!titulo || !mensagem) {
      toast.error('Preencha o título e a mensagem');
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
      const selecionados = usuarios.filter(u => selectedUsers.includes(u.key));

      // Criar logs para cada destinatário
      const logs = await Promise.all(
        selecionados.map(dest =>
          notificationLogsService.createLog({
            empresa_uid: company.uid,
            ...(dest.tipo === 'usuario' ? { usuario_uid: dest.uid } : { inscrito_uid: dest.uid }),
            titulo,
            mensagem,
            imagem_url: imagemUrl || undefined,
            link_direcionar: linkDirecionar || undefined,
            tipo_midia: tipoMidia !== 'texto' ? tipoMidia : undefined,
            url_midia: urlMidia || undefined
          })
        )
      );
      
      const linkFinal = linkDirecionar
        ? /^https?:\/\//i.test(linkDirecionar)
          ? linkDirecionar
          : `${window.location.origin}${linkDirecionar.startsWith('/') ? '' : '/'}${linkDirecionar}`
        : undefined;

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
        const resultadosEnvio = await notificationService.enviarParaTokens({
          tokens: comToken.map(d => d.token as string),
          title: titulo,
          body: mensagem,
          imagem_url: imagemUrl || undefined,
          link: linkFinal,
          data: {
            tipo_midia: tipoMidia,
            url_midia: urlMidia || ''
          }
        });

        await Promise.all(
          selecionados.map((dest, idx) => {
            if (!dest.token) return Promise.resolve();
            const r = resultadosEnvio.find(x => x.token === dest.token);
            if (r?.success) {
              enviados++;
              return notificationLogsService.markAsSent(logs[idx].uid);
            }
            falhas++;
            if (r?.invalid_token) {
              if (dest.tipo === 'inscrito') {
                notificationSubscribersService.alterarAtivo(dest.uid, false).catch(() => undefined);
              } else {
                notificationService.handleInvalidToken(dest.token, dest.uid);
              }
            }
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

      if (enviados > 0) {
        toast.success(`${enviados} notificação(ões) enviada(s)`);
      } else {
        toast.error('Nenhuma notificação foi enviada');
      }
      
      // Limpar formulário
      setTitulo('');
      setMensagem('');
      setImagemUrl('');
      setLinkDirecionar('');
      setTipoMidia('texto');
      setUrlMidia('');
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
                  Título *
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full px-4 py-2.5 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Ex: Nova atualização disponível"
                  maxLength={1024}
                />
              </div>
              
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
                  Tipo de Mídia
                </label>
                <select
                  value={tipoMidia}
                  onChange={(e) => setTipoMidia(e.target.value as any)}
                  className="w-full px-4 py-2.5 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="texto">Apenas Texto</option>
                  <option value="imagem">Imagem</option>
                  <option value="video">Vídeo (Link)</option>
                  <option value="audio">Áudio (Link)</option>
                  <option value="pdf">PDF (Link)</option>
                </select>
              </div>
              
              {tipoMidia === 'imagem' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    URL da Imagem
                  </label>
                  <input
                    type="text"
                    value={imagemUrl}
                    onChange={(e) => setImagemUrl(e.target.value)}
                    className="w-full px-4 py-2.5 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                </div>
              )}
              
              {(tipoMidia === 'video' || tipoMidia === 'audio' || tipoMidia === 'pdf') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    URL da Mídia
                  </label>
                  <input
                    type="text"
                    value={urlMidia}
                    onChange={(e) => setUrlMidia(e.target.value)}
                    className="w-full px-4 py-2.5 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="https://exemplo.com/arquivo"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Link de Redirecionamento
                </label>
                <input
                  type="text"
                  value={linkDirecionar}
                  onChange={(e) => setLinkDirecionar(e.target.value)}
                  className="w-full px-4 py-2.5 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="/app/dashboard"
                />
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
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {usuarios.map((usuario) => (
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
                          {usuario.tipo === 'usuario' ? 'Usuário' : 'Inscrito'}
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
            )}
            
            {/* Botão Enviar */}
            <button
              onClick={handleEnviar}
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
    </div>
  );
}
