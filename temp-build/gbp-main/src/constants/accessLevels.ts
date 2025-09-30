export const ACCESS_LEVELS = {
  ADMIN: 'admin',
  COORDENADOR: 'coordenador',
  ANALISTA: 'analista',
  COLABORADOR: 'colaborador',
  VISITANTE: 'visitante'
} as const;

export const ACCESS_LEVEL_DESCRIPTIONS = {
  [ACCESS_LEVELS.VISITANTE]: [
    'Visualização básica de eleitores',
    'Visualização de atendimentos',
    'Acesso a documentos (ofícios)'
  ],
  [ACCESS_LEVELS.COLABORADOR]: [
    'Todas as permissões de Visitante',
    'Gerenciamento de eleitores',
    'Agenda de compromissos',
    'Registro de atendimentos',
    'Documentos (ofícios)'
  ],
  [ACCESS_LEVELS.ANALISTA]: [
    'Todas as permissões de Colaborador',
    'Acesso a resultados eleitorais',
    'Análise de estratégia',
    'Mapa eleitoral',
    'Relatórios avançados'
  ],
  [ACCESS_LEVELS.COORDENADOR]: [
    'Todas as permissões de Analista',
    'Gerenciamento de documentos (ofícios, requerimentos, projetos de lei, emendas)',
    'Configurações do sistema',
    'Gerenciamento de pesquisas',
    'Gerenciamento de usuários'
  ],
  [ACCESS_LEVELS.ADMIN]: [
    'Acesso total ao sistema',
    'Todas as permissões de Coordenador',
    'Configurações administrativas',
    'Gerenciamento de empresas',
    'Audiência de logs do sistema'
  ]
} as const;

export type AccessLevel = typeof ACCESS_LEVELS[keyof typeof ACCESS_LEVELS];

export const RESTRICTED_ACCESS_LEVELS = [
  ACCESS_LEVELS.ADMIN,
  ACCESS_LEVELS.COORDENADOR,
  ACCESS_LEVELS.ANALISTA
];

export const hasRestrictedAccess = (nivelAcesso?: string | null): boolean => {
  if (!nivelAcesso) return false;
  return RESTRICTED_ACCESS_LEVELS.includes(nivelAcesso as AccessLevel);
};
