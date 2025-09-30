import { useEffect } from 'react';
import { presenceService } from '../services/presence';
import { useAuthStore } from '../store/useAuthStore';

export function usePresence() {
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (user?.id) {
      presenceService.initialize(user.id);
      return () => presenceService.cleanup();
    }
  }, [user?.id]);
}
