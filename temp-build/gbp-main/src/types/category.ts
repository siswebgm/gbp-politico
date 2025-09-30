export interface Category {
  uid: string;
  nome: string;
  empresa_uid: string;
  created_at: string;
  tipo: {
    uid: string;
    nome: string;
  };
}