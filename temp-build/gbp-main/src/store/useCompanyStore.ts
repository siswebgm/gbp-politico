import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Company {
  uid: string;
  nome: string;
  token: string | null;
  instancia: string | null;
  porta: string | null;
}

interface CompanyStore {
  company: Company | null;
  user: any;
  setCompany: (company: Company | null) => void;
  setUser: (user: any) => void;
  clearCompany: () => void;
}

export const useCompanyStore = create<CompanyStore>()(
  persist(
    (set) => ({
      company: null,
      user: null,
      setCompany: (company) => {
        console.log('Setting company:', company);
        set({ company });
      },
      setUser: (user) => {
        console.log('Setting user in store:', user);
        set({ user });
      },
      clearCompany: () => set({ company: null }),
    }),
    {
      name: 'company-storage',
    }
  )
);
