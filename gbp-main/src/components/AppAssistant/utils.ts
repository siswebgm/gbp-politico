export const normalize = (str: string) =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const toISO = (date: Date) => date.toISOString();

const pad = (n: number) => String(n).padStart(2, '0');

const formatDate = (date: Date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

export const formatDateRange = (from: Date, toExclusive: Date): string => {
  const toInclusive = new Date(toExclusive.getTime() - 1);
  const sameDay =
    from.getDate() === toInclusive.getDate() &&
    from.getMonth() === toInclusive.getMonth() &&
    from.getFullYear() === toInclusive.getFullYear();

  if (sameDay) return formatDate(from);

  const sameMonthAndYear =
    from.getMonth() === toInclusive.getMonth() &&
    from.getFullYear() === toInclusive.getFullYear();

  if (sameMonthAndYear) {
    return `${pad(from.getDate())}/${pad(from.getMonth() + 1)} a ${formatDate(toInclusive)}`;
  }

  return `${formatDate(from)} a ${formatDate(toInclusive)}`;
};

export const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const startOfWeek = (date: Date) => {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
};

export const startOfMonth = (date: Date) => {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
};

export const startOfYear = (date: Date) => {
  const d = startOfDay(date);
  d.setMonth(0, 1);
  return d;
};

export interface DateRange {
  dateFrom?: string;
  dateTo?: string;
  label: string;
}

export const getDateRange = (text: string): DateRange => {
  const norm = normalize(text);
  const now = new Date();

  if (norm.includes('hoje')) {
    const from = startOfDay(now);
    const to = startOfDay(addDays(now, 1));
    return { dateFrom: toISO(from), dateTo: toISO(to), label: formatDateRange(from, to) };
  }

  if (norm.includes('ontem')) {
    const from = startOfDay(addDays(now, -1));
    const to = startOfDay(now);
    return { dateFrom: toISO(from), dateTo: toISO(to), label: formatDateRange(from, to) };
  }

  if (/\bdepois\s+de\s+(amanha|amanhã)\b/.test(norm)) {
    const from = startOfDay(addDays(now, 2));
    const to = startOfDay(addDays(now, 3));
    return { dateFrom: toISO(from), dateTo: toISO(to), label: formatDateRange(from, to) };
  }

  if (/\b(amanha|amanhã)\b/.test(norm)) {
    const from = startOfDay(addDays(now, 1));
    const to = startOfDay(addDays(now, 2));
    return { dateFrom: toISO(from), dateTo: toISO(to), label: formatDateRange(from, to) };
  }

  const diaMatch = norm.match(/\b(?:no\s+|para\s+(?:o\s+)?|em\s+)?dia\s+(\d{1,2})\b/);
  if (diaMatch) {
    const day = parseInt(diaMatch[1], 10);
    const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), day));
    if (from < startOfDay(now)) {
      from.setMonth(from.getMonth() + 1);
    }
    const to = startOfDay(addDays(from, 1));
    return { dateFrom: toISO(from), dateTo: toISO(to), label: formatDateRange(from, to) };
  }

  if (/\b(semana passada|ultima semana|da semana passada)\b/.test(norm)) {
    const currentMonday = startOfWeek(now);
    const prevMonday = addDays(currentMonday, -7);
    return { dateFrom: toISO(prevMonday), dateTo: toISO(currentMonday), label: formatDateRange(prevMonday, currentMonday) };
  }

  if (/\b(esta semana|essa semana|desta semana|dessa semana)\b/.test(norm)) {
    const monday = startOfWeek(now);
    return { dateFrom: toISO(monday), dateTo: toISO(now), label: formatDateRange(monday, now) };
  }

  if (/\b(mes passado|mes anterior|ultimo mes|mês passado|do mes passado|do mês passado)\b/.test(norm)) {
    const firstThisMonth = startOfMonth(now);
    const firstLastMonth = new Date(firstThisMonth);
    firstLastMonth.setMonth(firstLastMonth.getMonth() - 1);
    return { dateFrom: toISO(firstLastMonth), dateTo: toISO(firstThisMonth), label: formatDateRange(firstLastMonth, firstThisMonth) };
  }

  if (/\b(este mes|esse mes|deste mes|desse mes|do mes|do mês)\b/.test(norm)) {
    const first = startOfMonth(now);
    return { dateFrom: toISO(first), dateTo: toISO(now), label: formatDateRange(first, now) };
  }

  if (/\b(ano passado|ano anterior|ultimo ano|do ano passado)\b/.test(norm)) {
    const firstThisYear = startOfYear(now);
    const firstLastYear = new Date(firstThisYear);
    firstLastYear.setFullYear(firstLastYear.getFullYear() - 1);
    return { dateFrom: toISO(firstLastYear), dateTo: toISO(firstThisYear), label: formatDateRange(firstLastYear, firstThisYear) };
  }

  if (/\b(este ano|esse ano|deste ano|desse ano|do ano)\b/.test(norm)) {
    const first = startOfYear(now);
    return { dateFrom: toISO(first), dateTo: toISO(now), label: formatDateRange(first, now) };
  }

  const ultimosMatch = norm.match(/(?:ultimos|ultimas)\s+(\d+)\s+(dias?|meses?|anos?|semanas?)/);
  if (ultimosMatch) {
    const amount = parseInt(ultimosMatch[1], 10);
    const unit = ultimosMatch[2];
    const from = new Date(now);
    if (unit.startsWith('dia')) from.setDate(from.getDate() - amount);
    else if (unit.startsWith('semana')) from.setDate(from.getDate() - amount * 7);
    else if (unit.startsWith('mes')) from.setMonth(from.getMonth() - amount);
    else if (unit.startsWith('ano')) from.setFullYear(from.getFullYear() - amount);
    return { dateFrom: toISO(from), dateTo: toISO(now), label: formatDateRange(from, now) };
  }

  const diasMatch = norm.match(/(\d+)\s+dias?/);
  if (diasMatch) {
    const days = parseInt(diasMatch[1], 10);
    const from = new Date(now);
    from.setDate(from.getDate() - days);
    return { dateFrom: toISO(from), dateTo: toISO(now), label: formatDateRange(from, now) };
  }

  return { label: 'todos os tempos' };
};

export const findByName = <T extends { nome?: string; name?: string }>(
  list: T[],
  value: string,
  key: 'nome' | 'name' = 'nome'
): T | undefined => {
  const normValue = normalize(value);
  return list.find((item) => normalize(String(item[key] || '')) === normValue)
    || list.find((item) => normalize(String(item[key] || '')).includes(normValue))
    || list.find((item) => normValue.includes(normalize(String(item[key] || ''))));
};

export const ARTICLES = '(?:da |de |do |em |na |no |a |o |pelo |pela |para )?';

export const extractValue = (text: string, keyword: string, stopKeywords: string[]): string | undefined => {
  const norm = normalize(text);
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const stopPattern = stopKeywords.length > 0 ? `(?=\\s+(?:${stopKeywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b|$)` : '(?=$)';
  const pattern = new RegExp(
    `(?:^|\\b${ARTICLES})${escapedKeyword}\\s*[:=]?\\s*(?:${ARTICLES})(.+?)${stopPattern}`,
    'i'
  );
  const match = norm.match(pattern);
  return match ? match[1].trim() : undefined;
};

export const getLastLimit = (text: string, singularTerms: string[], pluralTerms: string[] = []): number | undefined => {
  const norm = normalize(text);
  for (const term of singularTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    if (new RegExp(`(?:^|[^a-z0-9])ultim[ao]\\s+${escaped}(?:[^a-z0-9]|$)`, 'i').test(norm)) return 1;
  }
  for (const term of pluralTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    if (new RegExp(`(?:^|[^a-z0-9])ultim[ao]s\\s+${escaped}(?:[^a-z0-9]|$)`, 'i').test(norm)) return 5;
  }
  return undefined;
};

const ACCENT_CLASSES: Record<string, string> = {
  a: '[aàáâãä]',
  e: '[eèéêë]',
  i: '[iìíîï]',
  o: '[oòóôõö]',
  u: '[uùúûü]',
  c: '[cç]',
  n: '[nñ]',
};

export const toAccentInsensitiveRegex = (value: string): string => {
  const normalized = normalize(value).trim().replace(/\s+/g, ' ');
  const tokens = normalized.split(' ').filter(Boolean);
  const escaped = tokens.map((token) =>
    token
      .split('')
      .map((char) => {
        const cls = ACCENT_CLASSES[char];
        if (cls) return cls;
        return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('')
  );
  return escaped.join('\\s+');
};

export const toCpfRegex = (rawCpf: string): string => {
  const digits = rawCpf.replace(/\D/g, '').slice(0, 11);
  if (digits.length !== 11) return '';
  const chars = digits.split('');
  const parts = chars.map((char, index) => {
    const escaped = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return index < chars.length - 1 ? `${escaped}[\\.\\-]?` : escaped;
  });
  return `^${parts.join('')}$`;
};
