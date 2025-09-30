import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export function ProtectedRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const sessionStr = localStorage.getItem('supabase.auth.token');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          setIsAuthenticated(new Date(session.expires_at) > new Date());
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}