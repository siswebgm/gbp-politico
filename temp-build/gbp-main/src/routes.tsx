import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PublicLayout } from './components/PublicLayout';
import { Dashboard } from './pages/Dashboard';
import { Eleitores } from './pages/Eleitores';
import { NovoEleitor } from './pages/Eleitores/NovoEleitor';
import { EleitorDetalhes } from './pages/Eleitores/EleitorDetalhes';
import { ImportarEleitores } from './pages/ImportarEleitores';
import { Login } from './pages/Login';
import { useAuth } from './providers/AuthProvider';
import { useCompanyStore } from './store/useCompanyStore';
import AgendaPage from './pages/Agenda';
import ResultadosEleitorais from './pages/ResultadosEleitorais';
import DetalheCandidatoPage from './pages/ResultadosEleitorais/DetalheCandidato';
import { Documents } from './pages/Documents';
import { NewDocument } from './pages/Documents/NewDocument';
import { EditDocument } from './pages/Documents/EditDocument';
import { DemandasRuas } from './pages/Documents/DemandasRuas';
import { EditarDemanda } from './pages/Documents/DemandasRuas/EditarDemanda';
import RelatoriosDemandas from './pages/Documents/DemandasRuas/Relatorios';
import { DetalhesDemanda } from './pages/Documents/DemandasRuas/DetalhesDemanda';
import ConfiguracoesDemanda from './pages/Documents/DemandasRuas/ConfiguracoesDemanda';
import { AttendanceList } from './pages/AttendanceList';
import { AttendanceForm } from './pages/AttendanceForm';
import { AttendanceReport } from './pages/AttendanceReport';
import { Settings } from './pages/Settings';
import { DisparoMidia } from './pages/DisparoMidia';
import { RelatorioDisparo } from './pages/RelatorioDisparo';
import { ElectoralMap } from './pages/MapaEleitoral';
import { Users } from './pages/Users';
import { RegisterInvite } from './pages/RegisterInvite';
import { FormularioPublico } from './pages/FormularioPublico';
import GerenciarFormulario from './pages/app/configuracoes/GerenciarFormulario';
import { PublicAtendimento } from './pages/public/atendimento';
import Oficios from './pages/Documents/Oficios';
import ProjetosLei from './pages/Documents/ProjetosLei';
import NovoProjetoParte1 from './pages/Documents/ProjetosLei/NovoProjetoParte1';
import NovoProjetoParte2 from './pages/Documents/ProjetosLei/NovoProjetoParte2';
import NovoProjetoParte3 from './pages/Documents/ProjetosLei/NovoProjetoParte3';
import NovoProjetoParte4 from './pages/Documents/ProjetosLei/NovoProjetoParte4';
import VisualizarProjeto from './pages/Documents/ProjetosLei/VisualizarProjeto';
import UploadProjeto from './pages/Documents/ProjetosLei/UploadProjeto';
import { Requerimentos } from './pages/Documents/Requerimentos';
import UploadRequerimento from './pages/Documents/Requerimentos/UploadRequerimento';
import EditRequerimento from './pages/Documents/Requerimentos/EditRequerimento';
import ViewRequerimento from './pages/Documents/Requerimentos/ViewRequerimento';
import EmendasParlamentares from './pages/Documents/EmendasParlamentares';
import EmendaParlamentarForm from './pages/Documents/EmendasParlamentares/Form';
import NovoOficio from './pages/Documents/Oficios/NovoOficio';
import ListaAnualOficios from './pages/Documents/Oficios/ListaAnual';
import { PlanosPage } from './pages/app/Planos';
import { Strategy } from './pages/Strategy';
import WhatsAppPage from './pages/WhatsApp/index';
import { Suspense, lazy } from 'react';
import { EleitoresReport } from './pages/EleitoresReport';
import { ConsultarDemandas } from './pages/public/ConsultarDemandas';
import { DemandaPublica } from './pages/public/DemandaPublica/index';
const CheckoutPage = lazy(() => import('./pages/app/checkout'));
import ReconhecimentoFacial from './pages/ReconhecimentoFacial';
import ListaPesquisas from './pages/PesquisaEleitoral/ListaPesquisas';
import NovaPesquisa from './pages/PesquisaEleitoral/NovaPesquisa';
import EditarPesquisa from './pages/PesquisaEleitoral/EditarPesquisa';
import VisualizarPesquisa from './pages/PesquisaEleitoral/VisualizarPesquisa';
import ResponderPesquisa from './pages/PesquisaEleitoral/ResponderPesquisa';
import ObrigadoPesquisa from './pages/PesquisaEleitoral/ObrigadoPesquisa';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // Log para depuração
  console.log('[AdminRoute] User object:', user);
  console.log('[AdminRoute] User nivel_acesso:', user?.nivel_acesso);
  
  // Verifica se o usuário está autenticado e tem nível de acesso admin
  if (!user || user.nivel_acesso?.toLowerCase() !== 'admin') {
    console.log('[AdminRoute] Acesso negado - Redirecionando para /app');
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const company = useCompanyStore((state) => state.company);
  
  // Lista de rotas públicas e rotas sem empresa
  const publicPaths = ['/cadastro'];
  const noCompanyPaths = ['/select-company', '/app/planos'];
  const currentPath = window.location.pathname;
  
  // Se for uma rota pública, permite o acesso direto
  if (publicPaths.some(path => currentPath.startsWith(path))) {
    return <>{children}</>;
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!company && !noCompanyPaths.some(path => currentPath.startsWith(path))) {
    return <Navigate to="/select-company" replace />;
  }

  return <>{children}</>;
}

export function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  const company = useCompanyStore((state) => state.company);

  console.log('[DEBUG] AppRoutes rendered:', {
    isAuthenticated,
    isLoading,
    hasCompany: !!company
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Rota raiz */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Rotas Públicas */}
      <Route
        path="/cadastro/:slug"
        element={
          <PublicLayout>
            <FormularioPublico />
          </PublicLayout>
        }
      />
      <Route
        path="/cadastro/:categoria/:empresa_uid"
        element={
          <PublicLayout>
            <FormularioPublico />
          </PublicLayout>
        }
      />

      {/* Rota pública para atendimentos */}
      <Route
        path="/atendimento/:uid"
        element={
          <PublicLayout>
            <PublicAtendimento />
          </PublicLayout>
        }
      />

      {/* Rota de Login */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? (
            company ? (
              <Navigate to="/app" replace />
            ) : (
              <Navigate to="/select-company" replace />
            )
          ) : (
            <Login />
          )
        } 
      />
      <Route path="/register/:token" element={<RegisterInvite />} />
      
      {/* Rota Pública para Responder Pesquisa */}
      <Route 
        path="/pesquisa/:id" 
        element={
          <PublicLayout>
            <ResponderPesquisa />
          </PublicLayout>
        } 
      />
      <Route 
        path="/pesquisa/:id/obrigado" 
        element={
          <PublicLayout>
            <ObrigadoPesquisa />
          </PublicLayout>
        } 
      />
      
      {/* Rota pública para visualização de demandas */}
      <Route 
        path="/demanda/:empresaUid"
        element={
          <PublicLayout>
            <DemandaPublica />
          </PublicLayout>
        }
      />
      
      {/* Rota para consulta de demandas */}
      <Route 
        path="/minhas-demandas" 
        element={
          <PublicLayout>
            <ConsultarDemandas />
          </PublicLayout>
        } 
      />
      <Route 
        path="/minhas-demandas/empresa/:empresa_uid" 
        element={
          <PublicLayout>
            <ConsultarDemandas />
          </PublicLayout>
        } 
      />

      {/* Rotas Protegidas */}
      <Route 
        path="/app" 
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="planos" element={
          <Suspense fallback={<div>Carregando...</div>}>
            <PlanosPage />
          </Suspense>
        } />
        <Route path="eleitores">
          <Route index element={<Eleitores />} />
          <Route path=":id" element={<EleitorDetalhes />} />
          <Route path="novo" element={<NovoEleitor />} />
          <Route path=":id/editar" element={<NovoEleitor />} />
          <Route path="importar" element={<ImportarEleitores />} />
          <Route path="relatorio" element={<EleitoresReport />} />
        </Route>
        <Route path="atendimentos">
          <Route index element={<AttendanceList />} />
          <Route path="novo" element={<AttendanceForm />} />
          <Route path=":id" element={<AttendanceForm />} />
          <Route path="relatorios" element={<AttendanceReport />} />
        </Route>
        <Route path="agenda" element={<AgendaPage />} />
                <Route path="resultados-eleitorais">
          <Route index element={<ResultadosEleitorais />} />
          <Route path="detalhe/:tableName/:numero" element={<DetalheCandidatoPage />} />
        </Route>
        <Route path="documentos">
          <Route index element={<Documents />} />
          <Route path="novo" element={<NewDocument />} />
          <Route path=":id/editar" element={<EditDocument />} />
          <Route path="demandas-ruas">
            <Route index element={<AdminRoute><DemandasRuas /></AdminRoute>} />
            <Route path="nova" element={<AdminRoute><EditarDemanda /></AdminRoute>} />
            <Route path=":id" element={<AdminRoute><EditarDemanda /></AdminRoute>} />
            <Route path=":id/detalhes" element={<AdminRoute><DetalhesDemanda /></AdminRoute>} />
            <Route path="relatorios" element={<AdminRoute><RelatoriosDemandas /></AdminRoute>} />
            <Route path="configuracoes" element={<AdminRoute><ConfiguracoesDemanda /></AdminRoute>} />
          </Route>
          <Route path="oficios">
            <Route index element={<Oficios />} />
            <Route path="novo" element={<NovoOficio />} />
            <Route path=":ano" element={<ListaAnualOficios />} />
            <Route path=":ano/:id/editar" element={<NovoOficio />} />
          </Route>
          <Route path="projetos-lei">
            <Route index element={<AdminRoute><ProjetosLei /></AdminRoute>} />
            <Route path="novo" element={<AdminRoute><NovoProjetoParte1 /></AdminRoute>} />
            <Route path="novo/parte-2" element={<AdminRoute><NovoProjetoParte2 /></AdminRoute>} />
            <Route path="novo/parte-3" element={<AdminRoute><NovoProjetoParte3 /></AdminRoute>} />
            <Route path="novo/parte-4" element={<AdminRoute><NovoProjetoParte4 /></AdminRoute>} />
            <Route path="upload" element={<AdminRoute><UploadProjeto /></AdminRoute>} />
            <Route path="visualizar/:id" element={<AdminRoute><VisualizarProjeto /></AdminRoute>} />
          </Route>
          <Route path="requerimentos">
            <Route index element={<AdminRoute><Requerimentos /></AdminRoute>} />
            <Route path="upload" element={<AdminRoute><UploadRequerimento /></AdminRoute>} />
            <Route path=":uid/editar" element={<AdminRoute><EditRequerimento /></AdminRoute>} />
            <Route path=":uid" element={<AdminRoute><ViewRequerimento /></AdminRoute>} />
          </Route>
          <Route path="emendas-parlamentares">
            <Route index element={<AdminRoute><EmendasParlamentares /></AdminRoute>} />
            <Route path="novo" element={<AdminRoute><EmendaParlamentarForm /></AdminRoute>} />
            <Route path=":id/editar" element={<AdminRoute><EmendaParlamentarForm /></AdminRoute>} />
          </Route>
        </Route>
        <Route path="disparo-de-midia" element={<DisparoMidia />} />
        <Route path="relatorio-disparo" element={<RelatorioDisparo />} />
        <Route path="mapa-eleitoral" element={<ElectoralMap />} />
        <Route path="settings">
          <Route index element={<Settings />} />
        </Route>
        <Route path="configuracoes">
          <Route path="gerenciar-formulario" element={<GerenciarFormulario />} />
        </Route>
        <Route path="whatsapp" element={
          <Suspense fallback={<div>Carregando...</div>}>
            <WhatsAppPage />
          </Suspense>
        } />
        <Route path="strategy" element={<AdminRoute><Strategy /></AdminRoute>} />
        <Route path="users" element={<AdminRoute><Users /></AdminRoute>} />
        <Route path="reconhecimento-facial" element={<ReconhecimentoFacial />} />
        
        {/* Rotas de Pesquisa Eleitoral */}
        <Route path="pesquisas">
          <Route index element={<ListaPesquisas />} />
          <Route path="nova" element={<NovaPesquisa />} />
          <Route path=":id" element={<VisualizarPesquisa />} />
          <Route path=":id/editar" element={<EditarPesquisa />} />
        </Route>
      </Route>

      {/* Rota de visualização do projeto sem layout */}
      <Route 
        path="/app/documentos/projetos-lei/visualizar/:id" 
        element={
          <PrivateRoute>
            <VisualizarProjeto />
          </PrivateRoute>
        } 
      />
      
      {/* Rota de Checkout */}
      <Route 
        path="/app/checkout" 
        element={
          <PrivateRoute>
            <Suspense fallback={<div>Carregando checkout...</div>}>
              <CheckoutPage />
            </Suspense>
          </PrivateRoute>
        } 
      />

      <Route path="*" element={
        isAuthenticated ? (
          company ? (
            <Navigate to="/app" replace />
          ) : (
            <Navigate to="/select-company" replace />
          )
        ) : (
          <Navigate to="/login" replace />
        )
      } />
    </Routes>
  );
}

export default AppRoutes;
