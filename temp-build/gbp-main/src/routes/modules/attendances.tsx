import { AttendanceList } from '../../pages/AttendanceList';
import { AttendanceForm } from '../../pages/AttendanceForm';

export const AttendanceRoutes = [
  {
    path: 'attendances',
    element: <AttendanceList />,
  },
  {
    path: 'attendances/new',
    element: <AttendanceForm />,
  },
  {
    path: 'attendances/:id',
    element: <AttendanceForm />,
  },
];