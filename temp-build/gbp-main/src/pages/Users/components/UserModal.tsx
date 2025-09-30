import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { userService } from '../../../services/users';
import { emailService } from '../../../services/email';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

const createUserSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  contato: z.string()
    .refine((value) => {
      // Remove caracteres não numéricos para validação
      const numbers = value.replace(/\D/g, '');
      return numbers.length === 11;
    }, 'Telefone incompleto'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  nivel_acesso: z.enum(['admin', 'coordenador', 'analista', 'colaborador', 'visitante'], {
    required_error: 'Nível de acesso é obrigatório',
  }),
  status: z.enum(['active', 'pending', 'blocked'], {
    required_error: 'Status é obrigatório',
  }),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresa_uid: string;
  onSuccess: () => void;
}

export function UserModal({ isOpen, onClose, empresa_uid, onSuccess }: UserModalProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      nivel_acesso: undefined,
      status: 'active'
    }
  });

  const nivel_acesso = watch('nivel_acesso');

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      setLoading(true);

      // Remove a formatação do contato antes de enviar
      const cleanedData = {
        ...data,
        contato: data.contato.replace(/\D/g, '')
      };

      await userService.create({
        nome: cleanedData.nome,
        email: cleanedData.email,
        contato: cleanedData.contato,
        senha: cleanedData.senha,
        nivel_acesso: cleanedData.nivel_acesso,
        status: cleanedData.status,
        empresa_uid,
      });

      toast.success('Usuário criado com sucesso!');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[700px] p-0 gap-0 bg-white rounded-lg overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 py-4 bg-blue-500">
          <DialogTitle className="text-2xl font-semibold text-white">
            Novo Usuário
          </DialogTitle>
          <DialogDescription className="text-blue-100">
            Preencha os dados abaixo para criar um novo usuário no sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-6 space-y-6 overflow-y-auto flex-1">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Nome */}
            <div>
              <Label htmlFor="nome" className="text-gray-700 font-medium">
                Nome
              </Label>
              <div className="mt-1.5">
                <Input
                  id="nome"
                  placeholder="Digite o nome"
                  className="h-11 bg-white border-gray-200"
                  {...register('nome', {
                    onChange: (e) => {
                      // Formata o nome com iniciais maiúsculas
                      const value = e.target.value
                        .toLowerCase()
                        .split(' ')
                        .map(word => {
                          // Ignora palavras vazias
                          if (!word) return word;
                          // Lista de preposições que devem permanecer em minúsculo
                          const prepositions = ['de', 'da', 'do', 'dos', 'das'];
                          if (prepositions.includes(word)) return word;
                          // Capitaliza a primeira letra
                          return word.charAt(0).toUpperCase() + word.slice(1);
                        })
                        .join(' ');

                      e.target.value = value;
                      register('nome').onChange(e);
                    }
                  })}
                />
              </div>
              {errors.nome && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-red-500" />
                  {errors.nome.message}
                </p>
              )}
            </div>

            {/* Contato */}
            <div>
              <Label htmlFor="contato" className="text-gray-700 font-medium">
                Contato (Celular)
              </Label>
              <div className="mt-1.5">
                <Input
                  id="contato"
                  type="tel"
                  maxLength={15}
                  placeholder="(XX) XXXXX-XXXX"
                  className="h-11 bg-white border-gray-200"
                  {...register('contato', {
                    onChange: (e) => {
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
                      
                      e.target.value = value;
                      // Atualiza o valor no formulário com o número formatado
                      register('contato').onChange(e);
                    }
                  })}
                />
              </div>
              {errors.contato && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-red-500" />
                  {errors.contato.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="col-span-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">
                Email
              </Label>
              <div className="mt-1.5">
                <Input
                  id="email"
                  type="email"
                  placeholder="Digite o email"
                  className="h-11 bg-white border-gray-200"
                  {...register('email', {
                    onChange: (e) => {
                      // Força o email para minúsculas
                      const value = e.target.value.toLowerCase();
                      e.target.value = value;
                      register('email').onChange(e);
                    }
                  })}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-red-500" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Senha */}
            <div className="col-span-2">
              <Label htmlFor="senha" className="text-gray-700 font-medium">
                Senha
              </Label>
              <div className="mt-1.5 relative">
                <Input
                  id="senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite a senha"
                  className="h-11 bg-white border-gray-200 pr-10"
                  {...register('senha')}
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
              {errors.senha && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-red-500" />
                  {errors.senha.message}
                </p>
              )}
            </div>

            {/* Nível de Acesso */}
            <div>
              <Label htmlFor="nivel_acesso" className="text-gray-700 font-medium">
                Nível de Acesso
              </Label>
              <div className="mt-1.5">
                <Select
                  onValueChange={(value) => {
                    setValue('nivel_acesso', value as 'admin' | 'comum');
                  }}
                  value={nivel_acesso}
                >
                  <SelectTrigger className="h-11 bg-white border-gray-200">
                    <SelectValue placeholder="Selecione o nível" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border rounded-md shadow-lg">
                    <SelectItem value="admin" className="flex items-center gap-2 p-2.5 hover:bg-gray-50 cursor-pointer">
                      Administrador
                    </SelectItem>
                    <SelectItem value="comum" className="flex items-center gap-2 p-2.5 hover:bg-gray-50 cursor-pointer">
                      Comum
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {errors.nivel_acesso && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-red-500" />
                  {errors.nivel_acesso.message}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status" className="text-gray-700 font-medium">
                Status
              </Label>
              <div className="mt-1.5">
                <Select defaultValue="active" {...register('status')}>
                  <SelectTrigger className="h-11 bg-white border-gray-200">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border rounded-md shadow-lg">
                    <SelectItem value="active" className="flex items-center gap-2 p-2.5 hover:bg-gray-50 cursor-pointer">
                      Ativo
                    </SelectItem>
                    <SelectItem value="pending" className="flex items-center gap-2 p-2.5 hover:bg-gray-50 cursor-pointer">
                      Pendente
                    </SelectItem>
                    <SelectItem value="blocked" className="flex items-center gap-2 p-2.5 hover:bg-gray-50 cursor-pointer">
                      Bloqueado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {errors.status && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-red-500" />
                  {errors.status.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 sticky bottom-0 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="h-11"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-11 bg-blue-500 hover:bg-blue-600"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Criando...</span>
                </div>
              ) : (
                'Criar Usuário'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}