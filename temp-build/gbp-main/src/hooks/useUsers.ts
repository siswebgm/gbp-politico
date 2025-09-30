import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/users';
import { useCompanyStore } from './useCompanyContext';

interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
}

export function useUsers(filters?: UserFilters) {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useCompanyStore();

  const users = useQuery({
    queryKey: ['users', currentCompanyId, filters],
    queryFn: () => {
      if (!currentCompanyId) {
        throw new Error('No company selected');
      }
      return userService.list(currentCompanyId, filters);
    },
    enabled: !!currentCompanyId,
  });

  const blockUser = useMutation({
    mutationFn: (userId: number) => {
      if (!currentCompanyId) {
        throw new Error('No company selected');
      }
      return userService.toggleBlock(userId, currentCompanyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', currentCompanyId] });
    },
  });

  const deleteUser = useMutation({
    mutationFn: (userId: number) => {
      if (!currentCompanyId) {
        throw new Error('No company selected');
      }
      return userService.delete(userId, currentCompanyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', currentCompanyId] });
    },
  });

  return {
    users: users.data,
    isLoading: users.isLoading,
    error: users.error,
    blockUser,
    deleteUser,
  };
}