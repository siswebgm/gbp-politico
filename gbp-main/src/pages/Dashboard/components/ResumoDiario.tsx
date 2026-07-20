import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, ClipboardList, MapPin, Calendar, FileDown, Loader2, BarChart2, ScrollText, FileText, BookOpen, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCompanyStore } from '@/store/useCompanyStore';
import { useAuth } from '@/providers/AuthProvider';
import {
  fetchResumoAtividades,
  getDateRange,
  PERIODO_LABELS,
  getPeriodoLabel,
  type PeriodoResumo,
  type ResumoData,
} from '@/services/resumoDiarioService';
import ExcelJS from 'exceljs';

const PERIODOS: PeriodoResumo[] = ['hoje', 'semana', 'mes'];

const ANO_ATUAL = new Date().getFullYear();
const ANOS_ANTERIORES = Array.from({ length: 5 }, (_, i) => ANO_ATUAL - 1 - i);

const SECOES = [
  { key: 'eleitores' as const, label: 'Novos Cadastros', icon: Users, corNum: 'text-blue-600', corBg: 'bg-blue-50 dark:bg-blue-900/20', corBorda: 'border-blue-200 dark:border-blue-800', corTexto: 'text-blue-700 dark:text-blue-400' },
  { key: 'atendimentos' as const, label: 'Atendimentos', icon: ClipboardList, corNum: 'text-green-600', corBg: 'bg-green-50 dark:bg-green-900/20', corBorda: 'border-green-200 dark:border-green-800', corTexto: 'text-green-700 dark:text-green-400' },
  { key: 'demandas' as const, label: 'Demandas', icon: MapPin, corNum: 'text-orange-600', corBg: 'bg-orange-50 dark:bg-orange-900/20', corBorda: 'border-orange-200 dark:border-orange-800', corTexto: 'text-orange-700 dark:text-orange-400' },
  { key: 'agendamentos' as const, label: 'Agendamentos', icon: Calendar, corNum: 'text-purple-600', corBg: 'bg-purple-50 dark:bg-purple-900/20', corBorda: 'border-purple-200 dark:border-purple-800', corTexto: 'text-purple-700 dark:text-purple-400' },
  { key: 'oficios' as const, label: 'Ofícios', icon: FileText, corNum: 'text-sky-600', corBg: 'bg-sky-50 dark:bg-sky-900/20', corBorda: 'border-sky-200 dark:border-sky-800', corTexto: 'text-sky-700 dark:text-sky-400' },
  { key: 'requerimentos' as const, label: 'Requerimentos', icon: ScrollText, corNum: 'text-violet-600', corBg: 'bg-violet-50 dark:bg-violet-900/20', corBorda: 'border-violet-200 dark:border-violet-800', corTexto: 'text-violet-700 dark:text-violet-400' },
  { key: 'projetosLei' as const, label: 'Projetos de Lei', icon: BookOpen, corNum: 'text-emerald-600', corBg: 'bg-emerald-50 dark:bg-emerald-900/20', corBorda: 'border-emerald-200 dark:border-emerald-800', corTexto: 'text-emerald-700 dark:text-emerald-400' },
  { key: 'emendasParlamentares' as const, label: 'Emendas Parl.', icon: Landmark, corNum: 'text-amber-600', corBg: 'bg-amber-50 dark:bg-amber-900/20', corBorda: 'border-amber-200 dark:border-amber-800', corTexto: 'text-amber-700 dark:text-amber-400' },
];

async function gerarExcel(
  dados: ResumoData,
  periodo: PeriodoResumo,
  nomeEmpresa: string
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = nomeEmpresa;
  wb.created = new Date();

  const { inicio, fim } = getDateRange(periodo);
  const periodoLabel = getPeriodoLabel(periodo);
  const rangeLabel =
    periodo === 'hoje'
      ? format(inicio, 'dd/MM/yyyy', { locale: ptBR })
      : `${format(inicio, 'dd/MM/yyyy', { locale: ptBR })} a ${format(fim, 'dd/MM/yyyy', { locale: ptBR })}`;
  const geradoEm = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  function addSheet(
    name: string,
    headers: string[],
    rows: (string | number)[][],
    argb: string
  ) {
    const ws = wb.addWorksheet(name);
    ws.addRow([`${nomeEmpresa} — Relatório de Atividades`]).font = { bold: true, size: 12 };
    ws.addRow([`Período: ${periodoLabel} (${rangeLabel}) | Gerado em: ${geradoEm}`]).font = { italic: true, size: 9, color: { argb: 'FF555555' } };
    ws.addRow([]);
    const hRow = ws.addRow(headers);
    hRow.height = 20;
    hRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } };
    });
    if (rows.length === 0) {
      const r = ws.addRow(['Nenhum registro neste período.']);
      r.font = { italic: true, color: { argb: 'FF888888' } };
    } else {
      rows.forEach((row, i) => {
        const r = ws.addRow(row);
        if (i % 2 === 0) {
          r.eachCell({ includeEmpty: true }, cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFF' } };
          });
        }
      });
    }
    ws.columns = headers.map((h, i) => {
      const maxLen = rows.reduce((m, r) => Math.max(m, String(r[i] ?? '').length), h.length);
      return { width: Math.min(maxLen + 4, 52) };
    });
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 4 }];
    return ws;
  }

  // Aba 1: Resumo
  const wsR = wb.addWorksheet('Resumo');

  const titleRow = wsR.addRow([`${nomeEmpresa} — Relatório de Atividades`]);
  titleRow.font = { bold: true, size: 14 };
  titleRow.height = 28;

  const periodRow = wsR.addRow([`Período: ${periodoLabel}  •  ${rangeLabel}`]);
  periodRow.font = { italic: true, size: 10, color: { argb: 'FF374151' } };

  const genRow = wsR.addRow([`Gerado em: ${geradoEm}`]);
  genRow.font = { size: 9, color: { argb: 'FF6B7280' } };

  wsR.addRow([]);

  const secTitle = wsR.addRow(['RESUMO GERAL']);
  secTitle.font = { bold: true, size: 11, color: { argb: 'FF1E3A8A' } };
  secTitle.height = 20;

  const rHead = wsR.addRow(['Categoria', 'Quantidade', 'Ir para aba']);
  rHead.height = 22;
  rHead.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const summaryItems = [
    { label: 'Cadastros de Eleitores', count: dados.eleitores.length, sheet: 'Cadastros', argb: 'FF3B82F6' },
    { label: 'Atendimentos', count: dados.atendimentos.length, sheet: 'Atendimentos', argb: 'FF22C55E' },
    { label: 'Demandas', count: dados.demandas.length, sheet: 'Demandas', argb: 'FFF97316' },
    { label: 'Agendamentos', count: dados.agendamentos.length, sheet: 'Agendamentos', argb: 'FFA855F7' },
    { label: 'Ofícios', count: dados.oficios.length, sheet: 'Ofícios', argb: 'FF0EA5E9' },
    { label: 'Requerimentos', count: dados.requerimentos.length, sheet: 'Requerimentos', argb: 'FF8B5CF6' },
    { label: 'Projetos de Lei', count: dados.projetosLei.length, sheet: 'Projetos de Lei', argb: 'FF10B981' },
    { label: 'Emendas Parlamentares', count: dados.emendasParlamentares.length, sheet: 'Emendas Parl.', argb: 'FFF59E0B' },
  ];

  summaryItems.forEach((item, i) => {
    const r = wsR.addRow([item.label, item.count, '']);
    if (i % 2 === 0) {
      r.eachCell({ includeEmpty: true }, c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
      });
    }
    r.getCell(1).font = { size: 10 };
    r.getCell(2).alignment = { horizontal: 'center' };
    r.getCell(2).font = { bold: true, size: 12, color: { argb: item.argb } };
    const linkCell = r.getCell(3);
    linkCell.value = { text: `Ver ${item.label} →`, hyperlink: `#'${item.sheet}'!A1` };
    linkCell.font = { color: { argb: 'FF1D4ED8' }, underline: true, size: 10 };
    linkCell.alignment = { horizontal: 'center' };
  });

  // Seção: Distribuição por Cidade
  wsR.addRow([]);
  wsR.addRow([]);

  const distCidadeTitle = wsR.addRow(['DISTRIBUIÇÃO POR CIDADE']);
  distCidadeTitle.font = { bold: true, size: 11, color: { argb: 'FF1E3A8A' } };
  distCidadeTitle.height = 20;

  const cidadeMap = new Map<string, number>();
  dados.eleitores.forEach(e => {
    const c = e.cidade && e.cidade !== '-' ? e.cidade : 'Não informada';
    cidadeMap.set(c, (cidadeMap.get(c) ?? 0) + 1);
  });
  const porCidade = Array.from(cidadeMap.entries()).sort((a, b) => b[1] - a[1]);

  const cidadeHead = wsR.addRow(['#', 'Cidade', 'Quantidade', '% do Total']);
  cidadeHead.height = 20;
  cidadeHead.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const totalEleitores = dados.eleitores.length || 1;
  porCidade.forEach(([cidade, qtd], i) => {
    const pct = ((qtd / totalEleitores) * 100).toFixed(1) + '%';
    const r = wsR.addRow([i + 1, cidade, qtd, pct]);
    if (i % 2 === 0) r.eachCell({ includeEmpty: true }, c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } }; });
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(3).font = { bold: true };
    r.getCell(4).alignment = { horizontal: 'center' };
  });

  // Seção: Distribuição por Bairro
  wsR.addRow([]);
  wsR.addRow([]);

  const distBairroTitle = wsR.addRow(['DISTRIBUIÇÃO POR BAIRRO']);
  distBairroTitle.font = { bold: true, size: 11, color: { argb: 'FF7C3AED' } };
  distBairroTitle.height = 20;

  const bairroMap = new Map<string, { cidade: string; qtd: number }>();
  dados.eleitores.forEach(e => {
    const b = e.bairro && e.bairro !== '-' ? e.bairro : 'Não informado';
    const c = e.cidade && e.cidade !== '-' ? e.cidade : 'Não informada';
    const key = `${b}||${c}`;
    const prev = bairroMap.get(key);
    bairroMap.set(key, { cidade: c, qtd: (prev?.qtd ?? 0) + 1 });
  });
  const porBairro = Array.from(bairroMap.entries())
    .map(([key, val]) => ({ bairro: key.split('||')[0], cidade: val.cidade, qtd: val.qtd }))
    .sort((a, b) => b.qtd - a.qtd);

  const bairroHead = wsR.addRow(['#', 'Bairro', 'Cidade', 'Quantidade', '% do Total']);
  bairroHead.height = 20;
  bairroHead.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  porBairro.forEach(({ bairro, cidade, qtd }, i) => {
    const pct = ((qtd / totalEleitores) * 100).toFixed(1) + '%';
    const r = wsR.addRow([i + 1, bairro, cidade, qtd, pct]);
    if (i % 2 === 0) r.eachCell({ includeEmpty: true }, c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } }; });
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(4).alignment = { horizontal: 'center' };
    r.getCell(4).font = { bold: true };
    r.getCell(5).alignment = { horizontal: 'center' };
  });

  wsR.columns = [{ width: 38 }, { width: 28 }, { width: 28 }, { width: 14 }, { width: 12 }];
  wsR.views = [{ state: 'frozen', xSplit: 0, ySplit: 6 }];

  // Pré-computar grupos de atendimentos por eleitor para hyperlinks
  const atendCountMap = new Map<string, number>();
  dados.atendimentos.forEach(a => {
    const n = a.eleitor || 'Não informado';
    atendCountMap.set(n, (atendCountMap.get(n) ?? 0) + 1);
  });
  const atendGroupObj: Record<string, typeof dados.atendimentos> = {};
  dados.atendimentos.forEach(a => {
    const n = a.eleitor || 'Não informado';
    if (!atendGroupObj[n]) atendGroupObj[n] = [];
    atendGroupObj[n].push(a);
  });
  const atendGroups = Object.entries(atendGroupObj).sort((x, y) =>
    x[0].localeCompare(y[0], 'pt-BR')
  );
  // Linhas 1-4 = cabeçalho, dados começam na linha 5 (sem separadores)
  const eleitorSepRowMap = new Map<string, number>();
  let aSepCursor = 5;
  atendGroups.forEach(([n, rows]) => {
    eleitorSepRowMap.set(n, aSepCursor);
    aSepCursor += rows.length;
  });

  // Aba Cadastros (manual)
  const wsCad = wb.addWorksheet('Cadastros');
  const cadArgb = 'FF3B82F6';
  wsCad.addRow([`${nomeEmpresa} — Relatório de Atividades`]).font = { bold: true, size: 12 };
  wsCad.addRow([`Período: ${periodoLabel} (${rangeLabel}) | Gerado em: ${geradoEm}`]).font = { italic: true, size: 9, color: { argb: 'FF555555' } };
  wsCad.addRow([]);
  const cadHdr = wsCad.addRow(['#', 'Nome', 'WhatsApp', 'Telefone', 'CPF', 'Nascimento', 'Gênero', 'Título Eleit.', 'Zona', 'Seção', 'Bairro', 'Cidade', 'UF', 'Logradouro', 'CEP', 'Data Cadastro', 'Qtd. Atend.', '↗ Ver Atend.']);
  cadHdr.height = 20;
  cadHdr.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cadArgb } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } };
  });
  if (dados.eleitores.length === 0) {
    wsCad.addRow(['Nenhum registro neste período.']).font = { italic: true, color: { argb: 'FF888888' } };
  } else {
    dados.eleitores.forEach((e, i) => {
      const nome = (e.nome || 'Sem nome').trim();
      const qtdAtend = atendCountMap.get(nome) ?? 0;
      const sepRow = eleitorSepRowMap.get(nome);
      const hasAtend = qtdAtend > 0 && sepRow !== undefined;
      const r = wsCad.addRow([
        i + 1, nome, e.whatsapp, e.telefone, e.cpf, e.nascimento,
        e.genero, e.titulo, e.zona, e.secao, e.bairro, e.cidade,
        e.uf, e.logradouro, e.cep, e.data, qtdAtend, '',
      ]);

      // Fundo: verde claro para eleitores com atendimentos, azul claro alternado para os demais
      const rowBg = hasAtend ? 'FFD1FAE5' : (i % 2 === 0 ? 'FFF8FAFF' : 'FFFFFFFF');
      r.eachCell({ includeEmpty: true }, c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      });

      // Coluna # — número simples
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(1).font = { color: { argb: 'FF6B7280' } };

      // Coluna Nome — hyperlink se tiver atendimentos
      const nomeCell = r.getCell(2);
      if (hasAtend) {
        nomeCell.value = { text: nome, hyperlink: `#'Atendimentos'!A${sepRow}` };
        nomeCell.font = { color: { argb: 'FF1D4ED8' }, underline: true, bold: true };
      }

      // Coluna Qtd. Atend.
      const qtdCell = r.getCell(17);
      qtdCell.alignment = { horizontal: 'center' };
      if (hasAtend) {
        qtdCell.font = { bold: true, color: { argb: 'FF065F46' } };
        qtdCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6EE7B7' } };
      } else {
        qtdCell.font = { color: { argb: 'FF9CA3AF' } };
      }

      // Coluna ↗ Ver Atend. — link clicável dedicado
      const linkCell = r.getCell(18);
      linkCell.alignment = { horizontal: 'center' };
      if (hasAtend) {
        linkCell.value = { text: `↗ Ver ${qtdAtend} atend.`, hyperlink: `#'Atendimentos'!A${sepRow}` };
        linkCell.font = { color: { argb: 'FF1D4ED8' }, underline: true, bold: true };
        linkCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      }
    });
  }
  wsCad.columns = [
    { width: 8 }, { width: 36 }, { width: 18 }, { width: 16 }, { width: 16 },
    { width: 14 }, { width: 12 }, { width: 16 }, { width: 8 }, { width: 8 },
    { width: 24 }, { width: 24 }, { width: 6 }, { width: 36 }, { width: 12 },
    { width: 20 }, { width: 12 }, { width: 18 },
  ];
  wsCad.views = [{ state: 'frozen', xSplit: 0, ySplit: 4 }];

  // Aba Atendimentos — tabela plana, ordenada por eleitor, blocos alternados
  const wsA = wb.addWorksheet('Atendimentos');
  const aArgb = 'FF22C55E';
  wsA.addRow([`${nomeEmpresa} — Relatório de Atividades`]).font = { bold: true, size: 12 };
  wsA.addRow([`Período: ${periodoLabel} (${rangeLabel}) | Gerado em: ${geradoEm}`]).font = { italic: true, size: 9, color: { argb: 'FF555555' } };
  wsA.addRow([]);
  const aHdr = wsA.addRow(['#', 'Eleitor / Solicitante', 'Descrição', 'Status', 'Data/Hora']);
  aHdr.height = 20;
  aHdr.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: aArgb } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF15803D' } } };
  });
  if (dados.atendimentos.length === 0) {
    wsA.addRow(['Nenhum registro neste período.']).font = { italic: true, color: { argb: 'FF888888' } };
  } else {
    let globalIdx = 0;
    // Dois tons alternados por bloco de eleitor (não por linha individual)
    const blockColors = ['FFFFFFFF', 'FFF0F9FF']; // branco / azul muito claro
    atendGroups.forEach(([nome, rows], gi) => {
      const bg = blockColors[gi % 2];
      const isLastGroup = gi === atendGroups.length - 1;
      rows.forEach((a, ri) => {
        globalIdx++;
        const isLastRow = ri === rows.length - 1;
        const r = wsA.addRow([globalIdx, nome, a.descricao, a.status, a.data]);
        r.eachCell({ includeEmpty: true }, c => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          // Borda inferior no último row de cada grupo (exceto o último grupo)
          if (isLastRow && !isLastGroup) {
            c.border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
          }
        });
        r.getCell(1).alignment = { horizontal: 'center' };
        r.getCell(1).font = { color: { argb: 'FF6B7280' } };
      });
    });
  }
  wsA.columns = [
    { width: 6 }, { width: 34 }, { width: 50 }, { width: 18 }, { width: 20 },
  ];
  wsA.views = [{ state: 'frozen', xSplit: 0, ySplit: 4 }];

  addSheet('Demandas', ['#', 'Tipo', 'Logradouro', 'Bairro', 'Status', 'Data/Hora'],
    dados.demandas.map((d, i) => [i + 1, d.tipo, d.logradouro, d.bairro, d.status, d.data]), 'FFF97316');

  addSheet('Agendamentos', ['#', 'Título', 'Tipo', 'Local', 'Status', 'Data/Hora'],
    dados.agendamentos.map((a, i) => [i + 1, a.titulo, a.tipo, a.local, a.status, a.data]), 'FFA855F7');

  addSheet('Ofícios', ['#', 'Nº Ofício', 'Requerente', 'Tipo', 'Urgência', 'Status', 'Data/Hora'],
    dados.oficios.map((o, i) => [i + 1, o.numero, o.requerente, o.tipo, o.urgencia, o.status, o.data]), 'FF0EA5E9');

  addSheet('Requerimentos', ['#', 'Número', 'Título', 'Solicitante', 'Tipo', 'Prioridade', 'Status', 'Data'],
    dados.requerimentos.map((r, i) => [i + 1, r.numero, r.titulo, r.solicitante, r.tipo, r.prioridade, r.status, r.data]), 'FF8B5CF6');

  addSheet('Projetos de Lei', ['#', 'Número', 'Ano', 'Título', 'Autor', 'Status', 'Data Protocolo'],
    dados.projetosLei.map((p, i) => [i + 1, p.numero, String(p.ano), p.titulo, p.autor, p.status, p.data]), 'FF10B981');

  addSheet('Emendas Parl.', ['#', 'Número', 'Ano', 'Tipo', 'Descrição', 'Beneficiário', 'Valor', 'Status', 'Data'],
    dados.emendasParlamentares.map((e, i) => [i + 1, e.numero, String(e.ano), e.tipo, e.descricao, e.beneficiario, e.valor, e.status, e.data]), 'FFF59E0B');

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-${periodo}-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ResumoDiario() {
  const { company } = useCompanyStore();
  const { user } = useAuth();
  const podeExportar = ['admin', 'analista', 'coordenador'].includes(
    user?.nivel_acesso?.toLowerCase() ?? ''
  );
  const [periodo, setPeriodo] = useState<PeriodoResumo>('hoje');
  const [dados, setDados] = useState<ResumoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);

  const carregarDados = useCallback(async () => {
    if (!company?.uid) return;
    setLoading(true);
    try {
      const resultado = await fetchResumoAtividades(company.uid, periodo);
      setDados(resultado);
    } catch (e) {
      console.error('Erro ao carregar resumo:', e);
    } finally {
      setLoading(false);
    }
  }, [company?.uid, periodo]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleExportarExcel = async () => {
    if (exportando) return;
    setExportando(true);
    try {
      const dadosAtuais = dados ?? await fetchResumoAtividades(company!.uid, periodo);
      await gerarExcel(dadosAtuais, periodo, company?.nome || 'GBP Político');
    } catch (e) {
      console.error('Erro ao exportar Excel:', e);
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden border-l-4 border-l-blue-400">
      {/* Cabeçalho */}
      <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        {/* Título */}
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <BarChart2 className="w-4 h-4 text-blue-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Relatório de Atividades</h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Exporte um Excel com todos os registros do período
          </p>
        </div>
        {/* Controles */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
            {PERIODOS.map(p => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-2.5 py-1.5 font-medium transition-colors whitespace-nowrap ${
                  periodo === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {PERIODO_LABELS[p]}
              </button>
            ))}
            <select
              value={periodo === 'ano' || periodo.startsWith('ano_') ? periodo : 'ano'}
              onChange={e => setPeriodo(e.target.value)}
              className={`px-2 py-1.5 font-medium transition-colors cursor-pointer border-l border-gray-200 dark:border-gray-700 outline-none ${
                periodo === 'ano' || periodo.startsWith('ano_')
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <option value="ano">Este Ano</option>
              {ANOS_ANTERIORES.map(ano => (
                <option key={ano} value={`ano_${ano}`}>{ano}</option>
              ))}
            </select>
          </div>
          {podeExportar && (
            <Button
              size="sm"
              onClick={handleExportarExcel}
              disabled={!company?.uid || exportando || loading}
              className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center"
              title={exportando ? 'Gerando...' : 'Exportar Excel'}
            >
              {exportando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Cards de totais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 dark:bg-gray-700">
        {SECOES.map(secao => {
          const count = dados ? dados[secao.key].length : 0;
          const Icon = secao.icon;
          return (
            <div key={secao.key} className={`flex items-center gap-3 p-4 bg-white dark:bg-gray-800 ${secao.corBg}`}>
              <div className={`p-2 rounded-lg border ${secao.corBorda}`}>
                <Icon className={`h-4 w-4 ${secao.corTexto}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${loading ? 'text-gray-300 dark:text-gray-600' : secao.corNum}`}>
                  {loading ? '—' : count}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{secao.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
