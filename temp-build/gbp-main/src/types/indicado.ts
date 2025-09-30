export interface Indicado {
  id: number;
  nome: string;
  cidade?: string | null;
  bairro?: string | null;
  gbp_empresas: number;
  created_at: string;
}