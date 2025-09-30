import { useAuth } from '../providers/AuthProvider';

const routePermissions: Record<string, string[]> = {
  '/app/eleitores': ['view_voters'],
  '/app/atendimentos': ['view_appointments'],
  '/app/documentos': ['view_documents'],
  '/app/mapa': ['view_map'],
  '/app/metas': ['view_goals'],
  '/app/usuarios': ['manage_users'],
  '/app/configuracoes': ['manage_settings'],
  '/app/planos': ['view_plans']
};

export function usePermissions() {
  const { user } = useAuth();

  console.log('[DEBUG] usePermissions - Hook inicializado:', {
    hasUser: !!user,
    userNivel: user?.nivel_acesso,
    userPermissoes: user?.permissoes,
    isAdmin: user?.nivel_acesso === 'admin'
  });

  const isAdmin = user?.nivel_acesso === 'admin';

  const hasPermission = (path: string) => {
    // Se o usuário for admin, tem acesso a tudo
    if (isAdmin) {
      console.log('usePermissions - User is admin, granting access');
      return true;
    }

    // Normaliza o path removendo /app do início e trailing slashes
    const normalizedPath = path.replace(/^\/app/, '').replace(/\/$/, '');
    
    // Log the path being checked
    console.log('usePermissions - Checking path:', {
      originalPath: path,
      normalizedPath,
      userLevel: user?.nivel_acesso,
      userPermissions: user?.permissoes,
      isAdmin
    });
    
    // Se não houver permissões definidas para a rota, permite acesso
    if (!routePermissions[normalizedPath]) {
      console.log('usePermissions - No permissions required for route:', normalizedPath);
      return true;
    }

    // Verifica se o usuário tem as permissões necessárias
    const requiredPermissions = routePermissions[normalizedPath];
    console.log('usePermissions - Required permissions:', requiredPermissions);
    
    const hasAllPermissions = requiredPermissions.every(permission =>
      user?.permissoes?.includes(permission)
    );
    
    console.log('usePermissions - Has all permissions:', hasAllPermissions);
    
    return hasAllPermissions;
  };

  return {
    hasPermission,
    isAdmin
  };
} 