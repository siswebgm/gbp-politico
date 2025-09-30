import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Login } from '../pages/Login';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PublicRoute } from '../components/PublicRoute';
import { SelectCompany } from '../pages/SelectCompany';
import { Dashboard } from '../pages/app/dashboard';
import { PlanosPage } from '../pages/app/Planos';
import { Eleitores } from '../pages/app/Eleitores';
import { Documentos } from '../pages/app/Documentos';
import { Configuracoes } from '../pages/app/Configuracoes';
import { Users } from '../pages/Users';
import WhatsAppPage from '../pages/WhatsApp';
import { Suspense, lazy } from 'react';
import TiposDemanda from '../pages/Settings/TiposDemanda';

// Importando o componente da página de clientes com lazy loading
const ClientesPage = lazy(() => import('../pages/Clientes'));

export const router = createBrowserRouter([
  // Rotas públicas que podem redirecionar para login
  {
    path: '/',
    element: <PublicRoute />,
    children: [
      {
        path: 'login',
        element: <Login />
      },
      {
        path: 'select-company',
        element: <SelectCompany />
      }
    ]
  },
  // Rotas protegidas
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            path: '',
            element: <Dashboard />
          },
          // ... outras rotas protegidas
        ]
      }
    ]
  },
  // Rota de clientes - mantida como estava
  {
    path: '/clientes',
    element: (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Carregando...</div>}>
        <ClientesPage />
      </Suspense>
    )
  },
  {
    path: '/',
    element: <PublicRoute />,
    children: [
      {
        path: 'login',
        element: <Login />
      },
      {
        path: 'select-company',
        element: <SelectCompany />
      }
    ]
  },
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            path: '',
            element: <Dashboard />
          },
          {
            path: 'planos',
            element: (
              <Suspense fallback={<div>Carregando...</div>}>
                <PlanosPage />
              </Suspense>
            )
          },
          {
            path: 'eleitores',
            element: (
              <ProtectedRoute>
                <Suspense fallback={<div>Carregando...</div>}>
                  <Eleitores />
                </Suspense>
              </ProtectedRoute>
            )
          },
          {
            path: 'documentos',
            element: <Documentos />
          },
          {
            path: 'usuarios',
            element: (
              <ProtectedRoute>
                <Suspense fallback={<div>Carregando...</div>}>
                  <Users />
                </Suspense>
              </ProtectedRoute>
            )
          },
          {
            path: 'settings',
            children: [
              {
                path: 'tipos-demanda',
                element: <TiposDemanda />
              },
              {
                path: 'whatsapp',
                element: (
                  <Suspense fallback={<div>Carregando...</div>}>
                    <WhatsAppPage />
                  </Suspense>
                )
              }
            ]
          },
          {
            path: 'configuracoes',
            children: [
              {
                path: '',
                element: <Configuracoes />
              }
            ]
          }
        ]
      }
    ]
  }
]);

export default function AppRoutes() {
  console.log('AppRoutes - Rendering router');
  
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <RouterProvider router={router} />
    </Suspense>
  );
}