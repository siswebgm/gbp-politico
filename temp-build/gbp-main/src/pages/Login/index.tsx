import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
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
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email necessário",
        description: "Por favor, insira seu email primeiro.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsRecoveringPassword(true);
      
      const payload = {
        Email: email
      };

      console.log('Enviando requisição:', payload);

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
      toast({ 
        title: "Erro", 
        description: "Erro ao solicitar recuperação de senha. Tente novamente.", 
        variant: "destructive" 
      });
      console.error('Erro:', error);
    } finally {
      setIsRecoveringPassword(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value.toLowerCase());
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
        if (error.message.includes('conta está inativa')) {
          setErrorMessage('Sua conta está temporariamente inativa. Por favor, entre em contato com o administrador do sistema para mais informações.');
          setIsErrorModalOpen(true);
        } else {
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
    }
  };

  const handleCompanyCreated = (email: string) => {
    setEmail(email);
    setIsModalOpen(false);
    toast.success("Empresa criada com sucesso!", {
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
        <div className="md:w-1/2 h-[30vh] md:min-h-screen md:static relative bg-blue-600 z-10">
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
              <div className="mb-6">
                <img 
                  src="/icons/icon-512x512.png"
                  alt="GBP Político"
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
              <div className="mb-6">
                <img 
                  src="/icons/icon-512x512.png"
                  alt="GBP Político"
                  className="h-16 w-16 drop-shadow-lg"
                />
              </div>
              <h1 className="text-2xl font-semibold mb-2 drop-shadow-lg text-center">GBP Político</h1>
            </div>
          </div>
        </div>

        {/* Parte inferior/direita - Formulário de login */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center min-h-[60vh] md:min-h-full py-6 px-4 md:px-8 relative">
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
                        onChange={(e) => setPassword(e.target.value)}
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

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center items-center py-2.5 md:py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-white
                  bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                  transition-all transform hover:scale-[1.02] active:scale-[0.98]
                  shadow-md hover:shadow-lg ${
                    isLoading ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                      Entrando...
                    </>
                  ) : (
                    'Entrar no Sistema'
                  )}
                </button>
              </form>

              <div className="flex flex-col items-center gap-4 text-center">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isRecoveringPassword}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded px-2 py-1"
                >
                  {isRecoveringPassword ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                      Enviando...
                    </span>
                  ) : (
                    'Esqueci minha senha'
                  )}
                </button>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 
                  transition-all hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 
                  focus:ring-blue-500 rounded-lg px-4 py-2 hover:bg-blue-50"
                >
                  <span className="mr-2">🏢</span>
                  Cadastrar nova empresa
                </button>
              </div>
            </div>
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