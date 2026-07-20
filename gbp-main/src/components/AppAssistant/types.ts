export type AssistantAction = 'count' | 'list' | 'group' | 'custom';

export interface AssistantIntent {
  uid?: string;
  pergunta: string;
  resposta: string;
  palavras_chave: string;
  ativo: boolean;
  ordem?: number;
}

export interface AssistantContext {
  empresaUid: string;
  companyName?: string;
  categories: { uid: string; nome: string }[];
  indicadores: { uid: string; nome: string }[];
  responsaveis: { uid: string; nome: string }[];
  bairros: string[];
  statusWpp: string;
  customIntents: AssistantIntent[];
}

export interface AssistantQuery {
  module: string;
  action: AssistantAction;
  filters: Record<string, any>;
  groupBy?: string;
  limit?: number;
  description: string;
  displayTitle?: string;
}

export interface GroupItem {
  key: string;
  label: string;
  count: number;
}

export interface AssistantResult {
  module: string;
  action: AssistantAction;
  count?: number;
  rows?: any[];
  groups?: GroupItem[];
  limit?: number;
  description: string;
  filters: Record<string, any>;
  groupBy?: string;
  displayTitle?: string;
  customResponse?: string;
  isConnected?: boolean;
}

export interface AssistantModule {
  name: string;
  title: string;
  keywords: string[];
  primaryKeywords?: string[];
  quickQuestions: string[];
  parse(text: string, context: AssistantContext): AssistantQuery | null;
  execute(query: AssistantQuery, context: AssistantContext): Promise<AssistantResult>;
  export(result: AssistantResult, format: 'pdf' | 'excel', context: AssistantContext): Promise<void>;
}
