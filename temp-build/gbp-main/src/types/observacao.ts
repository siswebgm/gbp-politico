export interface Observacao {
  uid: string;
  id: number;
  atendimento_uid: string;
  observacao: string;
  created_at?: string;
  responsavel?: string;
  empresa_uid: string;
}

export interface ObservacaoFormData {
  atendimento_uid: string;
  observacao: string;
  responsavel?: string;
  empresa_uid: string;
}
