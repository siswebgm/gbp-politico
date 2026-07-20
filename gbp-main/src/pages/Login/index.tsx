import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Eye, EyeOff, ShieldOff, RefreshCw } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { authService, AuthError } from '../../services/auth';
import { useToast } from '../../components/ui/use-toast'; // Importação corrigida
import { CreateCompanyModal } from './components/CreateCompanyModal';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";

export function Login() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { toast } = useToast(); // Usando o hook padrão
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isBloqueadoModalOpen, setIsBloqueadoModalOpen] = useState(false);
  const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryDigits, setRecoveryDigits] = useState('');
  const [recoveryAttemptsWarning, setRecoveryAttemptsWarning] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [attemptsWarning, setAttemptsWarning] = useState<number | null>(null);
  const [mathNum1, setMathNum1] = useState(() => Math.floor(Math.random() * 10) + 1);
  const [mathNum2, setMathNum2] = useState(() => Math.floor(Math.random() * 10) + 1);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [captchaError, setCaptchaError] = useState(false);
  const captchaInputRef = useRef<HTMLInputElement>(null);
  const logoTapCountRef = useRef(0);
  const logoTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expectedCaptchaResult = mathNum1 + mathNum2;
  const isCaptchaValid = Number(captchaAnswer) === expectedCaptchaResult && honeypot === '';

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    body.classList.add('public-page-scroll');
    html.classList.add('public-page-scroll');

    return () => {
      body.classList.remove('public-page-scroll');
      html.classList.remove('public-page-scroll');
      if (logoTapTimerRef.current) clearTimeout(logoTapTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleSecretKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setShowCreateCompany(true);
        setIsModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleSecretKey);
    return () => window.removeEventListener('keydown', handleSecretKey);
  }, []);

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email necessário",
        description: "Por favor, insira seu email primeiro.",
        variant: "destructive"
      });
      return;
    }

    setRecoveryDigits('');
    setRecoveryAttemptsWarning(null);
    setIsRecoveryModalOpen(true);
  };

  const handleRecoveryVerify = async () => {
    const digits = recoveryDigits.replace(/\D/g, '');
    
    if (digits.length !== 4) {
      toast({
        title: "Código inválido",
        description: "Informe os 4 últimos dígitos do contato cadastrado.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsRecoveryLoading(true);
      
      await authService.validateRecoveryContact(email, digits);

      const payload = { Email: email };

      console.log('Enviando requisição de recuperação:', payload);

      const response = await fetch('https://whkn8n.guardia.work/webhook/esqueci_senha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('Status da resposta:', response.status);

      if (response.ok) {
        setIsRecoveryModalOpen(false);
        setRecoveryAttemptsWarning(null);
        toast({
          title: "Verifique seu email",
          description: "Instruções de recuperação foram enviadas para seu email.",
          variant: "success"
        });
      } else {
        const errorData = await response.text();
        console.error('Resposta de erro:', errorData);
        throw new Error('Falha ao enviar email de recuperação');
      }
    } catch (error) {
      console.error('Erro na recuperação:', error);
      if (error instanceof AuthError) {
        if (error.message === 'conta_bloqueada') {
          setIsRecoveryModalOpen(false);
          setIsBloqueadoModalOpen(true);
        } else if (error.message === 'conta_inativa') {
          setIsRecoveryModalOpen(false);
          setErrorMessage('Sua conta está temporariamente inativa. Por favor, entre em contato com o administrador do sistema para mais informações.');
          setIsErrorModalOpen(true);
        } else if (error.message.includes('tentativa')) {
          const match = error.message.match(/(\d+) tentativa/);
          setRecoveryAttemptsWarning(match ? parseInt(match[1]) : null);
        } else {
          setRecoveryAttemptsWarning(null);
          toast({
            title: "Erro",
            description: error.message,
            variant: "destructive"
          });
        }
      } else if (error instanceof Error) {
        setRecoveryAttemptsWarning(null);
        toast({
          title: "Erro",
          description: error.message || "Erro ao solicitar recuperação de senha. Tente novamente.",
          variant: "destructive"
        });
      } else {
        setRecoveryAttemptsWarning(null);
        toast({
          title: "Erro",
          description: "Erro ao solicitar recuperação de senha. Tente novamente.",
          variant: "destructive"
        });
      }
    } finally {
      setIsRecoveryLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value.toLowerCase());
  };

  const handleLogoTap = () => {
    logoTapCountRef.current += 1;
    if (logoTapCountRef.current === 1) {
      logoTapTimerRef.current = setTimeout(() => {
        logoTapCountRef.current = 0;
      }, 2000);
    }
    if (logoTapCountRef.current >= 5) {
      if (logoTapTimerRef.current) clearTimeout(logoTapTimerRef.current);
      logoTapCountRef.current = 0;
      setShowCreateCompany(true);
      setIsModalOpen(true);
    }
  };

  const refreshMathCaptcha = () => {
    setMathNum1(Math.floor(Math.random() * 10) + 1);
    setMathNum2(Math.floor(Math.random() * 10) + 1);
    setCaptchaAnswer('');
    setCaptchaError(false);
  };

  const onSubmit = async (data: { email: string; password: string }) => {
    if (!data.email || !data.password) {
      toast({
        title: "Erro de Validação",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    if (!isCaptchaValid) {
      setCaptchaError(true);
      captchaInputRef.current?.focus();
      captchaInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast({
        title: "Verificação necessária",
        description: "Responda corretamente à soma de segurança antes de entrar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const result = await auth.login(data.email, data.password);
      
      if (result) {
        // Navega diretamente para a página principal após o login bem-sucedido.
        navigate('/app', { replace: true });
      }
      
    } catch (error) {
      console.error('Erro no login:', error);
      if (error instanceof Error) {
        if (error.message === 'conta_bloqueada') {
          setIsBloqueadoModalOpen(true);
        } else if (error.message === 'conta_inativa' || error.message.includes('conta está inativa')) {
          setErrorMessage('Sua conta está temporariamente inativa. Por favor, entre em contato com o administrador do sistema para mais informações.');
          setIsErrorModalOpen(true);
        } else if (error.message.includes('tentativa')) {
          const match = error.message.match(/(\d+) tentativa/);
          setAttemptsWarning(match ? parseInt(match[1]) : null);
        } else {
          setAttemptsWarning(null);
          toast({
            title: "Erro de Autenticação",
            description: String(error.message || "Email ou senha incorretos"),
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Erro Inesperado",
          description: "Ocorreu um erro inesperado. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      refreshMathCaptcha();
      setHoneypot('');
    }
  };

  const handleCompanyCreated = (email: string) => {
    setEmail(email);
    setIsModalOpen(false);
    toast({
      title: "Empresa criada com sucesso!",
      variant: "success",
      style: {
        background: 'linear-gradient(to right, #2563eb, #3b82f6)',
        color: '#fff',
        border: 'none',
      },
      duration: 5000,
    });
  };

  return (
    <>
      <div className="min-h-screen flex md:flex-row flex-col">
        {/* Parte superior/esquerda - Fundo azul com logo e descrição */}
        <div className="md:w-1/2 h-[24vh] md:min-h-screen md:static relative bg-blue-600">
          <div className="md:flex hidden h-full flex-col items-center justify-center py-8 px-6 text-white relative overflow-hidden">
            {/* Conteúdo desktop - mantido como estava */}
            {/* Marca d'água */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'url(/icons/icon-512x512.png)',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundSize: '75%',
                transform: 'scale(1.5)',
                filter: 'blur(1px)'
              }}
            />
            
            {/* Overlay gradiente */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-600/30 to-blue-600/80" />

            {/* Conteúdo */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-2">
                <img 
                  src="/icons/icon-512x512.png"
                  alt="GBP Político"
                  onClick={handleLogoTap}
                  className="h-16 w-16 drop-shadow-lg"
                />
              </div>
              <h1 className="text-2xl font-semibold mb-2 drop-shadow-lg">GBP Político</h1>
              <p className="text-center text-white/90 mb-12 drop-shadow">
                Gerencie seus processos políticos de forma eficiente e organizada
              </p>
              <div className="space-y-4 w-full max-w-md backdrop-blur-sm bg-white/5 rounded-lg p-6">
                <div className="flex items-center space-x-3 text-white">
                  <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">✓</div>
                  <p className="text-sm">Cadastro inteligente de eleitores</p>
                </div>
                <div className="flex items-center space-x-3 text-white">
                  <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">📊</div>
                  <p className="text-sm">Relatórios completos em segundos!</p>
                </div>
                <div className="flex items-center space-x-3 text-white">
                  <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">🔍</div>
                  <p className="text-sm">Mapeamento preciso da base eleitoral!</p>
                </div>
                <div className="flex items-center space-x-3 text-white">
                  <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">📱</div>
                  <p className="text-sm">Disparo em massa fácil e rápido!</p>
                </div>
                <div className="flex items-center space-x-3 text-white">
                  <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">🎉</div>
                  <p className="text-sm">Envio automático de aniversários!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Versão mobile */}
          <div className="md:hidden flex flex-col items-center justify-center text-white h-full relative overflow-hidden">
            {/* Marca d'água para mobile */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'url(/icons/icon-512x512.png)',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundSize: '35%',
                transform: 'scale(1.2)',
                filter: 'blur(1px)'
              }}
            />
            
            {/* Conteúdo mobile */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-2">
                <img 
                  src="/icons/icon-512x512.png"
                  alt="GBP Político"
                  onClick={handleLogoTap}
                  className="h-16 w-16 drop-shadow-lg"
                />
              </div>
              <h1 className="text-2xl font-semibold mb-2 drop-shadow-lg text-center">GBP Político</h1>
            </div>
          </div>
        </div>

        {/* Parte inferior/direita - Formulário de login */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center min-h-[60vh] md:min-h-full py-6 px-4 md:px-8 relative z-20">
          <div className="w-full max-w-md space-y-4 md:space-y-6">
            <div className="bg-white rounded-3xl shadow-lg p-8">
              {/* Título mobile */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-bold text-blue-600 tracking-tight">
                  Bem-vindo!
                </h2>
                <p className="text-base md:text-lg text-gray-600">
                  
                </p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); onSubmit({ email, password }); }} 
                className="space-y-4 md:space-y-6">
                <div className="space-y-4 md:space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Seu email
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-blue-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        required
                        className="block w-full pl-10 pr-3 py-2.5 md:py-3 border border-gray-300 rounded-xl shadow-sm text-gray-900 placeholder-gray-400 
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all
                        hover:border-blue-300"
                        autoFocus
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Sua senha
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-blue-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setAttemptsWarning(null); }}
                        required
                        className="block w-full pl-10 pr-12 py-2.5 md:py-3 border border-gray-300 rounded-xl shadow-sm text-gray-900 placeholder-gray-400 
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all
                        hover:border-blue-300"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Verificação de segurança simples: substitui reCAPTCHA de teste */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Verificação de segurança
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 text-base text-gray-800 font-medium bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100">
                      Quanto é {mathNum1} + {mathNum2}?
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={captchaAnswer}
                      ref={captchaInputRef}
                      onChange={(e) => {
                        setCaptchaAnswer(e.target.value);
                        setCaptchaError(false);
                      }}
                      placeholder="Resposta"
                      required
                      className={`block w-full px-3 py-2.5 border rounded-xl shadow-sm text-gray-900 focus:outline-none focus:ring-2 transition-all ${
                        captchaError
                          ? 'border-red-500 bg-red-50/30 placeholder-red-400 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-transparent hover:border-blue-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={refreshMathCaptcha}
                      aria-label="Trocar soma de segurança"
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                  </div>
                  {/* Honeypot: campo oculto para bots */}
                  <input
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                  />
                </div>

                <button
                  type={isCaptchaValid ? "submit" : "button"}
                  disabled={isLoading}
                  onClick={(e) => {
                    if (!isCaptchaValid) {
                      e.preventDefault();
                      setCaptchaError(true);
                      captchaInputRef.current?.focus();
                      captchaInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      toast({
                        title: "Verificação necessária",
                        description: "Responda corretamente à soma de segurança acima antes de entrar.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className={`w-full flex justify-center items-center py-2.5 md:py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-white
                  transition-all duration-200 shadow-md ${
                    isLoading
                      ? "bg-gray-400 cursor-not-allowed opacity-70"
                      : !isCaptchaValid
                      ? "bg-gray-300 cursor-pointer hover:bg-gray-300"
                      : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg cursor-pointer"
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                      Entrando...
                    </>
                  ) : (
                    "Entrar no Sistema"
                  )}
                </button>

                {/* Aviso de tentativas restantes */}
                {attemptsWarning !== null && (
                  <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">
                      Senha incorreta.{' '}
                      <strong className="text-red-600">
                        {attemptsWarning} tentativa{attemptsWarning === 1 ? '' : 's'} restante{attemptsWarning === 1 ? '' : 's'}
                      </strong>{' '}
                      antes do bloqueio.
                    </span>
                  </div>
                )}
              </form>

              <div className="flex flex-col items-center gap-4 text-center">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isRecoveryLoading}
                  className="mt-4 text-sm text-blue-600 hover:text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded px-2 py-1"
                >
                  Esqueci minha senha
                </button>

                {showCreateCompany && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 
                    transition-all hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 
                    focus:ring-blue-500 rounded-lg px-4 py-2 hover:bg-blue-50"
                  >
                    <span className="mr-2">🏢</span>
                    Cadastrar nova empresa
                  </button>
                )}
              </div>
            </div>

            {/* Link discreto para baixar o app na Play Store */}
            <a
              href="https://play.google.com/apps/internaltest/4701148402452716879"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Baixar aplicativo na Play Store"
              className="md:hidden flex items-center justify-center gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors"
            >
              <img
                src="https://studio.gbppolitico.com/storage/v1/object/public/jmapps/google-play-store-logo-png-transparent-png-logos-10.png"
                alt="Play Store"
                className="h-7 w-auto object-contain rounded"
              />
              Baixar app
            </a>
          </div>
        </div>

        {/* Modal de Erro para Usuário Inativo */}
        <Dialog open={isErrorModalOpen} onOpenChange={setIsErrorModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-6 w-6" />
                <DialogTitle className="text-lg font-semibold">
                  Conta Inativa
                </DialogTitle>
              </div>
            </DialogHeader>
            
            <div className="py-4">
              <DialogDescription className="text-base text-gray-700 dark:text-gray-300">
                {errorMessage}
              </DialogDescription>
            </div>

            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setIsErrorModalOpen(false)}
                className="w-full"
              >
                Entendi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Conta Bloqueada */}
        <Dialog open={isBloqueadoModalOpen} onOpenChange={setIsBloqueadoModalOpen}>
          <DialogContent className="sm:max-w-[440px] max-w-[calc(100vw-2rem)] px-6">
            <DialogHeader>
              <div className="flex items-center gap-2 text-red-600">
                <ShieldOff className="h-6 w-6" />
                <DialogTitle className="text-lg font-semibold">
                  Conta Bloqueada
                </DialogTitle>
              </div>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <DialogDescription className="text-base text-gray-700 dark:text-gray-300">
                Sua conta foi <strong>bloqueada</strong> após múltiplas tentativas de acesso com senha incorreta.
              </DialogDescription>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                Para liberar o acesso, entre em contato com o <strong>administrador do sistema</strong>. 
                Ele poderá redefinir sua senha e desbloquear sua conta.
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setIsBloqueadoModalOpen(false)}
                className="w-full"
              >
                Entendi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de verificação de contato para recuperação de senha */}
        <Dialog open={isRecoveryModalOpen} onOpenChange={(open) => !isRecoveryLoading && setIsRecoveryModalOpen(open)}>
          <DialogContent className="sm:max-w-[440px] max-w-[calc(100vw-2rem)] px-6">
            <DialogHeader>
              <div className="flex items-center gap-2 text-blue-600">
                <Lock className="h-6 w-6" />
                <DialogTitle className="text-lg font-semibold">
                  Verificação de segurança
                </DialogTitle>
              </div>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <DialogDescription className="text-base text-gray-700 dark:text-gray-300">
                Para prosseguir com a recuperação de senha, informe os <strong>4 últimos dígitos</strong> do contato cadastrado.
              </DialogDescription>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={recoveryDigits}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 4) setRecoveryDigits(val);
                  setRecoveryAttemptsWarning(null);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRecoveryVerify(); }}
                placeholder="0000"
                disabled={isRecoveryLoading}
                className="block w-full px-3 py-2.5 text-center text-2xl tracking-[0.5em] border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-500"
              />
              {recoveryAttemptsWarning !== null && (
                <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    Código incorreto.{' '}
                    <strong className="text-red-600">
                      {recoveryAttemptsWarning} tentativa{recoveryAttemptsWarning === 1 ? '' : 's'} restante{recoveryAttemptsWarning === 1 ? '' : 's'}
                    </strong>{' '}
                    antes do bloqueio.
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-row gap-1 sm:gap-2 mt-4">
              <Button
                variant="secondary"
                onClick={() => setIsRecoveryModalOpen(false)}
                disabled={isRecoveryLoading}
                className="w-full"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRecoveryVerify}
                disabled={isRecoveryLoading || recoveryDigits.replace(/\D/g, '').length !== 4}
                className="w-full"
              >
                {isRecoveryLoading ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Enviando...
                  </span>
                ) : (
                  'Confirmar'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal existente de criar empresa */}
        <CreateCompanyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={(email) => handleCompanyCreated(email)}
        />
      </div>
    </>
  );
}

export default Login;
