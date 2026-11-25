import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import * as Dialog from '@radix-ui/react-dialog';
import * as ExcelJS from 'exceljs';
import {
  Upload,
  FileText,
  X,
  Download,
  Trash2,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Info,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

import { supabaseClient } from '../../lib/supabase';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useAuthStore } from '../../store/useAuthStore';
import { hasRestrictedAccess } from '../../constants/accessLevels';
import { useCategories } from '../../hooks/useCategories';
import { useCategoryTypes } from '../../hooks/useCategoryTypes';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface UploadHistory {
  uid: string;
  upload_history_uid: number;
  empresa_uid: string;
  arquivo_nome: string;
  registros_total: number;
  registros_processados: number;
  registros_erro: number;
  status: string;
  erro_mensagem: string | null;
  created_at: string;
}

interface Progress {
  total: number;
  processed: number;
  success: number;
  error: number;
  percent: number;
}

interface StandardField {
  key: string;
  label: string;
  required?: boolean;
}

interface ValidatedRow {
  line: number;
  data: Record<string, any>;
  issues: string[];
  hasError: boolean;
}

interface ImportResult {
  imported: number;
  duplicatesFile: number;
  duplicatesDb: number;
  errors: number;
  warnings: number;
}

// ---------------------------------------------------------------------------
// Campos padrão e variações de cabeçalho
// ---------------------------------------------------------------------------

const STANDARD_FIELDS: StandardField[] = [
  { key: 'nome', label: 'Nome', required: true },
  { key: 'cpf', label: 'CPF' },
  { key: 'nascimento', label: 'Data de Nascimento' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'genero', label: 'Gênero' },
  { key: 'titulo', label: 'Título de Eleitor' },
  { key: 'zona', label: 'Zona' },
  { key: 'secao', label: 'Seção' },
  { key: 'cep', label: 'CEP' },
  { key: 'logradouro', label: 'Logradouro' },
  { key: 'numero', label: 'Número' },
  { key: 'complemento', label: 'Complemento' },
  { key: 'bairro', label: 'Bairro' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'uf', label: 'UF' },
  { key: 'nome_mae', label: 'Nome da Mãe' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'numero_do_sus', label: 'Nº SUS' },
  { key: 'latitude', label: 'Latitude' },
  { key: 'longitude', label: 'Longitude' },
];

const FIELD_VARIATIONS: Record<string, string[]> = {
  nome: ['nome', 'name', 'eleitor', 'nomecompleto', 'nome completo', 'nome do eleitor', 'pessoa'],
  cpf: ['cpf', 'doc', 'documento', 'cpfcnpj', 'cpf/cnpj'],
  nascimento: ['nascimento', 'datanascimento', 'data_nascimento', 'datanasc', 'datanasc.', 'dt_nascimento', 'nasc', 'data de nascimento', 'dt nasc'],
  whatsapp: ['whatsapp', 'wpp', 'whats', 'whatsapp1', 'celular', 'cel', 'telefone1', 'telefone_1', 'fone1', 'whats app'],
  telefone: ['telefone', 'tel', 'telefone2', 'telefone_2', 'fone', 'telefone fixo', 'telefonefixo', 'fone2', 'tel2', 'telefone residencial'],
  genero: ['genero', 'gênero', 'sexo'],
  titulo: ['titulo', 'título', 'titulo_eleitor', 'título de eleitor', 'titulo de eleitor', 'num_titulo', 'numero_titulo'],
  zona: ['zona', 'zona_eleitoral', 'zona eleitoral', 'nr_zona', 'numero_zona'],
  secao: ['secao', 'seção', 'secao_eleitoral', 'seção eleitoral', 'sessao', 'sessão', 'nr_secao', 'numero_secao'],
  cep: ['cep', 'codigopostal', 'codigo postal', 'código postal', 'cep_numero'],
  logradouro: ['logradouro', 'endereco', 'endereço', 'rua', 'travessa', 'avenida', 'av', 'logradouro_nome', 'end'],
  numero: ['numero', 'número', 'nº', 'nro', 'num', 'numero_endereco', 'numero do endereco', 'numero do endereço'],
  complemento: ['complemento', 'compl', 'apto', 'apartamento', 'bloco', 'quadra', 'lote', 'casa'],
  bairro: ['bairro', 'distrito', 'zona_bairro'],
  cidade: ['cidade', 'municipio', 'município', 'localidade', 'cidade_nome'],
  uf: ['uf', 'estado', 'uf_estado', 'sigla_estado', 'sigla uf'],
  nome_mae: ['nomemae', 'nome_mae', 'mae', 'mãe', 'nome da mãe', 'nomedamae', 'nome_mae_eleitor'],
  instagram: ['instagram', 'insta', 'instagram_eleitor'],
  numero_do_sus: ['numero_do_sus', 'nº sus', 'numero sus', 'sus', 'cartao_sus', 'cartão sus', 'cns'],
  latitude: ['latitude', 'lat', 'latitud'],
  longitude: ['longitude', 'long', 'lng', 'lon', 'longitud'],
};

const CONNECTORS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos',
  'para', 'com', 'sem', 'sob', 'sobre', 'ao', 'aos', 'um', 'uma', 'o', 'a', 'os', 'as',
]);

const ROMAN_REGEX = /^(?=[MDCLXVI])M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

// ---------------------------------------------------------------------------
// Helpers de normalização
// ---------------------------------------------------------------------------

const normalizeFieldName = (name: string): string =>
  (name || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

const findStandardField = (header: string): string | null => {
  const normalized = normalizeFieldName(header);
  for (const [standard, variations] of Object.entries(FIELD_VARIATIONS)) {
    if (variations.includes(normalized)) return standard;
  }
  return null;
};

const capitalizeWord = (word: string, isFirst: boolean): string => {
  const upper = word.toUpperCase();
  const lower = word.toLowerCase();
  if (ROMAN_REGEX.test(upper)) return upper;
  if (/^[A-Z]{2,4}$/.test(word) && !CONNECTORS.has(lower)) return upper;
  if (!isFirst && CONNECTORS.has(lower)) return lower;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};

const formatText = (value: string | null | undefined): string => {
  if (!value) return '';
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w, i) => capitalizeWord(w, i === 0))
    .join(' ');
};

const digitsOnly = (value: string | null | undefined): string =>
  (value || '').toString().replace(/\D/g, '');

const isValidDateParts = (y: number, m: number, d: number): boolean => {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
};

// Retorna { iso, month } ou null
const parseFlexibleDate = (value: any): { iso: string; month: number } | null => {
  if (value === null || value === undefined || value === '') return null;

  // Date object (ExcelJS)
  if (value instanceof Date && !isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = value.getMonth() + 1;
    const d = value.getDate();
    if (!isValidDateParts(y, m, d)) return null;
    return { iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, month: m };
  }

  // Número: pode ser serial do Excel
  if (typeof value === 'number' && value > 20000 && value < 60000) {
    const dt = new Date(Math.round((value - 25569) * 86400 * 1000));
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth() + 1;
    const d = dt.getUTCDate();
    if (isValidDateParts(y, m, d)) {
      return { iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, month: m };
    }
    return null;
  }

  const str = value.toString().trim();
  if (!str) return null;

  // YYYY-MM-DD ou YYYY/MM/DD
  let m = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) {
    const y = +m[1], mo = +m[2], d = +m[3];
    if (isValidDateParts(y, mo, d)) {
      return { iso: `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`, month: mo };
    }
    return null;
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (ano 2 ou 4 dígitos)
  m = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    let y = +m[3];
    if (y < 100) y += y < 50 ? 2000 : 1900;
    const mo = +m[2], d = +m[1];
    if (isValidDateParts(y, mo, d)) {
      return { iso: `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`, month: mo };
    }
    return null;
  }

  return null;
};

const cleanPhone = (value: any): { phone: string | null; issue?: string } => {
  if (value === null || value === undefined || value === '') return { phone: null };
  let digits = digitsOnly(value);
  if (!digits) return { phone: null };
  // Remove DDI 55
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  if (digits.length === 10 || digits.length === 11) return { phone: digits };
  if (digits.length < 10) return { phone: null, issue: 'telefone incompleto (ignorado)' };
  // Mais de 11 dígitos: assume últimos 11 (DDD + número)
  return { phone: digits.slice(-11), issue: 'telefone ajustado automaticamente' };
};

const cleanCep = (value: any): { cep: string | null; issue?: string } => {
  if (value === null || value === undefined || value === '') return { cep: null };
  let digits = digitsOnly(value);
  if (!digits) return { cep: null };
  if (digits.length === 8) return { cep: digits };
  if (digits.length === 7) return { cep: '0' + digits, issue: 'CEP ajustado (zero à esquerda)' };
  return { cep: null, issue: 'CEP inválido (ignorado)' };
};

const cleanUf = (value: any): { uf: string | null; issue?: string } => {
  if (value === null || value === undefined || value === '') return { uf: null };
  const letters = value.toString().replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (letters.length === 2) return { uf: letters };
  if (letters.length > 2) return { uf: letters.slice(0, 2), issue: 'UF ajustada automaticamente' };
  return { uf: null, issue: 'UF inválida (ignorada)' };
};

const cleanDigits = (value: any): string | null => {
  if (value === null || value === undefined || value === '') return null;
  const digits = digitsOnly(value);
  return digits || null;
};

const cleanFloat = (value: any): { num: number | null; issue?: string } => {
  if (value === null || value === undefined || value === '') return { num: null };
  if (typeof value === 'number' && !isNaN(value)) return { num: value };
  const str = value.toString().trim().replace(',', '.');
  const num = parseFloat(str);
  if (isNaN(num)) return { num: null, issue: 'coordenada inválida (ignorada)' };
  return { num };
};

// Mapeia variações de gênero para os valores usados no sistema
const GENERO_MAP: Record<string, string> = {
  m: 'Masculino', masculino: 'Masculino', homem: 'Masculino', male: 'Masculino',
  f: 'Feminino', feminino: 'Feminino', mulher: 'Feminino', female: 'Feminino',
  nb: 'Não Binário', 'não binário': 'Não Binário', 'nao binario': 'Não Binário',
  nonbinary: 'Não Binário', 'non-binary': 'Não Binário',
  pni: 'Prefiro Não Informar', 'prefiro não informar': 'Prefiro Não Informar',
  'prefiro nao informar': 'Prefiro Não Informar',
};

const cleanGenero = (value: any): string | null => {
  if (value === null || value === undefined || value === '') return null;
  const raw = value.toString().trim();
  const normalized = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const mapped = GENERO_MAP[normalized] || GENERO_MAP[raw.toLowerCase()];
  if (mapped) return mapped;
  return formatText(raw) || null;
};

// Valida uma linha já mapeada para campos padrão
const validateRow = (mapped: Record<string, string>, line: number): ValidatedRow => {
  const issues: string[] = [];
  const data: Record<string, any> = {};

  // Nome (obrigatório)
  const nome = (mapped.nome || '').toString().trim().replace(/\s+/g, ' ');
  data.nome = nome ? formatText(nome) : null;
  const hasError = !data.nome;
  if (hasError) issues.push('Nome vazio ou não mapeado');

  // CPF
  const cpfRaw = (mapped.cpf || '').toString().trim();
  const cpfDigits = digitsOnly(cpfRaw);
  if (!cpfDigits) {
    data.cpf = null;
  } else if (cpfDigits.length === 11) {
    data.cpf = cpfDigits;
  } else {
    data.cpf = null;
    issues.push(`CPF inválido (${cpfDigits.length} dígitos) — será importado sem CPF`);
  }

  // Nascimento
  const nasc = parseFlexibleDate(mapped.nascimento);
  if (nasc) {
    data.nascimento = nasc.iso;
    data.mes_nascimento = nasc.month;
  } else {
    data.nascimento = null;
    data.mes_nascimento = null;
    if ((mapped.nascimento || '').toString().trim()) {
      issues.push('Data de nascimento inválida (ignorada)');
    }
  }

  // Telefones
  const whatsapp = cleanPhone(mapped.whatsapp);
  data.whatsapp = whatsapp.phone;
  if (whatsapp.issue) issues.push(`WhatsApp: ${whatsapp.issue}`);

  const telefone = cleanPhone(mapped.telefone);
  data.telefone = telefone.phone;
  if (telefone.issue) issues.push(`Telefone: ${telefone.issue}`);

  // Gênero
  data.genero = cleanGenero(mapped.genero);

  // Campos de texto formatados
  data.titulo = cleanDigits(mapped.titulo);
  data.zona = cleanDigits(mapped.zona);
  data.secao = cleanDigits(mapped.secao);
  data.numero_do_sus = cleanDigits(mapped.numero_do_sus);

  // CEP
  const cep = cleanCep(mapped.cep);
  data.cep = cep.cep;
  if (cep.issue) issues.push(`CEP: ${cep.issue}`);

  // Endereço
  data.logradouro = formatText(mapped.logradouro) || null;
  data.numero = (mapped.numero || '').toString().trim() || null;
  data.complemento = formatText(mapped.complemento) || null;
  data.bairro = formatText(mapped.bairro) || null;
  data.cidade = formatText(mapped.cidade) || null;

  const uf = cleanUf(mapped.uf);
  data.uf = uf.uf;
  if (uf.issue) issues.push(`UF: ${uf.issue}`);

  data.nome_mae = formatText(mapped.nome_mae) || null;
  data.instagram = (mapped.instagram || '').toString().trim() || null;

  // Coordenadas
  const lat = cleanFloat(mapped.latitude);
  data.latitude = lat.num;
  if (lat.issue) issues.push(`Latitude: ${lat.issue}`);
  const lng = cleanFloat(mapped.longitude);
  data.longitude = lng.num;
  if (lng.issue) issues.push(`Longitude: ${lng.issue}`);

  return { line, data, issues, hasError };
};

// ---------------------------------------------------------------------------
// Leitura de arquivos
// ---------------------------------------------------------------------------

const cellToString = (value: ExcelJS.CellValue): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  if (typeof value === 'object') {
    const v = value as any;
    if (typeof v.text === 'string') return v.text;
    if (v.result !== undefined && v.result !== null) return String(v.result);
    if (Array.isArray(v.richText)) return v.richText.map((t: any) => t.text || '').join('');
    if (v.error) return '';
  }
  return String(value);
};

const readXlsxFile = async (file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> => {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('Planilha vazia');

  // Encontra a linha de cabeçalho (entre as 10 primeiras, a com mais células preenchidas)
  let headerRowNumber = 1;
  let maxCells = 0;
  const maxScan = Math.min(10, worksheet.rowCount);
  for (let r = 1; r <= maxScan; r++) {
    const row = worksheet.getRow(r);
    let count = 0;
    row.eachCell({ includeEmpty: false }, () => count++);
    if (count > maxCells) {
      maxCells = count;
      headerRowNumber = r;
    }
  }
  if (maxCells < 2) throw new Error('Não foi possível identificar o cabeçalho da planilha');

  const headerRow = worksheet.getRow(headerRowNumber);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = cellToString(cell.value).trim();
  });
  // Remove colunas totalmente vazias do cabeçalho
  const validCols = headers.map((h, i) => ({ h, i })).filter(c => c.h);

  const rows: Record<string, string>[] = [];
  for (let r = headerRowNumber + 1; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const obj: Record<string, string> = {};
    let hasValue = false;
    validCols.forEach(({ h, i }) => {
      const cell = row.getCell(i + 1);
      const val = cellToString(cell.value).trim();
      obj[h] = val;
      if (val) hasValue = true;
    });
    if (hasValue) rows.push(obj);
  }

  return { headers: validCols.map(c => c.h), rows };
};

// Decodifica o arquivo respeitando o encoding: UTF-8 primeiro,
// fallback para Windows-1252 (Latin-1) — padrão de CSVs exportados do Excel no Brasil
const decodeFileText = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    text = new TextDecoder('windows-1252').decode(buffer);
  }
  return text.replace(/^\uFEFF/, ''); // remove BOM (U+FEFF) se existir
};

const readCsvFile = async (file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> => {
  const text = await decodeFileText(file);
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => (h || '').trim(),
      complete: (results) => {
        const fields = (results.meta.fields || []).filter(Boolean);
        const rows = (results.data as Record<string, string>[]).map((row) => {
          const obj: Record<string, string> = {};
          fields.forEach((f) => {
            obj[f] = row[f] === null || row[f] === undefined ? '' : String(row[f]).trim();
          });
          return obj;
        });
        resolve({ headers: fields, rows });
      },
      error: (err) => reject(err),
    });
  });
};

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function ImportarPessoas() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { company } = useCompanyStore();
  const { data: categories = [] } = useCategories();
  const { data: categoryTypes = [] } = useCategoryTypes();

  const canAccess = isAuthenticated && hasRestrictedAccess(user?.nivel_acesso);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Você precisa estar autenticado para acessar esta página');
      navigate('/login');
      return;
    }
    if (!canAccess) {
      toast.error('Você não tem permissão para acessar esta página');
      navigate('/app');
    }
  }, [canAccess, isAuthenticated, navigate]);

  // Estado do fluxo
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // Arquivo e dados parseados
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Validação
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  // Tipo/Categoria
  const [selectedTypeUid, setSelectedTypeUid] = useState('');
  const [selectedCategoryUid, setSelectedCategoryUid] = useState('');

  // Upload
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<Progress>({ total: 0, processed: 0, success: 0, error: 0, percent: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);

  // Histórico
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(5);
  const [totalPaginas, setTotalPaginas] = useState(0);

  // Modal de exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<UploadHistory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------------------
  // Histórico
  // -------------------------------------------------------------------------

  const buscarHistoricoUpload = async () => {
    if (!company?.uid) return;
    try {
      const { count } = await supabaseClient
        .from('gbp_upload_history')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_uid', company.uid)
        .neq('status', 'deleted');

      setTotalPaginas(Math.ceil((count || 0) / itensPorPagina));

      const { data, error } = await supabaseClient
        .from('gbp_upload_history')
        .select('*')
        .eq('empresa_uid', company.uid)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })
        .range((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina - 1);

      if (error) throw error;
      setUploadHistory((data || []) as UploadHistory[]);
    } catch (erro) {
      console.error('Erro ao buscar histórico:', erro);
    }
  };

  useEffect(() => {
    if (company?.uid) {
      setIsLoadingHistory(true);
      buscarHistoricoUpload().finally(() => setIsLoadingHistory(false));
    }
  }, [company?.uid, paginaAtual, itensPorPagina]);

  // Polling enquanto houver uploads em andamento
  useEffect(() => {
    if (!company?.uid) return;
    const hasActive = uploadHistory.some((h) => h.status === 'in_progress' || h.status === 'processing');
    if (!hasActive) return;
    const interval = setInterval(buscarHistoricoUpload, 5000);
    return () => clearInterval(interval);
  }, [company?.uid, uploadHistory]);

  // -------------------------------------------------------------------------
  // Processamento do arquivo
  // -------------------------------------------------------------------------

  const processFile = async (selectedFile: File) => {
    const ext = selectedFile.name.toLowerCase().split('.').pop() || '';
    if (!['csv', 'txt', 'xlsx', 'xls'].includes(ext)) {
      toast.error('Formato não suportado. Use CSV, TXT ou XLSX.');
      return;
    }
    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Tamanho máximo: 20MB.');
      return;
    }

    setIsParsing(true);
    try {
      const parsed = ext === 'xlsx' || ext === 'xls'
        ? await readXlsxFile(selectedFile)
        : await readCsvFile(selectedFile);

      if (!parsed.headers.length) {
        toast.error('Não foi possível ler o cabeçalho do arquivo.');
        return;
      }
      if (!parsed.rows.length) {
        toast.error('O arquivo não contém registros.');
        return;
      }

      setFile(selectedFile);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);

      // Mapeamento automático
      const mapping: Record<string, string> = {};
      parsed.headers.forEach((h) => {
        mapping[h] = findStandardField(h) || '';
      });
      setColumnMapping(mapping);
      setStep(2);
      toast.success(`${parsed.rows.length} registros encontrados em "${selectedFile.name}"`);
    } catch (err: any) {
      console.error('Erro ao ler arquivo:', err);
      toast.error(err?.message || 'Erro ao ler o arquivo. Verifique o formato.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  // -------------------------------------------------------------------------
  // Validação (reage ao mapeamento)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (step !== 2 || !rawRows.length) return;

    const rows: ValidatedRow[] = [];
    rawRows.forEach((raw, idx) => {
      // Monta linha mapeada
      const mapped: Record<string, string> = {};
      let hasAnyValue = false;
      Object.entries(columnMapping).forEach(([header, field]) => {
        if (!field) return;
        const val = (raw[header] || '').toString().trim();
        if (val) hasAnyValue = true;
        mapped[field] = val;
      });
      if (!hasAnyValue) return; // linha vazia

      rows.push(validateRow(mapped, idx + 2)); // +2: header + base 1
    });

    setValidatedRows(rows);
  }, [columnMapping, rawRows, step]);

  const stats = useMemo(() => {
    const valid = validatedRows.filter((r) => !r.hasError);
    const withErrors = validatedRows.filter((r) => r.hasError);
    const withWarnings = valid.filter((r) => r.issues.length > 0);
    const nomeMapped = Object.values(columnMapping).includes('nome');
    return {
      total: validatedRows.length,
      valid: valid.length,
      withErrors: withErrors.length,
      withWarnings: withWarnings.length,
      nomeMapped,
    };
  }, [validatedRows, columnMapping]);

  // -------------------------------------------------------------------------
  // Upload
  // -------------------------------------------------------------------------

  const handleUpload = async () => {
    if (!file || !company?.uid || isUploading) return;
    if (!selectedCategoryUid) {
      toast.error('Selecione a categoria para importar.');
      return;
    }
    if (!stats.nomeMapped) {
      toast.error('Mapeie a coluna "Nome" na etapa de revisão.');
      return;
    }
    if (stats.valid === 0) {
      toast.error('Nenhum registro válido para importar.');
      return;
    }

    setIsUploading(true);
    setStep(3);
    setResult(null);
    setProgress({ total: 0, processed: 0, success: 0, error: 0, percent: 0 });

    const userUid = user?.uid || localStorage.getItem('user_uid') || null;

    try {
      // 1. Cria registro de histórico
      const { data: uploadHistory, error: historyError } = await supabaseClient
        .from('gbp_upload_history')
        .insert({
          empresa_uid: company.uid,
          arquivo_nome: file.name,
          status: 'in_progress',
          registros_total: stats.valid,
          registros_processados: 0,
          registros_erro: 0,
        })
        .select()
        .single();

      if (historyError || !uploadHistory) {
        toast.error('Erro ao iniciar importação. Tente novamente.');
        setIsUploading(false);
        setStep(2);
        return;
      }

      const uploadUid = uploadHistory.uid; // UUID para gbp_upload_history
      const uploadId = uploadHistory.upload_history_uid; // numérico para gbp_eleitores.upload_id

      // 2. Dedup por CPF dentro do arquivo
      const cpfsNoArquivo = new Map<string, number>();
      const rowsComCpf: ValidatedRow[] = [];
      const rowsSemCpf: ValidatedRow[] = [];
      let duplicatesFile = 0;

      validatedRows
        .filter((r) => !r.hasError)
        .forEach((r) => {
          const cpf = r.data.cpf;
          if (!cpf) {
            rowsSemCpf.push(r);
            return;
          }
          if (cpfsNoArquivo.has(cpf)) {
            duplicatesFile++;
            return;
          }
          cpfsNoArquivo.set(cpf, 1);
          rowsComCpf.push(r);
        });

      // 3. Verifica CPFs existentes no banco (lotes de 100)
      const cpfsParaVerificar = Array.from(cpfsNoArquivo.keys());
      const cpfsExistentes = new Set<string>();
      const TAMANHO_VERIF = 100;
      for (let i = 0; i < cpfsParaVerificar.length; i += TAMANHO_VERIF) {
        const lote = cpfsParaVerificar.slice(i, i + TAMANHO_VERIF);
        const { data } = await supabaseClient
          .from('gbp_eleitores')
          .select('cpf')
          .in('cpf', lote)
          .eq('empresa_uid', company.uid);
        data?.forEach((d: any) => cpfsExistentes.add(d.cpf));
      }

      const rowsParaInserir = [
        ...rowsComCpf.filter((r) => !cpfsExistentes.has(r.data.cpf)),
        ...rowsSemCpf,
      ];
      const duplicatesDb = rowsComCpf.length - rowsParaInserir.filter((r) => r.data.cpf).length;

      // 4. Insere em lotes
      const TAMANHO_LOTE = 100;
      let success = 0;
      let errorCount = 0;
      const total = rowsParaInserir.length;

      setProgress({ total, processed: 0, success: 0, error: 0, percent: 0 });
      await atualizarStatusUpload(uploadUid, 'processing', total, 0, 0);

      for (let i = 0; i < rowsParaInserir.length; i += TAMANHO_LOTE) {
        const lote = rowsParaInserir.slice(i, i + TAMANHO_LOTE);

        const loteFormatado = lote.map((r) => ({
          nome: r.data.nome,
          cpf: r.data.cpf,
          empresa_uid: company.uid,
          upload_id: uploadId,
          categoria_uid: selectedCategoryUid,
          usuario_uid: userUid,
          whatsapp: r.data.whatsapp,
          telefone: r.data.telefone,
          nascimento: r.data.nascimento,
          titulo: r.data.titulo,
          zona: r.data.zona,
          secao: r.data.secao,
          cep: r.data.cep,
          logradouro: r.data.logradouro,
          cidade: r.data.cidade,
          bairro: r.data.bairro,
          numero: r.data.numero,
          complemento: r.data.complemento,
          uf: r.data.uf,
          nome_mae: r.data.nome_mae,
          genero: r.data.genero,
          instagram: r.data.instagram,
          latitude: r.data.latitude,
          longitude: r.data.longitude,
          numero_do_sus: r.data.numero_do_sus,
          mes_nascimento: r.data.mes_nascimento,
          responsavel: 'Importação',
        }));

        try {
          const { error: insertError } = await supabaseClient
            .from('gbp_eleitores')
            .insert(loteFormatado);

          if (insertError) {
            console.error('Erro ao inserir lote:', insertError);
            errorCount += loteFormatado.length;
          } else {
            success += loteFormatado.length;
          }
        } catch (e) {
          console.error('Erro ao inserir lote:', e);
          errorCount += loteFormatado.length;
        }

        const processed = Math.min(i + TAMANHO_LOTE, rowsParaInserir.length);
        setProgress({
          total,
          processed,
          success,
          error: errorCount,
          percent: Math.round((processed / total) * 100),
        });

        // Atualiza histórico a cada 5 lotes
        if (Math.floor(i / TAMANHO_LOTE) % 5 === 0) {
          await atualizarStatusUpload(uploadUid, 'processing', total, processed, errorCount);
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // 5. Finaliza
      const finalStatus = success > 0 ? 'success' : 'error';
      const partes: string[] = [];
      if (duplicatesFile > 0) partes.push(`${duplicatesFile} CPF(s) duplicado(s) no arquivo`);
      if (duplicatesDb > 0) partes.push(`${duplicatesDb} CPF(s) já existente(s)`);
      if (stats.withErrors > 0) partes.push(`${stats.withErrors} registro(s) sem nome`);
      if (errorCount > 0) partes.push(`${errorCount} erro(s) ao gravar`);
      const mensagemErro = partes.join('; ') || null;

      await atualizarStatusUpload(uploadUid, finalStatus, total, success + errorCount, errorCount, mensagemErro);

      setResult({
        imported: success,
        duplicatesFile,
        duplicatesDb,
        errors: errorCount + stats.withErrors,
        warnings: stats.withWarnings,
      });

      if (success > 0) {
        toast.success(`${success} registros importados com sucesso!`);
      } else {
        toast.error('Nenhum registro foi importado.');
      }

      buscarHistoricoUpload();
    } catch (err) {
      console.error('Erro na importação:', err);
      toast.error('Erro durante a importação. Tente novamente.');
      setIsUploading(false);
      setStep(2);
    } finally {
      setIsUploading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Reset e utilidades
  // -------------------------------------------------------------------------

  const resetFlow = () => {
    setStep(1);
    setFile(null);
    setHeaders([]);
    setRawRows([]);
    setColumnMapping({});
    setValidatedRows([]);
    setSelectedTypeUid('');
    setSelectedCategoryUid('');
    setProgress({ total: 0, processed: 0, success: 0, error: 0, percent: 0 });
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = () => {
    resetFlow();
  };

  const handleConfirmDelete = async () => {
    if (!selectedHistory || !company?.uid || isDeleting) return;
    try {
      setIsDeleting(true);

      const { data: eleitores, error: selectError } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('upload_id', selectedHistory.upload_history_uid)
        .eq('empresa_uid', company.uid);

      if (selectError) throw selectError;
      if (!eleitores || eleitores.length === 0) {
        toast.warning('Nenhum eleitor encontrado para excluir.');
        return;
      }

      await supabaseClient
        .from('gbp_upload_history')
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
        .eq('uid', selectedHistory.uid);

      const registrosParaDeletar = eleitores.map((eleitor: any) => {
        const {
          nome, cpf, nascimento, whatsapp, telefone, genero, titulo, zona, secao,
          cep, logradouro, cidade, bairro, numero, complemento, indicado, uf,
          categoria, categoria_uid, responsavel, latitude, longitude, nome_mae,
          instagram, numero_do_sus, mes_nascimento, extract, ax_rg_cnh, ax_cpf,
          ax_cert_nascimento, ax_titulo, ax_comp_residencia, ax_foto_3x4,
          responsavel_pelo_eleitor,
        } = eleitor;

        return {
          deletados_uid: `del_${Math.random().toString(36).substr(2, 9)}`,
          nome, cpf, nascimento, whatsapp, telefone, genero, titulo, zona, secao,
          cep, logradouro, cidade, bairro, numero, complemento, empresa_uid: company.uid,
          indicado, uf, categoria, categoria_uid, responsavel, latitude, longitude,
          nome_mae, upload_id: selectedHistory.upload_history_uid, mes_nascimento,
          extract, ax_rg_cnh, ax_cpf, ax_cert_nascimento, ax_titulo, ax_comp_residencia,
          ax_foto_3x4, instagram, numero_do_sus, responsavel_pelo_eleitor,
          created_at: new Date().toISOString(),
        };
      });

      const { error: insertError } = await supabaseClient
        .from('gbp_deletados')
        .insert(registrosParaDeletar);
      if (insertError) throw insertError;

      const { error: deleteError } = await supabaseClient
        .from('gbp_eleitores')
        .delete()
        .eq('empresa_uid', company.uid)
        .eq('upload_id', selectedHistory.upload_history_uid);
      if (deleteError) throw deleteError;

      toast.success(`${eleitores.length} eleitores movidos para deletados com sucesso!`);
      setSelectedHistory(null);
      buscarHistoricoUpload();
    } catch (erro) {
      console.error('Erro ao excluir registros:', erro);
      toast.error('Erro ao excluir registros. Tente novamente.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // -------------------------------------------------------------------------
  // Template
  // -------------------------------------------------------------------------

  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();

      // Planilha de instruções
      const instr = workbook.addWorksheet('Instruções');
      instr.columns = [{ width: 100 }];
      const instrLines = [
        'MODELO DE IMPORTAÇÃO DE PESSOAS',
        '',
        'COMO USAR:',
        '1. Preencha a aba "Dados" com as informações das pessoas.',
        '2. Você NÃO precisa seguir a ordem das colunas — o sistema identifica pelo nome do cabeçalho.',
        '3. Colunas com * são obrigatórias. As demais são opcionais.',
        '4. Na importação, você poderá revisar e ajustar o mapeamento das colunas antes de confirmar.',
        '',
        'FORMATOS ACEITOS:',
        '• CPF: apenas números (ex: 12345678900). Vazio = importa sem CPF.',
        '• Data de nascimento: DD/MM/AAAA ou AAAA-MM-DD.',
        '• CEP: 8 números (ex: 12345678).',
        '• WhatsApp/Telefone: DDD + número (ex: 11999999999).',
        '• UF: sigla com 2 letras (ex: SP).',
        '',
        'O que acontece com erros?',
        '• Linhas sem nome são ignoradas e listadas no relatório.',
        '• Campos com formato inválido são corrigidos automaticamente quando possível',
        '  (ex: data "1/1/1990" vira "01/01/1990") ou ignorados com aviso.',
        '• CPFs já cadastrados ou repetidos no arquivo são ignorados.',
      ];
      instrLines.forEach((line, i) => {
        const row = instr.getRow(i + 1);
        row.getCell(1).value = line;
        if (i === 0) row.getCell(1).font = { bold: true, size: 14 };
        else if (line.endsWith(':') || line === line.toUpperCase()) row.getCell(1).font = { bold: true };
      });

      // Planilha de dados
      const ws = workbook.addWorksheet('Dados');
      const columns = [
        { header: 'nome *', key: 'nome' },
        { header: 'cpf', key: 'cpf' },
        { header: 'nascimento', key: 'nascimento' },
        { header: 'whatsapp', key: 'whatsapp' },
        { header: 'telefone', key: 'telefone' },
        { header: 'genero', key: 'genero' },
        { header: 'titulo', key: 'titulo' },
        { header: 'zona', key: 'zona' },
        { header: 'secao', key: 'secao' },
        { header: 'cep', key: 'cep' },
        { header: 'logradouro', key: 'logradouro' },
        { header: 'numero', key: 'numero' },
        { header: 'complemento', key: 'complemento' },
        { header: 'bairro', key: 'bairro' },
        { header: 'cidade', key: 'cidade' },
        { header: 'uf', key: 'uf' },
        { header: 'nome_mae', key: 'nome_mae' },
        { header: 'instagram', key: 'instagram' },
        { header: 'numero_do_sus', key: 'numero_do_sus' },
        { header: 'latitude', key: 'latitude' },
        { header: 'longitude', key: 'longitude' },
      ];
      ws.columns = columns.map((c) => ({ ...c, width: 18 }));

      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

      ws.addRow({
        nome: 'João da Silva',
        cpf: '12345678900',
        nascimento: '01/01/1990',
        whatsapp: '11999999999',
        telefone: '1133334444',
        genero: 'Masculino',
        titulo: '123456789012',
        zona: '001',
        secao: '0001',
        cep: '01234567',
        logradouro: 'Rua Exemplo',
        numero: '123',
        complemento: 'Apto 45',
        bairro: 'Centro',
        cidade: 'São Paulo',
        uf: 'SP',
        nome_mae: 'Maria da Silva',
        instagram: '@joaosilva',
        numero_do_sus: '123456789012345',
        latitude: '-23.550520',
        longitude: '-46.633308',
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'modelo_importacao_pessoas.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Modelo baixado! Preencha a aba "Dados" e importe o arquivo.');
    } catch (error) {
      console.error('Erro ao gerar modelo:', error);
      toast.error('Erro ao gerar modelo. Tente novamente.');
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!company) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400">Selecione uma empresa para importar pessoas</p>
      </div>
    );
  }

  const steps = [
    { num: 1, label: 'Arquivo' },
    { num: 2, label: 'Revisar' },
    { num: 3, label: 'Importar' },
  ];

  const filteredCategories = selectedTypeUid
    ? categories.filter((c: any) => c.tipo_uid === selectedTypeUid)
    : [];

  return (
    <div className="min-h-full bg-white dark:bg-gray-900 overflow-x-hidden">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/app/pessoas')}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              title="Voltar para Pessoas"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="ml-4">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Importar Pessoas</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 whitespace-nowrap">
                Importe sua base de pessoas
              </p>
            </div>
          </div>
        </div>
      </header>
      <div className="px-4 py-6 pb-20 sm:pb-6 sm:px-6 lg:px-8">

        {/* Stepper */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-6 overflow-x-auto">
          {steps.map((s, idx) => (
            <div key={s.num} className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <div
                className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                  step > s.num
                    ? 'bg-green-500 dark:bg-green-600 text-white'
                    : step === s.num
                    ? 'bg-blue-600 dark:bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {step > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
              </div>
              <span className={`text-xs sm:text-sm font-medium whitespace-nowrap ${step === s.num ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                {s.label}
              </span>
              {idx < steps.length - 1 && <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-0.5 sm:mx-1" />}
            </div>
          ))}
        </div>

        {/* ETAPA 1: Arquivo */}
        {step === 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
                isDragOver ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {isParsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 text-blue-500 dark:text-blue-400 animate-spin" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">Lendo arquivo...</p>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
                  <p className="text-base font-medium text-gray-700 dark:text-gray-200">
                    Arraste seu arquivo aqui ou{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                    >
                      clique para selecionar
                    </button>
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    CSV, TXT ou XLSX — até 20MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt,.xlsx,.xls"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </>
              )}
            </div>

            <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400 dark:text-blue-300" />
                <span>
                  Não precisa que as colunas estejam na ordem do modelo — o sistema identifica pelo nome do cabeçalho.
                  Na próxima etapa você poderá revisar e ajustar tudo.
                </span>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors whitespace-nowrap"
              >
                <Download className="h-4 w-4" />
                Baixar modelo
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 2: Revisar */}
        {step === 2 && file && (
          <div className="space-y-5">
            {/* Card do arquivo */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {rawRows.length} registros · {(file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Trocar arquivo
                </button>
              </div>
            </div>

            {/* Resumo da validação */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{stats.valid}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">prontos para importar</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-2xl font-semibold text-amber-500 dark:text-amber-400">{stats.withWarnings}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">com avisos (serão corrigidos)</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-2xl font-semibold text-red-500 dark:text-red-400">{stats.withErrors}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">serão ignorados (sem nome)</p>
              </div>
            </div>

            {!stats.nomeMapped && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Coluna "Nome" não identificada</p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                    Selecione abaixo qual coluna do arquivo contém o nome das pessoas. Sem ela, nenhum registro pode ser importado.
                  </p>
                </div>
              </div>
            )}

            {/* Mapeamento de colunas */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Mapeamento de colunas</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Confira se cada coluna do arquivo está associada ao campo correto. Você pode ajustar qualquer item.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Coluna do arquivo</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Exemplo</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Campo do sistema</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {headers.map((header) => {
                      const mapped = columnMapping[header] || '';
                      const sample = rawRows.find((r) => (r[header] || '').trim())?.[header] || '';
                      return (
                        <tr key={header}>
                          <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{header}</td>
                          <td className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500 max-w-[180px] truncate">{sample}</td>
                          <td className="px-3 py-2">
                            <select
                              value={mapped}
                              onChange={(e) =>
                                setColumnMapping((prev) => ({ ...prev, [header]: e.target.value }))
                              }
                              className={`block w-full rounded-md border-0 py-1.5 pl-3 pr-8 text-sm ring-1 ring-inset focus:ring-2 focus:ring-blue-600 ${
                                mapped === 'nome' || mapped
                                  ? 'text-gray-900 dark:text-white ring-gray-300'
                                  : 'text-gray-400 dark:text-gray-500 ring-gray-200'
                              }`}
                              style={{ backgroundImage: 'none' }}
                            >
                              <option value="">— Ignorar —</option>
                              {STANDARD_FIELDS.map((f) => (
                                <option key={f.key} value={f.key}>
                                  {f.label}
                                  {f.required ? ' *' : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Preview */}
            {validatedRows.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                  Pré-visualização <span className="text-sm font-normal text-gray-400 dark:text-gray-500">(5 primeiras linhas válidas)</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                    <thead>
                      <tr>
                        {['Nome', 'CPF', 'Nascimento', 'WhatsApp', 'Cidade', 'UF'].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>
                        ))}
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avisos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {validatedRows.filter((r) => !r.hasError).slice(0, 5).map((r) => (
                        <tr key={r.line}>
                          <td className="px-3 py-2 text-gray-900 dark:text-white whitespace-nowrap">{r.data.nome}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{r.data.cpf || '—'}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{r.data.nascimento || '—'}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{r.data.whatsapp || r.data.telefone || '—'}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{r.data.cidade || '—'}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{r.data.uf || '—'}</td>
                          <td className="px-3 py-2 text-amber-600 text-xs max-w-[200px]">
                            {r.issues.length > 0 ? r.issues.join('; ') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Lista de erros */}
            {stats.withErrors > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <button
                  onClick={() => setShowErrors(!showErrors)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                  {stats.withErrors} linha(s) serão ignoradas (sem nome)
                  <span className="text-gray-400 dark:text-gray-500">{showErrors ? '▲' : '▼'}</span>
                </button>
                {showErrors && (
                  <div className="mt-3 max-h-48 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {validatedRows
                          .filter((r) => r.hasError)
                          .slice(0, 50)
                          .map((r) => (
                            <tr key={r.line}>
                              <td className="py-1.5 pr-4 text-gray-400 dark:text-gray-500 whitespace-nowrap">Linha {r.line}</td>
                              <td className="py-1.5 text-gray-600 dark:text-gray-300">
                                {r.issues.join('; ') || 'Nome vazio'}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {stats.withErrors > 50 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">...e mais {stats.withErrors - 50} linhas</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tipo e Categoria */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Classificação dos registros</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Tipo <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <select
                    value={selectedTypeUid}
                    onChange={(e) => {
                      setSelectedTypeUid(e.target.value);
                      setSelectedCategoryUid('');
                    }}
                    className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  >
                    <option value="">Selecione um tipo</option>
                    {categoryTypes.map((t: any) => (
                      <option key={t.uid} value={t.uid}>{t.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Categoria <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <select
                    value={selectedCategoryUid}
                    onChange={(e) => setSelectedCategoryUid(e.target.value)}
                    disabled={!selectedTypeUid}
                    className={`block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 ${
                      !selectedTypeUid ? 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="">Selecione uma categoria</option>
                    {filteredCategories.map((c: any) => (
                      <option key={c.uid} value={c.uid}>{c.nome}</option>
                    ))}
                  </select>
                  {selectedTypeUid && filteredCategories.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Nenhuma categoria neste tipo. Cadastre em Configurações → Categorias.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <button
                onClick={() => setStep(1)}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 self-start sm:self-auto"
              >
                ← Voltar
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading || stats.valid === 0 || !selectedCategoryUid || !stats.nomeMapped}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${
                  isUploading || stats.valid === 0 || !selectedCategoryUid || !stats.nomeMapped
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700'
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Importar {stats.valid} registro{stats.valid !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 3: Importando / Resultado */}
        {step === 3 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            {!result ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Importando registros...</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Não feche ou atualize a página.</p>
                  </div>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300">
                    {progress.processed.toLocaleString()} de {progress.total.toLocaleString()} processados
                  </span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{progress.percent}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                {(progress.success > 0 || progress.error > 0) && (
                  <div className="flex gap-4 mt-3 text-sm">
                    <span className="text-green-600 dark:text-green-400">✓ {progress.success} importados</span>
                    {progress.error > 0 && <span className="text-red-500 dark:text-red-400">✗ {progress.error} com erro</span>}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  {result.imported > 0 ? (
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {result.imported > 0 ? 'Importação concluída!' : 'Nenhum registro importado'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {result.imported} registro{result.imported !== 1 ? 's' : ''} adicionado{result.imported !== 1 ? 's' : ''} à base.
                    </p>
                  </div>
                </div>

                {(result.duplicatesFile > 0 || result.duplicatesDb > 0 || result.errors > 0 || result.warnings > 0) && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-5 space-y-1.5 text-sm">
                    {result.duplicatesFile > 0 && (
                      <p className="text-gray-600 dark:text-gray-300">• {result.duplicatesFile} CPF(s) duplicado(s) dentro do arquivo (ignorado(s))</p>
                    )}
                    {result.duplicatesDb > 0 && (
                      <p className="text-gray-600 dark:text-gray-300">• {result.duplicatesDb} CPF(s) já existente(s) na base (ignorado(s))</p>
                    )}
                    {result.errors > 0 && (
                      <p className="text-red-600 dark:text-red-400">• {result.errors} registro(s) ignorado(s) por erro</p>
                    )}
                    {result.warnings > 0 && (
                      <p className="text-amber-600">• {result.warnings} registro(s) importado(s) com avisos de correção</p>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={resetFlow}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Importar outro arquivo
                  </button>
                  <button
                    onClick={() => navigate('/app/pessoas')}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Ver pessoas
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Histórico */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Histórico de importações</h2>
          {isLoadingHistory ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : uploadHistory.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Nenhuma importação realizada ainda.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Arquivo</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Data</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Importados</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Erros</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {uploadHistory.map((upload) => (
                      <tr key={upload.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-3 py-2.5 text-gray-900 dark:text-white whitespace-nowrap">{upload.arquivo_nome}</td>
                        <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {new Date(upload.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              upload.status === 'success'
                                ? 'bg-green-100 text-green-800'
                                : upload.status === 'error'
                                ? 'bg-red-100 text-red-800 dark:text-red-300'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {upload.status === 'success' ? 'Sucesso' : upload.status === 'error' ? 'Erro' : 'Em progresso'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{upload.registros_processados - upload.registros_erro}</td>
                        <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{upload.registros_erro}</td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedHistory(upload);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-500 dark:text-red-400 hover:text-red-700"
                            title="Excluir registros desta importação"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPaginas > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>Mostrar</span>
                    <select
                      value={itensPorPagina}
                      onChange={(e) => {
                        setItensPorPagina(Number(e.target.value));
                        setPaginaAtual(1);
                      }}
                      className="rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                    <span>por página</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                      disabled={paginaAtual === 1}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Anterior
                    </button>
                    <span className="text-gray-500 dark:text-gray-400">
                      {paginaAtual} / {totalPaginas}
                    </span>
                    <button
                      onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                      disabled={paginaAtual === totalPaginas}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de exclusão */}
      <Dialog.Root
        open={showDeleteModal}
        onOpenChange={(open) => {
          setShowDeleteModal(open);
          if (!open) setSelectedHistory(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Dialog.Content className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-middle shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <Dialog.Title className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                        Confirmar Exclusão
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Tem certeza que deseja excluir os registros do arquivo{' '}
                          <span className="font-medium text-gray-900 dark:text-white">{selectedHistory?.arquivo_nome}</span>?
                          Esta ação não poderá ser desfeita.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm ${
                      isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Excluindo...
                      </>
                    ) : (
                      'Confirmar Exclusão'
                    )}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedHistory(null);
                    }}
                    disabled={isDeleting}
                  >
                    Cancelar
                  </button>
                </div>
              </Dialog.Content>
            </div>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper para atualizar status do upload
// ---------------------------------------------------------------------------

const atualizarStatusUpload = async (
  uid: string,
  status: string,
  total: number,
  processados: number,
  erros: number,
  mensagemErro?: string | null
) => {
  try {
    await supabaseClient
      .from('gbp_upload_history')
      .update({
        status,
        registros_total: total,
        registros_processados: processados,
        registros_erro: erros,
        erro_mensagem: mensagemErro || null,
        updated_at: new Date().toISOString(),
      })
      .eq('uid', uid);
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
  }
};
