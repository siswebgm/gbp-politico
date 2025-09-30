import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../services/attendances';
import { useCompanyStore } from './useCompanyContext';
import type { Attendance } from '../services/attendances';

export function useAttendances(eleitorId?: number) {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useCompanyStore();

  const attendances = useQuery({
    queryKey: ['attendances', currentCompanyId, eleitorId],
    queryFn: () => {
      if (!currentCompanyId) {
        throw new Error('No company selected');
      }
      return attendanceService.list(currentCompanyId, eleitorId);
    },
    enabled: !!currentCompanyId,
    retry: 3,
    retryDelay: 1000,
    staleTime: 1000 * 60, // 1 minute
  });

  const createAttendance = useMutation({
    mutationFn: (data: Omit<Attendance, 'id'>) => {
      if (!currentCompanyId) {
        throw new Error('No company selected');
      }
      return attendanceService.create({ ...data, empresa_id: currentCompanyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances', currentCompanyId] });
    },
  });

  const updateAttendance = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Attendance> }) => {
      if (!currentCompanyId) {
        throw new Error('No company selected');
      }
      return attendanceService.update(id, { ...data, empresa_id: currentCompanyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances', currentCompanyId] });
    },
  });

  const deleteAttendance = useMutation({
    mutationFn: (id: number) => {
      if (!currentCompanyId) {
        throw new Error('No company selected');
      }
      return attendanceService.delete(id, currentCompanyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances', currentCompanyId] });
    },
  });

  return {
    attendances,
    createAttendance,
    updateAttendance,
    deleteAttendance,
  };
}