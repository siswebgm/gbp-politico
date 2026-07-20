import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '@headlessui/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  X, 
  Download, 
  FileText, 
  Table, 
  File, 
  Users, 
  Phone,
  MapPin, 
  Info,
  CheckSquare,
  type LucideIcon
} from 'lucide-react';
import { useEleitores } from '../../../hooks/useEleitores';
import { toast } from 'react-toastify';
import { eleitorService } from '../../../services/eleitorService';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { EleitorFilters } from '../../../types/eleitor';
import { supabaseClient } from '../../../lib/supabase';
import * as XLSX from 'xlsx';

interface ExportarModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredData: any[];
  selectedIds: string[];
  filters?: EleitorFilters;
}

interface FieldGroup {
  label: string;
  icon: LucideIcon;
}

const exportFields = {
  pessoais: [
    { id: 'nome', label: 'Nome' },
    { id: 'cpf', label: 'CPF' },
    { id: 'nascimento', label: 'Data de Nascimento' },
    { id: 'genero', label: 'Gênero' },
    { id: 'nome_mae', label: 'Nome da Mãe' },
  ],
  contato: [
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'telefone', label: 'Telefone' },
  ],
  eleitorais: [
    { id: 'titulo', label: 'Título de Eleitor' },
    { id: 'zona', label: 'Zona' },
    { id: 'secao', label: 'Seção' },
  ],
  endereco: [
    { id: 'cep', label: 'CEP' },
    { id: 'logradouro', label: 'Logradouro' },
    { id: 'numero', label: 'Número' },
    { id: 'complemento', label: 'Complemento' },
    { id: 'bairro', label: 'Bairro' },
    { id: 'cidade', label: 'Cidade' },
    { id: 'uf', label: 'UF' },
    { id: 'latitude', label: 'Latitude' },
    { id: 'longitude', label: 'Longitude' },
  ],
  adicionais: [
    { id: 'categoria', label: 'Categoria' },
    { id: 'gbp_atendimentos', label: 'Atendimentos' },
    { id: 'responsavel', label: 'Responsável' },
    { id: 'indicado', label: 'Indicado por' },
    { id: 'created_at', label: 'Data de Cadastro' },
  ],
};

const fieldGroups: Record<string, FieldGroup> = {
  pessoais: { label: 'Dados Pessoais', icon: Users },
  contato: { label: 'Contato', icon: Phone },
  eleitorais: { label: 'Dados Eleitorais', icon: CheckSquare },
  endereco: { label: 'Endereço', icon: MapPin },
  adicionais: { label: 'Informações Adicionais', icon: Info },
};

const PDF_MAX_COLS = 6;
const PDF_DEFAULT_CAMPOS = ['nome', 'cpf', 'whatsapp', 'nascimento', 'cidade', 'bairro'];

export function ExportarModal({ isOpen, onClose, filteredData, selectedIds, filters = {} }: ExportarModalProps) {
  const [formato, setFormato] = useState('xlsx');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const allFields = Object.values(exportFields).flat();
  const [campos, setCampos] = useState<string[]>(allFields.map((f: { id: string }) => f.id));
  const [xlsxCampos, setXlsxCampos] = useState<string[]>(allFields.map((f: { id: string }) => f.id));

  const isPdf = formato === 'pdf';

  const handleSetFormato = (fmt: string) => {
    if (fmt === 'pdf' && formato !== 'pdf') {
      setXlsxCampos(campos); // salva seleção atual do XLSX
      setCampos(PDF_DEFAULT_CAMPOS);
    } else if (fmt === 'xlsx' && formato !== 'xlsx') {
      setCampos(xlsxCampos); // restaura seleção do XLSX
    }
    setFormato(fmt);
  };
  const company = useCompanyStore((state) => state.company);
  const { total: totalEleitores } = useEleitores({ filters });

  // Calcula a quantidade de eleitores a serem exportados
  const quantidadeExportar = selectedIds.length > 0 ? selectedIds.length : totalEleitores || 0;

  const formatData = (data: any, field: string) => {
    if (data === null || data === undefined) return '';
    
    switch (field) {
      case 'nascimento':
        return data ? new Date(data).toLocaleDateString('pt-BR') : '';
      case 'created_at':
        return data ? new Date(data).toLocaleString('pt-BR') : '';
      case 'cpf':
        return data ? data.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '';
      case 'telefone':
      case 'whatsapp':
        return data ? data.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : '';
      case 'categoria':
      case 'gbp_atendimentos':
      case 'indicado':
        return data ? String(data) : '';
      default:
        return String(data || '');
    }
  };

  const handleExport = async () => {
    try {
      if (!company?.uid) {
        toast.error('Empresa não encontrada');
        return;
      }

      if (campos.length === 0) {
        toast.error('Selecione pelo menos um campo para exportar');
        return;
      }

      setIsLoading(true);
      setLoadingMessage('Iniciando exportação...');

      // Busca os dados completos dos eleitores selecionados
      let eleitoresData = [];
      if (selectedIds.length > 0) {
        setLoadingMessage(`Buscando dados de ${quantidadeExportar} eleitores...`);
        
        try {
          console.log('[DEBUG] IDs selecionados:', selectedIds);
          
          // Remove duplicados e valida os UUIDs
          const validUuids = [...new Set(
            selectedIds
              .map(id => typeof id === 'string' ? id.trim() : String(id))
              .filter(id => id && id.length > 0)
          )];
          
          console.log('[DEBUG] UUIDs válidos:', validUuids);
          
          if (validUuids.length === 0) {
            throw new Error('IDs de eleitores inválidos');
          }

          // Busca os dados usando o serviço de eleitores
          console.log('[DEBUG] Buscando eleitores com empresa_uid:', company.uid);
          const response = await eleitorService.getByIds(company.uid, validUuids);
          
          console.log('[DEBUG] Resposta do servidor:', response);
          
          if (!response || !response.data) {
            throw new Error('Resposta inválida do servidor');
          }

          eleitoresData = response.data;
          console.log('[DEBUG] Dados dos eleitores:', eleitoresData);

          if (eleitoresData.length === 0) {
            throw new Error('Nenhum eleitor encontrado com os IDs fornecidos');
          }

        } catch (error) {
          console.error('Erro ao buscar eleitores:', error);
          toast.error(error instanceof Error ? error.message : 'Erro ao buscar dados dos eleitores');
          return;
        }
      } else {
        // Se não houver seleção, busca TODOS os eleitores com os filtros ativos (sem limite de página)
        setLoadingMessage(`Buscando todos os ${quantidadeExportar} eleitores...`);
        try {
          const response = await eleitorService.listAll(company.uid, filters, 1, 999999);
          eleitoresData = response.data;
        } catch (error) {
          console.error('Erro ao buscar todos os eleitores:', error);
          toast.error('Erro ao buscar dados dos eleitores para exportação');
          return;
        }
      }

      if (eleitoresData.length === 0) {
        toast.error('Nenhum eleitor encontrado para exportação');
        setIsLoading(false);
        return;
      }

      setLoadingMessage('Preparando dados para exportação...');

      // Ordena os dados por nome antes de exportar
      const sortedData = [...eleitoresData]
        .filter(eleitor => eleitor && eleitor.nome)
        .sort((a, b) => {
          const nomeA = (a.nome || '').toLowerCase();
          const nomeB = (b.nome || '').toLowerCase();
          return nomeA.localeCompare(nomeB);
        });

      // Prepara os dados para exportação
      const exportData = sortedData.map(eleitor => {
        const row: any = {};
        campos.forEach(campo => {
          const field = allFields.find(f => f.id === campo);
          if (field) {
            let value = eleitor[campo];
            
            // Tratamento especial para campos relacionados
            if (campo === 'categoria' && eleitor.gbp_categorias) {
              value = eleitor.gbp_categorias.nome;
            } else if (campo === 'responsavel') {
              if (eleitor.gbp_usuarios) {
                value = eleitor.gbp_usuarios.nome;
              } else if (eleitor.responsavel) {
                value = eleitor.responsavel;
              }
            } else if (campo === 'indicado' && eleitor.gbp_indicado) {
              value = eleitor.gbp_indicado.nome;
            }
            
            row[field.label] = formatData(value, campo);
          }
        });
        return row;
      });

      // Exporta no formato selecionado
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const companyPrefix = company.nome.toLowerCase().replace(/[^a-z0-9]/g, '_');
      let fileName = `${companyPrefix}_eleitores_${timestamp}`;

      setLoadingMessage(`Gerando arquivo ${formato.toUpperCase()}...`);
      
      try {
        switch (formato) {
          case 'csv': {
            const headers = campos.map(campo => {
              const field = allFields.find(f => f.id === campo);
              return field ? field.label : campo;
            }).join(',');
            
            const rows = exportData.map(row => 
              Object.values(row).map(value => 
                `"${String(value || '').replace(/"/g, '""')}"`
              ).join(',')
            );
            
            const content = [headers, ...rows].join('\n');
            const blob = new Blob(["\ufeff" + content], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${fileName}.csv`;
            link.click();
            window.URL.revokeObjectURL(url);
            break;
          }
          case 'xlsx': {
            try {
              setLoadingMessage('Buscando atendimentos dos eleitores...');

              // Busca atendimentos de todos os eleitores exportados
              const eleitorUids = sortedData.map(e => e.uid).filter(Boolean);
              let atendimentosPorEleitorUid: Record<string, any[]> = {};

              if (eleitorUids.length > 0) {
                const { data: atendRaw, error: atendError } = await supabaseClient
                  .from('gbp_atendimentos')
                  .select(`
                    uid,
                    eleitor_uid,
                    data_atendimento,
                    descricao,
                    gbp_usuarios!usuario_uid ( nome ),
                    gbp_categorias!categoria_uid ( nome )
                  `)
                  .in('eleitor_uid', eleitorUids)
                  .eq('empresa_uid', company.uid)
                  .order('data_atendimento', { ascending: false });

                if (atendError) console.error('[Export] Erro ao buscar atendimentos:', atendError);

                (atendRaw || []).forEach((at: any) => {
                  if (!atendimentosPorEleitorUid[at.eleitor_uid]) {
                    atendimentosPorEleitorUid[at.eleitor_uid] = [];
                  }
                  atendimentosPorEleitorUid[at.eleitor_uid].push(at);
                });
              }

              setLoadingMessage('Gerando arquivo XLSX...');

              const wb = XLSX.utils.book_new();

              // ── PRÉ-CÁLCULO: linha de cada eleitor na aba Eleitores (row Excel = idx + 2)
              const eleitorEleitoresRowMap: Record<string, number> = {};
              sortedData.forEach((eleitor, idx) => {
                eleitorEleitoresRowMap[eleitor.uid] = idx + 2; // +1 header +1 base-1
              });

              // ── ABA ELEITORES ─────────────────────────────────────────────
              const headers = campos.map(campo => {
                const field = allFields.find(f => f.id === campo);
                return field ? field.label : campo;
              });
              // Coluna indicadora + colunas de dados + Nº Atendimentos
              const INDICATOR_HEADER = '📋 Atend.';
              const headersWithCount = [INDICATOR_HEADER, ...headers, 'Nº Atendimentos'];

              const wsData: string[][] = [headersWithCount];
              sortedData.forEach((eleitor, idx) => {
                const row = exportData[idx];
                const qtd = (atendimentosPorEleitorUid[eleitor.uid] || []).length;
                const indicator = qtd > 0 ? '📎' : '';
                wsData.push([
                  indicator,
                  ...headers.map(h => row[h] ?? row[h.replace('  →  clique para ver atendimentos', '')] ?? ''),
                  String(qtd || ''),
                ]);
              });

              const ws = XLSX.utils.aoa_to_sheet(wsData);


              // Mapa uid → linha na aba Atendimentos (calculado ao construir wsAtendData)
              const eleitorAtendRowMap: Record<string, number> = {};

              // ── ABA ATENDIMENTOS ──────────────────────────────────────────
              const atendHeaders = ['Eleitor', 'Data', 'Descrição', 'Responsável', 'Categoria', '← Voltar'];
              const wsAtendData: string[][] = [atendHeaders];

              sortedData.forEach(eleitor => {
                const atends = atendimentosPorEleitorUid[eleitor.uid] || [];
                if (atends.length === 0) return;

                const anchorRow = wsAtendData.length + 1;
                eleitorAtendRowMap[eleitor.uid] = anchorRow;
                // Linha de grupo: nome do eleitor + célula de volta (preenchida depois via .l)
                wsAtendData.push([eleitor.nome, '', '', '', '', '← Voltar aos Eleitores']);

                atends.forEach((at: any) => {
                  wsAtendData.push([
                    '',
                    at.data_atendimento
                      ? new Date(at.data_atendimento).toLocaleDateString('pt-BR')
                      : '',
                    at.descricao || '',
                    at.gbp_usuarios?.nome || '',
                    at.gbp_categorias?.nome || '',
                    '',
                  ]);
                });
              });

              const wsAtend = XLSX.utils.aoa_to_sheet(wsAtendData);
              wsAtend['!cols'] = [
                { wch: 36 }, { wch: 14 }, { wch: 55 }, { wch: 24 }, { wch: 24 }, { wch: 22 },
              ];
              // Freeze cabeçalho da aba Atendimentos
              wsAtend['!views'] = [{ state: 'frozen', ySplit: 1 }];

              // Hyperlinks de volta: col F (índice 5) de cada linha de grupo → aba Eleitores
              sortedData.forEach(eleitor => {
                const anchorRow = eleitorAtendRowMap[eleitor.uid];
                if (!anchorRow) return;
                const elRow = eleitorEleitoresRowMap[eleitor.uid];
                const cellAddr = XLSX.utils.encode_cell({ r: anchorRow - 1, c: 5 });
                if (wsAtend[cellAddr]) {
                  wsAtend[cellAddr].l = {
                    Target: `#Eleitores!A${elRow}`,
                    Tooltip: `Voltar para ${eleitor.nome} na aba Eleitores`,
                  };
                }
              });

              // Hyperlinks na coluna 📎 → atendimentos do eleitor (cor azul)
              sortedData.forEach((eleitor, dataIdx) => {
                const atendRow = eleitorAtendRowMap[eleitor.uid];
                if (!atendRow) return;
                const cellAddr = XLSX.utils.encode_cell({ r: dataIdx + 1, c: 0 });
                if (ws[cellAddr]) {
                  ws[cellAddr].l = {
                    Target: `#Atendimentos!A${atendRow}`,
                    Tooltip: `Ver ${(atendimentosPorEleitorUid[eleitor.uid] || []).length} atendimento(s) de ${eleitor.nome}`,
                  };
                  ws[cellAddr].s = {
                    font: { color: { rgb: '0563C1' }, underline: true, bold: true },
                    alignment: { horizontal: 'center', vertical: 'center' },
                  };
                }
              });

              ws['!autofilter'] = {
                ref: XLSX.utils.encode_range(
                  { r: 0, c: 0 },
                  { r: exportData.length, c: headersWithCount.length - 1 }
                ),
              };
              // Freeze cabeçalho da aba Eleitores
              ws['!views'] = [{ state: 'frozen', ySplit: 1 }];

              const colWidths = headersWithCount.map((header, idx) => {
                if (idx === 0) return { wch: 8 };  // coluna indicadora ●
                if (idx === headersWithCount.length - 1) return { wch: 16 }; // Nº Atendimentos
                const dataHeader = header.replace('  →  clique para ver atendimentos', '');
                const maxLength = Math.max(
                  header.length,
                  ...exportData.map(row => String(row[dataHeader] || '').length)
                );
                return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
              });
              ws['!cols'] = colWidths;

              // Adiciona abas: Eleitores PRIMEIRO (aba ativa ao abrir), depois Atendimentos
              XLSX.utils.book_append_sheet(wb, ws, 'Eleitores');
              XLSX.utils.book_append_sheet(wb, wsAtend, 'Atendimentos');

              try {
                XLSX.writeFile(wb, `${fileName}.xlsx`);
              } catch (error) {
                console.error('Erro ao salvar arquivo XLSX:', error);
                throw new Error('Não foi possível salvar o arquivo XLSX.');
              }
            } catch (error) {
              console.error('Erro ao gerar XLSX:', error);
              throw new Error('Erro ao gerar arquivo XLSX');
            }
            break;
          }
          case 'pdf': {
            try {
              setLoadingMessage('Gerando arquivo PDF...');

              // Campos excluídos no PDF (não úteis em relatório impresso)
              const PDF_EXCLUDE = new Set(['latitude', 'longitude']);

              // Abreviações de header específicas do PDF
              const PDF_LABELS: Record<string, string> = {
                'Data de Nascimento': 'Nasc.',
                'Título de Eleitor':  'Título',
                'Nome da Mãe':        'Mãe',
                'Número':             'N°',
                'Complemento':        'Comp.',
                'Logradouro':         'Logr.',
                'Telefone':           'Tel.',
                'WhatsApp':           'WApp',
                'Gênero':             'Gên.',
                'Categoria':          'Cat.',
                'Responsável':        'Resp.',
                'Indicado por':       'Indicado',
                'Data de Cadastro':   'Cadastro',
                'Atendimentos':       'Atend.',
                'Seção':              'Seç.',
              };

              const pdfCampos = campos.filter(c => !PDF_EXCLUDE.has(c));

              const headers = pdfCampos.map(campo => {
                const field = allFields.find(f => f.id === campo);
                const label = field ? field.label : campo;
                return PDF_LABELS[label] ?? label;
              });

              const tableRows = exportData.map(row => {
                return pdfCampos.map(campo => {
                  const field = allFields.find(f => f.id === campo);
                  const label = field ? field.label : campo;
                  return String(row[label] ?? '');
                });
              });

              const nCols = headers.length;

              // Landscape a partir de 5 colunas para maximizar largura disponível
              const orientation = nCols > 4 ? 'landscape' : 'portrait';
              const format = nCols > 16 ? 'a3' : 'a4';
              const doc = new jsPDF({ orientation, unit: 'mm', format });

              const pageW  = doc.internal.pageSize.getWidth();
              const pageH  = doc.internal.pageSize.getHeight();
              const margin = 8;
              const availW = pageW - margin * 2; // largura útil

              // Font-size reduzido para caber mais conteúdo sem cortar
              const fontSize = nCols > 20 ? 4.5 : nCols > 14 ? 5 : nCols > 8 ? 5.5 : nCols > 4 ? 6 : 7;
              const cellPad = 1.5;

              // Estima largura natural de cada coluna (header + dados)
              const charW = fontSize * 0.52;
              const naturalW = headers.map((h, i) => {
                const maxData = tableRows.reduce((max, row) => {
                  const len = String(row[i] || '').length;
                  return len > max ? len : max;
                }, 0);
                const natural = Math.max(h.length, Math.min(maxData, 30)) * charW + cellPad * 2;
                return Math.max(natural, 10); // mínimo 10mm
              });

              const totalNatural = naturalW.reduce((a, b) => a + b, 0);
              const scale = totalNatural > availW ? availW / totalNatural : 1;

              const columnStyles: Record<number, { cellWidth: number; overflow: 'ellipsize' }> = {};
              headers.forEach((_, i) => {
                const w = naturalW[i] * scale;
                columnStyles[i] = {
                  cellWidth: Math.max(w, 10),
                  overflow: 'ellipsize',
                };
              });

              // ── Cabeçalho ────────────────────────────────────────────────
              doc.setFillColor(37, 99, 235);
              doc.rect(0, 0, pageW, 17, 'F');

              doc.setFont('helvetica', 'bold');
              doc.setFontSize(12);
              doc.setTextColor(255, 255, 255);
              doc.text('Relatório de Eleitores', margin, 10);

              doc.setFont('helvetica', 'normal');
              doc.setFontSize(8);
              doc.text(
                `${company.nome}  |  Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
                margin, 15
              );

              doc.setFontSize(8);
              doc.text(`Total: ${exportData.length} eleitor(es)`, pageW - margin, 10, { align: 'right' });

              // ── Tabela ────────────────────────────────────────────────────
              autoTable(doc, {
                head: [headers],
                body: tableRows,
                startY: 20,
                margin: { left: margin, right: margin },
                tableWidth: availW,
                styles: {
                  fontSize,
                  cellPadding: cellPad,
                  overflow: 'ellipsize',
                  textColor: [30, 30, 30],
                  valign: 'middle',
                  lineColor: [220, 220, 220],
                  lineWidth: 0.1,
                },
                headStyles: {
                  fillColor: [37, 99, 235],
                  textColor: [255, 255, 255],
                  fontStyle: 'bold',
                  fontSize: fontSize + 0.5,
                  cellPadding: cellPad,
                  overflow: 'ellipsize',
                  halign: 'center',
                },
                alternateRowStyles: {
                  fillColor: [239, 246, 255],
                },
                columnStyles,
                didDrawPage: (data: any) => {
                  const pageCount = (doc as any).internal.getNumberOfPages();
                  doc.setFontSize(7);
                  doc.setTextColor(150, 150, 150);
                  doc.text(
                    `Página ${data.pageNumber} de ${pageCount}  —  ${company.nome}`,
                    pageW / 2,
                    pageH - 4,
                    { align: 'center' }
                  );
                },
              });

              doc.save(`${fileName}.pdf`);
            } catch (error) {
              console.error('Erro ao gerar PDF:', error);
              throw new Error('Erro ao gerar arquivo PDF');
            }
            break;
          }
          default:
            throw new Error('Formato não suportado');
        }

        toast.success('Exportação concluída com sucesso!');
        onClose();
      } catch (error) {
        console.error('Erro ao gerar arquivo:', error);
        toast.error('Erro ao gerar arquivo de exportação');
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar eleitores. Tente novamente.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                Exportar Pessoas
              </Dialog.Title>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quantidade de eleitores */}
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-blue-400 mr-2" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {quantidadeExportar === 0 ? (
                  'Nenhum pessoa selecionada para exportação'
                ) : (
                  `${quantidadeExportar} eleitor${quantidadeExportar > 1 ? 'es' : ''} ${selectedIds.length > 0 ? 'selecionado' : 'encontrado'}${quantidadeExportar > 1 ? 's' : ''} para exportação`
                )}
              </span>
            </div>
          </div>

          {isLoading && (
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-600">{loadingMessage}</p>
              </div>
              <div className="mt-2">
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-2 bg-blue-600 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
            {/* Formato de exportação */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Formato de exportação</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSetFormato('xlsx')}
                  className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-colors ${
                    formato === 'xlsx'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-200'
                  }`}
                >
                  <Table className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">XLSX</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Planilha do Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetFormato('pdf')}
                  className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-colors ${
                    formato === 'pdf'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-200'
                  }`}
                >
                  <File className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">PDF</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Documento portátil</span>
                </button>
              </div>
            </div>

            {/* Campos para exportar */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Campos para exportar
                </h3>
                <div className="flex items-center gap-4">
                  {!isPdf && (
                    <button
                      onClick={() => {
                        if (campos.length === allFields.length) {
                          setCampos([]);
                        } else {
                          setCampos(allFields.map((f: { id: string }) => f.id));
                        }
                      }}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700"
                    >
                      {campos.length === allFields.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  )}
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {isPdf
                      ? <span className="text-orange-500 font-medium">{campos.length}/{PDF_MAX_COLS} colunas (limite PDF)</span>
                      : `${campos.length} de ${allFields.length} campos`
                    }
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {Object.entries(fieldGroups).map(([key, group]) => {
                  const GroupIcon = group.icon;
                  const fields = exportFields[key];
                  const selectedCount = fields.filter((f: { id: string }) => campos.includes(f.id)).length;
                  
                  return (
                    <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <GroupIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {group.label}
                          </span>
                        </div>
                        {!isPdf && (
                          <button
                            onClick={() => {
                              const groupFields = fields.map((f: { id: string }) => f.id);
                              if (selectedCount === fields.length) {
                                setCampos(prev => prev.filter(id => !groupFields.includes(id)));
                              } else {
                                setCampos(prev => [...new Set([...prev, ...groupFields])]);
                              }
                            }}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700"
                          >
                            {selectedCount === fields.length ? 'Desmarcar todos' : 'Selecionar todos'}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {fields.map((field) => (
                          <label
                            key={field.id}
                            className={`
                              flex items-center gap-2 p-2 rounded-lg
                              ${isPdf && !campos.includes(field.id) && campos.length >= PDF_MAX_COLS
                                ? 'opacity-40 cursor-not-allowed'
                                : 'cursor-pointer'
                              }
                              ${campos.includes(field.id)
                                ? 'bg-blue-50 dark:bg-blue-900/30'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                              }
                            `}
                          >
                            <input
                              type="checkbox"
                              checked={campos.includes(field.id)}
                              disabled={isPdf && !campos.includes(field.id) && campos.length >= PDF_MAX_COLS}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCampos(prev => [...prev, field.id]);
                                } else {
                                  setCampos(prev => prev.filter(id => id !== field.id));
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {field.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-200"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={campos.length === 0 || isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Exportando...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Exportar</span>
                </>
              )}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

<style>{`
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #666;
  }
`}</style>
