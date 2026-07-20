import type { AssistantContext, AssistantModule, AssistantResult } from '../types';
import { normalize, extractValue } from '../utils';
import { listUsers } from '../../../services/users/list';
import { exportToExcel, exportToPdf } from '../export';
import type { User } from '../../../types/user';

const KEYWORDS = [
  'usuario', 'usuarios', 'usuario', 'usuarios', 'user', 'users',
  'funcionario', 'funcionarios', 'funcionaria', 'funcionarias',
  'colaborador', 'colaboradores', 'equipe', 'time',
  'admin', 'adm', 'administrador', 'administradores', 'administradora', 'administradoras',
  'coordenador', 'coordenadores', 'coordenadora', 'coordenadoras',
  'analista', 'analistas',
  'visitante', 'visitantes',
  'ativo', 'ativos', 'ativa', 'ativas',
  'bloqueado', 'bloqueados', 'bloqueada', 'bloqueadas',
  'suspenso', 'suspensos', 'suspensa', 'suspensas',
  'pendente', 'pendentes',
];

const PRIMARY_KEYWORDS = [
  'usuario', 'usuarios', 'usuario', 'usuarios', 'user', 'users',
  'funcionario', 'funcionarios', 'funcionaria', 'funcionarias',
  'colaborador', 'colaboradores', 'equipe', 'time',
  'admin', 'adm', 'administrador', 'administradores', 'administradora', 'administradoras',
  'coordenador', 'coordenadores', 'coordenadora', 'coordenadoras',
  'analista', 'analistas',
  'visitante', 'visitantes',
];

const ROLE_SYNONYMS: Record<string, string> = {
  admin: 'admin',
  adm: 'admin',
  administrador: 'admin',
  administradores: 'admin',
  administradora: 'admin',
  administradoras: 'admin',
  coordenador: 'coordenador',
  coordenadores: 'coordenador',
  coordenadora: 'coordenador',
  coordenadoras: 'coordenador',
  analista: 'analista',
  analistas: 'analista',
  colaborador: 'colaborador',
  colaboradores: 'colaborador',
  colaboradora: 'colaborador',
  colaboradoras: 'colaborador',
  visitante: 'visitante',
  visitantes: 'visitante',
};

const STATUS_CANONICAL: Record<string, string> = {
  ativo: 'ativo',
  ativos: 'ativo',
  ativa: 'ativo',
  ativas: 'ativo',
  bloqueado: 'bloqueado',
  bloqueados: 'bloqueado',
  bloqueada: 'bloqueado',
  bloqueadas: 'bloqueado',
  suspenso: 'suspenso',
  suspensos: 'suspenso',
  suspensa: 'suspenso',
  suspensas: 'suspenso',
  pendente: 'pendente',
  pendentes: 'pendente',
};

const STATUS_DB_MATCHES: Record<string, string[]> = {
  ativo: ['ativo', 'active'],
  bloqueado: ['bloqueado', 'blocked'],
  suspenso: ['suspenso', 'pending', 'pendente'],
  pendente: ['pendente', 'pending', 'suspenso'],
};

const STOP_KEYWORDS = [
  'usuario', 'usuarios', 'user', 'users',
  'colaborador', 'colaboradores', 'equipe',
  'admin', 'adm', 'administrador', 'administradores',
  'coordenador', 'coordenadores',
  'analista', 'analistas',
  'visitante', 'visitantes',
  'ativo', 'ativos', 'bloqueado', 'bloqueados',
  'suspenso', 'suspensos', 'pendente', 'pendentes',
  'nome', 'contato', 'email', 'whatsapp', 'telefone',
  'status', 'nivel', 'acesso', 'nivel_acesso',
  'quem', 'sao', 'sao', 'qual', 'quais', 'liste', 'listar', 'mostrar', 'mostre',
  'quantos', 'quantidade', 'total', 'numero', 'tem', 'no', 'na', 'sistema', 'meu', 'meus', 'minha', 'minhas',
  'e', 'ou', 'de', 'do', 'da', 'em', 'por', 'com',
];

function detectRole(text: string): string | undefined {
  const norm = normalize(text);
  for (const [synonym, role] of Object.entries(ROLE_SYNONYMS)) {
    const pattern = new RegExp(`\\b${synonym}\\b`, 'i');
    if (pattern.test(norm)) return role;
  }
  return undefined;
}

function detectStatus(text: string): string | undefined {
  const norm = normalize(text);
  for (const [synonym, canonical] of Object.entries(STATUS_CANONICAL)) {
    const pattern = new RegExp(`\\b${synonym}\\b`, 'i');
    if (pattern.test(norm)) return canonical;
  }
  return undefined;
}

function extractSearch(text: string): string | undefined {
  for (const key of ['nome', 'email', 'contato', 'whatsapp', 'telefone', 'chamado']) {
    const value = extractValue(text, key, STOP_KEYWORDS);
    if (value) return value;
  }

  const norm = normalize(text);
  const tokens = norm
    .split(/\s+/)
    .filter((t) =>
      t.length > 2 &&
      !KEYWORDS.includes(t) &&
      !['quem', 'sao', 'sao', 'qual', 'quais', 'liste', 'listar', 'mostrar', 'mostre', 'quantos', 'quantidade', 'total', 'numero', 'tem', 'no', 'na', 'sistema', 'meu', 'meus', 'minha', 'minhas'].includes(t)
    );

  if (tokens.length > 0) {
    return tokens.join(' ');
  }

  return undefined;
}

function formatStatus(status?: string | null): string {
  if (!status) return 'Não informado';
  const n = normalize(status);
  if (STATUS_DB_MATCHES.ativo.includes(n)) return 'Ativo';
  if (STATUS_DB_MATCHES.bloqueado.includes(n)) return 'Bloqueado';
  if (STATUS_DB_MATCHES.suspenso.includes(n)) return 'Suspenso/Pendente';
  return status;
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function matchesFilters(user: User, filters: Record<string, any>): boolean {
  if (user.adm_empresa) {
    return false;
  }

  if (filters.role && normalize(user.nivel_acesso || '') !== normalize(filters.role)) {
    return false;
  }

  if (filters.status) {
    const accepted = STATUS_DB_MATCHES[filters.status as string] || [filters.status];
    const userStatus = normalize(user.status || '');
    if (!accepted.includes(userStatus)) return false;
  }

  if (filters.search) {
    const searchNorm = normalize(filters.search);
    const haystack = normalize(
      [user.nome, user.email, user.contato].filter(Boolean).join(' ')
    );
    if (!haystack.includes(searchNorm)) return false;
  }

  return true;
}

export const usuariosModule: AssistantModule = {
  name: 'usuarios',
  title: 'Usuários',
  keywords: KEYWORDS,
  primaryKeywords: PRIMARY_KEYWORDS,
  quickQuestions: [
    'Quem são os administradores?',
    'Quem são os visitantes?',
    'Quem são os coordenadores?',
    'Quem são os analistas?',
    'Quem são os colaboradores?',
    'Liste os usuários ativos',
    'Usuários bloqueados',
    'Quantos usuários ativos?',
    'Meus funcionários',
  ],

  parse(text, _context) {
    const norm = normalize(text);
    const matchesKeyword = KEYWORDS.some((keyword) => {
      const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
      return pattern.test(norm);
    });
    if (!matchesKeyword) return null;

    const role = detectRole(text);
    const status = detectStatus(text);
    const search = extractSearch(text);

    const isCount = /\b(quantos|quantidade|total|quantas|numero)\b/.test(norm);

    const filters: Record<string, any> = {};
    if (role) filters.role = role;
    if (status) filters.status = status;
    if (search) filters.search = search;

    const action = isCount ? 'count' : 'list';

    const parts: string[] = [];
    parts.push(isCount ? 'Quantidade' : 'Lista');
    parts.push('de usuários');
    if (role) parts.push(`com nível ${role}`);
    if (status) parts.push(`com status ${status}`);
    if (search) parts.push(`contendo "${search}"`);

    return {
      module: 'usuarios',
      action,
      filters,
      description: parts.join(' '),
      displayTitle: 'Usuários',
    };
  },

  async execute(query, context: AssistantContext): Promise<AssistantResult> {
    const users = await listUsers(context.empresaUid);
    const filtered = users.filter((user) => matchesFilters(user, query.filters));

    if (query.action === 'count') {
      return { ...query, count: filtered.length };
    }

    const displayRows = filtered.slice(0, 20).map((user) => ({
      uid: user.uid || user.id,
      nome: user.nome || '-',
      email: user.email || '-',
      contato: user.contato || '-',
      nivel_acesso: user.nivel_acesso || '-',
      status: formatStatus(user.status),
      ultimo_acesso: formatDateTime(user.ultimo_acesso),
    }));

    return { ...query, count: filtered.length, rows: displayRows };
  },

  async export(result, format, context: AssistantContext) {
    const users = await listUsers(context.empresaUid);
    const filtered = users.filter((user) => matchesFilters(user, result.filters));

    const date = new Date().toISOString().slice(0, 10);
    const fileName = `usuarios_assistente_${date}`;

    const sheetData = filtered.map((user) => ({
      Nome: user.nome || '',
      Email: user.email || '',
      Contato: user.contato || '',
      'Nível de acesso': user.nivel_acesso || '',
      Status: formatStatus(user.status),
      'Último acesso': formatDateTime(user.ultimo_acesso),
    }));

    if (format === 'excel') {
      exportToExcel(sheetData, `${fileName}.xlsx`, 'Usuários');
      return;
    }

    const headers = ['Nome', 'Email', 'Contato', 'Nível de acesso', 'Status', 'Último acesso'];
    const body = filtered.map((user) => [
      user.nome || '',
      user.email || '',
      user.contato || '',
      user.nivel_acesso || '',
      formatStatus(user.status),
      formatDateTime(user.ultimo_acesso),
    ]);

    exportToPdf(headers, body, 'GBP Político - Usuários', result.description, filtered.length, `${fileName}.pdf`);
  },
};
