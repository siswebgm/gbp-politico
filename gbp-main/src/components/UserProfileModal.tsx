import { useState, useEffect } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { supabaseClient } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import { useAuthStore } from '../store/useAuthStore';
import { useCompanyStore } from '../store/useCompanyStore';
import { cn } from '../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog"
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useNavigate } from 'react-router-dom';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserData {
  nome: string;
  contato: string;
  email: string;
  foto: string;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [userData, setUserData] = useState<UserData>({
    nome: '',
    contato: '',
    email: '',
    foto: ''
  });
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { user } = useAuth();
  const authStore = useAuthStore();
  const { company } = useCompanyStore();
  const setCompanyUser = useCompanyStore((state) => state.setUser);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const sanitizeFileName = (fileName: string): string => {
    // Remove caracteres especiais e espaços
    const cleanName = fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-zA-Z0-9.]/g, '_') // Substitui caracteres especiais por _
      .replace(/_+/g, '_') // Remove underscores múltiplos
      .toLowerCase();

    // Separa nome e extensão
    const [name, ext] = cleanName.split('.');
    
    // Gera um timestamp
    const timestamp = Date.now();
    
    // Retorna o nome formatado
    return `${timestamp}_${name}.${ext}`;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast.showToast({
          type: 'error',
          title: "Arquivo muito grande",
          description: "O tamanho máximo permitido é 10MB",
        });
        return;
      }

      setSelectedFile(file);
      
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Função para formatar o número de telefone (apenas para exibição)
  const formatPhone = (value: string) => {
    // Remove tudo que não for número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara
    let formatted = numbers;
    if (numbers.length <= 11) {
      formatted = numbers.replace(
        /(\d{2})(\d{1})(\d{4})(\d{4})/,
        '($1) $2 $3-$4'
      );
    }
    
    return formatted;
  };

  // Função para remover formatação do telefone
  const unformatPhone = (value: string) => {
    return value.replace(/\D/g, '');
  };

  // Handler para o campo de contato
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setUserData(prev => ({ ...prev, contato: formatted }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserData(prev => ({
      ...prev,
      email: e.target.value.toLowerCase()
    }));
  };

  const handleSave = async () => {
    if (!user?.uid) {
      toast.showToast({
        type: 'error',
        title: "Erro",
        description: "Usuário não identificado. Por favor, faça login novamente.",
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      let photoUrl = userData.foto;

      // Upload da foto se houver uma nova
      if (selectedFile) {
        try {
          const fileName = sanitizeFileName(selectedFile.name);

          // Verificar tamanho e tipo do arquivo
          if (selectedFile.size > MAX_FILE_SIZE) {
            throw new Error('Arquivo muito grande. Máximo permitido: 10MB');
          }
          if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
            throw new Error('Tipo de arquivo não permitido. Use: JPG, PNG ou WebP');
          }

          // Buscar o storage da empresa
          const { data: empresaData, error: empresaError } = await supabaseClient
            .from('gbp_empresas')
            .select('storage')
            .eq('uid', user.empresa_uid)
            .single();

          if (empresaError || !empresaData?.storage) {
            throw new Error('Não foi possível obter o storage da empresa');
          }

          const bucketName = empresaData.storage.toLowerCase();
          const timestamp = new Date().getTime();
          const safeFileName = `${timestamp}_${fileName}`;

          const { data: uploadDataResponse, error: uploadError } = await supabaseClient
            .storage
            .from(bucketName)
            .upload(safeFileName, selectedFile, {
              cacheControl: '3600',
              contentType: selectedFile.type,
              upsert: true
            });

          if (uploadError) throw new Error('Erro no upload da imagem');
          if (!uploadDataResponse?.path) throw new Error('Caminho do arquivo não retornado');

          const { data: urlData } = await supabaseClient
            .storage
            .from(bucketName)
            .getPublicUrl(uploadDataResponse.path);

          photoUrl = urlData.publicUrl;
        } catch (uploadError: any) {
          toast.showToast({
            type: 'error',
            title: "Erro no upload",
            description: uploadError.message || "Não foi possível fazer o upload da imagem",
          });
          throw new Error('Falha no upload da imagem');
        }
      }

      // Preparar dados para atualização (removendo formatação do contato)
      const updateData: {
        nome?: string | null;
        contato?: string | null;
        foto?: string | null;
        email: string;
        senha?: string | null;
      } = {
        email: userData.email,
      };

      // Adicionar campos opcionais apenas se tiverem valor
      if (userData.nome?.trim()) updateData.nome = userData.nome.trim();
      if (userData.contato) updateData.contato = unformatPhone(userData.contato);
      if (photoUrl?.trim()) updateData.foto = photoUrl.trim();

      try {
        // Adicionar senha ao updateData se fornecida
        if (senha?.trim()) {
          updateData.senha = senha.trim();
        }

        // Atualizar os dados no Supabase
        const { error: updateError } = await supabaseClient
          .from('gbp_usuarios')
          .update(updateData)
          .eq('uid', user.uid)
          .single();

        if (updateError) {
          throw new Error(`Erro ao atualizar dados: ${updateError.message}`);
        }

        // Buscar dados atualizados do usuário
        const { data: updatedUserData, error: fetchError } = await supabaseClient
          .from('gbp_usuarios')
          .select('*')
          .eq('uid', user.uid)
          .single();

        if (fetchError) {
          throw new Error(`Erro ao buscar dados atualizados: ${fetchError.message}`);
        }

        // Atualizar estado global apenas com informações não sensíveis
        if (user && updatedUserData) {
          // Mantém todos os dados existentes do usuário
          const updatedUser = {
            ...user,
            nome: updatedUserData.nome || user.nome,
            email: updatedUserData.email || user.email,
            foto: photoUrl || user.foto,
            contato: updatedUserData.contato || user.contato,
            empresa_uid: user.empresa_uid,
            empresa_nome: user.empresa_nome,
            nivel_acesso: user.nivel_acesso,
            permissoes: user.permissoes
          };

          // Atualizar AuthStore mantendo todos os dados existentes
          authStore.setUser({
            ...user,
            uid: updatedUser.uid,
            nome: updatedUser.nome,
            email: updatedUser.email,
            empresa_uid: updatedUser.empresa_uid,
            empresa_nome: updatedUser.empresa_nome,
            nivel_acesso: updatedUser.nivel_acesso,
            role: updatedUser.nivel_acesso as 'admin' | 'attendant',
            foto: updatedUser.foto,
            permissoes: updatedUser.permissoes
          });

          // Atualizar CompanyStore mantendo todos os dados
          setCompanyUser(updatedUser);

          // Atualizar localStorage mantendo todos os dados
          const currentUser = JSON.parse(localStorage.getItem('gbp_user') || '{}');
          localStorage.setItem('gbp_user', JSON.stringify({
            ...currentUser,
            ...updatedUser
          }));

          toast.showToast({
            type: 'success',
            title: "Sucesso",
            description: "Perfil atualizado com sucesso!",
          });

          onClose();
        }

      } catch (error: any) {
        console.error('Erro ao atualizar perfil:', error);
        toast.showToast({
          type: 'error',
          title: "Erro",
          description: error.message || "Não foi possível atualizar o perfil.",
        });
      } finally {
        setIsSaving(false);
      }
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      toast.showToast({
        type: 'error',
        title: "Erro",
        description: error.message || "Não foi possível atualizar o perfil.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const carregarFoto = async () => {
      if (!user?.uid) return;

      try {
        setLoading(true);
        setError(null);

        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select('foto')
          .eq('uid', user.uid)
          .single();

        if (userError) {
          console.error('Erro ao buscar foto:', userError);
          setFotoUrl(null); // Define como null em caso de erro
          return; // Retorna sem tentar novamente
        }

        // Se não houver foto, define como null e retorna
        if (!userData?.foto) {
          setFotoUrl(null);
          return;
        }

        // Verifica se a URL da foto é válida
        try {
          const response = await fetch(userData.foto);
          if (!response.ok) {
            console.warn('Foto não encontrada:', userData.foto);
            setFotoUrl(null); // Define como null se a foto não existir
            return;
          }
          setFotoUrl(userData.foto);
        } catch (error) {
          console.error('Erro ao verificar foto:', error);
          setFotoUrl(null); // Define como null em caso de erro de rede
        }
      } catch (error) {
        console.error('Erro ao carregar foto:', error);
        setFotoUrl(null);
      } finally {
        setLoading(false);
      }
    };

    carregarFoto();
  }, [user?.uid]);

  // Carregar dados do usuário
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return;
      setIsLoading(true);

      try {
        const { data, error } = await supabaseClient
          .from('gbp_usuarios')
          .select('nome, contato, email, foto')
          .eq('uid', user.uid)
          .single();

        if (error) throw error;

        if (data) {
          setUserData({
            nome: data.nome || '',
            contato: data.contato || '',
            email: data.email || '',
            foto: data.foto || ''
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        toast.showToast({
          type: 'error',
          title: "Erro",
          description: "Não foi possível carregar os dados do usuário.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen, user?.uid]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
        {/* Header com fundo azul e gradiente */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 h-[60px] relative">
          {/* Título centralizado */}
          <div className="h-full flex items-center justify-center">
            <DialogTitle className="text-lg font-semibold text-white">Editar Perfil</DialogTitle>
          </div>

          {/* Avatar */}
          <div className="absolute -bottom-6 left-4">
            <label
              htmlFor="avatar-upload"
              className="relative cursor-pointer group"
            >
              <div className="h-14 w-14 rounded-full overflow-hidden bg-white shadow-lg ring-2 ring-white transition-transform duration-200 group-hover:scale-105">
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="loading loading-spinner loading-sm"></span>
                  </div>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : fotoUrl ? (
                  <img
                    src={fotoUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                    onError={() => setFotoUrl(null)}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gray-50">
                    <Camera className="h-5 w-5 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                  <Camera className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
              </div>

              <input
                id="avatar-upload"
                type="file"
                className="hidden"
                accept=".jpeg,.jpg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
              />
            </label>
          </div>
        </div>

        {/* Formulário */}
        <div className="p-4 pt-8 space-y-2.5">
          <div className="space-y-2.5">
            <div className="space-y-1">
              <Label htmlFor="nome" className="text-xs font-medium text-gray-700">Nome completo</Label>
              <Input
                id="nome"
                value={userData.nome}
                onChange={(e) => setUserData(prev => ({ ...prev, nome: e.target.value }))}
                className="h-7 px-2 text-sm border-gray-200 rounded focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="contato" className="text-xs font-medium text-gray-700">Contato</Label>
              <Input
                id="contato"
                value={userData.contato}
                onChange={handlePhoneChange}
                placeholder="(00) 0 0000-0000"
                maxLength={16}
                className="h-7 px-2 text-sm border-gray-200 rounded focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-medium text-gray-700">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={userData.email}
                onChange={handleEmailChange}
                className="h-7 px-2 text-sm border-gray-200 rounded focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="senha" className="text-xs font-medium text-gray-700">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite para alterar a senha"
                className="h-7 px-2 text-sm border-gray-200 rounded focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
            </div>
          </div>

          {/* Divisor */}
          <div className="my-4 border-t border-gray-200" />

          {/* Footer */}
          <DialogFooter className="bg-gray-50 px-6 py-4">
            <Button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
