import { useEffect, useState, useRef, useCallback } from 'react';
import { supabaseClient } from '../../lib/supabase';
import { Card } from '../../components/Card';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useCategories } from '../../hooks/useCategories';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { Input } from '../../components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Label } from '../../components/ui/label';
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Filter, 
  Calendar, 
  MapPin, 
  AlertTriangle, 
  Download, 
  FileSpreadsheet, 
  Send,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  TrendingUp,
  BarChart3,
  ArrowLeft,
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  RefreshCw
} from 'lucide-react';
import { utils as XLSXUtils, write as XLSXWrite } from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Helper para adicionar scroll horizontal com touch
const setupHorizontalScroll = (el: HTMLDivElement | null) => {
  if (!el) return;
  
  el.style.cssText = 'overflow-x: scroll; overflow-y: visible; -webkit-overflow-scrolling: touch; width: 100%; position: relative;';
  
  let startX = 0;
  let startY = 0;
  let scrollLeft = 0;
  let isHorizontalScroll = false;
  
  el.addEventListener('touchstart', (e) => {
    startX = e.touches[0].pageX - el.offsetLeft;
    startY = e.touches[0].pageY;
    scrollLeft = el.scrollLeft;
    isHorizontalScroll = false;
  });
  
  el.addEventListener('touchmove', (e) => {
    const x = e.touches[0].pageX - el.offsetLeft;
    const y = e.touches[0].pageY;
    const deltaX = Math.abs(x - startX);
    const deltaY = Math.abs(y - startY);
    
    if (!isHorizontalScroll && deltaX < 10 && deltaY < 10) {
      return;
    }
    
    if (!isHorizontalScroll) {
      isHorizontalScroll = deltaX > deltaY;
    }
    
    if (isHorizontalScroll) {
      e.preventDefault();
      const walk = (x - startX) * 2;
      el.scrollLeft = scrollLeft - walk;
    }
  }, { passive: false });
};

// Interface para a tabela gbp_disparo
interface Disparo {
  uid: string;
  disparo_id: number;
  created_at: string;
  empresa_uid: string;
  empresa_nome: string;
  usuario_nome: string;
  mensagem: string;
  categoria?: string[];
  cidade?: string[];
  bairro?: string[];
  genero?: string;
  qtde?: number;
  upload?: string[];
  andamento?: string;
  expires_at?: string;
  archived?: boolean;
  cancelar_disparo?: boolean;
}

// Interface para a tabela gbp_relatorio_disparo
interface RelatorioItem {
  uid: string;
  created_at: string;
  cidade: string;
  bairro: string;
  uf: string;
  categoria: string;
  empresa_uid: string;
  genero: string;
  enviada: boolean;
  perdida: string;
  whatsapp: string;
  eleitor_nome: string;
  disparo_uid: string;
  tipo: string;
}

// Grupo de disparo com estatísticas
interface DisparoGroup {
  disparo: Disparo;
  relatorios: RelatorioItem[];
  stats: {
    total: number;
    enviadas: number;
    perdidas: number;
    taxaSucesso: number;
  };
  expanded: boolean;
}

export function RelatorioDisparo() {
  console.log('🎨 RelatorioDisparo renderizou');
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const [disparosAgrupados, setDisparosAgrupados] = useState<DisparoGroup[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Verificar permissão de acesso
  const canAccess = user?.nivel_acesso === 'admin' || user?.nivel_acesso === 'coordenador';
  
  useEffect(() => {
    // Só verificar se user já foi carregado e tem nivel_acesso definido
    if (user?.nivel_acesso && user.nivel_acesso !== 'admin' && user.nivel_acesso !== 'coordenador') {
      navigate('/app');
    }
  }, [user?.nivel_acesso, navigate]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<{[key: string]: boolean}>({});
  const itemsPerPage = 10;
  const company = useCompanyStore((state) => state.company);
  const companyUid = company?.uid; // Extrair apenas o uid para evitar re-renders
  const { data: categorias } = useCategories();
  const [dataFiltro, setDataFiltro] = useState('');
  const [datasDisponiveis, setDatasDisponiveis] = useState<string[]>([]);
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [mensagensExpandidas, setMensagensExpandidas] = useState<{[key: string]: boolean}>({});
  const [modalCancelar, setModalCancelar] = useState<{ aberto: boolean; disparoUid: string | null }>({ aberto: false, disparoUid: null });
  const [paginasRelatorio, setPaginasRelatorio] = useState<{[key: string]: number}>({});
  const [ordenacaoRelatorio, setOrdenacaoRelatorio] = useState<{[key: string]: { campo: string; direcao: 'asc' | 'desc' }}>({});
  const relatoriosPerPage = 20;
  
  // Buscar datas únicas de disparos
  const fetchDatasDisponiveis = useCallback(async () => {
    if (!companyUid) return;

    try {
      const { data, error } = await supabaseClient
        .from('gbp_disparo')
        .select('created_at')
        .eq('empresa_uid', companyUid)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Extrair apenas as datas únicas (sem hora) - ajustando para timezone de Brasília
      const datasUnicas = [...new Set(
        data?.map(item => {
          // Criar data e ajustar para timezone de Brasília (UTC-3)
          const date = new Date(item.created_at);
          // Converter para string de data no formato yyyy-MM-dd considerando timezone local
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }) || []
      )];

      setDatasDisponiveis(datasUnicas);
    } catch (error) {
      console.error('Erro ao buscar datas disponíveis:', error);
    }
  }, [companyUid]);

  const fetchDisparos = useCallback(async () => {
    if (!companyUid) return;

    try {
      setLoading(true);
      
      // Buscar disparos (apenas ativos - não arquivados/expirados)
      let queryDisparos = supabaseClient
        .from('gbp_disparo')
        .select('*', { count: 'exact' })
        .eq('empresa_uid', companyUid)
        .eq('archived', false); // Só mostra disparos não arquivados

      // Filtrar disparos expirados
      const dataAtual = new Date().toISOString();
      queryDisparos = queryDisparos.or(`expires_at.is.null,expires_at.gt.${dataAtual}`);

      // Filtro por data específica (considerando timezone de Brasília)
      if (dataFiltro) {
        // Criar intervalo de data completo (início e fim do dia)
        const dataInicio = `${dataFiltro}T00:00:00`;
        const dataFim = `${dataFiltro}T23:59:59`;
        
        queryDisparos = queryDisparos
          .gte('created_at', dataInicio)
          .lte('created_at', dataFim);
      }

      // Paginação
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data: disparos, error: errorDisparos, count } = await queryDisparos
        .order('created_at', { ascending: false })
        .range(from, to);

      if (errorDisparos) throw errorDisparos;

      // Para cada disparo, buscar seus relatórios
      const disparosComRelatorios = await Promise.all(
        (disparos || []).map(async (disparo) => {
          const { data: relatorios, error: errorRelatorios } = await supabaseClient
            .from('gbp_relatorio_disparo')
            .select('*')
            .eq('disparo_uid', disparo.uid);

          if (errorRelatorios) {
            console.error('Erro ao buscar relatórios do disparo:', errorRelatorios);
            return null;
          }

          // Calcular estatísticas - AGRUPANDO POR CONTATO ÚNICO
          // Agrupar por whatsapp + nome para contar contatos únicos
          const contatosUnicos = new Map<string, {
            whatsapp: string;
            nome: string;
            mensagensRecebidas: number;
            perdida: boolean;
          }>();
          
          relatorios?.forEach(r => {
            const chave = `${r.whatsapp}_${r.eleitor_nome}`;
            const existente = contatosUnicos.get(chave);
            
            if (existente) {
              // Incrementar contador de mensagens
              existente.mensagensRecebidas++;
              // Se alguma foi perdida, marcar como perdida
              if (r.perdida === 'SIM') {
                existente.perdida = true;
              }
            } else {
              // Adicionar novo contato
              contatosUnicos.set(chave, {
                whatsapp: r.whatsapp,
                nome: r.eleitor_nome,
                mensagensRecebidas: 1,
                perdida: r.perdida === 'SIM'
              });
            }
          });
          
          // Calcular estatísticas baseadas em contatos únicos
          const total = contatosUnicos.size;
          const perdidas = Array.from(contatosUnicos.values()).filter(c => c.perdida).length;
          const enviadas = total - perdidas;
          const taxaSucesso = total > 0 ? ((enviadas / total) * 100) : 0;

          return {
            disparo,
            relatorios: relatorios || [],
            stats: {
              total,
              enviadas,
              perdidas,
              taxaSucesso: Math.round(taxaSucesso * 10) / 10
            },
            expanded: expandedGroups[disparo.uid] || false
          };
        })
      );

      // Filtrar nulls
      const disparosValidos = disparosComRelatorios.filter(d => d !== null) as DisparoGroup[];

      setDisparosAgrupados(disparosValidos);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Erro ao buscar disparos:', error);
    } finally {
      setLoading(false);
    }
  }, [companyUid, page, dataFiltro, itemsPerPage]);

  const exportToPDF = (grupo: DisparoGroup) => {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('GBP Político', 14, 20);
    
    doc.setFontSize(14);
    doc.text('Relatório de Disparo', 14, 30);
    
    // Informações do Disparo
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const dataDisparo = format(new Date(grupo.disparo.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    doc.text(`Data do Disparo: ${dataDisparo}`, 14, 40);
    doc.text(`Usuário: ${grupo.disparo.usuario_nome || 'Não informado'}`, 14, 46);
    doc.text(`Status: ${grupo.disparo.andamento || 'Iniciado'}`, 14, 52);
    doc.text(`Gênero: ${grupo.disparo.genero || 'Todos'}`, 14, 58);
    
    // Estatísticas
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Estatísticas:', 14, 68);
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total: ${grupo.stats.total}`, 14, 76);
    doc.text(`Enviadas: ${grupo.stats.enviadas}`, 14, 82);
    doc.text(`Perdidas: ${grupo.stats.perdidas}`, 14, 88);
    doc.text(`Taxa de Sucesso: ${grupo.stats.taxaSucesso}%`, 14, 94);
    
    // Mensagem
    if (grupo.disparo.mensagem) {
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text('Mensagem:', 14, 104);
      
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const mensagemLinhas = doc.splitTextToSize(grupo.disparo.mensagem, 180);
      doc.text(mensagemLinhas, 14, 112);
    }
    
    // Tabela de relatórios - AGRUPAR POR CONTATO ÚNICO
    if (grupo.relatorios && grupo.relatorios.length > 0) {
      // Agrupar por contato único
      const contatosAgrupados = new Map<string, { nome: string; whatsapp: string; cidade: string; mensagens: number; perdida: boolean }>();
      
      grupo.relatorios.forEach(rel => {
        const chave = `${rel.whatsapp}_${rel.eleitor_nome}`;
        const existente = contatosAgrupados.get(chave);
        
        if (existente) {
          existente.mensagens++;
          if (rel.perdida === 'SIM') existente.perdida = true;
        } else {
          contatosAgrupados.set(chave, {
            nome: rel.eleitor_nome || 'N/A',
            whatsapp: rel.whatsapp || 'N/A',
            cidade: rel.cidade || 'N/A',
            mensagens: 1,
            perdida: rel.perdida === 'SIM'
          });
        }
      });
      
      const tableData = Array.from(contatosAgrupados.values()).map(contato => [
        contato.nome,
        contato.whatsapp,
        contato.cidade,
        `${contato.mensagens}x`,
        contato.perdida ? 'Perdida' : 'Enviada'
      ]);
      
      (doc as any).autoTable({
        startY: grupo.disparo.mensagem ? 135 : 105,
        head: [['Eleitor', 'WhatsApp', 'Cidade', 'Msgs', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
        styles: { fontSize: 8 },
        margin: { top: 10 }
      });
    }
    
    // Salvar PDF
    const dataArquivo = format(new Date(grupo.disparo.created_at), 'dd-MM-yyyy_HH-mm');
    doc.save(`Relatorio_Disparo_${dataArquivo}.pdf`);
  };

  const exportToExcel = (grupo: DisparoGroup) => {
    const headers = [
      'Data do Disparo',
      'Usuário',
      'Nome do Eleitor',
      'WhatsApp',
      'Cidade',
      'Bairro',
      'Mensagens Recebidas',
      'Status',
    ];

    // Agrupar por contato único
    const contatosAgrupados = new Map<string, { nome: string; whatsapp: string; cidade: string; bairro: string; mensagens: number; perdida: boolean }>();
    
    grupo.relatorios.forEach(rel => {
      const chave = `${rel.whatsapp}_${rel.eleitor_nome}`;
      const existente = contatosAgrupados.get(chave);
      
      if (existente) {
        existente.mensagens++;
        if (rel.perdida === 'SIM') existente.perdida = true;
      } else {
        contatosAgrupados.set(chave, {
          nome: rel.eleitor_nome || 'N/A',
          whatsapp: rel.whatsapp || 'N/A',
          cidade: rel.cidade || 'N/A',
          bairro: rel.bairro || 'N/A',
          mensagens: 1,
          perdida: rel.perdida === 'SIM'
        });
      }
    });

    const data = Array.from(contatosAgrupados.values()).map(contato => ({
      'Data do Disparo': format(new Date(grupo.disparo.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      'Usuário': grupo.disparo.usuario_nome || 'Não informado',
      'Nome do Eleitor': contato.nome,
      'WhatsApp': contato.whatsapp,
      'Cidade': contato.cidade,
      'Bairro': contato.bairro,
      'Mensagens Recebidas': contato.mensagens,
      'Status': contato.perdida ? 'Perdida' : 'Enviada',
    }));

    const ws = XLSXUtils.aoa_to_sheet([headers, ...data]);
    const wb = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(wb, ws, 'Relatório');

    // Gerar o arquivo Excel
    const excelBuffer = XLSXWrite(wb, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Download do arquivo
    const fileName = `disparo_${grupo.disparo.disparo_id}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleExpand = (uid: string) => {
    const isCurrentlyExpanded = expandedGroups[uid];
    
    setExpandedGroups(prev => ({
      ...prev,
      [uid]: !prev[uid]
    }));
    
    // Se está expandindo (não estava expandido antes), fazer scroll
    if (!isCurrentlyExpanded) {
      // Usar setTimeout para garantir que o conteúdo foi renderizado
      setTimeout(() => {
        const element = document.getElementById(`disparo-${uid}`);
        if (element) {
          // Scroll para a tabela expandida dentro do card
          const tableElement = element.querySelector('.overflow-x-auto');
          if (tableElement) {
            tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 300);
    }
  };

  useEffect(() => {
    console.log('🔄 Executando fetchDatasDisponiveis');
    fetchDatasDisponiveis();
  }, [fetchDatasDisponiveis]);

  useEffect(() => {
    console.log('🔄 Executando fetchDisparos');
    fetchDisparos();
  }, [fetchDisparos]);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      if (menuAberto) setMenuAberto(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuAberto]);

  const getCategoriaName = (categoriaId: string) => {
    return categorias?.find(cat => cat.uid === categoriaId)?.nome || 'N/A';
  };

  const formatarNumero = (numero: number): string => {
    return numero.toLocaleString('pt-BR');
  };

  const cancelarDisparo = async (disparoUid: string) => {
    try {
      const { error } = await supabaseClient
        .from('gbp_disparo')
        .update({ cancelar_disparo: true })
        .eq('uid', disparoUid);

      if (error) throw error;

      // Atualizar o estado local
      setDisparosAgrupados(prev => prev.map(grupo => 
        grupo.disparo.uid === disparoUid 
          ? { ...grupo, disparo: { ...grupo.disparo, cancelar_disparo: true } }
          : grupo
      ));

      // Fechar modal
      setModalCancelar({ aberto: false, disparoUid: null });
      
      alert('Disparo cancelado com sucesso!');
    } catch (error) {
      console.error('Erro ao cancelar disparo:', error);
      alert('Erro ao cancelar disparo. Tente novamente.');
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Calcular estatísticas gerais
  const statsGerais = disparosAgrupados.reduce((acc, grupo) => {
    return {
      totalDisparos: acc.totalDisparos + 1,
      totalEnvios: acc.totalEnvios + grupo.stats.total,
      totalEnviadas: acc.totalEnviadas + grupo.stats.enviadas,
      totalPerdidas: acc.totalPerdidas + grupo.stats.perdidas
    };
  }, { totalDisparos: 0, totalEnvios: 0, totalEnviadas: 0, totalPerdidas: 0 });

  const taxaSucessoGeral = statsGerais.totalEnvios > 0 
    ? Math.round((statsGerais.totalEnviadas / statsGerais.totalEnvios) * 100) 
    : 0;

  // Bloquear acesso se não tiver permissão
  if (!canAccess) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">Você não tem permissão para acessar esta página.</p>
          <p className="text-sm text-gray-500">Apenas usuários com nível de acesso Admin ou Coordenador podem visualizar os relatórios.</p>
        </div>
      </div>
    );
  }
  
  if (loading && !disparosAgrupados.length) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 min-h-screen">
        <div className="w-full">
          {/* Cabeçalho */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                {/* Botão Voltar */}
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center justify-center hover:opacity-70 transition-opacity"
                  title="Voltar"
                >
                  <ArrowLeft className="h-6 w-6 text-gray-700" />
                </button>
                
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Relatórios de Disparo</h1>
                  <p className="mt-1 text-xs sm:text-sm text-gray-500">Acompanhe o desempenho das campanhas</p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setPage(1);
                  fetchDisparos();
                  fetchDatasDisponiveis();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                title="Atualizar relatórios"
                disabled={loading}
              >
                <RefreshCw className={`h-5 w-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

          {/* Cartões de Estatísticas */}
          <div className="flex flex-wrap gap-4 mt-6">
            <Card className="flex-1 min-w-[200px] bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total de Campanhas</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">{formatarNumero(statsGerais.totalDisparos)}</p>
                  </div>
                  <BarChart3 className="h-10 w-10 text-blue-500 opacity-80" />
                </div>
              </div>
            </Card>

            <Card className="flex-1 min-w-[200px] bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Total de Envios</p>
                    <p className="text-3xl font-bold text-purple-900 mt-2">{formatarNumero(statsGerais.totalEnvios)}</p>
                  </div>
                  <Users className="h-10 w-10 text-purple-500 opacity-80" />
                </div>
              </div>
            </Card>

            <Card className="flex-1 min-w-[200px] bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Enviadas com Sucesso</p>
                    <p className="text-3xl font-bold text-green-900 mt-2">{formatarNumero(statsGerais.totalEnviadas)}</p>
                  </div>
                  <CheckCircle2 className="h-10 w-10 text-green-500 opacity-80" />
                </div>
              </div>
            </Card>

            <Card className="flex-1 min-w-[200px] bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-600">Taxa de Sucesso</p>
                    <p className="text-3xl font-bold text-amber-900 mt-2">{taxaSucessoGeral}%</p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-amber-500 opacity-80" />
                </div>
              </div>
            </Card>
          </div>

          {/* Banner Informativo de Disponibilidade */}
          <div className="mt-6 mb-6 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 shadow-sm">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">
                  Disponibilidade dos Relatórios
                </h3>
                <p className="text-sm text-blue-800">
                  Os relatórios de campanhas ficam disponíveis por <strong>15 dias</strong> após a criação. 
                  Após este período, serão automaticamente arquivados.
                </p>
              </div>
            </div>
          </div>
          </div>

          {/* Seção de Filtros */}
          <Card className="mb-6">
            <div className="p-3 sm:p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-400" />
                  <h2 className="text-base sm:text-lg font-medium text-gray-900">Filtros</h2>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  {/* Data do Disparo - Dropdown */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                    <Label className="flex items-center gap-2 text-gray-700 text-sm sm:text-base">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Data Início</span>
                    </Label>
                    <Select
                      value={dataFiltro || 'todos'}
                      onValueChange={(value) => {
                        if (value === 'todos') {
                          setDataFiltro('');
                        } else {
                          setDataFiltro(value);
                        }
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[200px] focus:ring-2 focus:ring-blue-500">
                        <SelectValue placeholder="Selecione a data" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os disparos</SelectItem>
                        {datasDisponiveis.map((data) => {
                          // Criar data local sem conversão de timezone
                          const [ano, mes, dia] = data.split('-');
                          const dataLocal = new Date(Number(ano), Number(mes) - 1, Number(dia));
                          
                          return (
                            <SelectItem key={data} value={data}>
                              {format(dataLocal, "dd/MM/yyyy", { locale: ptBR })}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Botão Limpar */}
                  {dataFiltro && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDataFiltro('');
                        setPage(1);
                      }}
                      className="hover:bg-gray-50 w-full sm:w-auto text-sm sm:text-base"
                    >
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Lista de Disparos */}
          <div className="space-y-4">
            {disparosAgrupados.length === 0 ? (
              <Card className="p-12 text-center">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum disparo encontrado</h3>
                <p className="text-gray-500">Não há disparos para os filtros selecionados.</p>
              </Card>
            ) : (
              disparosAgrupados.map((grupo) => (
              <Card key={grupo.disparo.uid} id={`disparo-${grupo.disparo.uid}`} className="overflow-hidden hover:shadow-lg transition-all border-2 border-gray-200 bg-gray-50">
                {/* Cabeçalho do Disparo */}
                <div 
                  className="p-3 sm:p-4 md:p-6 cursor-pointer transition-colors hover:bg-gray-100/50"
                  onClick={() => toggleExpand(grupo.disparo.uid)}
                >
                  <div className="bg-white rounded-lg p-3 sm:p-4 md:p-6 shadow-sm border border-gray-100">
                    {/* Título e Status */}
                    <div className="flex items-center gap-3 mb-4">
                      <ChevronRight
                        className={`h-5 w-5 sm:h-6 sm:w-6 text-gray-400 transition-transform flex-shrink-0 ${
                          expandedGroups[grupo.disparo.uid] ? 'transform rotate-90' : ''
                        }`}
                      />
                      <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-700 flex-1">
                        <span className="text-gray-500 font-normal">Disparo</span>{' '}
                        <span className="text-blue-600 font-bold">
                          {format(new Date(grupo.disparo.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </span>
                      </h3>
                      {grupo.disparo.cancelar_disparo ? (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-bold shadow-md bg-red-500 text-white">
                          Cancelado
                        </span>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-md ${
                          grupo.disparo.andamento === 'Finalizado' 
                            ? 'bg-green-500 text-white' 
                            : grupo.disparo.andamento === 'Em andamento'
                            ? 'bg-blue-500 text-white'
                            : 'bg-yellow-500 text-white'
                        }`}>
                          {grupo.disparo.andamento || 'Iniciado'}
                        </span>
                      )}
                    </div>

                    {/* Estatísticas do Disparo com Menu de Exportação */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 flex-1">
                        <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 text-center">
                          <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatarNumero(grupo.stats.total)}</p>
                          <p className="text-xs text-gray-500 mt-1">Total</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 text-center">
                          <p className="text-xl sm:text-2xl font-bold text-green-600">{formatarNumero(grupo.stats.enviadas)}</p>
                          <p className="text-xs text-gray-500 mt-1">Enviadas</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 text-center">
                          <p className="text-xl sm:text-2xl font-bold text-red-600">{formatarNumero(grupo.stats.perdidas)}</p>
                          <p className="text-xs text-gray-500 mt-1">Perdidas</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 text-center">
                          <p className="text-xl sm:text-2xl font-bold text-blue-600">{grupo.stats.taxaSucesso}%</p>
                          <p className="text-xs text-gray-500 mt-1">Sucesso</p>
                        </div>
                      </div>

                      {/* Menu de Exportação */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuAberto(menuAberto === grupo.disparo.uid ? null : grupo.disparo.uid);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Opções de exportação"
                        >
                          <MoreVertical className="h-5 w-5 text-gray-600" />
                        </button>

                        {menuAberto === grupo.disparo.uid && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                exportToExcel(grupo);
                                setMenuAberto(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FileSpreadsheet className="h-4 w-4 text-green-600" />
                              Baixar Excel
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                exportToPDF(grupo);
                                setMenuAberto(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FileText className="h-4 w-4 text-red-600" />
                              Baixar PDF
                            </button>
                            <div className="border-t border-gray-200 my-1"></div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalCancelar({ aberto: true, disparoUid: grupo.disparo.uid });
                                setMenuAberto(null);
                              }}
                              disabled={grupo.disparo.cancelar_disparo === true}
                              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                                grupo.disparo.cancelar_disparo 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-red-700 hover:bg-red-50'
                              }`}
                            >
                              <XCircle className="h-4 w-4" />
                              {grupo.disparo.cancelar_disparo ? 'Disparo Cancelado' : 'Cancelar Disparo'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card de Cancelamento */}
                    {grupo.disparo.cancelar_disparo && (
                      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-red-700">Este disparo foi cancelado</span>
                      </div>
                    )}

                    {/* Card de Expiração */}
                    {grupo.disparo.expires_at && (() => {
                      const diasRestantes = Math.ceil(
                        (new Date(grupo.disparo.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                      );
                      
                      if (diasRestantes <= 0) {
                        return (
                          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            <span className="text-sm font-medium text-red-700">Este disparo expirou</span>
                          </div>
                        );
                      } else if (diasRestantes <= 7) {
                        return (
                          <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-600 flex-shrink-0" />
                            <span className="text-sm font-medium text-orange-700">Expira em {diasRestantes} dia{diasRestantes !== 1 ? 's' : ''}</span>
                          </div>
                        );
                      } else {
                        return (
                          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm text-blue-700">{diasRestantes} dias restantes</span>
                          </div>
                        );
                      }
                    })()}

                    {/* Informações Principais em Grid - 1 Coluna */}
                    <div className="grid grid-cols-1 gap-3 mb-4">
                          {/* Usuário */}
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="h-4 w-4 text-purple-500" />
                              <p className="text-xs font-medium text-gray-500">Usuário</p>
                            </div>
                            <p className="font-semibold text-gray-900">{grupo.disparo.usuario_nome || 'Não informado'}</p>
                          </div>

                          {/* Gênero */}
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              <Filter className="h-4 w-4 text-amber-500" />
                              <p className="text-xs font-medium text-gray-500">Gênero</p>
                            </div>
                            <p className="font-semibold text-gray-900">{grupo.disparo.genero || 'Todos'}</p>
                          </div>
                        </div>

                        {/* Seção de Filtros Aplicados */}
                        <div className="grid grid-cols-1 gap-3 mb-4">
                          {/* Categorias */}
                          {grupo.disparo.categoria && grupo.disparo.categoria.length > 0 && (
                            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                              <p className="text-xs font-semibold text-purple-700 mb-1">📋 Categorias:</p>
                              <div className="flex flex-wrap gap-1">
                                {grupo.disparo.categoria.map((cat, idx) => (
                                  <span key={idx} className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                                    {getCategoriaName(cat)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Cidades */}
                          {grupo.disparo.cidade && grupo.disparo.cidade.length > 0 && (
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                              <p className="text-xs font-semibold text-blue-700 mb-1">🏙️ Cidades:</p>
                              <div className="flex flex-wrap gap-1">
                                {grupo.disparo.cidade.map((cidade, idx) => (
                                  <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                    {cidade}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Bairros */}
                          {grupo.disparo.bairro && grupo.disparo.bairro.length > 0 && (
                            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                              <p className="text-xs font-semibold text-green-700 mb-1">📍 Bairros:</p>
                              <div className="flex flex-wrap gap-1">
                                {grupo.disparo.bairro.map((b, idx) => (
                                  <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                    {b}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Mensagem */}
                        {grupo.disparo.mensagem && (() => {
                          const mensagemCompleta = grupo.disparo.mensagem;
                          const limiteCaracteres = 200;
                          const mensagemExpandida = mensagensExpandidas[grupo.disparo.uid];
                          const precisaTruncate = mensagemCompleta.length > limiteCaracteres;
                          const mensagemExibida = mensagemExpandida || !precisaTruncate 
                            ? mensagemCompleta 
                            : mensagemCompleta.substring(0, limiteCaracteres) + '...';

                          return (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-lg mb-3 shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="h-4 w-4 text-blue-600" />
                                <p className="text-sm font-bold text-blue-900">Mensagem:</p>
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{mensagemExibida}</p>
                              {precisaTruncate && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMensagensExpandidas(prev => ({
                                      ...prev,
                                      [grupo.disparo.uid]: !prev[grupo.disparo.uid]
                                    }));
                                  }}
                                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                >
                                  {mensagemExpandida ? (
                                    <>
                                      <ChevronDown className="h-4 w-4 transform rotate-180" />
                                      Ver menos
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4" />
                                      Ver mais
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        })()}

                        {/* Upload/Mídia */}
                        {grupo.disparo.upload && grupo.disparo.upload.length > 0 && (
                          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 p-4 rounded-lg shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <Download className="h-4 w-4 text-amber-600" />
                              <p className="text-sm font-bold text-amber-900">Arquivos Anexados:</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {grupo.disparo.upload.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs bg-white border-2 border-amber-300 text-amber-800 px-3 py-1.5 rounded-md hover:bg-amber-100 hover:border-amber-400 transition-all shadow-sm hover:shadow-md"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <FileText className="h-3 w-3" />
                                  Arquivo {idx + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                  </div>
                </div>

                {/* Detalhes Expandidos - Tabela de Relatórios */}
                {expandedGroups[grupo.disparo.uid] && (() => {
                  const paginaAtualRelatorio = paginasRelatorio[grupo.disparo.uid] || 1;
                  const ordenacao = ordenacaoRelatorio[grupo.disparo.uid] || { campo: 'eleitor_nome', direcao: 'asc' };
                  
                  // AGRUPAR POR CONTATO ÚNICO (whatsapp + nome)
                  const contatosAgrupados = new Map<string, RelatorioItem & { mensagensRecebidas: number }>();
                  
                  grupo.relatorios.forEach(r => {
                    const chave = `${r.whatsapp}_${r.eleitor_nome}`;
                    const existente = contatosAgrupados.get(chave);
                    
                    if (existente) {
                      // Incrementar contador de mensagens
                      existente.mensagensRecebidas++;
                      // Se alguma foi perdida, manter como perdida
                      if (r.perdida === 'SIM') {
                        existente.perdida = 'SIM';
                      }
                    } else {
                      // Adicionar novo contato com contador
                      contatosAgrupados.set(chave, {
                        ...r,
                        mensagensRecebidas: 1
                      });
                    }
                  });
                  
                  // Converter Map para array
                  const relatoriosUnicos = Array.from(contatosAgrupados.values());
                  
                  // Ordenar relatórios únicos
                  const relatoriosOrdenados = [...relatoriosUnicos].sort((a, b) => {
                    let valorA: any = '';
                    let valorB: any = '';
                    
                    switch (ordenacao.campo) {
                      case 'eleitor_nome':
                        valorA = a.eleitor_nome?.toLowerCase() || '';
                        valorB = b.eleitor_nome?.toLowerCase() || '';
                        break;
                      case 'whatsapp':
                        valorA = a.whatsapp || '';
                        valorB = b.whatsapp || '';
                        break;
                      case 'cidade':
                        valorA = a.cidade?.toLowerCase() || '';
                        valorB = b.cidade?.toLowerCase() || '';
                        break;
                      case 'bairro':
                        valorA = a.bairro?.toLowerCase() || '';
                        valorB = b.bairro?.toLowerCase() || '';
                        break;
                      case 'status':
                        valorA = a.perdida === 'SIM' ? 1 : 0;
                        valorB = b.perdida === 'SIM' ? 1 : 0;
                        break;
                      default:
                        return 0;
                    }
                    
                    if (valorA < valorB) return ordenacao.direcao === 'asc' ? -1 : 1;
                    if (valorA > valorB) return ordenacao.direcao === 'asc' ? 1 : -1;
                    return 0;
                  });
                  
                  const totalRelatorios = relatoriosOrdenados.length;
                  const totalPaginasRelatorio = Math.ceil(totalRelatorios / relatoriosPerPage);
                  const indiceInicio = (paginaAtualRelatorio - 1) * relatoriosPerPage;
                  const indiceFim = indiceInicio + relatoriosPerPage;
                  const relatoriosPaginados = relatoriosOrdenados.slice(indiceInicio, indiceFim);
                  
                  const toggleOrdenacao = (campo: string) => {
                    setOrdenacaoRelatorio(prev => {
                      const ordenacaoAtual = prev[grupo.disparo.uid];
                      const novaDirecao = ordenacaoAtual?.campo === campo && ordenacaoAtual.direcao === 'asc' ? 'desc' : 'asc';
                      return { ...prev, [grupo.disparo.uid]: { campo, direcao: novaDirecao } };
                    });
                    // Resetar para primeira página ao ordenar
                    setPaginasRelatorio(prev => ({ ...prev, [grupo.disparo.uid]: 1 }));
                  };
                  
                  const renderIconeOrdenacao = (campo: string) => {
                    if (ordenacao.campo !== campo) {
                      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
                    }
                    return ordenacao.direcao === 'asc' 
                      ? <ArrowUp className="h-4 w-4 ml-1 text-blue-600" />
                      : <ArrowDown className="h-4 w-4 ml-1 text-blue-600" />;
                  };
                  
                  return (
                  <div className="border-t border-gray-200 bg-gray-50">
                    {grupo.relatorios.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>Nenhum relatório disponível para este disparo.</p>
                      </div>
                    ) : (
                      <>
                        <div 
                          ref={setupHorizontalScroll}
                          className="overflow-x-auto"
                        >
                          <div className="inline-block min-w-full align-middle">
                            <div className="overflow-hidden">
                              <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                              <tr>
                                <th 
                                  className="pl-6 pr-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none"
                                  onClick={() => toggleOrdenacao('eleitor_nome')}
                                >
                                  <div className="flex items-center">
                                    Eleitor
                                    {renderIconeOrdenacao('eleitor_nome')}
                                  </div>
                                </th>
                                <th 
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none"
                                  onClick={() => toggleOrdenacao('whatsapp')}
                                >
                                  <div className="flex items-center">
                                    WhatsApp
                                    {renderIconeOrdenacao('whatsapp')}
                                  </div>
                                </th>
                                <th 
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none"
                                  onClick={() => toggleOrdenacao('cidade')}
                                >
                                  <div className="flex items-center">
                                    Cidade
                                    {renderIconeOrdenacao('cidade')}
                                  </div>
                                </th>
                                <th 
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none"
                                  onClick={() => toggleOrdenacao('bairro')}
                                >
                                  <div className="flex items-center">
                                    Bairro
                                    {renderIconeOrdenacao('bairro')}
                                  </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                  Tipo
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                                  <div className="flex items-center justify-center">
                                    <MessageSquare className="w-4 h-4 mr-1" />
                                    Msgs Recebidas
                                  </div>
                                </th>
                                <th 
                                  className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors select-none"
                                  onClick={() => toggleOrdenacao('status')}
                                >
                                  <div className="flex items-center justify-center">
                                    Status
                                    {renderIconeOrdenacao('status')}
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {relatoriosPaginados.map((relatorio) => (
                                <tr 
                                  key={relatorio.uid} 
                                  className={`hover:bg-gray-50 transition-colors ${
                                    relatorio.perdida === 'SIM' ? 'bg-red-50/30' : ''
                                  }`}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">
                                          {relatorio.eleitor_nome || 'N/A'}
                                        </div>
                                        <div className="text-xs text-gray-500">{relatorio.genero}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {relatorio.whatsapp || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {relatorio.cidade || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {relatorio.bairro || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {relatorio.tipo || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                      <MessageSquare className="w-3 h-3 mr-1" />
                                      {relatorio.mensagensRecebidas}x
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center">
                                    {relatorio.perdida === 'SIM' ? (
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Perdida
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Enviada
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                            </div>
                          </div>
                        </div>
                        
                        {/* Paginação dos Relatórios */}
                        {totalPaginasRelatorio > 1 && (
                          <div className="px-6 py-2 bg-gray-50 border-t border-gray-200">
                            <div className="flex items-center justify-center gap-3">
                              <button
                                onClick={() => setPaginasRelatorio(prev => ({ ...prev, [grupo.disparo.uid]: Math.max(1, paginaAtualRelatorio - 1) }))}
                                disabled={paginaAtualRelatorio === 1}
                                className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                Anterior
                              </button>
                              <span className="text-xs text-gray-500">
                                Pág. {paginaAtualRelatorio} de {totalPaginasRelatorio}
                              </span>
                              <button
                                onClick={() => setPaginasRelatorio(prev => ({ ...prev, [grupo.disparo.uid]: Math.min(totalPaginasRelatorio, paginaAtualRelatorio + 1) }))}
                                disabled={paginaAtualRelatorio === totalPaginasRelatorio}
                                className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                Próxima
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  );
                })()}
              </Card>
              ))
            )}
          </div>

          {/* Paginação Inferior */}
          <div className="flex items-center justify-center gap-3 mt-3 py-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="text-xs text-gray-500">
              Pág. {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Cancelamento */}
      <Dialog open={modalCancelar.aberto} onOpenChange={(aberto) => setModalCancelar({ aberto, disparoUid: null })}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-red-100 rounded-full">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              Cancelar Disparo
            </DialogTitle>
            <DialogDescription className="text-base pt-4">
              Você tem certeza que deseja cancelar este disparo?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 mb-1">Atenção!</p>
                  <p className="text-sm text-amber-800">
                    Esta ação irá interromper o envio de mensagens para os contatos pendentes.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>O que acontecerá:</strong>
              </p>
              <ul className="text-sm text-gray-600 space-y-1.5 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>O disparo será marcado como cancelado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>Mensagens pendentes não serão enviadas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span>Mensagens já enviadas não serão afetadas</span>
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalCancelar({ aberto: false, disparoUid: null })}
              className="w-full sm:w-auto"
            >
              Não, manter disparo
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (modalCancelar.disparoUid) {
                  cancelarDisparo(modalCancelar.disparoUid);
                }
              }}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
            >
              Sim, cancelar disparo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
