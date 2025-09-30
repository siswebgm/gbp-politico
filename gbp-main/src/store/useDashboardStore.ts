import { create } from 'zustand';
import { DashboardData } from '../types/dashboard';

interface DashboardStore {
  data: DashboardData | null;
  lastUpdate: Date | null;
  isLoading: boolean;
  error: Error | null;
  setData: (data: DashboardData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  clearData: () => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  data: null,
  lastUpdate: null,
  isLoading: false,
  error: null,
  setData: (data) => set({ data, lastUpdate: new Date(), error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearData: () => set({ data: null, lastUpdate: null, error: null }),
}));
