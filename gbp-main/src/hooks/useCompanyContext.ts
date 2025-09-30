import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CompanyState {
  currentCompanyUid: string | null;
  setCurrentCompany: (companyUid: string) => void;
  clearCurrentCompany: () => void;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      currentCompanyUid: null,
      setCurrentCompany: (companyUid) => set({ currentCompanyUid: companyUid }),
      clearCurrentCompany: () => set({ currentCompanyUid: null }),
    }),
    {
      name: 'company-storage',
    }
  )
);