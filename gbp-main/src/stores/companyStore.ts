import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Company {
  id: number;
  name: string;
  logo?: string;
}

interface CompanyState {
  company: Company | null;
  setCompany: (company: Company | null) => void;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      company: null,
      setCompany: (company) => set({ company }),
    }),
    {
      name: 'company-storage',
    }
  )
);
