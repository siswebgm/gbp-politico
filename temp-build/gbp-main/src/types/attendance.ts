export interface Attendance {
  id: number;
  eleitor_id: number;
  usuario_id: number;
  categoria_id: number | null;
  descricao: string;
  data_atendimento: string;
  empresa_id: number;
  created_at?: string;
  
  // Joined fields
  eleitor?: {
    id: number;
    nome: string;
  };
  usuario?: {
    id: number;
    nome: string;
  };
  categoria?: {
    id: number;
    nome: string;
  };
}