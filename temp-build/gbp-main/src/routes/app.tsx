import { lazy } from 'react';
import { Dashboard } from '../pages/Dashboard';
import { VoterRoutes, AttendanceRoutes, disparoMidiaRoutes, documentsRoutes } from './modules/index';
import { ElectoralMap } from '../pages/MapaEleitoral';
import { Goals } from '../pages/Goals';
import { Reports } from '../pages/Reports';
import { Strategy } from '../pages/Strategy';
import { Users } from '../pages/Users';
import { PlanosPage } from '../pages/app/Planos';
import { Settings } from '../pages/Settings/Settings';
import { VotersByConfidence } from '../pages/VotersByConfidence';

// Lazy load ElectionResults component
const ElectionResults = lazy(() => import('../pages/ElectionResults'));

interface RouteConfig {
  path: string;
  element: JSX.Element;
}

export const appRoutes: RouteConfig[] = [
  {
    path: 'dashboard',
    element: <Dashboard />,
  },
  {
    path: 'eleitores/confiabilidade/:confidenceLevel',
    element: <VotersByConfidence />,
  },
  ...VoterRoutes,
  ...AttendanceRoutes,
  ...disparoMidiaRoutes,
  ...documentsRoutes,
  {
    path: 'electoral-map',
    element: <ElectoralMap />,
  },
  {
    path: 'election-results',
    element: <ElectionResults />,
  },
  {
    path: 'goals',
    element: <Goals />,
  },
  {
    path: 'reports',
    element: <Reports />,
  },
  {
    path: 'strategy',
    element: <Strategy />,
  },
  {
    path: 'users',
    element: <Users />,
  },
  {
    path: 'settings',
    element: <Settings />,
  },
  {
    path: 'planos',
    element: <PlanosPage />,
  },
];