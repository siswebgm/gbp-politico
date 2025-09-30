export interface Voter {
  uid: string;
  nome: string;
  cpf: string | null;
  genero: string;
  whatsapp: string;
  nascimento: string | null;
  titulo: string | null;
  zona: string | null;
  secao: string | null;
  telefone: string | null;
  cep: string | null;
  logradouro: string | null;
  cidade: string | null;
  bairro: string | null;
  numero: string | null;
  complemento: string | null;
  categoria_uid: string | null;
  indicado: string | null;
  empresa_uid: string;
  created_at?: string;
  usuario_uid: string; // ID do usuário que cadastrou
  responsavel: string; // Mantendo compatibilidade com o campo existente
}

export interface VoterFilters {
  search: string;
  city: string;
  neighborhood: string;
  category: string;
  indication: string;
  logradouro: string;
  cpf: string;
}

export interface VoterFormData {
  nome: string;
  cpf?: string;
  ignoreCpf: boolean;
  genero: string;
  whatsapp: string;
  nascimento?: string;
  titulo?: string;
  zona?: string;
  secao?: string;
  telefone?: string;
  cep: string;
  logradouro: string;
  cidade: string;
  bairro: string;
  numero: string;
  complemento?: string;
  categoria_uid: string;
  indicado?: string;
  registrarAtendimento?: boolean;
  descricaoAtendimento?: string;
  categoriaAtendimento?: string | null;
  statusAtendimento?: string;
  latitude?: string;
  longitude?: string;
}