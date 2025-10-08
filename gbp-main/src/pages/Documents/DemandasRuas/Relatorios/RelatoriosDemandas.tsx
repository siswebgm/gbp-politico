import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { demandasRuasService } from '@/services/demandasRuasService';
import { useCompanyStore } from '@/store/useCompanyStore';
import { Button } from '@/components/ui/button';
import * as Tabs from '@/components/ui/tabs';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Definindo a interface para os dados do gráfico
interface DadosGrafico {
  totalDemandas: number;
  comDocumento: number;
  concluidas: {
    total: number;
    detalhes: Array<{
      uid: string;
      criado_em: string;
      demanda_concluida_data: string | null;
    }>;
  };
  porStatus: Record<string, number>;
  porTipoDemanda: Record<string, number>;
  porNivelUrgencia: Record<string, number>;
  porCidade: Record<string, number>;
  porBairro: Record<string, number>;
  porDocumentoProtocolado: Record<string, number>;
  porNivelFavorito: Record<string, number>;
  evolucaoMensal: Array<{
    mes: string;
    total: number;
  }>;
  [key: string]: unknown; // Índice de assinatura para propriedades adicionais
}
import { 
  ChevronLeft, 
  Loader2, 
  FileText, 
  FileCheck, 
  CheckCircle, 
  Clock,
  BarChart2,
  TrendingUp,
  MapPin,
  AlertCircle,
  Star,
  FileCheck2,
  Download,
  Calendar,
  Activity,
  XCircle,
  Hourglass,
  CheckCheck,
  Info,
  FileSpreadsheet
} from 'lucide-react';

// Componente de gráfico de barras
const BarChart = ({ 
  data, 
  title 
}: { 
  data: Record<string, number> | Array<{mes: string, total: number}>; 
  title: string 
}) => {
  // Normalizar os dados para garantir que estamos trabalhando com o formato correto
  const normalizedData = Array.isArray(data) 
    ? data.reduce((acc, item) => {
        acc[item.mes] = item.total;
        return acc;
      }, {} as Record<string, number>)
    : data || {};
  if (!normalizedData || Object.keys(normalizedData).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <BarChart2 className="w-12 h-12 text-gray-300 mb-2" />
        <p className="text-gray-500 text-sm">Sem dados disponíveis para o período selecionado</p>
      </div>
    );
  }

  const maxValue = Math.max(...Object.values(normalizedData));
  const entries = Object.entries(normalizedData);
  const total = Object.values(normalizedData).reduce((a, b) => a + b, 0);

  // Ordenar por valor (maior para menor)
  entries.sort((a, b) => b[1] - a[1]);

  // Cores para as barras
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-yellow-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-red-500',
  ];

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="space-y-4 flex-1 overflow-y-auto pr-2">
        {entries.map(([label, value], index) => {
          const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
          const color = colors[index % colors.length];
          
          return (
            <div key={label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700 capitalize truncate max-w-[150px]">
                  {label.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-900">{value}</span>
                  <span className="text-gray-500 w-10 text-right">{percentage}%</span>
                </div>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${color} rounded-full transition-all duration-700 ease-out`} 
                  style={{ 
                    width: `${percentage}%`,
                    transitionDelay: `${index * 100}ms`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {title && (
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Total</span>
            <span className="font-semibold">{total.toLocaleString('pt-BR')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function RelatoriosDemandas() {
  const navigate = useNavigate();
  const { company } = useCompanyStore();
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relatorio, setRelatorio] = useState<DadosGrafico | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 1)),
    to: endOfMonth(new Date()),
  });
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string | null>(null);

  // Função para definir períodos rápidos
  const setPeriodoRapido = (tipo: 'hoje' | 'semana' | 'mes' | 'trimestre' | 'ano') => {
    const hoje = new Date();
    let from: Date;
    let to: Date = new Date();

    switch (tipo) {
      case 'hoje':
        from = new Date(hoje.setHours(0, 0, 0, 0));
        to = new Date(hoje.setHours(23, 59, 59, 999));
        break;
      case 'semana':
        from = new Date(hoje);
        from.setDate(hoje.getDate() - hoje.getDay());
        from.setHours(0, 0, 0, 0);
        break;
      case 'mes':
        from = startOfMonth(hoje);
        to = endOfMonth(hoje);
        break;
      case 'trimestre':
        from = startOfMonth(subMonths(hoje, 3));
        to = endOfMonth(hoje);
        break;
      case 'ano':
        from = new Date(hoje.getFullYear(), 0, 1);
        to = new Date(hoje.getFullYear(), 11, 31);
        break;
      default:
        from = startOfMonth(subMonths(hoje, 1));
    }

    setDateRange({ from, to });
    setPeriodoSelecionado(tipo);
  };

  // Formatar o período para exibição
  const periodoFormatado = dateRange?.from && dateRange?.to
    ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
    : 'Período não definido';

  // Função para calcular porcentagem
  const calcularPorcentagem = (valor: number, total: number) => {
    return total > 0 ? Math.round((valor / total) * 100) : 0;
  };

  // Função para exportar PDF
  const exportarPDF = async () => {
    if (!relatorio) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Caixa de destaque para o nome da empresa
    doc.setFillColor(30, 64, 175); // Azul
    doc.rect(0, 0, pageWidth, 20, 'F'); // Retângulo preenchido no topo
    
    // Nome da Empresa em destaque
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255); // Branco
    doc.setFont('helvetica', 'bold');
    doc.text('GBP POLITICO', pageWidth / 2, 13, { align: 'center' });
    
    // Título
    yPos = 32;
    doc.setFontSize(18);
    doc.setTextColor(30, 64, 175);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Demandas das Ruas', pageWidth / 2, yPos, { align: 'center' });
    
    // Linha abaixo do título
    yPos += 3;
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.8);
    doc.line(20, yPos, pageWidth - 20, yPos);
    
    // Informações do período
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: ${periodoFormatado}`, 20, yPos);
    yPos += 5;
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, yPos);
    
    // Resumo Executivo
    yPos += 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text('Resumo Executivo', 20, yPos);
    yPos += 2;
    doc.setDrawColor(229, 231, 235);
    doc.line(20, yPos, pageWidth - 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    const resumoData = [
      ['Total de Demandas', relatorio.totalDemandas.toString()],
      ['Demandas Recebidas', `${relatorio.porStatus?.recebido || 0} (${calcularPorcentagem(relatorio.porStatus?.recebido || 0, relatorio.totalDemandas || 1)}%)`],
      ['Demandas Protocoladas', `${relatorio.porStatus?.protocolado || 0} (${calcularPorcentagem(relatorio.porStatus?.protocolado || 0, relatorio.totalDemandas || 1)}%)`],
      ['Demandas Concluídas', `${relatorio.concluidas?.total || 0} (${calcularPorcentagem(relatorio.concluidas?.total || 0, relatorio.totalDemandas || 1)}%)`],
      ['Em Andamento', `${(relatorio.totalDemandas || 0) - (relatorio.concluidas?.total || 0)} (${calcularPorcentagem((relatorio.totalDemandas || 0) - (relatorio.concluidas?.total || 0), relatorio.totalDemandas || 1)}%)`],
      ['Com Documento Protocolado', `${relatorio.comDocumento} (${calcularPorcentagem(relatorio.comDocumento || 0, relatorio.totalDemandas || 1)}%)`],
    ];

    (doc as any).autoTable({
      startY: yPos,
      head: [['Métrica', 'Valor']],
      body: resumoData,
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Distribuição por Status
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(55, 65, 81);
    doc.text('Distribuição por Status', 20, yPos);
    yPos += 2;
    doc.setDrawColor(229, 231, 235);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 8;

    const statusData = Object.entries(relatorio.porStatus || {}).map(([status, qtd]) => [
      status.replace(/_/g, ' ').toUpperCase(),
      qtd.toString(),
      `${calcularPorcentagem(qtd, relatorio.totalDemandas || 1)}%`
    ]);

    (doc as any).autoTable({
      startY: yPos,
      head: [['Status', 'Quantidade', 'Porcentagem']],
      body: statusData,
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175] },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Distribuição por Tipo de Demanda
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(55, 65, 81);
    doc.text('Distribuição por Tipo de Demanda', 20, yPos);
    yPos += 2;
    doc.setDrawColor(229, 231, 235);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 8;

    const tipoData = Object.entries(relatorio.porTipoDemanda || {}).map(([tipo, qtd]) => [
      tipo,
      qtd.toString(),
      `${calcularPorcentagem(qtd, relatorio.totalDemandas || 1)}%`
    ]);

    (doc as any).autoTable({
      startY: yPos,
      head: [['Tipo', 'Quantidade', 'Porcentagem']],
      body: tipoData,
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175] },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Distribuição por Nível de Urgência
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(55, 65, 81);
    doc.text('Distribuição por Nível de Urgência', 20, yPos);
    yPos += 2;
    doc.setDrawColor(229, 231, 235);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 8;

    const urgenciaData = Object.entries(relatorio.porNivelUrgencia || {}).map(([nivel, qtd]) => [
      nivel.toUpperCase(),
      qtd.toString(),
      `${calcularPorcentagem(qtd, relatorio.totalDemandas || 1)}%`
    ]);

    (doc as any).autoTable({
      startY: yPos,
      head: [['Urgência', 'Quantidade', 'Porcentagem']],
      body: urgenciaData,
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175] },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Distribuição por Cidade
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(55, 65, 81);
    doc.text('Distribuição por Cidade', 20, yPos);
    yPos += 2;
    doc.setDrawColor(229, 231, 235);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 8;

    const cidadeData = Object.entries(relatorio.porCidade || {}).map(([cidade, qtd]) => [
      cidade,
      qtd.toString(),
      `${calcularPorcentagem(qtd, relatorio.totalDemandas || 1)}%`
    ]);

    (doc as any).autoTable({
      startY: yPos,
      head: [['Cidade', 'Quantidade', 'Porcentagem']],
      body: cidadeData,
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175] },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Distribuição por Bairro
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(55, 65, 81);
    doc.text('Distribuição por Bairro', 20, yPos);
    yPos += 2;
    doc.setDrawColor(229, 231, 235);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 8;

    const bairroData = Object.entries(relatorio.porBairro || {}).map(([bairro, qtd]) => [
      bairro,
      qtd.toString(),
      `${calcularPorcentagem(qtd, relatorio.totalDemandas || 1)}%`
    ]);

    (doc as any).autoTable({
      startY: yPos,
      head: [['Bairro', 'Quantidade', 'Porcentagem']],
      body: bairroData,
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175] },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    });

    // Rodapé em todas as páginas
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `GBP Politico - Relatório gerado automaticamente - ${new Date().toLocaleString('pt-BR')}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageWidth - 20,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      );
    }

    // Salvar o PDF
    doc.save(`relatorio-demandas-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
  };

  // Função para exportar Excel
  const exportarExcel = () => {
    if (!relatorio) return;

    // Preparar dados para Excel
    const dados = [
      ['GBP Politico'],
      ['Relatório de Demandas das Ruas'],
      ['Período:', periodoFormatado],
      ['Gerado em:', new Date().toLocaleString('pt-BR')],
      [''],
      ['RESUMO GERAL'],
      ['Total de Demandas', relatorio.totalDemandas],
      ['Demandas Recebidas', relatorio.porStatus?.recebido || 0],
      ['Demandas Protocoladas', relatorio.porStatus?.protocolado || 0],
      ['Demandas Concluídas', relatorio.concluidas?.total || 0],
      ['Demandas em Andamento', (relatorio.totalDemandas || 0) - (relatorio.concluidas?.total || 0)],
      ['Com Documento Protocolado', relatorio.comDocumento],
      ['Taxa de Conclusão', `${calcularPorcentagem(relatorio.concluidas?.total || 0, relatorio.totalDemandas || 1)}%`],
      [''],
      ['DISTRIBUIÇÃO POR STATUS'],
      ['Status', 'Quantidade', 'Porcentagem'],
      ...Object.entries(relatorio.porStatus || {}).map(([status, qtd]) => [
        status.replace(/_/g, ' ').toUpperCase(),
        qtd,
        `${calcularPorcentagem(qtd, relatorio.totalDemandas || 1)}%`
      ]),
      [''],
      ['DISTRIBUIÇÃO POR TIPO DE DEMANDA'],
      ['Tipo', 'Quantidade', 'Porcentagem'],
      ...Object.entries(relatorio.porTipoDemanda || {}).map(([tipo, qtd]) => [
        tipo,
        qtd,
        `${calcularPorcentagem(qtd, relatorio.totalDemandas || 1)}%`
      ]),
      [''],
      ['DISTRIBUIÇÃO POR NÍVEL DE URGÊNCIA'],
      ['Urgência', 'Quantidade', 'Porcentagem'],
      ...Object.entries(relatorio.porNivelUrgencia || {}).map(([nivel, qtd]) => [
        nivel.toUpperCase(),
        qtd,
        `${calcularPorcentagem(qtd, relatorio.totalDemandas || 1)}%`
      ]),
      [''],
      ['DISTRIBUIÇÃO POR CIDADE'],
      ['Cidade', 'Quantidade', 'Porcentagem'],
      ...Object.entries(relatorio.porCidade || {}).map(([cidade, qtd]) => [
        cidade,
        qtd,
        `${calcularPorcentagem(qtd, relatorio.totalDemandas || 1)}%`
      ]),
      [''],
      ['DISTRIBUIÇÃO POR BAIRRO'],
      ['Bairro', 'Quantidade', 'Porcentagem'],
      ...Object.entries(relatorio.porBairro || {}).map(([bairro, qtd]) => [
        bairro,
        qtd,
        `${calcularPorcentagem(qtd, relatorio.totalDemandas || 1)}%`
      ]),
    ];

    // Converter para CSV
    const csv = dados.map(row => row.join('\t')).join('\n');
    
    // Criar blob e download
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-demandas-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Carregar dados do relatório
  const carregarRelatorio = async () => {
    if (!company?.uid) {
      setError('ID da empresa não encontrado');
      setLoading(false);
      return;
    }

    // Só seta loading se for o primeiro carregamento
    if (!relatorio) {
      setLoading(true);
    }
    setError(null);

    try {
      const dataInicio = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
      const dataFim = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

      const dados = await demandasRuasService.getRelatorioDemandas(
        company.uid,
        { inicio: dataInicio, fim: dataFim }
      );

      setRelatorio(dados as DadosGrafico);
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
      setError('Erro ao carregar os dados do relatório. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados iniciais e quando as datas forem alteradas
  useEffect(() => {
    const timer = setTimeout(() => {
      // Se for a primeira carga, usa o loading normal
      // Se for uma atualização, usa o updating
      if (relatorio) {
        setIsUpdating(true);
      }
      carregarRelatorio().finally(() => setIsUpdating(false));
    }, 300); // Debounce de 300ms
    
    return () => clearTimeout(timer);
  }, [JSON.stringify(dateRange), company?.uid]); // Usar JSON.stringify para comparar objetos

  // Exibir estado de carregamento
  if (loading && !relatorio) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-600 animate-spin" />
          <p className="text-gray-600">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  // Exibir mensagem de erro
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-sm">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar relatório</h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button 
            onClick={carregarRelatorio}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <div className="w-full py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden relative">
          {/* Overlay de carregamento sutil */}
          {isUpdating && (
            <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
              <div className="bg-blue-100 p-3 rounded-full shadow-lg">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
            </div>
          )}
          {/* Cabeçalho */}
          <div className="border-b border-gray-200 px-6 py-5">
            <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate(-1)}
                  className="text-gray-600 hover:bg-gray-100 p-2"
                  title="Voltar"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Relatórios de Demandas</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Dados consolidados das demandas por período
                  </p>
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline"
                    className="inline-flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={exportarPDF} className="cursor-pointer">
                    <Download className="w-4 h-4 mr-2 text-red-600" />
                    <span>Exportar PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportarExcel} className="cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                    <span>Exportar Excel</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Atalhos de Período */}
          <div className="px-3 sm:px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="flex flex-col gap-4">
              {/* Botões de Período Rápido */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Período rápido:</span>
                <div className="grid grid-cols-3 sm:flex gap-1.5 sm:gap-1.5">
                  <Button 
                    variant={periodoSelecionado === 'hoje' ? 'default' : 'outline'}
                    size="sm" 
                    onClick={() => setPeriodoRapido('hoje')}
                    className={`text-xs h-8 px-2 sm:px-3 ${
                      periodoSelecionado === 'hoje' 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                        : 'hover:bg-white'
                    }`}
                  >
                    Hoje
                  </Button>
                  <Button 
                    variant={periodoSelecionado === 'semana' ? 'default' : 'outline'}
                    size="sm" 
                    onClick={() => setPeriodoRapido('semana')}
                    className={`text-xs h-8 px-2 sm:px-3 ${
                      periodoSelecionado === 'semana' 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                        : 'hover:bg-white'
                    }`}
                  >
                    Semana
                  </Button>
                  <Button 
                    variant={periodoSelecionado === 'mes' ? 'default' : 'outline'}
                    size="sm" 
                    onClick={() => setPeriodoRapido('mes')}
                    className={`text-xs h-8 px-2 sm:px-3 ${
                      periodoSelecionado === 'mes' 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                        : 'hover:bg-white'
                    }`}
                  >
                    Mês
                  </Button>
                  <Button 
                    variant={periodoSelecionado === 'trimestre' ? 'default' : 'outline'}
                    size="sm" 
                    onClick={() => setPeriodoRapido('trimestre')}
                    className={`text-xs h-8 px-2 sm:px-3 ${
                      periodoSelecionado === 'trimestre' 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                        : 'hover:bg-white'
                    }`}
                  >
                    3 Meses
                  </Button>
                  <Button 
                    variant={periodoSelecionado === 'ano' ? 'default' : 'outline'}
                    size="sm" 
                    onClick={() => setPeriodoRapido('ano')}
                    className={`text-xs h-8 px-2 sm:px-3 col-span-2 sm:col-span-1 ${
                      periodoSelecionado === 'ano' 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                        : 'hover:bg-white'
                    }`}
                  >
                    Este Ano
                  </Button>
                </div>
              </div>

              {/* Separador horizontal */}
              <div className="h-px bg-gray-300"></div>

              {/* Campos de Data Manual */}
              <div className="flex flex-col gap-3">
                <span className="text-sm font-semibold text-gray-700">Ou selecione:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="absolute -top-2 left-2 text-[10px] text-gray-500 bg-gradient-to-r from-gray-50 to-gray-100 px-1 z-10">Data Inicial</label>
                    <input
                      type="date"
                      value={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        const newDate = e.target.value ? new Date(e.target.value) : undefined;
                        setDateRange({ from: newDate, to: dateRange?.to });
                        setPeriodoSelecionado(null);
                      }}
                      className="text-xs h-10 w-full px-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="relative">
                    <label className="absolute -top-2 left-2 text-[10px] text-gray-500 bg-gradient-to-r from-gray-50 to-gray-100 px-1 z-10">Data Final</label>
                    <input
                      type="date"
                      value={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        const newDate = e.target.value ? new Date(e.target.value) : undefined;
                        setDateRange({ from: dateRange?.from, to: newDate });
                        setPeriodoSelecionado(null);
                      }}
                      className="text-xs h-10 w-full px-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo Executivo */}
          <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Resumo Executivo
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Período: <span className="font-medium">{periodoFormatado}</span>
                </p>
              </div>
            </div>
            
            {/* Indicadores Principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Recebidas</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {relatorio?.porStatus?.recebido || 0}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {calcularPorcentagem(relatorio?.porStatus?.recebido || 0, relatorio?.totalDemandas || 1)}% do total
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm border border-yellow-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Protocoladas</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {relatorio?.porStatus?.protocolado || 0}
                    </p>
                  </div>
                  <FileCheck className="w-8 h-8 text-yellow-400" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {calcularPorcentagem(relatorio?.porStatus?.protocolado || 0, relatorio?.totalDemandas || 1)}% do total
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Concluídas</p>
                    <p className="text-2xl font-bold text-green-600">
                      {relatorio?.concluidas?.total || 0}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {calcularPorcentagem(relatorio?.concluidas?.total || 0, relatorio?.totalDemandas || 1)}% do total
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Em Andamento</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {(relatorio?.totalDemandas || 0) - (relatorio?.concluidas?.total || 0)}
                    </p>
                  </div>
                  <Hourglass className="w-8 h-8 text-amber-400" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {calcularPorcentagem((relatorio?.totalDemandas || 0) - (relatorio?.concluidas?.total || 0), relatorio?.totalDemandas || 1)}% do total
                </p>
              </div>
            </div>

            {/* Insights e Alertas */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Taxa de Conclusão */}
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                <div className="flex items-start gap-2">
                  <CheckCheck className="w-4 h-4 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-700">Taxa de Conclusão</p>
                    <p className="text-lg font-bold text-green-600">
                      {calcularPorcentagem(relatorio?.concluidas?.total || 0, relatorio?.totalDemandas || 1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {relatorio?.concluidas?.total || 0} de {relatorio?.totalDemandas || 0} demandas concluídas
                    </p>
                  </div>
                </div>
              </div>

              {/* Demandas com Documento */}
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                <div className="flex items-start gap-2">
                  <FileCheck2 className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-700">Com Documento Protocolado</p>
                    <p className="text-lg font-bold text-blue-600">
                      {calcularPorcentagem(relatorio?.comDocumento || 0, relatorio?.totalDemandas || 1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {relatorio?.comDocumento || 0} de {relatorio?.totalDemandas || 0} com documento anexado
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cards de Estatísticas Detalhadas */}
          <div className="px-6 py-5 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
              {/* Card Total de Demandas */}
              <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium text-blue-700">Total de Demandas</p>
                  <div className="p-2 rounded-lg bg-white shadow-sm border border-blue-50">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="mt-2 mb-3">
                  <p className="text-3xl font-bold text-gray-900">
                    {relatorio?.totalDemandas?.toLocaleString('pt-BR') || '0'}
                  </p>
                </div>
                <div className="mt-auto">
                  <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-full w-fit">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                    <span className="text-xs">Período: {periodoFormatado}</span>
                  </div>
                </div>
              </div>

              {/* Card Com Documento */}
              <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium text-green-700">Com Documento</p>
                  <div className="p-2 rounded-lg bg-white shadow-sm border border-green-50">
                    <FileCheck className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="mt-2 mb-3">
                  <p className="text-3xl font-bold text-gray-900">
                    {relatorio?.comDocumento?.toLocaleString('pt-BR') || '0'}
                  </p>
                </div>
                <div className="mt-auto">
                  <div className="flex items-center text-xs text-green-600 bg-green-50 px-2.5 py-1.5 rounded-full w-fit">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                    <span className="text-xs">{calcularPorcentagem(relatorio?.comDocumento || 0, relatorio?.totalDemandas || 1)}% do total</span>
                  </div>
                </div>
              </div>

              {/* Card Concluídas */}
              <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium text-purple-700">Concluídas</p>
                  <div className="p-2 rounded-lg bg-white shadow-sm border border-purple-50">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
                <div className="mt-2 mb-3">
                  <p className="text-3xl font-bold text-gray-900">
                    {relatorio?.concluidas?.total?.toLocaleString('pt-BR') || '0'}
                  </p>
                </div>
                <div className="mt-auto">
                  <div className="flex items-center text-xs text-purple-600 bg-purple-50 px-2.5 py-1.5 rounded-full w-fit">
                    <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                    <span className="text-xs">{calcularPorcentagem(relatorio?.concluidas?.total || 0, relatorio?.totalDemandas || 1)}% do total</span>
                  </div>
                </div>
              </div>

              {/* Card Em Andamento */}
              <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium text-amber-700">Em Andamento</p>
                  <div className="p-2 rounded-lg bg-white shadow-sm border border-amber-50">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <div className="mt-2 mb-3">
                  <p className="text-3xl font-bold text-gray-900">
                    {relatorio?.totalDemandas ? (relatorio.totalDemandas - (relatorio.concluidas?.total || 0)).toLocaleString('pt-BR') : '0'}
                  </p>
                </div>
                <div className="mt-auto">
                  <div className="flex items-center text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-full w-fit">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                    <span className="text-xs">
                      {relatorio?.totalDemandas ? calcularPorcentagem(relatorio.totalDemandas - (relatorio.concluidas?.total || 0), relatorio.totalDemandas) : '0'}% do total
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Título da seção de visualização */}
          <div className="px-6 py-5 border-t border-gray-200 w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Visualização dos Dados</h3>
          </div>

          {/* Tabs de visualização */}
          <div className="px-6 pb-6">
            <Tabs.Tabs defaultValue="status" className="w-full">
              <div className="border-b border-gray-200 overflow-x-auto">
                <Tabs.TabsList className="inline-flex space-x-1 rounded-md bg-gray-100 p-1">
                  <Tabs.TabsTrigger 
                    value="status" 
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600"
                  >
                    <BarChart2 className="w-4 h-4 mr-2" />
                    Por Status
                  </Tabs.TabsTrigger>
                  <Tabs.TabsTrigger 
                    value="tipo" 
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Por Tipo
                  </Tabs.TabsTrigger>
                  <Tabs.TabsTrigger 
                    value="urgencia" 
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Por Urgência
                  </Tabs.TabsTrigger>
                  <Tabs.TabsTrigger 
                    value="cidade" 
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Por Cidade
                  </Tabs.TabsTrigger>
                  <Tabs.TabsTrigger 
                    value="bairro" 
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Por Bairro
                  </Tabs.TabsTrigger>
                  <Tabs.TabsTrigger 
                    value="documento" 
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600"
                  >
                    <FileCheck2 className="w-4 h-4 mr-2" />
                    Por Documento
                  </Tabs.TabsTrigger>
                  <Tabs.TabsTrigger 
                    value="favorito" 
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Por Favorito
                  </Tabs.TabsTrigger>
                  <Tabs.TabsTrigger 
                    value="evolucao" 
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Evolução Mensal
                  </Tabs.TabsTrigger>
                </Tabs.TabsList>
              </div>

              <div className="mt-6">
                <Tabs.TabsContent value="status" className="mt-0">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Distribuição por Status</h3>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Total: {relatorio?.totalDemandas?.toLocaleString('pt-BR') || '0'}
                        </span>
                      </div>
                    </div>
                    <div className="h-64">
                      <BarChart 
                        data={relatorio?.porStatus || {}}
                        title="Distribuição por Status"
                      />
                    </div>
                  </div>
                </Tabs.TabsContent>

                <Tabs.TabsContent value="tipo" className="mt-0">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Distribuição por Tipo de Demanda</h3>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Total: {relatorio?.totalDemandas?.toLocaleString('pt-BR') || '0'}
                        </span>
                      </div>
                    </div>
                    <div className="h-64">
                      <BarChart 
                        data={relatorio?.porTipoDemanda || {}}
                        title="Distribuição por Tipo de Demanda"
                      />
                    </div>
                  </div>
                </Tabs.TabsContent>

                <Tabs.TabsContent value="urgencia" className="mt-0">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Distribuição por Nível de Urgência</h3>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Total: {relatorio?.totalDemandas?.toLocaleString('pt-BR') || '0'}
                        </span>
                      </div>
                    </div>
                    <div className="h-64">
                      <BarChart 
                        data={relatorio?.porNivelUrgencia || {}}
                        title="Distribuição por Nível de Urgência"
                      />
                    </div>
                  </div>
                </Tabs.TabsContent>

                <Tabs.TabsContent value="cidade" className="mt-0">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Distribuição por Cidade</h3>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Total: {relatorio?.totalDemandas?.toLocaleString('pt-BR') || '0'}
                        </span>
                      </div>
                    </div>
                    <div className="h-64">
                      <BarChart 
                        data={relatorio?.porCidade || {}}
                        title="Distribuição por Cidade"
                      />
                    </div>
                  </div>
                </Tabs.TabsContent>

                <Tabs.TabsContent value="bairro" className="mt-0">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Distribuição por Bairro</h3>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Total: {relatorio?.totalDemandas?.toLocaleString('pt-BR') || '0'}
                        </span>
                      </div>
                    </div>
                    <div className="h-64">
                      <BarChart 
                        data={relatorio?.porBairro || {}}
                        title="Distribuição por Bairro"
                      />
                    </div>
                  </div>
                </Tabs.TabsContent>

                <Tabs.TabsContent value="documento" className="mt-0">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Distribuição por Documento Protocolado</h3>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Total: {relatorio?.totalDemandas?.toLocaleString('pt-BR') || '0'}
                        </span>
                      </div>
                    </div>
                    <div className="h-64">
                      <BarChart 
                        data={relatorio?.porDocumentoProtocolado || {}}
                        title="Distribuição por Documento Protocolado"
                      />
                    </div>
                  </div>
                </Tabs.TabsContent>

                <Tabs.TabsContent value="favorito" className="mt-0">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Distribuição por Nível de Favorito</h3>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Total: {relatorio?.totalDemandas?.toLocaleString('pt-BR') || '0'}
                        </span>
                      </div>
                    </div>
                    <div className="h-64">
                      <BarChart 
                        data={relatorio?.porNivelFavorito || {}}
                        title="Distribuição por Nível de Favorito"
                      />
                    </div>
                  </div>
                </Tabs.TabsContent>

                <Tabs.TabsContent value="evolucao" className="mt-0">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Evolução Mensal</h3>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Período: {periodoFormatado}
                        </span>
                      </div>
                    </div>
                    <div className="h-64">
                      <BarChart
                        data={relatorio?.evolucaoMensal || []}
                        title="Evolução Mensal"
                      />
                    </div>
                  </div>
                </Tabs.TabsContent>
              </div>
            </Tabs.Tabs>
          </div>

          {/* Legenda e Informações */}
          <div className="px-6 py-5 border-t border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Legenda de Status */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  Legenda de Status
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="font-medium">Recebido:</span>
                    <span className="text-gray-600">Demanda registrada no sistema</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                    <span className="font-medium">Feito Ofício:</span>
                    <span className="text-gray-600">Ofício elaborado e pronto</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="font-medium">Protocolado:</span>
                    <span className="text-gray-600">Documento protocolado no órgão</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <span className="font-medium">Aguardando:</span>
                    <span className="text-gray-600">Aguardando resposta do órgão</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="font-medium">Concluído:</span>
                    <span className="text-gray-600">Demanda finalizada com sucesso</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="font-medium">Cancelado:</span>
                    <span className="text-gray-600">Demanda cancelada</span>
                  </div>
                </div>
              </div>

              {/* Informações Úteis */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  Informações Úteis
                </h4>
                <div className="space-y-2 text-xs text-gray-600">
                  <p>
                    <span className="font-medium text-gray-900">• Período Analisado:</span> {periodoFormatado}
                  </p>
                  <p>
                    <span className="font-medium text-gray-900">• Total de Demandas:</span> {relatorio?.totalDemandas || 0} registros
                  </p>
                  <p>
                    <span className="font-medium text-gray-900">• Taxa de Conclusão:</span> {calcularPorcentagem(relatorio?.concluidas?.total || 0, relatorio?.totalDemandas || 1)}% das demandas foram concluídas
                  </p>
                  <p>
                    <span className="font-medium text-gray-900">• Documentação:</span> {calcularPorcentagem(relatorio?.comDocumento || 0, relatorio?.totalDemandas || 1)}% possuem documento protocolado
                  </p>
                  <p className="mt-3 pt-3 border-t border-gray-200">
                    <span className="font-medium text-gray-900">💡 Dica:</span> Use os filtros de período rápido para análises específicas. Clique em "Exportar" para gerar um relatório imprimível.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé com Timestamp */}
          <div className="px-6 py-3 bg-gray-100 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Relatório gerado em {new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} • 
              Dados atualizados em tempo real
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

