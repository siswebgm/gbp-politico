import type { AssistantContext, AssistantModule, AssistantQuery, GroupItem } from '../types';
import { normalize, getDateRange, findByName, extractValue, getLastLimit, formatDateRange } from '../utils';
import { eleitorService } from '../../../services/eleitorService';
import type { Eleitor, EleitorFilters } from '../../../types/eleitor';
import { exportToExcel, exportToPdf } from '../export';

const STOP_KEYWORDS = [
  'categoria', 'bairro', 'cidade', 'genero', 'sexo', 'indicado', 'indicado por',
  'responsavel', 'usuario', 'periodo', 'por', 'hoje', 'ontem', 'semana', 'mes',
  'ano', 'dia', 'dias', 'meses', 'anos', 'semanas', 'esse', 'esta', 'este', 'essa',
  'ultimos', 'ultimas', 'proximos', 'proximas', 'quantos', 'quantidade', 'total',
  'cadastros', 'pessoas', 'eleitores', 'cadastro', 'pessoa', 'quem', 'sao', 'sao',
  'liste', 'mostre', 'exiba', 'baixar', 'pdf', 'excel', 'e', 'ou', 'com', 'em', 'na', 'no'
];

const getGroupBy = (text: string): EleitorFilters['groupBy'] => {
  const norm = normalize(text);
  if (/\bpor\s+(categoria|categorias)\b/.test(norm)) return 'categoria_uid';
  if (/\bpor\s+(bairro|bairros)\b/.test(norm)) return 'bairro';
  if (/\bpor\s+(cidade|cidades)\b/.test(norm)) return 'cidade';
  if (/\bpor\s+(genero|sexo)\b/.test(norm)) return 'genero';
  if (/\bpor\s+(indicado|indicados)\b/.test(norm)) return 'indicado_uid';
  if (/\bpor\s+(responsavel|usuario|usuário|usuarios)\b/.test(norm)) return 'usuario_uid';
  return undefined;
};

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const formatNascimentoDisplay = (nascimento?: string | null) => {
  if (!nascimento) return '';
  const [year, month, day] = nascimento.split('T')[0].split('-').map(Number);
  if (!year || !month || !day) return '';
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
};

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

const MONTH_NAMES_NORM = MONTH_NAMES.map((m) => normalize(m));

const extractMonthNumber = (norm: string): number | undefined => {
  for (let i = 0; i < MONTH_NAMES_NORM.length; i++) {
    if (new RegExp(`\\b${MONTH_NAMES_NORM[i]}\\b`).test(norm)) return i + 1;
  }
  return undefined;
};

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfWeek = (date: Date) => {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
};

const getBirthdayRange = (text: string, allowMonthOnly = false): { from: Date; to: Date; label: string } | undefined => {
  const norm = normalize(text);
  const hasKeyword = /\b(aniversariantes|aniversariante|aniversarios|aniversario|niver|niversario)\b/.test(norm);
  const explicitMonth = extractMonthNumber(norm);

  if (!hasKeyword && !(allowMonthOnly && explicitMonth)) return undefined;

  const now = new Date();

  if (explicitMonth) {
    const from = new Date(2000, explicitMonth - 1, 1);
    const to = new Date(2000, explicitMonth, 1);
    const label = `${MONTH_NAMES[explicitMonth - 1]} de ${now.getFullYear()}`;
    return { from, to, label };
  }

  if (norm.includes('hoje')) {
    const from = startOfDay(now);
    const to = startOfDay(addDays(now, 1));
    return { from, to, label: formatDateRange(from, to) };
  }

  if (/\b(amanha|amanhã)\b/.test(norm)) {
    const from = startOfDay(addDays(now, 1));
    const to = startOfDay(addDays(now, 2));
    return { from, to, label: formatDateRange(from, to) };
  }

  if (norm.includes('ontem')) {
    const from = startOfDay(addDays(now, -1));
    const to = startOfDay(now);
    return { from, to, label: formatDateRange(from, to) };
  }

  if (/\b(esta semana|essa semana)\b/.test(norm)) {
    const monday = startOfWeek(now);
    const to = startOfDay(addDays(monday, 7));
    return { from: monday, to, label: formatDateRange(monday, to) };
  }

  const monthMatch = norm.match(/\b(este mes|esse mes|deste mes|desse mes|do mes|do mês)\b/);
  if (monthMatch) {
    const month = now.getMonth() + 1;
    const from = new Date(2000, month - 1, 1);
    const to = new Date(2000, month, 1);
    const label = `${MONTH_NAMES[month - 1]} de ${now.getFullYear()}`;
    return { from, to, label };
  }

  const prevMonthMatch = norm.match(/\b(mes passado|mes anterior|ultimo mes|mês passado|do mes passado)\b/);
  if (prevMonthMatch) {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = d.getMonth() + 1;
    const from = new Date(2000, month - 1, 1);
    const to = new Date(2000, month, 1);
    const label = `${MONTH_NAMES[month - 1]} de ${d.getFullYear()}`;
    return { from, to, label };
  }

  const diaMatch = norm.match(/\bdia\s+(\d{1,2})\b/);
  if (diaMatch) {
    const day = parseInt(diaMatch[1], 10);
    const from = new Date(now.getFullYear(), now.getMonth(), day);
    const to = startOfDay(addDays(from, 1));
    return { from: startOfDay(from), to, label: formatDateRange(startOfDay(from), to) };
  }

  return undefined;
};

export const pessoasModule: AssistantModule = {
  name: 'pessoas',
  title: 'Pessoas',
  keywords: ['pessoas', 'eleitores', 'cadastros', 'cadastro', 'eleitor', 'pessoa', 'aniversariantes', 'aniversariante', 'aniversarios', 'aniversario', 'niver', 'cpf'],
  primaryKeywords: ['pessoas', 'eleitores', 'cadastros', 'pessoa', 'eleitor', 'aniversariantes', 'aniversariante', 'niver', 'cpf'],
  quickQuestions: [
    'Quantos cadastros essa semana?',
    'Cadastros desse mês',
    'Cadastros desse ano',
    'Cadastros por categoria',
    'Cadastros por bairro',
    'Cadastros por cidade',
    'Quantos aniversariantes tenho hoje?',
    'O CPF 08990802431 tem cadastrado?',
  ],

  parse(text, context) {
    const norm = normalize(text);
    const isBirthdayContinuation = !!context.previousFilters?.birthdayLabel;
    const birthdayRange = getBirthdayRange(text, isBirthdayContinuation);
    const { dateFrom, dateTo, label } = getDateRange(text);
    const groupBy = getGroupBy(text);

    const filters: Record<string, any> = birthdayRange
      ? { birthdayFrom: birthdayRange.from.toISOString(), birthdayTo: birthdayRange.to.toISOString(), birthdayLabel: birthdayRange.label }
      : { dateFrom, dateTo };

    const categoriaValue = extractValue(text, 'categoria', STOP_KEYWORDS);
    if (categoriaValue) {
      const found = findByName(context.categories, categoriaValue);
      if (found) filters.categoria_uid = found.uid;
    }

    const bairroValue = extractValue(text, 'bairro', STOP_KEYWORDS);
    if (bairroValue) filters.bairro = bairroValue;

    const cidadeValue = extractValue(text, 'cidade', STOP_KEYWORDS);
    if (cidadeValue) filters.cidade = cidadeValue;

    const cpfMatch = text.match(/\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b/);
    const cpfValue = cpfMatch ? cpfMatch[0].replace(/\D/g, '') : undefined;
    if (cpfValue) filters.cpf = cpfValue;

    const generoValue = extractValue(text, 'genero', STOP_KEYWORDS) || extractValue(text, 'sexo', STOP_KEYWORDS);
    if (generoValue) {
      const g = normalize(generoValue);
      if (g.startsWith('f') || g.includes('fem')) filters.genero = 'Feminino';
      else if (g.startsWith('m') || g.includes('mas')) filters.genero = 'Masculino';
      else filters.genero = generoValue;
    }

    const indicadoValue = extractValue(text, 'indicado(?:\\s*por)?', STOP_KEYWORDS);
    if (indicadoValue) {
      const found = findByName(context.indicadores, indicadoValue);
      if (found) filters.indicado = found.uid;
    }

    const responsavelValue = extractValue(text, 'responsavel', STOP_KEYWORDS);
    if (responsavelValue) {
      const found = findByName(context.responsaveis, responsavelValue);
      if (found) filters.responsavel = found.uid;
    }

    const isList = /\b(quem sao|quem são|liste|listar|mostre|mostrar|exiba|exibir|ver|mostrar)\b/.test(norm);
    const isCount = /\b(quantos|quantidade|total|quantas|numero)\b/.test(norm);

    let limit: number | undefined = getLastLimit(text, ['cadastro', 'pessoa', 'eleitor'], ['cadastros', 'pessoas', 'eleitores']);
    const isLast = limit != null;

    let action: AssistantQuery['action'] = 'count';
    if (groupBy) action = 'group';
    else if ((isList && !isCount) || isLast) action = 'list';
    else if (birthdayRange && !isCount) action = 'list';
    else if (filters.cpf && !isCount) action = 'list';

    const parts: string[] = [];
    if (isLast) {
      parts.push(limit === 1 ? 'Último cadastro' : `Últimos ${limit} cadastros`);
      if (label && label !== 'todos os tempos') parts.push(`(${label})`);
    } else if (birthdayRange) {
      parts.push(action === 'group' ? 'Agrupamento' : action === 'list' ? 'Lista' : 'Quantidade');
      parts.push(`de aniversariantes (${birthdayRange.label})`);
    } else {
      parts.push(action === 'group' ? 'Agrupamento' : action === 'list' ? 'Lista' : 'Quantidade');
      parts.push(`de pessoas (${label})`);
    }

    if (filters.categoria_uid) {
      const cat = context.categories.find((c) => c.uid === filters.categoria_uid);
      parts.push(`na categoria ${cat?.nome || filters.categoria_uid}`);
    } else if (categoriaValue) {
      parts.push(`com categoria próxima a "${categoriaValue}"`);
    }

    if (filters.bairro) parts.push(`no bairro ${filters.bairro}`);
    if (filters.cidade) parts.push(`na cidade ${filters.cidade}`);
    if (filters.cpf) parts.push(`com CPF ${filters.cpf}`);
    if (filters.genero) parts.push(`do gênero ${filters.genero}`);
    if (filters.indicado) {
      const ind = context.indicadores.find((i) => i.uid === filters.indicado);
      parts.push(`indicado por ${ind?.nome || filters.indicado}`);
    }
    if (filters.responsavel) {
      const resp = context.responsaveis.find((r) => r.uid === filters.responsavel);
      parts.push(`responsável ${resp?.nome || filters.responsavel}`);
    }

    return {
      module: 'pessoas',
      action,
      filters,
      groupBy,
      limit,
      description: parts.join(' '),
      displayTitle: 'Pessoas',
    };
  },

  async execute(query, context) {
    if (query.filters.birthdayFrom) {
      const rows = await eleitorService.getBirthdays(
        context.empresaUid,
        new Date(query.filters.birthdayFrom),
        new Date(query.filters.birthdayTo)
      );

      if (query.action === 'count') {
        return { ...query, count: rows.length };
      }

      if (query.action === 'group') {
        const groups = groupRows(rows, query.groupBy, context);
        return { ...query, count: rows.length, groups };
      }

      const displayRows = rows.slice(0, 20).map((row) => ({
        ...row,
        categoria_nome: context.categories.find((c) => c.uid === row.categoria_uid)?.nome || '-',
      }));

      return { ...query, count: rows.length, rows: displayRows };
    }

    if (query.action === 'count') {
      const { count, error } = await eleitorService.count(context.empresaUid, query.filters as EleitorFilters);
      if (error) throw new Error(error);
      return { ...query, count: count || 0 };
    }

    const rows = await eleitorService.listAllForExport(context.empresaUid, query.filters as EleitorFilters);

    const sortedRows = query.limit != null
      ? [...rows].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      : rows;

    if (query.action === 'group') {
      const groups = groupRows(rows, query.groupBy, context);
      return { ...query, count: rows.length, groups };
    }

    const displayRows = sortedRows.slice(0, query.limit ?? 20).map((row) => ({
      ...row,
      categoria_nome: context.categories.find((c) => c.uid === row.categoria_uid)?.nome || '-',
    }));

    return { ...query, count: sortedRows.length, rows: displayRows };
  },

  async export(result, format, context) {
    let rows = result.filters.birthdayFrom
      ? await eleitorService.getBirthdays(
          context.empresaUid,
          new Date(result.filters.birthdayFrom),
          new Date(result.filters.birthdayTo)
        )
      : await eleitorService.listAllForExport(context.empresaUid, result.filters as EleitorFilters);

    if (result.limit != null) {
      rows = [...rows].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, result.limit);
    }

    const getCat = (uid?: string | null) =>
      uid ? context.categories.find((c) => c.uid === uid)?.nome || '-' : '-';
    const getInd = (uid?: string | null) =>
      uid ? context.indicadores.find((i) => i.uid === uid)?.nome || '-' : '-';
    const getResp = (uid?: string | null) =>
      uid ? context.responsaveis.find((r) => r.uid === uid)?.nome || '-' : '-';

    const data = rows.map((row) => ({
      Nome: row.nome || '',
      CPF: row.cpf || '',
      WhatsApp: row.whatsapp || '',
      Gênero: row.genero || '',
      Cidade: row.cidade || '',
      Bairro: row.bairro || '',
      Logradouro: row.logradouro || '',
      Categoria: getCat(row.categoria_uid),
      Indicado: getInd(row.indicado_uid),
      Responsável: getResp(row.usuario_uid),
      'Criado em': row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : '',
      Nascimento: formatNascimentoDisplay(row.nascimento),
    }));

    const date = new Date().toISOString().slice(0, 10);
    const fileName = `pessoas_assistente_${date}`;

    if (format === 'excel') {
      exportToExcel(data, `${fileName}.xlsx`, 'Pessoas');
      return;
    }

    const headers = ['Nome', 'CPF', 'WhatsApp', 'Gênero', 'Cidade', 'Bairro', 'Categoria', 'Responsável', 'Criado em'];
    const body = rows.map((row) => [
      row.nome,
      row.cpf,
      row.whatsapp,
      row.genero,
      row.cidade,
      row.bairro,
      getCat(row.categoria_uid),
      getResp(row.usuario_uid),
      row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : '',
    ]);

    exportToPdf(headers, body, 'GBP Político - Pessoas', result.description, rows.length, `${fileName}.pdf`);
  },
};

function groupRows(rows: Eleitor[], groupBy: string | undefined, context: AssistantContext): GroupItem[] {
  if (!groupBy) return [];

  const map = new Map<string, { label: string; count: number }>();

  rows.forEach((row) => {
    let key = '';
    let label = '';

    if (groupBy === 'categoria_uid') {
      key = row.categoria_uid || '(sem categoria)';
      label = context.categories.find((c) => c.uid === key)?.nome || key;
    } else if (groupBy === 'indicado_uid') {
      key = row.indicado_uid || '(sem indicador)';
      label = context.indicadores.find((i) => i.uid === key)?.nome || key;
    } else if (groupBy === 'usuario_uid') {
      key = row.usuario_uid || '(sem responsável)';
      label = context.responsaveis.find((r) => r.uid === key)?.nome || key;
    } else {
      key = String((row as any)[groupBy] || '(não informado)');
      label = key;
    }

    const current = map.get(key) || { label, count: 0 };
    current.count += 1;
    map.set(key, current);
  });

  return Array.from(map.entries())
    .map(([key, value]) => ({ key, label: value.label, count: value.count }))
    .sort((a, b) => b.count - a.count);
}
