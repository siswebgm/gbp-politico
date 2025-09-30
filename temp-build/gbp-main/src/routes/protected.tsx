import { Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { appRoutes } from './app';
import { SelectCompany } from '../pages/SelectCompany';
import { PrivateRoute } from '../components/PrivateRoute';

export const protectedRoutes = [
  {
    path: '/select-company',
    element: (
      <PrivateRoute>
        <SelectCompany />
      </PrivateRoute>
    ),
  },
  {
    path: '/app',
    element: (
      <PrivateRoute>
        <Layout />
      </PrivateRoute>
    ),
    children: appRoutes,
  },
  {
    path: '*',
    element: <Navigate to="/app" replace />,
  },
];