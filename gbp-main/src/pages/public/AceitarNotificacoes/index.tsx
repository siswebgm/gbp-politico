import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Bell, BellRing, Check, CheckCircle, XCircle, AlertCircle, User, Phone, Loader2 } from 'lucide-react';
import { forceRefreshToken } from '../../../lib/firebase';
import { notificationSubscribersService, EmpresaPublica } from '../../../services/notificationSubscribers';
import { supabaseClient } from '../../../lib/supabase';

type Etapa = 'inicial' | 'processando' | 'sucesso' | 'negado' | 'nao_suportado' | 'ja_inscrito' | 'erro';
type MotivoNegado = 'bloqueado' | 'ignorado' | 'inseguro';

export function AceitarNotificacoes() {
  const { empresa_uid, eleitor_uid } = useParams<{ empresa_uid: string; eleitor_uid?: string }>();
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [etapa, setEtapa] = useState<Etapa>('inicial');
  const [mensagemErro, setMensagemErro] = useState('');
  const [semToken, setSemToken] = useState(false);
  const [motivoNegado, setMotivoNegado] = useState<MotivoNegado>('bloqueado');
  const [empresa, setEmpresa] = useState<EmpresaPublica | null>(null);
  const [logoFalhou, setLogoFalhou] = useState(false);

  useEffect(() => {
    if (!empresa_uid) return;
    let ativo = true;
    notificationSubscribersService
      .buscarEmpresaPublica(empresa_uid)
      .then((dados) => {
        if (ativo) setEmpresa(dados);
      })
      .catch((e) => console.error('[AceitarNotificacoes] Falha ao carregar empresa:', e));
    return () => {
      ativo = false;
    };
  }, [empresa_uid]);

  // Buscar dados do eleitor se eleitor_uid for fornecido
  useEffect(() => {
    const fetchEleitor = async () => {
      if (!eleitor_uid) return;
      try {
        const { data, error } = await supabaseClient
          .from('gbp_eleitores')
          .select('nome, whatsapp')
          .eq('uid', eleitor_uid)
          .single();
        
        if (!error && data) {
          setNome(data.nome || '');
          setTelefone(data.whatsapp || '');
        }
      } catch (e) {
        console.error('[AceitarNotificacoes] Falha ao carregar eleitor:', e);
      }
    };
    
    fetchEleitor();
  }, [eleitor_uid]);

  const exibirLogo = !!empresa?.logo && !logoFalhou;
  // Com eleitor_uid, os dados já vêm do cadastro — não precisa pedir ao usuário
  const identificado = !!eleitor_uid;
  const primeiroNome = nome.trim().split(' ')[0] || '';

  const suportado = typeof window !== 'undefined' && 'Notification' in window;

  const handleAtivar = async () => {
    if (!empresa_uid) return;

    if (!suportado) {
      setEtapa('nao_suportado');
      return;
    }

    if (!window.isSecureContext) {
      setMotivoNegado('inseguro');
      setEtapa('negado');
      return;
    }

    setEtapa('processando');
    try {
      const permissao = await Notification.requestPermission();

      if (permissao === 'default') {
        setMotivoNegado('ignorado');
        setEtapa('negado');
        return;
      }

      if (permissao === 'denied') {
        await notificationSubscribersService.registrar({
          empresa_uid,
          eleitor_uid,
          nome,
          telefone,
          permissao
        });
        setMotivoNegado('bloqueado');
        setEtapa('negado');
        return;
      }

      // Força token NOVO — sem isso o dispositivo devolve o token em cache
      // mesmo quando o FCM já o marcou como 'unregistered' (reativação ficava
      // presa com token morto)
      const token = await forceRefreshToken();
      setSemToken(!token);

      await notificationSubscribersService.registrar({
        empresa_uid,
        eleitor_uid,
        nome,
        telefone,
        token,
        permissao: 'granted'
      });
      setEtapa('sucesso');
    } catch (error: any) {
      if (error?.code === 'JA_REGISTRADO') {
        setEtapa('ja_inscrito');
        return;
      }
      setMensagemErro(error?.message || 'Não foi possível concluir a ativação.');
      setEtapa('erro');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-white flex items-center justify-center px-5 py-4">
      <div className="w-full max-w-sm bg-white">
        {(etapa === 'inicial' || etapa === 'processando') && (
          <>
            <div className="flex justify-center mb-3">
              {exibirLogo ? (
                <div className="relative h-24 w-24 rounded-full overflow-hidden bg-gray-50 ring-4 ring-white shadow-lg shadow-gray-900/20 border border-gray-200">
                  <img
                    src={empresa!.logo!}
                    alt={empresa?.nome ? `Foto de ${empresa.nome}` : 'Foto da empresa'}
                    onError={() => setLogoFalhou(true)}
                    className="absolute object-cover max-w-none"
                    style={{ width: '150%', height: '150%', left: '-49%', top: '-25%' }}
                  />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/30">
                  <BellRing className="h-8 w-8 text-white" />
                </div>
              )}
            </div>

            {empresa?.nome && (
              <p className="text-center text-sm font-semibold uppercase tracking-wide text-blue-600">
                {empresa.nome}
              </p>
            )}
            <h1 className="text-2xl font-bold text-gray-900 text-center leading-snug">
              {identificado && primeiroNome ? `Olá, ${primeiroNome}!` : 'Ative as notificações'}
            </h1>
            <p className="mt-1 mb-4 text-sm text-gray-500 text-center whitespace-nowrap">
              {identificado && primeiroNome
                ? 'Ative as notificações no seu celular.'
                : 'Receba avisos e novidades no seu celular.'}
            </p>

            <ul className="mb-4 space-y-2 rounded-2xl bg-blue-50/70 px-4 py-3">
              {['Avisos em tempo real', 'Sem spam, só o que importa', 'Cancele quando quiser'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm font-medium text-gray-700">
                  <span className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            {!identificado && (
              <div className="space-y-2.5 mb-4">
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    autoComplete="name"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome (opcional)"
                    className="w-full h-11 pl-11 pr-4 text-base bg-gray-50 border border-gray-200 rounded-xl placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="Seu WhatsApp (opcional)"
                    className="w-full h-11 pl-11 pr-4 text-base bg-gray-50 border border-gray-200 rounded-xl placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleAtivar}
              disabled={etapa === 'processando'}
              className="w-full h-12 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl text-base font-semibold shadow-md shadow-blue-600/25 active:scale-[0.98] hover:bg-blue-700 disabled:bg-gray-400 disabled:shadow-none transition"
            >
              {etapa === 'processando' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Ativando...
                </>
              ) : (
                <>
                  <Bell className="h-5 w-5" />
                  Ativar notificações
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">
              O celular vai pedir permissão. Toque em <span className="font-semibold text-gray-600">"Permitir"</span>.
            </p>
          </>
        )}

        {etapa === 'sucesso' && (
          <div className="text-center">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 whitespace-nowrap">Obrigado pela confiança!</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              <span className="block whitespace-nowrap">Notificações ativadas com sucesso.</span>
              <span className="block whitespace-nowrap">Você receberá nossos avisos por aqui.</span>
            </p>
            {semToken && (
              <p className="text-sm text-yellow-700 bg-yellow-50 rounded-2xl p-4 mt-5">
                Permissão registrada. O serviço de envio ainda está sendo configurado.
              </p>
            )}
            <a
              href="https://www.google.com"
              className="mt-8 inline-flex items-center justify-center gap-1 px-4 py-3 text-sm font-medium text-gray-400 hover:text-gray-600 active:text-gray-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </a>
          </div>
        )}

        {etapa === 'ja_inscrito' && (
          <div className="text-center">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Você já está inscrito!
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              <span className="block whitespace-nowrap">Este dispositivo já recebe nossas notificações.</span>
              <span className="block whitespace-nowrap">Não precisa ativar novamente.</span>
            </p>
            <a
              href="https://www.google.com"
              className="mt-8 inline-flex items-center justify-center gap-1 px-4 py-3 text-sm font-medium text-gray-400 hover:text-gray-600 active:text-gray-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </a>
          </div>
        )}

        {etapa === 'negado' && (
          <div className="text-center">
            <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {motivoNegado === 'inseguro' ? 'Conexão não segura' : 'Permissão não concedida'}
            </h2>
            <p className="text-base text-gray-600 leading-relaxed mb-5">
              {motivoNegado === 'inseguro' &&
                'Este endereço não usa HTTPS, e o navegador bloqueia notificações nele. Abra o link oficial (https) para ativar.'}
              {motivoNegado === 'ignorado' &&
                'O aviso de permissão foi fechado sem resposta. Toque em tentar novamente e escolha "Permitir".'}
              {motivoNegado === 'bloqueado' &&
                'As notificações estão bloqueadas neste navegador. Toque no cadeado ao lado do endereço, abra "Permissões", libere as notificações e tente novamente. Se abriu o link dentro do WhatsApp ou Instagram, abra no Chrome ou Safari.'}
            </p>
            {motivoNegado !== 'inseguro' && (
              <button
                onClick={() => setEtapa('inicial')}
                className="w-full h-12 bg-blue-600 text-white rounded-xl text-base font-semibold shadow-md shadow-blue-600/25 active:scale-[0.98] hover:bg-blue-700 transition"
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}

        {etapa === 'nao_suportado' && (
          <div className="text-center">
            <div className="h-20 w-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-10 w-10 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Navegador não suportado</h2>
            <p className="text-base text-gray-600 leading-relaxed">
              Este navegador não permite notificações. No iPhone, toque em Compartilhar, escolha "Adicionar à Tela de Início" e abra o site por lá.
            </p>
          </div>
        )}

        {etapa === 'erro' && (
          <div className="text-center">
            <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ops, algo deu errado</h2>
            <p className="text-base text-gray-600 leading-relaxed mb-5">{mensagemErro}</p>
            <button
              onClick={() => setEtapa('inicial')}
              className="w-full h-12 bg-blue-600 text-white rounded-xl text-base font-semibold shadow-md shadow-blue-600/25 active:scale-[0.98] hover:bg-blue-700 transition"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AceitarNotificacoes;
