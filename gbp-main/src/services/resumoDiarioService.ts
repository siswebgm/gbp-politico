import { supabaseClient } from '@/lib/supabase';
import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
  format,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type PeriodoResumo = 'hoje' | 'semana' | 'mes' | 'ano' | string;

export interface ResumoEleitor {
  uid: string;
  nome: string;
  whatsapp: string;
  telefone: string;
  cpf: string;
  nascimento: string;
  genero: string;
  bairro: string;
  cidade: string;
  uf: string;
  logradouro: string;
  cep: string;
  zona: string;
  secao: string;
  titulo: string;
  data: string;
}

export interface ResumoAtendimento {
  uid: string;
  eleitor: string;
  descricao: string;
  status: string;
  data: string;
}

export interface ResumoDemanda {
  uid: string;
  tipo: string;
  logradouro: string;
  bairro: string;
  status: string;
  data: string;
}

export interface ResumoAgendamento {
  uid: string;
  titulo: string;
  tipo: string;
  status: string;
  data: string;
  local: string;
}

export interface ResumoOficio {
  uid: string;
  numero: string;
  requerente: string;
  tipo: string;
  urgencia: string;
  status: string;
  data: string;
}

export interface ResumoRequerimento {
  uid: string;
  numero: string;
  titulo: string;
  solicitante: string;
  tipo: string;
  prioridade: string;
  status: string;
  data: string;
}

export interface ResumoProjetoLei {
  uid: string;
  numero: string;
  ano: number | string;
  titulo: string;
  autor: string;
  status: string;
  data: string;
}

export interface ResumoEmendaParlamentar {
  uid: string;
  numero: string;
  ano: number | string;
  tipo: string;
  descricao: string;
  valor: string;
  beneficiario: string;
  status: string;
  data: string;
}

export interface ResumoData {
  eleitores: ResumoEleitor[];
  atendimentos: ResumoAtendimento[];
  demandas: ResumoDemanda[];
  agendamentos: ResumoAgendamento[];
  oficios: ResumoOficio[];
  requerimentos: ResumoRequerimento[];
  projetosLei: ResumoProjetoLei[];
  emendasParlamentares: ResumoEmendaParlamentar[];
}

export function getDateRange(periodo: PeriodoResumo): { inicio: Date; fim: Date } {
  const now = new Date();
  if (periodo.startsWith('ano_')) {
    const year = parseInt(periodo.replace('ano_', ''), 10);
    return { inicio: new Date(year, 0, 1, 0, 0, 0), fim: new Date(year, 11, 31, 23, 59, 59) };
  }
  switch (periodo) {
    case 'hoje':
      return { inicio: startOfDay(now), fim: endOfDay(now) };
    case 'semana':
      return { inicio: startOfWeek(now, { weekStartsOn: 0 }), fim: endOfWeek(now, { weekStartsOn: 0 }) };
    case 'mes':
      return { inicio: startOfMonth(now), fim: endOfMonth(now) };
    case 'ano':
    default:
      return { inicio: startOfYear(now), fim: endOfYear(now) };
  }
}

export const PERIODO_LABELS: Record<string, string> = {
  hoje: 'Hoje',
  semana: 'Esta Semana',
  mes: 'Este Mês',
  ano: 'Este Ano',
};

export function getPeriodoLabel(periodo: string): string {
  if (periodo.startsWith('ano_')) return periodo.replace('ano_', '');
  return PERIODO_LABELS[periodo] ?? periodo;
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  protocolado: 'Protocolado',
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

function fmt(d: string | null | undefined): string {
  if (!d) return '-';
  try {
    return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  } catch {
    return '-';
  }
}

function fmtStatus(s: string | null | undefined): string {
  if (!s) return '-';
  return STATUS_LABELS[s] ?? s;
}

export async function fetchResumoAtividades(
  empresaUid: string,
  periodo: PeriodoResumo
): Promise<ResumoData> {
  const { inicio, fim } = getDateRange(periodo);
  const inicioISO = inicio.toISOString();
  const fimISO = fim.toISOString();

  const [
    { data: eleitores },
    { data: atendimentos },
    { data: demandas },
    { data: agendamentos },
    { data: oficios },
    { data: requerimentos },
    { data: projetosLei },
    { data: emendas },
  ] = await Promise.all([
    supabaseClient
      .from('gbp_eleitores')
      .select('uid, nome, whatsapp, telefone, cpf, nascimento, genero, bairro, cidade, uf, logradouro, cep, zona, secao, titulo, created_at')
      .eq('empresa_uid', empresaUid)
      .gte('created_at', inicioISO)
      .lte('created_at', fimISO)
      .order('created_at', { ascending: false }),

    supabaseClient
      .from('gbp_atendimentos')
      .select('uid, eleitor, descricao, status, created_at')
      .eq('empresa_uid', empresaUid)
      .gte('created_at', inicioISO)
      .lte('created_at', fimISO)
      .order('created_at', { ascending: false }),

    supabaseClient
      .from('gbp_demandas_ruas')
      .select('uid, tipo_de_demanda, logradouro, bairro, status, criado_em')
      .eq('empresa_uid', empresaUid)
      .neq('excluido', true)
      .gte('criado_em', inicioISO)
      .lte('criado_em', fimISO)
      .order('criado_em', { ascending: false }),

    supabaseClient
      .from('gbp_agendamentos')
      .select('uid, title, type, status, start_time, location')
      .eq('empresa_uid', empresaUid)
      .gte('start_time', inicioISO)
      .lte('start_time', fimISO)
      .order('start_time', { ascending: true }),

    supabaseClient
      .from('gbp_oficios')
      .select('uid, numero_oficio, requerente_nome, tipo_de_demanda, nivel_de_urgencia, status_solicitacao, created_at')
      .eq('empresa_uid', empresaUid)
      .gte('created_at', inicioISO)
      .lte('created_at', fimISO)
      .order('created_at', { ascending: false }),

    supabaseClient
      .from('gbp_requerimentos')
      .select('uid, numero, titulo, solicitante, tipo, prioridade, status, data_emissao, created_at')
      .eq('empresa_uid', empresaUid)
      .is('deleted_at', null)
      .gte('created_at', inicioISO)
      .lte('created_at', fimISO)
      .order('created_at', { ascending: false }),

    supabaseClient
      .from('gbp_projetos_lei')
      .select('uid, numero, ano, titulo, autor, status, data_protocolo, created_at')
      .eq('empresa_uid', empresaUid)
      .is('deleted_at', null)
      .gte('created_at', inicioISO)
      .lte('created_at', fimISO)
      .order('created_at', { ascending: false }),

    supabaseClient
      .from('gbp_emendas_parlamentares')
      .select('uid, numero_emenda, ano, tipo, descricao, valor_total, beneficiario, status, created_at')
      .eq('empresa_uid', empresaUid)
      .is('deleted_at', null)
      .gte('created_at', inicioISO)
      .lte('created_at', fimISO)
      .order('created_at', { ascending: false }),
  ]);

  return {
    eleitores: (eleitores || []).map(e => ({
      uid: e.uid,
      nome: e.nome || 'Sem nome',
      whatsapp: e.whatsapp || '-',
      telefone: e.telefone || '-',
      cpf: e.cpf || '-',
      nascimento: e.nascimento ? format(new Date(e.nascimento), 'dd/MM/yyyy') : '-',
      genero: e.genero || '-',
      bairro: e.bairro || '-',
      cidade: e.cidade || '-',
      uf: e.uf || '-',
      logradouro: e.logradouro || '-',
      cep: e.cep || '-',
      zona: e.zona != null ? String(e.zona) : '-',
      secao: e.secao != null ? String(e.secao) : '-',
      titulo: e.titulo || '-',
      data: fmt(e.created_at),
    })),
    atendimentos: (atendimentos || []).map(a => ({
      uid: a.uid,
      eleitor: a.eleitor || 'Não informado',
      descricao: a.descricao ? String(a.descricao).slice(0, 80) : '-',
      status: fmtStatus(a.status),
      data: fmt(a.created_at),
    })),
    demandas: (demandas || []).map(d => ({
      uid: d.uid,
      tipo: (d.tipo_de_demanda || '-').replace('Infraestrutura::', ''),
      logradouro: d.logradouro || '-',
      bairro: d.bairro || '-',
      status: fmtStatus(d.status),
      data: fmt(d.criado_em),
    })),
    agendamentos: (agendamentos || []).map(a => ({
      uid: a.uid,
      titulo: a.title || 'Sem título',
      tipo: a.type || '-',
      status: fmtStatus(a.status),
      data: fmt(a.start_time),
      local: a.location || '-',
    })),
    oficios: (oficios || []).map(o => ({
      uid: o.uid,
      numero: o.numero_oficio || '-',
      requerente: o.requerente_nome || '-',
      tipo: (o.tipo_de_demanda || '-').replace('Infraestrutura::', ''),
      urgencia: o.nivel_de_urgencia || '-',
      status: o.status_solicitacao || '-',
      data: fmt(o.created_at),
    })),
    requerimentos: (requerimentos || []).map(r => ({
      uid: r.uid,
      numero: r.numero || '-',
      titulo: r.titulo || '-',
      solicitante: r.solicitante || '-',
      tipo: r.tipo || '-',
      prioridade: r.prioridade || '-',
      status: fmtStatus(r.status),
      data: fmt(r.data_emissao || r.created_at),
    })),
    projetosLei: (projetosLei || []).map(p => ({
      uid: p.uid,
      numero: p.numero || '-',
      ano: p.ano || '-',
      titulo: p.titulo || '-',
      autor: p.autor || '-',
      status: fmtStatus(p.status),
      data: fmt(p.data_protocolo || p.created_at),
    })),
    emendasParlamentares: (emendas || []).map(e => ({
      uid: e.uid,
      numero: e.numero_emenda || '-',
      ano: e.ano || '-',
      tipo: e.tipo || '-',
      descricao: e.descricao || '-',
      valor: e.valor_total != null ? `R$ ${Number(e.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
      beneficiario: e.beneficiario || '-',
      status: fmtStatus(e.status),
      data: fmt(e.created_at),
    })),
  };
}
