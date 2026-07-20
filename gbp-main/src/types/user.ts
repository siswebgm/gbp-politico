export interface User {
  uid?: string;
  id: string;
  nome: string;
  email: string;
  senha: string;
  nivel_acesso: 'admin' | 'coordenador' | 'analista' | 'colaborador' | 'visitante';
  empresa_uid: string;
  ultimo_acesso: string | null;
  created_at: string;
  contato?: string | null;
  foto?: string | null;
  status?: string | null;
  adm_empresa?: boolean | null;
}

export interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
}