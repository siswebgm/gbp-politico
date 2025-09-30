export interface DocumentTag {
  id: number;
  nome: string;
  cor: string;
  empresa_id: number;
}

export interface DocumentUpdate {
  id: number;
  documento_id: number;
  usuario_id: number;
  descricao: string;
  status: DocumentStatus;
  created_at: string;
}

export interface DocumentMessage {
  id: number;
  documento_id: number;
  usuario_id: number;
  mensagem: string;
  lida: boolean;
  created_at: string;
}

export interface DocumentApproval {
  id: number;
  documento_id: number;
  etapa: number;
  usuario_id: number;
  status: 'pending' | 'approved' | 'rejected';
  comentario: string | null;
  data_aprovacao: string | null;
}

export type DocumentStatus = 
  | 'draft' 
  | 'review'
  | 'approved'
  | 'rejected'
  | 'archived';

export type DocumentType = 
  | 'law_project'
  | 'official_letter'
  | 'requirement'
  | 'minutes'
  | 'resolution'
  | 'ordinance';

export interface Document {
  id: number;
  titulo: string;
  tipo: DocumentType;
  descricao: string;
  status: DocumentStatus;
  responsavel_id: number;
  empresa_id: number;
  created_at: string;
  tags?: DocumentTag[];
  updates?: DocumentUpdate[];
  messages?: DocumentMessage[];
  approvals?: DocumentApproval[];
}