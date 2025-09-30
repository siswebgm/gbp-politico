import { Eleitores } from '../../pages/Eleitores';
import { VoterForm } from '../../pages/VoterForm';
import { VoterProfile } from '../../pages/VoterProfile';
import { EleitorDetalhes } from '../../pages/Eleitores/EleitorDetalhes';

export const VoterRoutes = [
  {
    path: 'eleitores',
    element: <Eleitores />,
  },
  {
    path: 'eleitores/novo',
    element: <VoterForm />,
  },
  {
    path: 'eleitores/:uid',
    element: <EleitorDetalhes />,
  },
  {
    path: 'eleitores/:uid/editar',
    element: <VoterForm />,
  },
  {
    path: 'eleitores/:uid/perfil',
    element: <VoterProfile />,
  },
];