import { Navigate } from 'react-router-dom';
import { Login } from '../pages/Login';
import { NovaDemanda } from '../pages/public/NovaDemanda';
import { DemandaSucesso } from '../pages/public/DemandaSucesso';

export const publicRoutes = [
  {
    path: '/',
    element: <Login />,
  },
  {
    path: '/demanda/:empresa_uid',
    element: <NovaDemanda />,
  },
  {
    path: '/demanda-sucesso/:id',
    element: <DemandaSucesso />,
  },
];