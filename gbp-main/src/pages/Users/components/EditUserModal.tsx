import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '../../../components/ui/alert-dialog';
import { userService } from '../../../services/users';
import { toast } from 'react-hot-toast';
import { 
  UserCircle2, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Activity, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  ShieldOff,
  KeyRound,
  Copy,
  Check
} from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';

// Gera uma senha aleatória segura (8 caracteres: letras maiúsculas, minúsculas e números)
function generateRandomPassword(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: {
    uid: string;
    nome: string | null;
    email: string | null;
    contato: string | null;
    nivel_acesso: string | null;
    status: string | null;
    tentativas_login?: number;
  } | null;
}

export function EditUserModal({ isOpen, onClose, onSuccess, user }: EditUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    contato: '',
    nivel_acesso: '',
    status: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nome: user.nome || '',
        email: user.email || '',
        contato: user.contato || '',
        nivel_acesso: user.nivel_acesso || '',
        status: user.status || ''
      });
    }
  }, [user]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      email: e.target.value.toLowerCase()
    }));
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    // Validação dos campos obrigatórios
    if (!formData.nome.trim()) {
      toast.error('O campo Nome é obrigatório');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('O campo Email é obrigatório');
      return;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    if (!formData.nivel_acesso) {
      toast.error('O campo Nível de Acesso é obrigatório');
      return;
    }

    if (!formData.status) {
      toast.error('O campo Status é obrigatório');
      return;
    }

    try {
      setLoading(true);

      // Remove a formatação do contato antes de enviar
      const cleanedData = {
        ...formData,
        contato: formData.contato.replace(/\D/g, '')
      };

      await userService.update(user.uid, {
        nome: cleanedData.nome.trim(),
        email: cleanedData.email.trim().toLowerCase(),
        contato: cleanedData.contato,
        nivel_acesso: cleanedData.nivel_acesso as any,
        status: cleanedData.status as any,
      });

      toast.success('Usuário atualizado com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro ao atualizar usuário. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUnlock = async () => {
    if (!user) return;
    setUnlocking(true);
    try {
      const newPassword = generateRandomPassword();

      await supabaseClient
        .from('gbp_usuarios')
        .update({ status: 'active', tentativas_login: 0, senha: newPassword })
        .eq('uid', user.uid);

      setGeneratedPassword(newPassword);
      setShowUnlockConfirm(false);
      toast.success('Conta desbloqueada! Nova senha gerada com sucesso.');
    } catch (err) {
      toast.error('Erro ao desbloquear. Tente novamente.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      toast.success('Senha copiada!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar. Copie manualmente.');
    }
  };

  const handleClosePasswordReveal = () => {
    setGeneratedPassword(null);
    onSuccess();
    onClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'blocked':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Efeito para carregar os dados do usuário quando o modal for aberto
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        nome: user.nome || '',
        email: user.email || '',
        contato: user.contato || '',
        nivel_acesso: user.nivel_acesso || '',
        status: user.status || 'pending'
      });
    }
  }, [isOpen, user]);

  const getStatusInfo = (status: string) => {
    const statusMap = {
      active: {
        label: 'Ativo',
        icon: CheckCircle2,
        color: 'bg-green-100 text-green-700 border-green-200',
        textColor: 'text-green-700'
      },
      pending: {
        label: 'Pendente',
        icon: Clock,
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        textColor: 'text-yellow-700'
      },
      blocked: {
        label: 'Bloqueado',
        icon: XCircle,
        color: 'bg-red-100 text-red-700 border-red-200',
        textColor: 'text-red-700'
      }
    };

    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  const statusInfo = getStatusInfo(formData.status);
  const StatusIcon = statusInfo.icon;

  if (!user) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <UserCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span>Editar Usuário</span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
            Atualize as informações do usuário abaixo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="space-y-6">
            {/* Seção 1: Informações Pessoais */}
            <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <UserCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">Informações Pessoais</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nome" className="flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Nome <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserCircle2 className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => {
                        const value = e.target.value
                          .toLowerCase()
                          .split(' ')
                          .map(word => {
                            if (!word) return word;
                            const prepositions = ['de', 'da', 'do', 'dos', 'das'];
                            if (prepositions.includes(word)) return word;
                            return word.charAt(0).toUpperCase() + word.slice(1);
                          })
                          .join(' ');
                        setFormData(prev => ({ ...prev, nome: value }));
                      }}
                      className="pl-10 h-10 text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nome completo"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={handleEmailChange}
                      className="pl-10 h-10 text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="exemplo@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contato" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Telefone
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      id="contato"
                      type="tel"
                      maxLength={15}
                      value={formData.contato}
                      placeholder="(00) 00000-0000"
                      className="h-10 pl-10 text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        
                        // Aplica a máscara
                        if (value.length <= 11) {
                          if (value.length <= 2) {
                            value = value.replace(/^(\d{2}).*/, '($1)');
                          } else if (value.length <= 7) {
                            value = value.replace(/^(\d{2})(\d{1,5}).*/, '($1) $2');
                          } else {
                            value = value.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
                          }
                        }
                        
                        setFormData(prev => ({ ...prev, contato: value }));
                      }}
                      onBlur={(e) => {
                        const digits = e.target.value.replace(/\D/g, '');
                        if (digits.length < 11 && digits.length > 0) {
                          toast.error('Número de telefone inválido');
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 2: Configurações de Acesso */}
            <div className="space-y-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Configurações de Acesso</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nivel_acesso" className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Nível de Acesso <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.nivel_acesso}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, nivel_acesso: value }))}
                  >
                    <SelectTrigger className="h-12 pl-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                      <div className="absolute left-3.5">
                        <ShieldCheck className="h-4.5 w-4.5 text-gray-400" />
                      </div>
                      <SelectValue placeholder="Selecione um nível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="coordenador">Coordenador</SelectItem>
                      <SelectItem value="analista">Analista</SelectItem>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                      <SelectItem value="visitante">Visitante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Status da Conta <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                  >
                    <SelectTrigger className="h-12 pl-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                      <div className="absolute left-3.5">
                        <StatusIcon className="h-4.5 w-4.5" />
                      </div>
                      <SelectValue placeholder="Selecione um status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>Ativo</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="pending">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-500" />
                          <span>Pendente</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="blocked">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span>Bloqueado</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Aviso de tentativas — aparece quando o usuário já errou a senha mas ainda não foi bloqueado */}
          {formData.status === 'active' && (user.tentativas_login || 0) > 0 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs font-semibold">
                  {user.tentativas_login} de 3 tentativas de senha incorreta registradas
                </span>
              </div>
            </div>
          )}

          {/* Área de desbloqueio — só aparece quando a conta está bloqueada */}
          {(formData.status === 'bloqueado' || formData.status === 'blocked') && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <ShieldOff className="h-4 w-4" />
                <span className="text-sm font-semibold">
                  Conta bloqueada{(user.tentativas_login || 0) >= 3 ? ' após 3 tentativas de senha incorreta' : ' por um administrador'}
                </span>
              </div>
              <p className="text-xs text-red-600 dark:text-red-400">
                Clique em <strong>Desbloquear & Redefinir Senha</strong> para enviar uma nova senha ao usuário e liberar o acesso.
              </p>
              <button
                type="button"
                disabled={unlocking}
                onClick={() => setShowUnlockConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {unlocking ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Desbloqueando...</>
                ) : (
                  <><KeyRound className="h-4 w-4" /> Desbloquear &amp; Redefinir Senha</>
                )}
              </button>
            </div>
          )}

          <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="h-12 px-8 font-semibold border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="h-12 px-8 font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>

      {/* Confirmação antes de gerar nova senha */}
      <AlertDialog open={showUnlockConfirm} onOpenChange={setShowUnlockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldOff className="h-5 w-5" />
              Confirmar desbloqueio e nova senha
            </AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai gerar uma <strong>nova senha aleatória</strong> para{' '}
              <strong>{user?.nome || user?.email}</strong>, substituindo a senha atual, e desbloquear a conta imediatamente.
              <br /><br />
              A senha atual deixará de funcionar. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlocking}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={unlocking}
              onClick={handleConfirmUnlock}
              className="bg-red-600 hover:bg-red-700"
            >
              {unlocking ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Gerando...</>
              ) : (
                'Sim, gerar nova senha'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exibição da senha gerada para o admin copiar e passar ao usuário */}
      <Dialog open={!!generatedPassword} onOpenChange={(open) => !open && handleClosePasswordReveal()}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              <DialogTitle>Nova senha gerada</DialogTitle>
            </div>
            <DialogDescription>
              Copie a senha abaixo e envie ao usuário por um canal seguro. Ela não será exibida novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
            <code className="flex-1 text-lg font-mono font-bold tracking-wider text-gray-900 dark:text-white text-center select-all">
              {generatedPassword}
            </code>
            <button
              type="button"
              onClick={handleCopyPassword}
              className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              title="Copiar senha"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <Button onClick={handleClosePasswordReveal} className="w-full h-11 mt-2">
            Concluído
          </Button>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
