import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCompanyStore } from '../../store/useCompanyStore';
import { eleitorStatsService, EleitorStats } from '../../services/eleitorStats';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ChevronLeft, Loader2, Download, Users2, Building2, Home, MapPin, ThumbsUp, UserCircle2, FileSpreadsheet, FileText, MoreVertical, Cake } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { TablePagination } from '../../components/TablePagination';
import { useAuth } from '../../providers/AuthProvider';
import { hasRestrictedAccess } from '../../constants/accessLevels';
import { supabaseClient } from '../../lib/supabase';
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

export function EleitoresReport() {
  const navigate = useNavigate();
  const { company } = useCompanyStore();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EleitorStats | null>(null);
  const [bairroPages, setBairroPages] = useState<Record<string, number>>({});
  const [openMenuBairro, setOpenMenuBairro] = useState<string | null>(null);
  const [openMenuCidade, setOpenMenuCidade] = useState<string | null>(null);
  const [openMenuUsuario, setOpenMenuUsuario] = useState<string | null>(null);
  const [openMenuConfiabilidade, setOpenMenuConfiabilidade] = useState<string | null>(null);
  const [openMenuIndicado, setOpenMenuIndicado] = useState<string | null>(null);
  const [openMenuZona, setOpenMenuZona] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [aniversariantes, setAniversariantes] = useState<any[]>([]);
  const [loadingAniversariantes, setLoadingAniversariantes] = useState(false);
  const [openMenuAniversariante, setOpenMenuAniversariante] = useState<boolean>(false);
  const [aniversariantesPage, setAniversariantesPage] = useState(1);
  const [generoFilter, setGeneroFilter] = useState<'all' | 'MASCULINO' | 'FEMININO' | 'hoje' | '7dias' | '15dias'>('all');
  
  const canAccess = hasRestrictedAccess(user?.nivel_acesso);

  // Estados para paginação
  const [cidadePage, setCidadePage] = useState(1);
  const [indicadoPage, setIndicadoPage] = useState(1);
  const [bairroPage, setBairroPage] = useState(1);
  const [zonaPage, setZonaPage] = useState(1);
  const [usuarioPage, setUsuarioPage] = useState(1);
  const [confiabilidadePage, setConfiabilidadePage] = useState(1);
  const [topEleitoresPage, setTopEleitoresPage] = useState(1);
  const itemsPerPage = 10;
  const bairrosPerPage = 5;

  // Mapeamento de ícones para cada tipo de confiabilidade
  const confiabilidadeConfig = {
    'Frio': { icon: '🧊', description: 'Pouco engajado, dificilmente votará' },
    'Indeciso': { icon: '🤔', description: 'Ainda não definiu seu voto, precisa de convencimento' },
    'Morno': { icon: '🌥️', description: 'Demonstra interesse, mas não está totalmente convencido' },
    'Quente': { icon: '🔥', description: 'Alta chance de votar, mas ainda requer atenção' },
    'Convicto': { icon: '🏆', description: 'Já decidiu e apoia publicamente' },
    'Fiel': { icon: '✅', description: 'Já vota e defende a candidatura' },
    'Multiplicador': { icon: '🚀', description: 'Além de votar, influencia outras pessoas' },
  };

  useEffect(() => {
    if (!canAccess) {
      navigate('/app');
      return;
    }
    loadStats();
  }, [company?.uid, canAccess]);

  // Carregar aniversariantes quando o mês mudar
  useEffect(() => {
    if (company?.uid && selectedMonth) {
      loadAniversariantes();
      setGeneroFilter('all'); // Resetar filtro ao mudar o mês
      setAniversariantesPage(1);
    }
  }, [company?.uid, selectedMonth]);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.relative')) {
        setOpenMenuBairro(null);
        setOpenMenuCidade(null);
        setOpenMenuUsuario(null);
        setOpenMenuConfiabilidade(null);
        setOpenMenuIndicado(null);
        setOpenMenuZona(null);
        setOpenMenuAniversariante(false);
      }
    };
    
    if (openMenuBairro || openMenuCidade || openMenuUsuario || openMenuConfiabilidade || openMenuIndicado || openMenuZona || openMenuAniversariante) {
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuBairro, openMenuCidade, openMenuUsuario, openMenuConfiabilidade, openMenuIndicado, openMenuZona, openMenuAniversariante]);

  const loadStats = async () => {
    if (!company?.uid) {
      // toast.error('Empresa não identificada');
      return;
    }

    try {
      setLoading(true);
      const data = await eleitorStatsService.getStats(company.uid);
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      // toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const loadAniversariantes = async () => {
    if (!company?.uid || !selectedMonth) return;

    try {
      setLoadingAniversariantes(true);
      const [year, month] = selectedMonth.split('-');
      
      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('uid, nome, nascimento, whatsapp, telefone, cidade, bairro, genero')
        .eq('empresa_uid', company.uid)
        .not('nascimento', 'is', null)
        .order('nascimento');

      if (error) throw error;

      // Filtrar por mês de nascimento (tratando timezone corretamente)
      const filtered = data?.filter(eleitor => {
        if (!eleitor.nascimento) return false;
        // Criar data local sem conversão de timezone
        const [y, m, d] = eleitor.nascimento.split('-').map(Number);
        const birthDate = new Date(y, m - 1, d);
        return birthDate.getMonth() + 1 === parseInt(month);
      }) || [];

      // Ordenar por dia do mês
      filtered.sort((a, b) => {
        const [, , dayA] = a.nascimento.split('-').map(Number);
        const [, , dayB] = b.nascimento.split('-').map(Number);
        return dayA - dayB;
      });

      setAniversariantes(filtered);
    } catch (error) {
      console.error('Erro ao carregar aniversariantes:', error);
      setAniversariantes([]);
    } finally {
      setLoadingAniversariantes(false);
    }
  };

  const handleExportExcel = async () => {
    if (!stats) return;

    // Log dos dados que serão exportados
    console.log('Dados para exportação:', {
      totalEleitores: stats.totalEleitores,
      cidades: stats.porCidade,
      bairros: stats.porBairro,
      zonas: stats.porZonaSecao,
      indicados: stats.porIndicado,
      usuarios: stats.porUsuario
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Eleitoral';
    workbook.created = new Date();

    try {
      // 1. Aba de Cidades
      console.log('Criando aba de Cidades...');
      const cidadesSheet = workbook.addWorksheet('Cidades');
      cidadesSheet.columns = [
        { header: 'Cidade', key: 'cidade', width: 30 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: 'Porcentagem', key: 'porcentagem', width: 15 }
      ];

      // Verificar se há dados de cidades
      if (stats.porCidade.length === 0) {
        console.warn('Nenhum dado de cidade encontrado');
      }

      // Adicionar todas as cidades
      stats.porCidade.forEach((cidade, index) => {
        console.log(`Adicionando cidade ${index + 1}/${stats.porCidade.length}:`, cidade);
        cidadesSheet.addRow({
          cidade: cidade.cidade,
          total: cidade.total,
          porcentagem: `${((cidade.total / stats.totalEleitores) * 100).toFixed(1)}%`
        });
      });

      // 2. Aba de Indicados
      console.log('Criando aba de Indicados...');
      const indicadosSheet = workbook.addWorksheet('Indicados');
      indicadosSheet.columns = [
        { header: 'Indicado', key: 'indicado', width: 30 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: 'Porcentagem', key: 'porcentagem', width: 15 }
      ];

      // Verificar se há dados de indicados
      if (stats.porIndicado.length === 0) {
        console.warn('Nenhum dado de indicado encontrado');
      }

      // Adicionar todos os indicados
      stats.porIndicado.forEach((indicado, index) => {
        console.log(`Adicionando indicado ${index + 1}/${stats.porIndicado.length}:`, indicado);
        indicadosSheet.addRow({
          indicado: indicado.indicado_nome,
          total: indicado.total,
          porcentagem: `${((indicado.total / stats.totalEleitores) * 100).toFixed(1)}%`
        });
      });

      // 3. Aba de Bairros
      console.log('Criando aba de Bairros...');
      const bairrosSheet = workbook.addWorksheet('Bairros por Cidade');
      bairrosSheet.columns = [
        { header: 'Cidade', key: 'cidade', width: 30 },
        { header: 'Bairro', key: 'bairro', width: 30 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: '% do Total', key: 'porcentagemTotal', width: 15 },
        { header: '% da Cidade', key: 'porcentagemCidade', width: 15 }
      ];

      // Verificar se há dados de bairros
      if (stats.porBairro.length === 0) {
        console.warn('Nenhum dado de bairro encontrado');
      }

      // Agrupar bairros por cidade
      const bairrosPorCidade = stats.porBairro.reduce((acc, curr) => {
        if (!acc[curr.cidade]) {
          acc[curr.cidade] = [];
        }
        acc[curr.cidade].push(curr);
        return acc;
      }, {} as Record<string, typeof stats.porBairro>);

      console.log('Bairros agrupados por cidade:', bairrosPorCidade);

      // Adicionar todos os bairros agrupados por cidade
      Object.entries(bairrosPorCidade).forEach(([cidade, bairros], cidadeIndex) => {
        console.log(`Processando cidade ${cidadeIndex + 1}: ${cidade} com ${bairros.length} bairros`);
        
        const cidadeTotal = bairros.reduce((sum, b) => sum + b.total, 0);
        
        // Adicionar linha da cidade
        bairrosSheet.addRow({
          cidade: cidade,
          bairro: 'TOTAL DA CIDADE',
          total: cidadeTotal,
          porcentagemTotal: `${((cidadeTotal / stats.totalEleitores) * 100).toFixed(1)}%`,
          porcentagemCidade: '100%'
        });

        // Adicionar todos os bairros da cidade
        bairros.forEach((bairro, bairroIndex) => {
          console.log(`Adicionando bairro ${bairroIndex + 1}/${bairros.length} da cidade ${cidade}:`, bairro);
          bairrosSheet.addRow({
            cidade: '',
            bairro: bairro.bairro,
            total: bairro.total,
            porcentagemTotal: `${((bairro.total / stats.totalEleitores) * 100).toFixed(1)}%`,
            porcentagemCidade: `${((bairro.total / cidadeTotal) * 100).toFixed(1)}%`
          });
        });

        bairrosSheet.addRow({}); // Linha em branco entre cidades
      });

      // 4. Aba de Zonas e Seções
      console.log('Criando aba de Zonas e Seções...');
      const zonasSheet = workbook.addWorksheet('Zonas e Seções');
      zonasSheet.columns = [
        { header: 'Zona', key: 'zona', width: 15 },
        { header: 'Seção', key: 'secao', width: 15 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: 'Porcentagem', key: 'porcentagem', width: 15 }
      ];

      // Verificar se há dados de zonas
      if (stats.porZonaSecao.length === 0) {
        console.warn('Nenhum dado de zona/seção encontrado');
      }

      // Adicionar todas as zonas e seções
      stats.porZonaSecao.forEach((zona, index) => {
        console.log(`Adicionando zona/seção ${index + 1}/${stats.porZonaSecao.length}:`, zona);
        zonasSheet.addRow({
          zona: zona.zona,
          secao: zona.secao,
          total: zona.total,
          porcentagem: `${((zona.total / stats.totalEleitores) * 100).toFixed(1)}%`
        });
      });

      // 5. Aba de Usuários
      console.log('Criando aba de Usuários...');
      const usuariosSheet = workbook.addWorksheet('Usuários');
      usuariosSheet.columns = [
        { header: 'Usuário', key: 'nome', width: 30 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: 'Porcentagem', key: 'porcentagem', width: 15 },
      ];

      stats.porUsuario.forEach((usuario) => {
        const porcentagem = (usuario.total / stats.totalEleitores) * 100;
        usuariosSheet.addRow({
          nome: usuario.usuario_nome,
          total: usuario.total,
          porcentagem: `${porcentagem.toFixed(1)}%`,
        });
      });

      // Adiciona aba de Confiabilidade do Voto
      const confiabilidadeSheet = workbook.addWorksheet('Confiabilidade do Voto');
      confiabilidadeSheet.columns = [
        { header: 'Nível', key: 'nivel', width: 30 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: 'Porcentagem', key: 'porcentagem', width: 15 },
      ];

      stats.porConfiabilidade.forEach((conf) => {
        confiabilidadeSheet.addRow({
          nivel: conf.confiabilidade,
          total: conf.total,
          porcentagem: `${((conf.total / stats.totalEleitores) * 100).toFixed(1)}%`,
        });
      });

      // Adiciona aba de Top 20 Eleitores
      const topEleitoresSheet = workbook.addWorksheet('Top 20 Eleitores');
      topEleitoresSheet.columns = [
        { header: 'Eleitor', key: 'nome', width: 30 },
        { header: 'WhatsApp', key: 'whatsapp', width: 15 },
        { header: 'Total Atendimentos', key: 'total', width: 20 },
      ];

      stats.topEleitoresAtendimentos.forEach((eleitor) => {
        topEleitoresSheet.addRow({
          nome: eleitor.eleitor_nome,
          whatsapp: eleitor.whatsapp,
          total: eleitor.total_atendimentos,
        });
      });

      // Aplicar estilos a todas as abas
      [cidadesSheet, indicadosSheet, bairrosSheet, zonasSheet, usuariosSheet, confiabilidadeSheet, topEleitoresSheet].forEach(sheet => {
        // Estilo para o cabeçalho
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F0FF' }
        };

        // Aplicar estilos a todas as células
        sheet.eachRow((row) => {
          row.eachCell(cell => {
            // Bordas
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };

            // Alinhamento
            if (typeof cell.value === 'number') {
              cell.alignment = { horizontal: 'right' };
            }
          });

          // Destacar totais
          if (
            row.getCell(1).value === 'Total Geral' || 
            row.getCell(2).value === 'TOTAL DA CIDADE'
          ) {
            row.eachCell(cell => {
              cell.font = { bold: true };
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF0F0F0' }
              };
            });
          }
        });

        // Congelar cabeçalho
        sheet.views = [
          { state: 'frozen', xSplit: 0, ySplit: 1 }
        ];
      });

      console.log('Gerando arquivo Excel...');
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Relatório_Eleitores_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      console.log('Arquivo Excel gerado com sucesso!');

    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      alert('Erro ao gerar o arquivo Excel. Por favor, tente novamente.');
    }
  };

  // Funções auxiliares para paginação
  const getPaginatedData = <T extends any>(data: T[], page: number): T[] => {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  };

  // Função para atualizar a página de uma cidade específica
  const handleBairroPageChange = (cidade: string, page: number) => {
    setBairroPages(prev => ({
      ...prev,
      [cidade]: page
    }));
  };

  // Função para obter a página atual dos bairros de uma cidade
  const getBairroPage = (cidade: string) => bairroPages[cidade] || 1;

  // Função auxiliar para definir colunas completas do Excel
  const getExcelColumns = () => [
    { header: 'Nome', key: 'nome', width: 30 },
    { header: 'CPF', key: 'cpf', width: 15 },
    { header: 'Nascimento', key: 'nascimento', width: 12 },
    { header: 'WhatsApp', key: 'whatsapp', width: 15 },
    { header: 'Telefone', key: 'telefone', width: 15 },
    { header: 'Gênero', key: 'genero', width: 12 },
    { header: 'Título', key: 'titulo', width: 15 },
    { header: 'Zona', key: 'zona', width: 10 },
    { header: 'Seção', key: 'secao', width: 10 },
    { header: 'CEP', key: 'cep', width: 12 },
    { header: 'Logradouro', key: 'logradouro', width: 35 },
    { header: 'Número', key: 'numero', width: 10 },
    { header: 'Complemento', key: 'complemento', width: 20 },
    { header: 'Bairro', key: 'bairro', width: 20 },
    { header: 'Cidade', key: 'cidade', width: 20 },
    { header: 'UF', key: 'uf', width: 5 },
    { header: 'Nome da Mãe', key: 'nome_mae', width: 30 },
    { header: 'Instagram', key: 'instagram', width: 20 },
    { header: 'Número do SUS', key: 'numero_do_sus', width: 18 },
    { header: 'Responsável pelo Eleitor', key: 'responsavel_pelo_eleitor', width: 25 },
    { header: 'Confiabilidade do Voto', key: 'confiabilidade_do_voto', width: 20 },
    { header: 'Colégio Eleitoral', key: 'colegio_eleitoral', width: 25 },
    { header: 'Qtd Adultos Residência', key: 'quantidade_adultos_residencia', width: 20 }
  ];

  // Função auxiliar para formatar dados do eleitor para Excel
  const formatEleitorForExcel = (eleitor: any) => ({
    nome: eleitor.nome || '',
    cpf: eleitor.cpf || '',
    nascimento: eleitor.nascimento ? new Date(eleitor.nascimento).toLocaleDateString('pt-BR') : '',
    whatsapp: eleitor.whatsapp || '',
    telefone: eleitor.telefone || '',
    genero: eleitor.genero || '',
    titulo: eleitor.titulo || '',
    zona: eleitor.zona || '',
    secao: eleitor.secao || '',
    cep: eleitor.cep || '',
    logradouro: eleitor.logradouro || '',
    numero: eleitor.numero || '',
    complemento: eleitor.complemento || '',
    bairro: eleitor.bairro || '',
    cidade: eleitor.cidade || '',
    uf: eleitor.uf || '',
    nome_mae: eleitor.nome_mae || '',
    instagram: eleitor.instagram || '',
    numero_do_sus: eleitor.numero_do_sus || '',
    responsavel_pelo_eleitor: eleitor.responsavel_pelo_eleitor || '',
    confiabilidade_do_voto: eleitor.confiabilidade_do_voto || '',
    colegio_eleitoral: eleitor.colegio_eleitoral || '',
    quantidade_adultos_residencia: eleitor.quantidade_adultos_residencia || ''
  });

  // Função para exportar eleitores de um bairro específico para Excel
  const handleExportBairroExcel = async (cidade: string, bairro: string) => {
    if (!company?.uid) return;

    try {
      // Buscar eleitores do bairro específico
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid)
        .eq('cidade', cidade)
        .eq('bairro', bairro)
        .order('nome');

      if (error) throw error;

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(`${bairro} - ${cidade}`);

      sheet.columns = getExcelColumns();

      eleitores?.forEach(eleitor => {
        sheet.addRow(formatEleitorForExcel(eleitor));
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eleitores_${bairro}_${cidade}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar bairro:', error);
      alert('Erro ao gerar o arquivo Excel');
    }
  };

  // Função para exportar eleitores de uma cidade específica para Excel
  const handleExportCidadeExcel = async (cidade: string) => {
    if (!company?.uid) return;

    try {
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid)
        .eq('cidade', cidade)
        .order('bairro')
        .order('nome');

      if (error) throw error;

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(cidade);

      sheet.columns = getExcelColumns();

      eleitores?.forEach(eleitor => {
        sheet.addRow(formatEleitorForExcel(eleitor));
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eleitores_${cidade}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar cidade:', error);
      alert('Erro ao gerar o arquivo Excel');
    }
  };

  // Função para exportar eleitores de uma cidade específica para PDF
  const handleExportCidadePDF = async (cidade: string) => {
    if (!company?.uid) return;

    try {
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid)
        .eq('cidade', cidade)
        .order('bairro')
        .order('nome');

      if (error) throw error;

      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(`Eleitores - ${cidade}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Total: ${eleitores?.length || 0} eleitores`, 14, 22);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 27);

      (doc as any).autoTable({
        startY: 32,
        head: [['Nome', 'Bairro', 'Telefone', 'Zona/Seção']],
        body: eleitores?.map(e => [
          e.nome || '',
          e.bairro || '',
          e.whatsapp || e.telefone || '',
          `${e.zona || ''}/${e.secao || ''}`
        ]) || [],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`eleitores_${cidade}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar cidade PDF:', error);
      alert('Erro ao gerar o arquivo PDF');
    }
  };

  // Função para exportar eleitores de um usuário específico para Excel
  const handleExportUsuarioExcel = async (usuarioNome: string) => {
    if (!company?.uid) return;

    try {
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*, gbp_usuarios!inner(nome)')
        .eq('empresa_uid', company.uid)
        .eq('gbp_usuarios.nome', usuarioNome)
        .order('cidade')
        .order('nome');

      if (error) throw error;

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(usuarioNome);

      sheet.columns = getExcelColumns();

      eleitores?.forEach(eleitor => {
        sheet.addRow(formatEleitorForExcel(eleitor));
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eleitores_${usuarioNome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar usuário:', error);
      alert('Erro ao gerar o arquivo Excel');
    }
  };

  // Função para exportar eleitores de um usuário específico para PDF
  const handleExportUsuarioPDF = async (usuarioNome: string) => {
    if (!company?.uid) return;

    try {
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*, gbp_usuarios!inner(nome)')
        .eq('empresa_uid', company.uid)
        .eq('gbp_usuarios.nome', usuarioNome)
        .order('cidade')
        .order('nome');

      if (error) throw error;

      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(`Cadastros - ${usuarioNome}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Total: ${eleitores?.length || 0} eleitores`, 14, 22);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 27);

      (doc as any).autoTable({
        startY: 32,
        head: [['Nome', 'Cidade', 'Bairro', 'Telefone']],
        body: eleitores?.map(e => [
          e.nome || '',
          e.cidade || '',
          e.bairro || '',
          e.whatsapp || e.telefone || ''
        ]) || [],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`cadastros_${usuarioNome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar usuário PDF:', error);
      alert('Erro ao gerar o arquivo PDF');
    }
  };

  // Função para exportar eleitores por confiabilidade para Excel
  const handleExportConfiabilidadeExcel = async (confiabilidade: string) => {
    if (!company?.uid) return;

    try {
      // Buscar eleitores com filtro de confiabilidade
      const query = supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid);
      
      // Aplicar filtro de confiabilidade_do_voto (pode ser null)
      if (confiabilidade && confiabilidade !== 'null') {
        query.eq('confiabilidade_do_voto', confiabilidade);
      } else {
        query.is('confiabilidade_do_voto', null);
      }
      
      const { data: eleitores, error } = await query
        .order('cidade')
        .order('nome');

      if (error) {
        console.error('Erro ao buscar eleitores:', error);
        throw error;
      }

      if (!eleitores || eleitores.length === 0) {
        alert('Nenhum eleitor encontrado para esta confiabilidade');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(confiabilidade);

      sheet.columns = getExcelColumns();

      eleitores?.forEach(eleitor => {
        sheet.addRow(formatEleitorForExcel(eleitor));
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eleitores_${confiabilidade.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar confiabilidade:', error);
      alert('Erro ao gerar o arquivo Excel');
    }
  };

  // Função para exportar eleitores por confiabilidade para PDF
  const handleExportConfiabilidadePDF = async (confiabilidade: string) => {
    if (!company?.uid) return;

    try {
      // Buscar eleitores com filtro de confiabilidade
      const query = supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid);
      
      // Aplicar filtro de confiabilidade_do_voto (pode ser null)
      if (confiabilidade && confiabilidade !== 'null') {
        query.eq('confiabilidade_do_voto', confiabilidade);
      } else {
        query.is('confiabilidade_do_voto', null);
      }
      
      const { data: eleitores, error } = await query
        .order('cidade')
        .order('nome');

      if (error) {
        console.error('Erro ao buscar eleitores:', error);
        throw error;
      }

      if (!eleitores || eleitores.length === 0) {
        alert('Nenhum eleitor encontrado para esta confiabilidade');
        return;
      }

      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(`Confiabilidade: ${confiabilidade}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Total: ${eleitores?.length || 0} eleitores`, 14, 22);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 27);

      (doc as any).autoTable({
        startY: 32,
        head: [['Nome', 'Cidade', 'Bairro', 'Telefone']],
        body: eleitores?.map(e => [
          e.nome || '',
          e.cidade || '',
          e.bairro || '',
          e.whatsapp || e.telefone || ''
        ]) || [],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`confiabilidade_${confiabilidade.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar confiabilidade PDF:', error);
      alert('Erro ao gerar o arquivo PDF');
    }
  };

  // Função para exportar eleitores por indicado para Excel
  const handleExportIndicadoExcel = async (indicadoNome: string) => {
    if (!company?.uid) return;

    try {
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*, gbp_indicado!inner(nome)')
        .eq('empresa_uid', company.uid)
        .eq('gbp_indicado.nome', indicadoNome)
        .order('cidade')
        .order('nome');

      if (error) {
        console.error('Erro ao buscar eleitores:', error);
        throw error;
      }

      if (!eleitores || eleitores.length === 0) {
        alert('Nenhum eleitor encontrado para este indicado');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(indicadoNome);

      sheet.columns = getExcelColumns();

      eleitores?.forEach(eleitor => {
        sheet.addRow(formatEleitorForExcel(eleitor));
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `indicados_${indicadoNome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar indicado:', error);
      alert('Erro ao gerar o arquivo Excel');
    }
  };

  // Função para exportar eleitores por indicado para PDF
  const handleExportIndicadoPDF = async (indicadoNome: string) => {
    if (!company?.uid) return;

    try {
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*, gbp_indicado!inner(nome)')
        .eq('empresa_uid', company.uid)
        .eq('gbp_indicado.nome', indicadoNome)
        .order('cidade')
        .order('nome');

      if (error) {
        console.error('Erro ao buscar eleitores:', error);
        throw error;
      }

      if (!eleitores || eleitores.length === 0) {
        alert('Nenhum eleitor encontrado para este indicado');
        return;
      }

      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(`Indicados - ${indicadoNome}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Total: ${eleitores?.length || 0} eleitores`, 14, 22);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 27);

      (doc as any).autoTable({
        startY: 32,
        head: [['Nome', 'Cidade', 'Bairro', 'Telefone']],
        body: eleitores?.map(e => [
          e.nome || '',
          e.cidade || '',
          e.bairro || '',
          e.whatsapp || e.telefone || ''
        ]) || [],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`indicados_${indicadoNome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar indicado PDF:', error);
      alert('Erro ao gerar o arquivo PDF');
    }
  };

  // Função para exportar eleitores por zona/seção para Excel
  const handleExportZonaExcel = async (zona: string, secao: string) => {
    if (!company?.uid) return;

    try {
      const { data: eleitores, error} = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid)
        .eq('zona', zona)
        .eq('secao', secao)
        .order('nome');

      if (error) {
        console.error('Erro ao buscar eleitores:', error);
        throw error;
      }

      if (!eleitores || eleitores.length === 0) {
        alert('Nenhum eleitor encontrado para esta zona/seção');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(`Zona ${zona} Seção ${secao}`);

      sheet.columns = getExcelColumns();

      eleitores?.forEach(eleitor => {
        sheet.addRow(formatEleitorForExcel(eleitor));
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `zona_${zona}_secao_${secao}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar zona/seção:', error);
      alert('Erro ao gerar o arquivo Excel');
    }
  };

  // Função para exportar eleitores por zona/seção para PDF
  const handleExportZonaPDF = async (zona: string, secao: string) => {
    if (!company?.uid) return;

    try {
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid)
        .eq('zona', zona)
        .eq('secao', secao)
        .order('nome');

      if (error) {
        console.error('Erro ao buscar eleitores:', error);
        throw error;
      }

      if (!eleitores || eleitores.length === 0) {
        alert('Nenhum eleitor encontrado para esta zona/seção');
        return;
      }

      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(`Zona ${zona} - Seção ${secao}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Total: ${eleitores?.length || 0} eleitores`, 14, 22);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 27);

      (doc as any).autoTable({
        startY: 32,
        head: [['Nome', 'Cidade', 'Bairro', 'Telefone']],
        body: eleitores?.map(e => [
          e.nome || '',
          e.cidade || '',
          e.bairro || '',
          e.whatsapp || e.telefone || ''
        ]) || [],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`zona_${zona}_secao_${secao}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar zona/seção PDF:', error);
      alert('Erro ao gerar o arquivo PDF');
    }
  };

  // Função para exportar aniversariantes do mês para Excel
  const handleExportAniversariantesExcel = async () => {
    if (!company?.uid || aniversariantes.length === 0) return;

    try {
      const [year, month] = selectedMonth.split('-');
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const monthName = monthNames[parseInt(month) - 1];

      // Aplicar o filtro selecionado
      let filteredData = aniversariantes;
      let filterName = monthName;
      
      if (generoFilter === 'MASCULINO') {
        filteredData = aniversariantes.filter(e => e.genero?.toUpperCase() === 'MASCULINO');
        filterName = `${monthName} - Masculino`;
      } else if (generoFilter === 'FEMININO') {
        filteredData = aniversariantes.filter(e => e.genero?.toUpperCase() === 'FEMININO');
        filterName = `${monthName} - Feminino`;
      } else if (generoFilter === 'hoje') {
        const today = new Date();
        const todayDay = today.getDate();
        filteredData = aniversariantes.filter(e => {
          const [, , d] = e.nascimento.split('-').map(Number);
          return d === todayDay;
        });
        filterName = `${monthName} - Hoje`;
      } else if (generoFilter === '7dias') {
        const today = new Date();
        const todayDay = today.getDate();
        const startDay = Math.max(1, todayDay - 7);
        filteredData = aniversariantes.filter(e => {
          const [, , d] = e.nascimento.split('-').map(Number);
          return d >= startDay && d <= todayDay;
        });
        filterName = `${monthName} - Ultimos_7_Dias`;
      } else if (generoFilter === '15dias') {
        const today = new Date();
        const todayDay = today.getDate();
        const startDay = Math.max(1, todayDay - 15);
        filteredData = aniversariantes.filter(e => {
          const [, , d] = e.nascimento.split('-').map(Number);
          return d >= startDay && d <= todayDay;
        });
        filterName = `${monthName} - Ultimos_15_Dias`;
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(`Aniversariantes ${filterName}`);

      sheet.columns = [
        { header: 'Dia', key: 'dia', width: 8 },
        { header: 'Nome', key: 'nome', width: 35 },
        { header: 'Data de Nascimento', key: 'nascimento', width: 18 },
        { header: 'Idade', key: 'idade', width: 8 },
        { header: 'Gênero', key: 'genero', width: 12 },
        { header: 'WhatsApp', key: 'whatsapp', width: 16 },
        { header: 'Telefone', key: 'telefone', width: 16 },
        { header: 'Cidade', key: 'cidade', width: 20 },
        { header: 'Bairro', key: 'bairro', width: 20 }
      ];

      filteredData.forEach(eleitor => {
        const [y, m, d] = eleitor.nascimento.split('-').map(Number);
        const birthDate = new Date(y, m - 1, d);
        const age = new Date().getFullYear() - birthDate.getFullYear();
        
        sheet.addRow({
          dia: birthDate.getDate(),
          nome: eleitor.nome || '',
          nascimento: birthDate.toLocaleDateString('pt-BR'),
          idade: age,
          genero: eleitor.genero || 'Não informado',
          whatsapp: eleitor.whatsapp || '',
          telefone: eleitor.telefone || '',
          cidade: eleitor.cidade || '',
          bairro: eleitor.bairro || ''
        });
      });

      // Estilo para o cabeçalho
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F0FF' }
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aniversariantes_${filterName.replace(/\s+/g, '_')}_${year}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar aniversariantes Excel:', error);
      alert('Erro ao gerar o arquivo Excel');
    }
  };

  // Função para exportar aniversariantes do mês para PDF
  const handleExportAniversariantesPDF = async () => {
    if (!company?.uid || aniversariantes.length === 0) return;

    try {
      const [year, month] = selectedMonth.split('-');
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const monthName = monthNames[parseInt(month) - 1];

      // Aplicar o filtro selecionado
      let filteredData = aniversariantes;
      let filterName = monthName;
      
      if (generoFilter === 'MASCULINO') {
        filteredData = aniversariantes.filter(e => e.genero?.toUpperCase() === 'MASCULINO');
        filterName = `${monthName} - Masculino`;
      } else if (generoFilter === 'FEMININO') {
        filteredData = aniversariantes.filter(e => e.genero?.toUpperCase() === 'FEMININO');
        filterName = `${monthName} - Feminino`;
      } else if (generoFilter === 'hoje') {
        const today = new Date();
        const todayDay = today.getDate();
        filteredData = aniversariantes.filter(e => {
          const [, , d] = e.nascimento.split('-').map(Number);
          return d === todayDay;
        });
        filterName = `${monthName} - Hoje`;
      } else if (generoFilter === '7dias') {
        const today = new Date();
        const todayDay = today.getDate();
        const startDay = Math.max(1, todayDay - 7);
        filteredData = aniversariantes.filter(e => {
          const [, , d] = e.nascimento.split('-').map(Number);
          return d >= startDay && d <= todayDay;
        });
        filterName = `${monthName} - Ultimos_7_Dias`;
      } else if (generoFilter === '15dias') {
        const today = new Date();
        const todayDay = today.getDate();
        const startDay = Math.max(1, todayDay - 15);
        filteredData = aniversariantes.filter(e => {
          const [, , d] = e.nascimento.split('-').map(Number);
          return d >= startDay && d <= todayDay;
        });
        filterName = `${monthName} - Ultimos_15_Dias`;
      }

      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(`Aniversariantes - ${filterName} ${year}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Total: ${filteredData.length} aniversariantes`, 14, 22);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 27);

      (doc as any).autoTable({
        startY: 32,
        head: [['Dia', 'Nome', 'Nascimento', 'Idade', 'Gênero', 'Telefone', 'Bairro']],
        body: filteredData.map(e => {
          const [y, m, d] = e.nascimento.split('-').map(Number);
          const birthDate = new Date(y, m - 1, d);
          const age = new Date().getFullYear() - birthDate.getFullYear();
          return [
            birthDate.getDate(),
            e.nome || '',
            birthDate.toLocaleDateString('pt-BR'),
            age,
            e.genero || 'N/A',
            e.whatsapp || e.telefone || '',
            e.bairro || ''
          ];
        }),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`aniversariantes_${filterName.replace(/\s+/g, '_')}_${year}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar aniversariantes PDF:', error);
      alert('Erro ao gerar o arquivo PDF');
    }
  };

  // Função para exportar eleitores de um bairro específico para PDF
  const handleExportBairroPDF = async (cidade: string, bairro: string) => {
    if (!company?.uid) return;

    try {
      // Buscar eleitores do bairro específico
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid)
        .eq('cidade', cidade)
        .eq('bairro', bairro)
        .order('nome');

      if (error) throw error;

      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(16);
      doc.text(`Eleitores - ${bairro}`, 14, 15);
      doc.setFontSize(12);
      doc.text(`${cidade}`, 14, 22);
      doc.setFontSize(10);
      doc.text(`Total: ${eleitores?.length || 0} eleitores`, 14, 28);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 33);

      // Tabela
      (doc as any).autoTable({
        startY: 38,
        head: [['Nome', 'Telefone', 'Endereço', 'Zona/Seção']],
        body: eleitores?.map(e => [
          e.nome || '',
          e.whatsapp || e.telefone || '',
          `${e.logradouro || ''} ${e.numero || ''}`.trim(),
          `${e.zona || ''}/${e.secao || ''}`
        ]) || [],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`eleitores_${bairro}_${cidade}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar bairro PDF:', error);
      alert('Erro ao gerar o arquivo PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-500">Nenhuma estatística disponível</p>
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-0">
      <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-0 sm:p-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-full"
                title="Voltar"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                Relatório de Cadastros
              </h1>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleExportExcel}
                className="hidden sm:flex w-full sm:w-auto items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-sm sm:text-base"
              >
                <Download className="h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 px-4 sm:px-0">
          {/* Cabeçalho com Total e Líderes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card Total de Eleitores */}
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-lg">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-white">Total de Eleitores</h3>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                    <Users2 className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 dark:text-blue-300" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-4xl font-bold text-blue-600 dark:text-white">
                    {stats.totalEleitores.toLocaleString()}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300">
                    eleitores
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                  <span>{stats.porCidade.length} cidades</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{stats.porBairro.length} bairros</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{new Set(stats.porZonaSecao.map(z => z.zona)).size} zonas</span>
                </div>
              </div>
            </Card>

            {/* Cidade Líder */}
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-lg">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-white">Cidade Líder</h3>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                    <Building2 className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 dark:text-blue-300" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-4xl font-bold text-blue-600 dark:text-white">
                    {stats.porCidade[0]?.total.toLocaleString() || '0'}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300">
                    eleitores
                  </span>
                </div>
                <div className="flex flex-col space-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-white truncate" title={stats.porCidade[0]?.cidade || '-'}>
                    {stats.porCidade[0]?.cidade || '-'}
                  </span>
                  <span>({((stats.porCidade[0]?.total / stats.totalEleitores) * 100).toFixed(1)}% do total)</span>
                </div>
              </div>
            </Card>

            {/* Bairro Líder */}
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-lg">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-white">Bairro Líder</h3>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                    <Home className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 dark:text-blue-300" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-4xl font-bold text-blue-600 dark:text-white">
                    {stats.porBairro[0]?.total.toLocaleString() || '0'}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300">
                    eleitores
                  </span>
                </div>
                <div className="flex flex-col space-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-white truncate" title={stats.porBairro[0]?.bairro || '-'}>
                    {stats.porBairro[0]?.bairro || '-'}
                  </span>
                  <span className="truncate" title={stats.porBairro[0]?.cidade || '-'}>
                    {stats.porBairro[0]?.cidade || '-'}
                  </span>
                  <span>({((stats.porBairro[0]?.total / stats.totalEleitores) * 100).toFixed(1)}% do total)</span>
                </div>
              </div>
            </Card>

            {/* Zona Líder */}
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-lg">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-white">Zona Líder</h3>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                    <MapPin className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 dark:text-blue-300" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-4xl font-bold text-blue-600 dark:text-white">
                    {stats.porZonaSecao[0]?.total.toLocaleString() || '0'}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300">
                    eleitores
                  </span>
                </div>
                <div className="flex flex-col space-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Zona {stats.porZonaSecao[0]?.zona || '-'}
                  </span>
                  <span>Seção {stats.porZonaSecao[0]?.secao || '-'}</span>
                  <span>({((stats.porZonaSecao[0]?.total / stats.totalEleitores) * 100).toFixed(1)}% do total)</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Distribuição por Cidade */}
          <Card className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Distribuição por Cidade</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total de cidades: {stats.porCidade.length}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 text-sm w-full sm:w-auto">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-center">
                  Maior: {stats.porCidade[0]?.cidade} ({stats.porCidade[0]?.total})
                </span>
                <span className="px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded text-center">
                  Menor: {stats.porCidade[stats.porCidade.length - 1]?.cidade} ({stats.porCidade[stats.porCidade.length - 1]?.total})
                </span>
              </div>
            </div>
            <div ref={setupHorizontalScroll}>
              <table style={{ minWidth: '600px', width: '100%' }}>
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-2 text-gray-900 dark:text-white">Cidade</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white">Total</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white">%</th>
                      <th className="px-4 py-2 w-1/3 text-gray-900 dark:text-white">Progresso</th>
                      <th className="text-center py-2 text-gray-900 dark:text-white">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedData(stats.porCidade, cidadePage).map(({ cidade, total }, index) => {
                      const percentage = (total / stats.totalEleitores) * 100;
                      return (
                        <tr key={cidade} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${index === 0 ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                          <td className="py-2 text-gray-900 dark:text-white">{cidade}</td>
                          <td className="text-right py-2 text-gray-900 dark:text-white">{total}</td>
                          <td className="text-right py-2 text-gray-900 dark:text-white">{percentage.toFixed(1)}%</td>
                          <td className="px-4 py-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-blue-400'}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </td>
                          <td className="py-2">
                            <div className="relative flex items-center justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuCidade(openMenuCidade === cidade ? null : cidade);
                                }}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                title="Opções de exportação"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                              </button>
                              
                              {openMenuCidade === cidade && (
                                <div 
                                  className="absolute right-0 top-8 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportCidadeExcel(cidade);
                                      setOpenMenuCidade(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                  >
                                    <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span>Excel</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportCidadePDF(cidade);
                                      setOpenMenuCidade(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                  >
                                    <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                                    <span>PDF</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
            <TablePagination
              currentPage={cidadePage}
              totalItems={stats.porCidade.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCidadePage}
            />
          </Card>

          {/* Distribuição por Indicado */}
          <Card className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Distribuição por Indicado</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total de indicados: {stats.porIndicado.length}
                </p>
              </div>
              {stats.porIndicado.length > 0 && (
                <div className="text-sm w-full sm:w-auto">
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded block text-center">
                    Maior: {stats.porIndicado[0]?.indicado_nome} ({stats.porIndicado[0]?.total})
                  </span>
                </div>
              )}
            </div>

            <div ref={setupHorizontalScroll}>
              <table style={{ minWidth: '600px', width: '100%' }}>
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-2 text-gray-900 dark:text-white">Indicado</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white">Total</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white">%</th>
                    <th className="px-4 py-2 text-gray-900 dark:text-white">Distribuição</th>
                    <th className="text-center py-2 text-gray-900 dark:text-white">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedData(stats.porIndicado, indicadoPage).map((item, index) => {
                    const percentage = (item.total / stats.totalEleitores) * 100;
                    return (
                      <tr key={item.indicado_nome} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${index === 0 ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                        <td className="py-2 text-gray-900 dark:text-white">{item.indicado_nome}</td>
                        <td className="text-right py-2 text-gray-900 dark:text-white">{item.total}</td>
                        <td className="text-right py-2 text-gray-900 dark:text-white">{percentage.toFixed(1)}%</td>
                        <td className="px-4 py-2">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-blue-400'}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="py-2">
                          <div className="relative flex items-center justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuIndicado(openMenuIndicado === item.indicado_nome ? null : item.indicado_nome);
                              }}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Opções de exportação"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                            
                            {openMenuIndicado === item.indicado_nome && (
                              <div 
                                className="absolute right-0 top-8 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportIndicadoExcel(item.indicado_nome);
                                    setOpenMenuIndicado(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                >
                                  <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  <span>Excel</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportIndicadoPDF(item.indicado_nome);
                                    setOpenMenuIndicado(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                >
                                  <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                                  <span>PDF</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TablePagination
              currentPage={indicadoPage}
              totalItems={stats.porIndicado.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setIndicadoPage}
            />
          </Card>

          {/* Distribuição por Bairro */}
          <Card className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Distribuição por Bairro</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total de bairros: {stats.porBairro.length} em {new Set(stats.porBairro.map(b => b.cidade)).size} cidades
                </p>
              </div>
              <div className="text-sm w-full sm:w-auto">
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded block text-center">
                  Maior: {stats.porBairro[0]?.bairro} ({stats.porBairro[0]?.total})
                </span>
              </div>
            </div>

            <div className="space-y-6">
              {getPaginatedData(
                Object.entries(
                  stats.porBairro.reduce((acc, curr) => {
                    if (!acc[curr.cidade]) {
                      acc[curr.cidade] = [];
                    }
                    acc[curr.cidade].push(curr);
                    return acc;
                  }, {} as Record<string, typeof stats.porBairro>)
                )
                  .sort(([, a], [, b]) => b[0].total - a[0].total),
                bairroPage
              ).map(([cidade, bairros]) => {
                const cidadeTotal = bairros.reduce((sum, b) => sum + b.total, 0);
                const cidadePercentage = (cidadeTotal / stats.totalEleitores) * 100;
                const currentPage = getBairroPage(cidade);
                const paginatedBairros = bairros
                  .sort((a, b) => b.total - a.total)
                  .slice((currentPage - 1) * bairrosPerPage, currentPage * bairrosPerPage);

                return (
                  <div key={cidade} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    {/* Cabeçalho da Cidade */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-2 border-b dark:border-gray-700">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-white">{cidade}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {bairros.length} bairros | Total: {cidadeTotal} ({cidadePercentage.toFixed(1)}%)
                        </p>
                      </div>
                    </div>

                    {/* Tabela de Bairros */}
                    <div ref={setupHorizontalScroll}>
                        <table style={{ minWidth: '600px', width: '100%' }}>
                          <thead>
                            <tr className="border-b dark:border-gray-700">
                              <th className="text-left py-2 text-gray-900 dark:text-white">Bairro</th>
                              <th className="text-right py-2 text-gray-900 dark:text-white">Total</th>
                              <th className="text-right py-2 text-gray-900 dark:text-white">% da Cidade</th>
                              <th className="text-right py-2 text-gray-900 dark:text-white">% Total</th>
                              <th className="px-4 py-2 w-1/3 text-gray-900 dark:text-white">Progresso</th>
                              <th className="text-center py-2 text-gray-900 dark:text-white">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedBairros.map((bairro, index) => {
                              const percentageTotal = (bairro.total / stats.totalEleitores) * 100;
                              const percentageCidade = (bairro.total / cidadeTotal) * 100;

                              return (
                                <tr
                                  key={`${bairro.cidade}-${bairro.bairro}`}
                                  className={`border-b dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 transition-colors ${
                                    index === 0 ? 'bg-green-50/50 dark:bg-green-900/30' : ''
                                  }`}
                                >
                                  <td className="py-2 text-gray-900 dark:text-white">{bairro.bairro}</td>
                                  <td className="text-right py-2 text-gray-900 dark:text-white">{bairro.total}</td>
                                  <td className="text-right py-2 text-gray-900 dark:text-white">{percentageCidade.toFixed(1)}%</td>
                                  <td className="text-right py-2 text-gray-900 dark:text-white">{percentageTotal.toFixed(1)}%</td>
                                  <td className="px-4 py-2">
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                      <div
                                        className={`h-2.5 rounded-full ${
                                          index === 0 ? 'bg-green-600' : 'bg-green-400'
                                        }`}
                                        style={{ width: `${percentageCidade}%` }}
                                      ></div>
                                    </div>
                                  </td>
                                  <td className="py-2">
                                    <div className="relative flex items-center justify-center">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuBairro(openMenuBairro === `${bairro.cidade}-${bairro.bairro}` ? null : `${bairro.cidade}-${bairro.bairro}`);
                                        }}
                                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                                        title="Opções de exportação"
                                      >
                                        <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                      </button>
                                      
                                      {openMenuBairro === `${bairro.cidade}-${bairro.bairro}` && (
                                        <div 
                                          className="absolute right-0 top-8 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleExportBairroExcel(bairro.cidade, bairro.bairro);
                                              setOpenMenuBairro(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                          >
                                            <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                                            <span>Excel</span>
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleExportBairroPDF(bairro.cidade, bairro.bairro);
                                              setOpenMenuBairro(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                          >
                                            <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                                            <span>PDF</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                    </div>
                    <TablePagination
                      currentPage={currentPage}
                      totalItems={bairros.length}
                      itemsPerPage={bairrosPerPage}
                      onPageChange={(page) => handleBairroPageChange(cidade, page)}
                    />
                  </div>
                );
              })}
              <TablePagination
                currentPage={bairroPage}
                totalItems={Object.keys(
                  stats.porBairro.reduce((acc, curr) => {
                    if (!acc[curr.cidade]) {
                      acc[curr.cidade] = [];
                    }
                    acc[curr.cidade].push(curr);
                    return acc;
                  }, {} as Record<string, typeof stats.porBairro>)
                ).length}
                itemsPerPage={itemsPerPage}
                onPageChange={setBairroPage}
              />
            </div>
          </Card>

          {/* Distribuição por Zona e Seção */}
          <Card className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Distribuição por Zona e Seção</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total de zonas/seções: {stats.porZonaSecao.length}
                </p>
              </div>
              {stats.porZonaSecao.length > 0 && (
                <div className="text-sm w-full sm:w-auto">
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded block text-center">
                    Maior: Zona {stats.porZonaSecao[0]?.zona} Seção {stats.porZonaSecao[0]?.secao} ({stats.porZonaSecao[0]?.total})
                  </span>
                </div>
              )}
            </div>

            <div ref={setupHorizontalScroll}>
              <table style={{ minWidth: '600px', width: '100%' }}>
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-2 text-gray-900 dark:text-white">Zona</th>
                    <th className="text-left py-2 text-gray-900 dark:text-white">Seção</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white">Total</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white">%</th>
                    <th className="px-4 py-2 text-gray-900 dark:text-white">Distribuição</th>
                    <th className="text-center py-2 text-gray-900 dark:text-white">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedData(stats.porZonaSecao, zonaPage).map((item, index) => {
                    const percentage = (item.total / stats.totalEleitores) * 100;
                    const zonaSecaoKey = `${item.zona}-${item.secao}`;
                    return (
                      <tr key={zonaSecaoKey} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${index === 0 ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                        <td className="py-2 text-gray-900 dark:text-white">{item.zona}</td>
                        <td className="py-2 text-gray-900 dark:text-white">{item.secao}</td>
                        <td className="text-right py-2 text-gray-900 dark:text-white">{item.total}</td>
                        <td className="text-right py-2 text-gray-900 dark:text-white">{percentage.toFixed(1)}%</td>
                        <td className="px-4 py-2">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-blue-400'}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="py-2">
                          <div className="relative flex items-center justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuZona(openMenuZona === zonaSecaoKey ? null : zonaSecaoKey);
                              }}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Opções de exportação"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                            
                            {openMenuZona === zonaSecaoKey && (
                              <div 
                                className="absolute right-0 top-8 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportZonaExcel(item.zona, item.secao);
                                    setOpenMenuZona(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                >
                                  <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  <span>Excel</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportZonaPDF(item.zona, item.secao);
                                    setOpenMenuZona(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                >
                                  <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                                  <span>PDF</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TablePagination
              currentPage={zonaPage}
              totalItems={stats.porZonaSecao.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setZonaPage}
            />
          </Card>

          {/* Top 5 Eleitores com Mais Atendimentos */}
          <Card className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Users2 className="w-5 h-5 text-gray-900 dark:text-white" />
                  Top 20 Eleitores - Atendimentos
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Eleitores com maior número de atendimentos registrados</p>
              </div>
            </div>
            <div ref={setupHorizontalScroll}>
                <table style={{ minWidth: '600px', width: '100%' }}>
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-2 w-1/3 text-gray-900 dark:text-white">Eleitor</th>
                      <th className="text-right py-2 w-1/4 text-gray-900 dark:text-white">WhatsApp</th>
                      <th className="text-right py-2 w-20 text-gray-900 dark:text-white">Total</th>
                      <th className="px-4 py-2 w-1/4 text-gray-900 dark:text-white">Progresso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedData(stats.topEleitoresAtendimentos, topEleitoresPage).map((eleitor) => {
                      const maxAtendimentos = stats.topEleitoresAtendimentos[0]?.total_atendimentos || 1;

                      return (
                        <tr key={eleitor.eleitor_nome} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="py-2 truncate">
                            <div className="flex items-center gap-2">
                              <Link 
                                to={`/app/eleitores/${eleitor.uid}`} 
                                className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-primary dark:hover:text-primary"
                              >
                                <UserCircle2 className="w-5 h-5 text-primary dark:text-primary" />
                                {eleitor.eleitor_nome}
                              </Link>
                            </div>
                          </td>
                          <td className="text-right py-2 font-mono text-gray-500 dark:text-gray-400 tracking-wider">{eleitor.whatsapp || '-'}</td>
                          <td className="text-right py-2 font-semibold text-primary-600 dark:text-primary-400">{eleitor.total_atendimentos}</td>
                          <td className="px-4 py-2">
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                              <div
                                className="h-2.5 rounded-full bg-blue-600"
                                style={{ 
                                  width: `${Math.min((eleitor.total_atendimentos / maxAtendimentos) * 70, 70)}%`,
                                  opacity: 0.6
                                }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
            <TablePagination
              currentPage={topEleitoresPage}
              totalItems={stats.topEleitoresAtendimentos?.length || 0}
              itemsPerPage={itemsPerPage}
              onPageChange={setTopEleitoresPage}
            />
          </Card>

          {/* Tabela de Confiabilidade */}
          <Card className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <ThumbsUp className="w-5 h-5 text-gray-900 dark:text-white" />
                  Confiabilidade do Voto
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Distribuição dos eleitores por nível de confiabilidade</p>
              </div>
            </div>
            <div ref={setupHorizontalScroll}>
                <table style={{ minWidth: '600px', width: '100%' }}>
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-2 text-gray-900 dark:text-white">Nível</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white">Total</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white">%</th>
                      <th className="px-4 py-2 w-1/3 text-gray-900 dark:text-white">Progresso</th>
                      <th className="text-center py-2 text-gray-900 dark:text-white">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedData(stats.porConfiabilidade, confiabilidadePage).map(({ confiabilidade, total }) => {
                      const percentage = (total / stats.totalEleitores) * 100;
                      const config = confiabilidadeConfig[confiabilidade as keyof typeof confiabilidadeConfig] || {
                        color: 'bg-gray-400',
                        icon: '❓',
                        description: 'Não definido'
                      };
                      
                      return (
                        <tr key={confiabilidade} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="py-2 flex items-center gap-2 text-gray-900 dark:text-white">
                            <span>{config.icon}</span>
                            {confiabilidade}
                          </td>
                          <td className="text-right py-2 text-gray-900 dark:text-white">{total}</td>
                          <td className="text-right py-2 text-gray-900 dark:text-white">{percentage.toFixed(1)}%</td>
                          <td className="px-4 py-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                              <div
                                className="h-2.5 rounded-full bg-blue-600"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </td>
                          <td className="py-2">
                            <div className="relative flex items-center justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuConfiabilidade(openMenuConfiabilidade === confiabilidade ? null : confiabilidade);
                                }}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                title="Opções de exportação"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                              </button>
                              
                              {openMenuConfiabilidade === confiabilidade && (
                                <div 
                                  className="absolute right-0 top-8 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportConfiabilidadeExcel(confiabilidade);
                                      setOpenMenuConfiabilidade(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                  >
                                    <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span>Excel</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportConfiabilidadePDF(confiabilidade);
                                      setOpenMenuConfiabilidade(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                  >
                                    <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                                    <span>PDF</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
            <TablePagination
              currentPage={confiabilidadePage}
              totalItems={stats.porConfiabilidade?.length || 0}
              itemsPerPage={itemsPerPage}
              onPageChange={setConfiabilidadePage}
            />
          </Card>

          {/* Aniversariantes do Mês */}
          <Card className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Cake className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  Aniversariantes do Mês
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Visualize todos os aniversariantes do mês selecionado</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm flex-1 sm:flex-initial bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                {aniversariantes.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuAniversariante(!openMenuAniversariante);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Exportar aniversariantes"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                    
                    {openMenuAniversariante && (
                      <div 
                        className="absolute right-0 top-10 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportAniversariantesExcel();
                            setOpenMenuAniversariante(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span>Excel</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportAniversariantesPDF();
                            setOpenMenuAniversariante(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                        >
                          <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span>PDF</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {loadingAniversariantes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : aniversariantes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Cake className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p>Nenhum aniversariante encontrado para este mês</p>
              </div>
            ) : (
              <>
                {generoFilter !== 'all' && (
                  <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg flex flex-row items-center justify-between gap-2">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      <span className="font-semibold">Filtro ativo:</span> {
                        generoFilter === 'MASCULINO' ? 'Masculino' : 
                        generoFilter === 'FEMININO' ? 'Feminino' : 
                        generoFilter === 'hoje' ? 'Aniversariantes de Hoje' :
                        generoFilter === '7dias' ? 'Últimos 7 dias' :
                        'Últimos 15 dias'
                      }
                    </p>
                    <button
                      onClick={() => {
                        setGeneroFilter('all');
                        setAniversariantesPage(1);
                      }}
                      className="text-xs text-yellow-800 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-200 underline whitespace-nowrap flex-shrink-0"
                    >
                      Limpar filtro
                    </button>
                  </div>
                )}
                
                {/* Filtro de Período - Dropdown */}
                <div className="mb-3 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Filtrar por período:
                  </label>
                  <select
                    value={generoFilter === '7dias' ? '7dias' : generoFilter === '15dias' ? '15dias' : 'all'}
                    onChange={(e) => {
                      setGeneroFilter(e.target.value as any);
                      setAniversariantesPage(1);
                    }}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="all">Todos do mês</option>
                    <option value="7dias">Últimos 7 dias</option>
                    <option value="15dias">Últimos 15 dias</option>
                  </select>
                </div>
                
                <div className={`mb-3 grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 ${
                  (() => {
                    const today = new Date();
                    const todayDay = today.getDate();
                    const todayMonth = today.getMonth() + 1;
                    const selectedMonthNum = parseInt(selectedMonth.split('-')[1]);
                    
                    if (selectedMonthNum === todayMonth) {
                      const aniversariantesHoje = aniversariantes.filter(e => {
                        const [, , d] = e.nascimento.split('-').map(Number);
                        return d === todayDay;
                      });
                      
                      if (aniversariantesHoje.length > 0) {
                        return 'lg:grid-cols-4';
                      }
                    }
                    return 'lg:grid-cols-3';
                  })()
                }`}>
                  <button
                    onClick={() => {
                      setGeneroFilter('all');
                      setAniversariantesPage(1);
                    }}
                    className={`p-3 sm:p-4 rounded-lg text-left transition-all hover:shadow-md cursor-pointer ${
                      generoFilter === 'all' ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-500 dark:ring-blue-400' : 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                    }`}
                  >
                    <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-300 font-medium mb-1">Total</p>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-200">{aniversariantes.length}</p>
                  </button>
                  
                  {/* Card de Aniversariantes de Hoje - Aparece após Total */}
                  {(() => {
                    const today = new Date();
                    const todayDay = today.getDate();
                    const todayMonth = today.getMonth() + 1;
                    const selectedMonthNum = parseInt(selectedMonth.split('-')[1]);
                    
                    if (selectedMonthNum === todayMonth) {
                      const aniversariantesHoje = aniversariantes.filter(e => {
                        const [, , d] = e.nascimento.split('-').map(Number);
                        return d === todayDay;
                      });
                      
                      if (aniversariantesHoje.length > 0) {
                        return (
                          <button
                            onClick={() => {
                              setGeneroFilter('hoje');
                              setAniversariantesPage(1);
                            }}
                            className={`p-3 sm:p-4 rounded-lg text-left transition-all hover:shadow-lg cursor-pointer border-2 ${
                              generoFilter === 'hoje' 
                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 border-green-500 dark:border-green-400 ring-2 ring-green-300 dark:ring-green-600' 
                                : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-300 dark:border-green-600 hover:border-green-400 dark:hover:border-green-500'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-1.5 bg-green-500 rounded-full flex-shrink-0">
                                <Cake className="w-4 h-4 text-white" />
                              </div>
                              <p className="text-xs font-medium text-green-700 dark:text-green-300">🎉 Aniversariantes Hoje</p>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <p className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-200">{aniversariantesHoje.length}</p>
                              <p className="text-xs text-green-600 dark:text-green-400">
                                {aniversariantesHoje.length === 1 ? 'pessoa' : 'pessoas'}
                              </p>
                            </div>
                          </button>
                        );
                      }
                    }
                    return null;
                  })()}
                  <button
                    onClick={() => {
                      setGeneroFilter('MASCULINO');
                      setAniversariantesPage(1);
                    }}
                    className={`p-3 sm:p-4 rounded-lg text-left transition-all hover:shadow-md cursor-pointer ${
                      generoFilter === 'MASCULINO' ? 'bg-cyan-100 dark:bg-cyan-900/50 ring-2 ring-cyan-500 dark:ring-cyan-400' : 'bg-cyan-50 dark:bg-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/40'
                    }`}
                  >
                    <p className="text-xs sm:text-sm text-cyan-600 dark:text-cyan-300 font-medium mb-1">Masculino</p>
                    <p className="text-2xl sm:text-3xl font-bold text-cyan-700 dark:text-cyan-200">
                      {aniversariantes.filter(e => e.genero?.toUpperCase() === 'MASCULINO').length}
                    </p>
                  </button>
                  <button
                    onClick={() => {
                      setGeneroFilter('FEMININO');
                      setAniversariantesPage(1);
                    }}
                    className={`p-3 sm:p-4 rounded-lg text-left transition-all hover:shadow-md cursor-pointer ${
                      generoFilter === 'FEMININO' ? 'bg-pink-100 dark:bg-pink-900/50 ring-2 ring-pink-500 dark:ring-pink-400' : 'bg-pink-50 dark:bg-pink-900/30 hover:bg-pink-100 dark:hover:bg-pink-900/40'
                    }`}
                  >
                    <p className="text-xs sm:text-sm text-pink-600 dark:text-pink-300 font-medium mb-1">Feminino</p>
                    <p className="text-2xl sm:text-3xl font-bold text-pink-700 dark:text-pink-200">
                      {aniversariantes.filter(e => e.genero?.toUpperCase() === 'FEMININO').length}
                    </p>
                  </button>
                </div>
                <div 
                  ref={(el) => {
                    if (el) {
                      el.style.cssText = 'overflow-x: scroll; overflow-y: visible; -webkit-overflow-scrolling: touch; width: 100%; position: relative;';
                      
                      // Controle de scroll com detecção de direção
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
                        
                        // Detecta se é scroll horizontal ou vertical
                        if (!isHorizontalScroll && deltaX < 10 && deltaY < 10) {
                          return; // Movimento muito pequeno, ignora
                        }
                        
                        if (!isHorizontalScroll) {
                          isHorizontalScroll = deltaX > deltaY;
                        }
                        
                        // Só previne default se for scroll horizontal
                        if (isHorizontalScroll) {
                          e.preventDefault();
                          const walk = (x - startX) * 2;
                          el.scrollLeft = scrollLeft - walk;
                        }
                      }, { passive: false });
                    }
                  }}
                >
                  <table style={{ minWidth: '700px', width: '100%', borderCollapse: 'collapse', userSelect: 'none' }}>
                      <thead>
                        <tr className="border-b dark:border-gray-700">
                          <th className="text-left py-2 px-2 text-gray-900 dark:text-white" style={{ width: '64px' }}>Dia</th>
                          <th className="text-left py-2 px-2 text-gray-900 dark:text-white" style={{ minWidth: '150px' }}>Nome</th>
                          <th className="text-left py-2 px-2 text-gray-900 dark:text-white" style={{ width: '128px' }}>Nascimento</th>
                          <th className="text-center py-2 px-2 text-gray-900 dark:text-white" style={{ width: '80px' }}>Idade</th>
                          <th className="text-center py-2 px-2 text-gray-900 dark:text-white" style={{ width: '80px' }}>Gênero</th>
                          <th className="text-left py-2 px-2 text-gray-900 dark:text-white" style={{ minWidth: '120px' }}>Contato</th>
                          <th className="text-left py-2 px-2 text-gray-900 dark:text-white" style={{ minWidth: '120px' }}>Bairro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Filtrar por gênero
                          let filteredAniversariantes = aniversariantes;
                          if (generoFilter === 'MASCULINO') {
                            filteredAniversariantes = aniversariantes.filter(e => e.genero?.toUpperCase() === 'MASCULINO');
                          } else if (generoFilter === 'FEMININO') {
                            filteredAniversariantes = aniversariantes.filter(e => e.genero?.toUpperCase() === 'FEMININO');
                          } else if (generoFilter === 'hoje') {
                            const today = new Date();
                            const todayDay = today.getDate();
                            filteredAniversariantes = aniversariantes.filter(e => {
                              const [, , d] = e.nascimento.split('-').map(Number);
                              return d === todayDay;
                            });
                          } else if (generoFilter === '7dias') {
                            const today = new Date();
                            const todayDay = today.getDate();
                            const startDay = Math.max(1, todayDay - 7);
                            filteredAniversariantes = aniversariantes.filter(e => {
                              const [, , d] = e.nascimento.split('-').map(Number);
                              return d >= startDay && d <= todayDay;
                            });
                          } else if (generoFilter === '15dias') {
                            const today = new Date();
                            const todayDay = today.getDate();
                            const startDay = Math.max(1, todayDay - 15);
                            filteredAniversariantes = aniversariantes.filter(e => {
                              const [, , d] = e.nascimento.split('-').map(Number);
                              return d >= startDay && d <= todayDay;
                            });
                          }
                          
                          return getPaginatedData(filteredAniversariantes, aniversariantesPage).map((eleitor, index) => {
                          const [y, m, d] = eleitor.nascimento.split('-').map(Number);
                          const birthDate = new Date(y, m - 1, d);
                          const day = birthDate.getDate();
                          const age = new Date().getFullYear() - birthDate.getFullYear();
                          
                          // Verificar se é aniversário hoje
                          const today = new Date();
                          const isToday = today.getDate() === day && (today.getMonth() + 1) === parseInt(selectedMonth.split('-')[1]);
                          
                          return (
                            <tr key={eleitor.uid} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${isToday ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                              <td className="py-3 px-2">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
                                  isToday ? 'bg-blue-500 dark:bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-500' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                }`}>
                                  {day}
                                </div>
                              </td>
                              <td className="py-3 px-2">
                                <Link 
                                  to={`/app/eleitores/${eleitor.uid}`} 
                                  className="text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                                >
                                  {eleitor.nome}
                                </Link>
                              </td>
                              <td className="py-3 px-2 text-xs text-gray-600 dark:text-gray-400">
                                {birthDate.toLocaleDateString('pt-BR')}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                                  {age}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-center">
                                {eleitor.genero?.toUpperCase() === 'MASCULINO' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300">
                                    ♂
                                  </span>
                                ) : eleitor.genero?.toUpperCase() === 'FEMININO' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-300">
                                    ♀
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-xs text-gray-600 dark:text-gray-400">
                                {eleitor.whatsapp || eleitor.telefone || '-'}
                              </td>
                              <td className="py-3 px-2 text-xs text-gray-600 dark:text-gray-400">
                                {eleitor.bairro || '-'}
                              </td>
                            </tr>
                          );
                        });
                        })()}
                      </tbody>
                    </table>
                </div>
                <TablePagination
                  currentPage={aniversariantesPage}
                  totalItems={(() => {
                    if (generoFilter === 'MASCULINO') {
                      return aniversariantes.filter(e => e.genero?.toUpperCase() === 'MASCULINO').length;
                    } else if (generoFilter === 'FEMININO') {
                      return aniversariantes.filter(e => e.genero?.toUpperCase() === 'FEMININO').length;
                    } else if (generoFilter === 'hoje') {
                      const today = new Date();
                      const todayDay = today.getDate();
                      return aniversariantes.filter(e => {
                        const [, , d] = e.nascimento.split('-').map(Number);
                        return d === todayDay;
                      }).length;
                    } else if (generoFilter === '7dias') {
                      const today = new Date();
                      const todayDay = today.getDate();
                      const startDay = Math.max(1, todayDay - 7);
                      return aniversariantes.filter(e => {
                        const [, , d] = e.nascimento.split('-').map(Number);
                        return d >= startDay && d <= todayDay;
                      }).length;
                    } else if (generoFilter === '15dias') {
                      const today = new Date();
                      const todayDay = today.getDate();
                      const startDay = Math.max(1, todayDay - 15);
                      return aniversariantes.filter(e => {
                        const [, , d] = e.nascimento.split('-').map(Number);
                        return d >= startDay && d <= todayDay;
                      }).length;
                    }
                    return aniversariantes.length;
                  })()}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setAniversariantesPage}
                />
              </>
            )}
          </Card>

          {/* Tabela de Usuários */}
          <Card className="p-4 mb-8 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cadastros por Usuário</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total de usuários ativos: {stats.porUsuario.length}</p>
              </div>
              <div className="text-sm w-full sm:w-auto">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded block text-center">
                  Líder: {stats.porUsuario[0]?.usuario_nome} ({stats.porUsuario[0]?.total})
                </span>
              </div>
            </div>
            <div ref={setupHorizontalScroll}>
                <table style={{ minWidth: '600px', width: '100%' }}>
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-2 text-gray-900 dark:text-white">Usuário</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white">Total</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white">%</th>
                      <th className="px-4 py-2 w-1/3 text-gray-900 dark:text-white">Progresso</th>
                      <th className="text-center py-2 text-gray-900 dark:text-white">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedData(stats.porUsuario, usuarioPage).map(({ usuario_nome, total }, index) => {
                      const percentage = (total / stats.totalEleitores) * 100;
                      return (
                        <tr key={usuario_nome} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${index === 0 ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                          <td className="py-2 text-gray-900 dark:text-white">{usuario_nome}</td>
                          <td className="text-right py-2 text-gray-900 dark:text-white">{total}</td>
                          <td className="text-right py-2 text-gray-900 dark:text-white">{percentage.toFixed(1)}%</td>
                          <td className="px-4 py-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-blue-400'}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </td>
                          <td className="py-2">
                            <div className="relative flex items-center justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuUsuario(openMenuUsuario === usuario_nome ? null : usuario_nome);
                                }}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                title="Opções de exportação"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                              </button>
                              
                              {openMenuUsuario === usuario_nome && (
                                <div 
                                  className="absolute right-0 top-8 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportUsuarioExcel(usuario_nome);
                                      setOpenMenuUsuario(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                  >
                                    <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span>Excel</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportUsuarioPDF(usuario_nome);
                                      setOpenMenuUsuario(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                  >
                                    <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                                    <span>PDF</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
            <TablePagination
              currentPage={usuarioPage}
              totalItems={stats.porUsuario.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setUsuarioPage}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
