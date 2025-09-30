import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { Eye, EyeOff } from 'lucide-react';
import { userService } from '../services/users';

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userData: {
    id: string;
    nome: string;
    email: string;
    contato: string;
    nivel_acesso: string;
  } | null;
}

export function UserEditModal({ isOpen, onClose, onSuccess, userData }: UserEditModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    contato: '',
    nivel_acesso: '',
  });

  useEffect(() => {
    if (userData && isOpen) {
      setFormData({
        nome: userData.nome,
        email: userData.email,
        contato: userData.contato || '',
        nivel_acesso: userData.nivel_acesso,
      });
    }
  }, [userData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (!formData.nome || !formData.email || !formData.nivel_acesso) {
        toast({
          variant: "destructive",
          title: "Atenção",
          description: "Preencha todos os campos obrigatórios",
          duration: 3000,
        });
        return;
      }

      // Validação de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast({
          variant: "destructive",
          title: "Atenção",
          description: "Por favor, insira um email válido",
          duration: 3000,
        });
        return;
      }

      if (userData?.id) {
        await userService.update(userData.id, formData);

        toast({
          variant: "success",
          title: "Sucesso! ",
          description: "Usuário atualizado com sucesso",
          duration: 3000,
        });
        
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "Erro ao atualizar usuário",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95%] max-w-[400px] p-4 md:p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Editar Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Nome <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.nome}
              onChange={(e) => handleChange('nome', e.target.value)}
              placeholder="Digite o nome completo"
              className="h-9 px-3"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Digite o email"
              className="h-9 px-3"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contact" className="text-sm font-medium">
              Contato
            </Label>
            <Input
              id="contact"
              value={formData.contato}
              onChange={(e) => handleChange('contato', e.target.value)}
              placeholder="Digite o número de contato"
              className="h-9 px-3"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="access" className="text-sm font-medium">
              Nível de Acesso <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.nivel_acesso}
              onValueChange={(value) => handleChange('nivel_acesso', value)}
            >
              <SelectTrigger id="access" className="h-9">
                <SelectValue placeholder="Selecione o nível de acesso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Administrador">Administrador</SelectItem>
                <SelectItem value="Geral">Geral</SelectItem>
                <SelectItem value="Comum">Comum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" type="button" onClick={onClose} className="h-9">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="h-9">
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
