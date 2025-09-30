import { createAttendance } from './create';
import { listAttendances } from './list';
import { updateAttendance } from './update';
import { deleteAttendance } from './delete';

export const attendanceService = {
  create: createAttendance,
  list: listAttendances,
  update: updateAttendance,
  delete: deleteAttendance,
};