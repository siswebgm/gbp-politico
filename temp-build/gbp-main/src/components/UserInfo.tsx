import { useAuth } from '../providers/AuthProvider';
import { useCompanyStore } from '../store/useCompanyStore';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export function UserInfo() {
  const { user, signOut } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('UserInfo - Dados do usuário:', user);
    console.log('UserInfo - Dados da empresa:', company);
  }, [user, company]);

  if (!user || !company) {
    console.log('UserInfo - Usuário ou empresa não encontrados');
    return null;
  }

  // Verifica se o usuário pertence à empresa correta
  if (user.empresa_id !== company.id) {
    console.error('UserInfo - ID da empresa do usuário não corresponde:', {
      userCompanyId: user.empresa_id,
      currentCompanyId: company.id
    });
    return null;
  }

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Avatar com Iniciais */}
      <div className="relative group">
        <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-white font-medium text-sm cursor-pointer">
          {getInitials(user.nome)}
        </div>
      </div>

      {/* Informações do Usuário */}
      <div className="hidden md:flex flex-col">
        <div className="text-sm font-medium text-white">
          {user.nome}
        </div>
        <div className="text-xs text-blue-100">
          {company.nome}
        </div>
      </div>

      {/* Botão de Logout */}
      <button
        onClick={handleLogout}
        className="p-2 hover:bg-blue-500 rounded-full transition-colors"
        title="Sair"
      >
        <LogOut className="h-5 w-5 text-white" />
      </button>
    </div>
  );
}
