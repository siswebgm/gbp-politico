import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useToast } from "./ui/use-toast";
import { userService } from "../services/users";
import { Eye, EyeOff, User, Mail, Phone, Shield, Key } from "lucide-react";
import { cn } from "../lib/utils";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  empresaUid: string;
}

export function UserFormModal({ isOpen, onClose, onSuccess, empresaUid }: UserFormModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    contato: '',
    nivel_acesso: '',
    senha: '',
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      contato: '',
      nivel_acesso: '',
      senha: '',
    });
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validações básicas
      if (!formData.nome || !formData.email || !formData.nivel_acesso) {
        toast({
          variant: "destructive",
          title: "Atenção",
          description: "Preencha todos os campos obrigatórios",
          duration: 3000,
        });
        return;
      }

      // Validação de senha
      if (!formData.senha || formData.senha.length < 6) {
        toast({
          variant: "destructive",
          title: "Atenção",
          description: "A senha deve ter pelo menos 6 caracteres",
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

      await userService.create({
        ...formData,
        empresa_uid: empresaUid,
      });

      toast({
        variant: "success",
        title: "Sucesso! ",
        description: "Usuário cadastrado com sucesso",
        duration: 3000,
      });
      
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao cadastrar usuário:', error);
      
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "Email já cadastrado no sistema",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

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
          <DialogTitle className="text-xl font-semibold">Novo Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3 py-4">
          <div className="grid gap-2">
            <Label htmlFor="nome" className="text-sm font-medium">
              Nome <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nome"
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
            <Label htmlFor="contato" className="text-sm font-medium">
              Contato
            </Label>
            <Input
              id="contato"
              value={formData.contato}
              onChange={(e) => handleChange('contato', e.target.value)}
              placeholder="Digite o número de contato"
              className="h-9 px-3"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="senha" className="text-sm font-medium">
              Senha <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="senha"
                type={showPassword ? 'text' : 'password'}
                value={formData.senha}
                onChange={(e) => handleChange('senha', e.target.value)}
                placeholder="Digite a senha"
                className="h-9 px-3 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nivel_acesso" className="text-sm font-medium">
              Nível de Acesso <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.nivel_acesso}
              onValueChange={(value) => handleChange('nivel_acesso', value)}
            >
              <SelectTrigger id="nivel_acesso" className="h-9">
                <SelectValue placeholder="Selecione o nível de acesso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="geral">Geral</SelectItem>
                <SelectItem value="comum">Comum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" type="button" onClick={onClose} className="h-9">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="h-9">
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
