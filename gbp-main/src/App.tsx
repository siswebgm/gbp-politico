import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { CompanyProvider } from './providers/CompanyProvider';
import { ErrorBoundary } from 'react-error-boundary';
import { EditModeProvider } from './contexts/EditModeContext';
import { PesquisaProvider } from './contexts/PesquisaContext';
import { PlanoProvider } from './contexts/PlanoContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import AppRoutes from './routes';
import { InstallPWA } from './components/InstallPWA';
import { UpdateAlert } from './components/UpdateAlert';
import { VendasPage } from './pages/Vendas';
import ClientesPage from './pages/Clientes';
import { Toaster } from './components/ui/toaster';
import { NovaDemanda } from './pages/public/NovaDemanda';
import { DemandaSucesso } from './pages/public/DemandaSucesso';

// Inicializa o Stripe com sua chave pública
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');
import './styles/scrollbar.css';

// Configuração do React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutos
      networkMode: 'always',
      gcTime: 1000 * 60 * 10, // 10 minutos
    },
  },
});

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div role="alert" className="min-h-screen flex items-center justify-center">
      <div className="bg-red-100 p-8 rounded-lg">
        <h2 className="text-lg font-semibold text-red-800">Algo deu errado:</h2>
        <pre className="mt-2 text-red-600">{error.message}</pre>
      </div>
    </div>
  );
}

function PWAWrapper() {
  const location = useLocation();
  const isCadastroPath = location.pathname.startsWith('/cadastro/');
  const isLoginPage = location.pathname === '/login' || location.pathname === '/';
  
  // Mostra a notificação PWA apenas na página de login
  if (isCadastroPath || !isLoginPage) {
    return null;
  }
  
  return <InstallPWA />;
}

export function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <CompanyProvider>
              <EditModeProvider>
                <PlanoProvider>
                  <div className="min-h-screen bg-gray-50">
                    <Toaster />
                    <Routes>
                      {/* Rotas públicas */}
                      <Route path="/demanda/:empresa_uid" element={
                        <div className="min-h-screen bg-gray-50">
                          <NovaDemanda />
                        </div>
                      } />
                      <Route path="/demanda-sucesso/:id" element={
                        <div className="min-h-screen bg-gray-50">
                          <DemandaSucesso />
                        </div>
                      } />
                      
                      {/* Rotas protegidas */}
                      <Route path="/vendas" element={<VendasPage />} />
                      <Route path="/clientes" element={<ClientesPage />} />
                      <Route path="/*" element={
                        <Elements stripe={stripePromise}>
                          <PesquisaProvider>
                            <AppRoutes />
                          </PesquisaProvider>
                        </Elements>
                      } />
                    </Routes>
                    <PWAWrapper />
                    <UpdateAlert />
                  </div>
                </PlanoProvider>
              </EditModeProvider>
            </CompanyProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}