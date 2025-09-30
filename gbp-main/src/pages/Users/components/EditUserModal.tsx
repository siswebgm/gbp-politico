import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
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
  Clock
} from 'lucide-react';
import { cn } from '../../../lib/utils';

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
  };
}

export function EditUserModal({ isOpen, onClose, onSuccess, user }: EditUserModalProps) {
  const [loading, setLoading] = useState(false);
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
        nivel_acesso: cleanedData.nivel_acesso,
        status: cleanedData.status,
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
            <UserCircle2 className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            <span>Editar Usuário</span>
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">
            Atualize as informações do usuário abaixo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2">
          <div className="space-y-6">
            {/* Seção 1: Informações Pessoais */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <UserCircle2 className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Informações Pessoais</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="flex items-center gap-1">
                    Nome <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserCircle2 className="h-5 w-5 text-gray-400" />
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
                      className="pl-10 h-11"
                      placeholder="Nome completo"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={handleEmailChange}
                      className="pl-10 h-11"
                      placeholder="exemplo@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contato">
                    Telefone
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="contato"
                      type="tel"
                      maxLength={15}
                      value={formData.contato}
                      placeholder="(00) 00000-0000"
                      className="h-11 pl-10"
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
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Configurações de Acesso</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nivel_acesso" className="flex items-center gap-1">
                    Nível de Acesso <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.nivel_acesso}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, nivel_acesso: value }))}
                  >
                    <SelectTrigger className="h-11 pl-10">
                      <div className="absolute left-3">
                        <ShieldCheck className="h-5 w-5 text-gray-400" />
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
                  <Label htmlFor="status" className="flex items-center gap-1">
                    Status da Conta <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                  >
                    <SelectTrigger className="h-11 pl-10">
                      <div className="absolute left-3">
                        <StatusIcon className="h-5 w-5" />
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

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="h-11 px-6"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="h-11 px-6 bg-blue-600 hover:bg-blue-700"
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
    </Dialog>
  );
}
