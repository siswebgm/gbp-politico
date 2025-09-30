import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Mail, Phone, User, Eye, EyeOff } from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog';

const createCompanySchema = z.object({
  // Dados da Empresa
  nomeEmpresa: z.string().min(1, 'Nome da empresa é obrigatório'),
  
  // Dados do Administrador
  nomeAdmin: z.string().min(1, 'Nome do administrador é obrigatório'),
  telefoneAdmin: z.string().optional(),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmarSenha: z.string(),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: "Senhas não conferem",
  path: ["confirmarSenha"],
});

type CreateCompanyFormData = z.infer<typeof createCompanySchema>;

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

// Função para formatar nome com iniciais maiúsculas
const formatName = (name: string) => {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Função para formatar telefone
const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    return numbers.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '($1) $2 $3-$4');
  }
  return value;
};

export function CreateCompanyModal({ isOpen, onClose, onSuccess }: CreateCompanyModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    setValue,
    watch,
  } = useForm<CreateCompanyFormData>({
    resolver: zodResolver(createCompanySchema),
  });

  // Observar mudanças nos campos para aplicar formatação
  const nomeEmpresa = watch('nomeEmpresa');
  const nomeAdmin = watch('nomeAdmin');
  const telefoneAdmin = watch('telefoneAdmin');
  const email = watch('email');

  // Aplicar formatações em tempo real
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('nomeEmpresa', formatName(e.target.value));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('nomeAdmin', formatName(e.target.value));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('telefoneAdmin', formatPhone(e.target.value));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('email', e.target.value.toLowerCase());
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: CreateCompanyFormData) => {
    try {
      setIsLoading(true);

      // Criar empresa
      const { data: company, error: companyError } = await supabaseClient
        .from('gbp_empresas')
        .insert([
          {
            nome: data.nomeEmpresa,
            status: 'active',
            created_at: new Date().toISOString(),
            plano: 'basic'
          },
        ])
        .select()
        .single();

      if (companyError) throw companyError;

      // Criar usuário administrador
      const { data: user, error: userError } = await supabaseClient
        .from('gbp_usuarios')
        .insert([
          {
            nome: data.nomeAdmin,
            email: data.email,
            senha: data.senha,
            contato: data.telefoneAdmin,
            empresa_uid: company.uid,
            nivel_acesso: 'admin',
            cargo: 'admin',
            status: 'active',
            permissoes: [
              'view_projetos_lei',
              'create_projetos_lei',
              'edit_projetos_lei',
              'delete_projetos_lei',
              'view_oficios',
              'create_oficios',
              'edit_oficios',
              'delete_oficios',
              'view_dashboard',
              'manage_users',
              'manage_roles',
              'manage_settings'
            ],
            created_at: new Date().toISOString()
          },
        ])
        .select()
        .single();

      if (userError) {
        // Se falhar ao criar usuário, remove a empresa
        await supabaseClient
          .from('gbp_empresas')
          .delete()
          .eq('uid', company.uid);
        throw userError;
      }

      reset();
      onSuccess(data.email); // Retorna o email para preencher o campo de login
      
    } catch (error: any) {
      console.error('Erro ao criar empresa:', error);
      
      if (error.message.includes('duplicate key')) {
        if (error.message.includes('email')) {
          setError('email', {
            type: 'manual',
            message: 'Este email já está em uso',
          });
        } else {
          toast.error('Erro ao criar empresa. Tente novamente.');
        }
      } else {
        toast.error('Erro ao criar empresa. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Criar Nova Empresa
          </DialogTitle>
          <DialogDescription>
            Preencha os dados da empresa e do administrador
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          {/* Dados da Empresa */}
          <div>
            <h2 className="text-base font-medium text-blue-600 mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Dados da Empresa
            </h2>
            <div className="space-y-4">
              <div>
                <Input
                  {...register('nomeEmpresa')}
                  placeholder="Nome da empresa"
                  error={errors.nomeEmpresa?.message}
                  onChange={handleCompanyNameChange}
                  value={nomeEmpresa || ''}
                />
              </div>
            </div>
          </div>

          {/* Dados do Administrador */}
          <div>
            <h2 className="text-base font-medium text-blue-600 mb-4 flex items-center gap-2">
              <User className="h-4 w-4" />
              Dados do Administrador
            </h2>
            <div className="space-y-4">
              <div>
                <Input
                  {...register('nomeAdmin')}
                  placeholder="Nome do administrador"
                  error={errors.nomeAdmin?.message}
                  onChange={handleNameChange}
                  value={nomeAdmin || ''}
                />
              </div>

              <div>
                <Input
                  {...register('telefoneAdmin')}
                  placeholder="Telefone do administrador"
                  type="tel"
                  error={errors.telefoneAdmin?.message}
                  onChange={handlePhoneChange}
                  value={telefoneAdmin || ''}
                  maxLength={16}
                />
              </div>

              <div>
                <Input
                  {...register('email')}
                  placeholder="Email"
                  type="email"
                  error={errors.email?.message}
                  onChange={handleEmailChange}
                  value={email || ''}
                />
              </div>

              {/* Campos de senha na mesma linha */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Input
                    {...register('senha')}
                    placeholder="Senha"
                    type={showPassword ? 'text' : 'password'}
                    error={errors.senha?.message}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    {...register('confirmarSenha')}
                    placeholder="Confirmar senha"
                    type={showConfirmPassword ? 'text' : 'password'}
                    error={errors.confirmarSenha?.message}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Criando...' : 'Criar Empresa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}