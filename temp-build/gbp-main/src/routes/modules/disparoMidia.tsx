// ARQUIVO EM USO (criado em 31/01/2025)
// Este é o arquivo principal usado pelo sistema.
// Importado em routes/modules/index.ts e routes/app.tsx

import { DisparoMidia } from '../../pages/DisparoMidia';

// Exporta as rotas do módulo
export const disparoMidiaRoutes = [
  {
    path: 'disparo-de-midia',
    element: <DisparoMidia />,
  }
];
