import { create } from 'zustand';

interface Atendimento {
  uid: string;
  id: number;
  eleitor_uid: string | null;
  usuario_uid: string | null;
  categoria_uid: string | null;
  descricao: string | null;
  data_atendimento: Date | null;
  empresa_uid: string | null;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'cancelado' | null;
  responsavel: string | null;
  indicado: string | null;
  numero: number | null;
  created_at: Date | null;
  tipo_de_atendimento: string | null;
  data_agendamento: Date | null;
  data_expiração: Date | null;
  observacao_descricao: string | null;
  updated_at: Date | null;
  // Campos de endereço
  bairro: string | null;
  cidade: string | null;
  logradouro: string | null;
  uf: string | null;
  cep: string | null;
}

interface AtendimentosStore {
  atendimentos: Atendimento[];
  loading: boolean;
  error: string | null;
  setAtendimentos: (atendimentos: Atendimento[]) => void;
  addAtendimento: (atendimento: Atendimento) => void;
  updateAtendimento: (id: string, atendimento: Partial<Atendimento>) => void;
  deleteAtendimento: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAtendimentosStore = create<AtendimentosStore>((set) => ({
  atendimentos: [],
  loading: false,
  error: null,
  setAtendimentos: (atendimentos) => set({ atendimentos }),
  addAtendimento: (atendimento) =>
    set((state) => ({
      atendimentos: [...state.atendimentos, atendimento],
    })),
  updateAtendimento: (id, atendimento) =>
    set((state) => ({
      atendimentos: state.atendimentos.map((item) =>
        item.uid === id ? { ...item, ...atendimento } : item
      ),
    })),
  deleteAtendimento: (id) =>
    set((state) => ({
      atendimentos: state.atendimentos.filter((item) => item.uid !== id),
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
