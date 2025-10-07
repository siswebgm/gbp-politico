import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCompanyStore } from '../../store/useCompanyStore';
import { eleitorStatsService, EleitorStats } from '../../services/eleitorStats';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ChevronLeft, Loader2, Download, Users2, Building2, Home, MapPin, ThumbsUp, UserCircle2, FileSpreadsheet, FileText, MoreVertical } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { TablePagination } from '../../components/TablePagination';
import { useAuth } from '../../providers/AuthProvider';
import { hasRestrictedAccess } from '../../constants/accessLevels';
import { supabaseClient } from '../../lib/supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
      }
    };
    
    if (openMenuBairro || openMenuCidade || openMenuUsuario || openMenuConfiabilidade || openMenuIndicado || openMenuZona) {
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuBairro, openMenuCidade, openMenuUsuario, openMenuConfiabilidade, openMenuIndicado, openMenuZona]);

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
      <div className="bg-gray-50 rounded-lg p-0 sm:p-4">
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
        <div className="grid grid-cols-1 gap-4">
          {/* Cabeçalho com Total e Líderes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card Total de Eleitores */}
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 shadow-lg">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-300">Total de Eleitores</h3>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <Users2 className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.totalEleitores.toLocaleString()}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                    eleitores
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <span>{stats.porCidade.length} cidades</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{stats.porBairro.length} bairros</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{new Set(stats.porZonaSecao.map(z => z.zona)).size} zonas</span>
                </div>
              </div>
            </Card>

            {/* Cidade Líder */}
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 shadow-lg">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-300">Cidade Líder</h3>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <Building2 className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.porCidade[0]?.total.toLocaleString() || '0'}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                    eleitores
                  </span>
                </div>
                <div className="flex flex-col space-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate" title={stats.porCidade[0]?.cidade || '-'}>
                    {stats.porCidade[0]?.cidade || '-'}
                  </span>
                  <span>({((stats.porCidade[0]?.total / stats.totalEleitores) * 100).toFixed(1)}% do total)</span>
                </div>
              </div>
            </Card>

            {/* Bairro Líder */}
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 shadow-lg">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-300">Bairro Líder</h3>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <Home className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.porBairro[0]?.total.toLocaleString() || '0'}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                    eleitores
                  </span>
                </div>
                <div className="flex flex-col space-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate" title={stats.porBairro[0]?.bairro || '-'}>
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
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 shadow-lg">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-300">Zona Líder</h3>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <MapPin className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.porZonaSecao[0]?.total.toLocaleString() || '0'}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                    eleitores
                  </span>
                </div>
                <div className="flex flex-col space-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    Zona {stats.porZonaSecao[0]?.zona || '-'}
                  </span>
                  <span>Seção {stats.porZonaSecao[0]?.secao || '-'}</span>
                  <span>({((stats.porZonaSecao[0]?.total / stats.totalEleitores) * 100).toFixed(1)}% do total)</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Distribuição por Cidade */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold">Distribuição por Cidade</h3>
                <p className="text-sm text-gray-500">Total de cidades: {stats.porCidade.length}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 text-sm w-full sm:w-auto">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-center">
                  Maior: {stats.porCidade[0]?.cidade} ({stats.porCidade[0]?.total})
                </span>
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-center">
                  Menor: {stats.porCidade[stats.porCidade.length - 1]?.cidade} ({stats.porCidade[stats.porCidade.length - 1]?.total})
                </span>
              </div>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[600px] px-4 sm:px-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Cidade</th>
                      <th className="text-right py-2">Total</th>
                      <th className="text-right py-2">%</th>
                      <th className="px-4 py-2 w-1/3">Progresso</th>
                      <th className="text-center py-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedData(stats.porCidade, cidadePage).map(({ cidade, total }, index) => {
                      const percentage = (total / stats.totalEleitores) * 100;
                      return (
                        <tr key={cidade} className={`border-b hover:bg-gray-50 ${index === 0 ? 'bg-blue-50' : ''}`}>
                          <td className="py-2">{cidade}</td>
                          <td className="text-right py-2">{total}</td>
                          <td className="text-right py-2">{percentage.toFixed(1)}%</td>
                          <td className="px-4 py-2">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
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
                                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                title="Opções de exportação"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-600" />
                              </button>
                              
                              {openMenuCidade === cidade && (
                                <div 
                                  className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportCidadeExcel(cidade);
                                      setOpenMenuCidade(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                    <span>Excel</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportCidadePDF(cidade);
                                      setOpenMenuCidade(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <FileText className="w-4 h-4 text-red-600" />
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
            </div>
            <TablePagination
              currentPage={cidadePage}
              totalItems={stats.porCidade.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCidadePage}
            />
          </Card>

          {/* Distribuição por Indicado */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold">Distribuição por Indicado</h3>
                <p className="text-sm text-gray-500">
                  Total de indicados: {stats.porIndicado.length}
                </p>
              </div>
              {stats.porIndicado.length > 0 && (
                <div className="text-sm w-full sm:w-auto">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded block text-center">
                    Maior: {stats.porIndicado[0]?.indicado_nome} ({stats.porIndicado[0]?.total})
                  </span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Indicado</th>
                    <th className="text-right py-2">Total</th>
                    <th className="text-right py-2">%</th>
                    <th className="px-4 py-2">Distribuição</th>
                    <th className="text-center py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedData(stats.porIndicado, indicadoPage).map((item, index) => {
                    const percentage = (item.total / stats.totalEleitores) * 100;
                    return (
                      <tr key={item.indicado_nome} className={`border-b hover:bg-gray-50 ${index === 0 ? 'bg-blue-50' : ''}`}>
                        <td className="py-2">{item.indicado_nome}</td>
                        <td className="text-right py-2">{item.total}</td>
                        <td className="text-right py-2">{percentage.toFixed(1)}%</td>
                        <td className="px-4 py-2">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
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
                              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                              title="Opções de exportação"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-600" />
                            </button>
                            
                            {openMenuIndicado === item.indicado_nome && (
                              <div 
                                className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportIndicadoExcel(item.indicado_nome);
                                    setOpenMenuIndicado(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                  <span>Excel</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportIndicadoPDF(item.indicado_nome);
                                    setOpenMenuIndicado(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <FileText className="w-4 h-4 text-red-600" />
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
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold">Distribuição por Bairro</h3>
                <p className="text-sm text-gray-500">
                  Total de bairros: {stats.porBairro.length} em {new Set(stats.porBairro.map(b => b.cidade)).size} cidades
                </p>
              </div>
              <div className="text-sm w-full sm:w-auto">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded block text-center">
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
                  <div key={cidade} className="bg-gray-50 rounded-lg p-4">
                    {/* Cabeçalho da Cidade */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-2 border-b">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800">{cidade}</h4>
                        <p className="text-sm text-gray-500">
                          {bairros.length} bairros | Total: {cidadeTotal} ({cidadePercentage.toFixed(1)}%)
                        </p>
                      </div>
                    </div>

                    {/* Tabela de Bairros */}
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <div className="min-w-[600px] px-4 sm:px-0">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Bairro</th>
                              <th className="text-right py-2">Total</th>
                              <th className="text-right py-2">% da Cidade</th>
                              <th className="text-right py-2">% Total</th>
                              <th className="px-4 py-2 w-1/3">Progresso</th>
                              <th className="text-center py-2">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedBairros.map((bairro, index) => {
                              const percentageTotal = (bairro.total / stats.totalEleitores) * 100;
                              const percentageCidade = (bairro.total / cidadeTotal) * 100;

                              return (
                                <tr
                                  key={`${bairro.cidade}-${bairro.bairro}`}
                                  className={`border-b hover:bg-white transition-colors ${
                                    index === 0 ? 'bg-green-50/50' : ''
                                  }`}
                                >
                                  <td className="py-2">{bairro.bairro}</td>
                                  <td className="text-right py-2">{bairro.total}</td>
                                  <td className="text-right py-2">{percentageCidade.toFixed(1)}%</td>
                                  <td className="text-right py-2">{percentageTotal.toFixed(1)}%</td>
                                  <td className="px-4 py-2">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
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
                                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                        title="Opções de exportação"
                                      >
                                        <MoreVertical className="w-4 h-4 text-gray-600" />
                                      </button>
                                      
                                      {openMenuBairro === `${bairro.cidade}-${bairro.bairro}` && (
                                        <div 
                                          className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleExportBairroExcel(bairro.cidade, bairro.bairro);
                                              setOpenMenuBairro(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                          >
                                            <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                            <span>Excel</span>
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleExportBairroPDF(bairro.cidade, bairro.bairro);
                                              setOpenMenuBairro(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                          >
                                            <FileText className="w-4 h-4 text-red-600" />
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
                        <TablePagination
                          currentPage={currentPage}
                          totalItems={bairros.length}
                          itemsPerPage={bairrosPerPage}
                          onPageChange={(page) => handleBairroPageChange(cidade, page)}
                        />
                      </div>
                    </div>
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
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold">Distribuição por Zona e Seção</h3>
                <p className="text-sm text-gray-500">
                  Total de zonas/seções: {stats.porZonaSecao.length}
                </p>
              </div>
              {stats.porZonaSecao.length > 0 && (
                <div className="text-sm w-full sm:w-auto">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded block text-center">
                    Maior: Zona {stats.porZonaSecao[0]?.zona} Seção {stats.porZonaSecao[0]?.secao} ({stats.porZonaSecao[0]?.total})
                  </span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Zona</th>
                    <th className="text-left py-2">Seção</th>
                    <th className="text-right py-2">Total</th>
                    <th className="text-right py-2">%</th>
                    <th className="px-4 py-2">Distribuição</th>
                    <th className="text-center py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedData(stats.porZonaSecao, zonaPage).map((item, index) => {
                    const percentage = (item.total / stats.totalEleitores) * 100;
                    const zonaSecaoKey = `${item.zona}-${item.secao}`;
                    return (
                      <tr key={zonaSecaoKey} className={`border-b hover:bg-gray-50 ${index === 0 ? 'bg-blue-50' : ''}`}>
                        <td className="py-2">{item.zona}</td>
                        <td className="py-2">{item.secao}</td>
                        <td className="text-right py-2">{item.total}</td>
                        <td className="text-right py-2">{percentage.toFixed(1)}%</td>
                        <td className="px-4 py-2">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
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
                              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                              title="Opções de exportação"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-600" />
                            </button>
                            
                            {openMenuZona === zonaSecaoKey && (
                              <div 
                                className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportZonaExcel(item.zona, item.secao);
                                    setOpenMenuZona(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                  <span>Excel</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportZonaPDF(item.zona, item.secao);
                                    setOpenMenuZona(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <FileText className="w-4 h-4 text-red-600" />
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
              <TablePagination
                currentPage={zonaPage}
                totalItems={stats.porZonaSecao.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setZonaPage}
              />
            </div>
          </Card>

          {/* Top 5 Eleitores com Mais Atendimentos */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users2 className="w-5 h-5" />
                  Top 20 Eleitores - Atendimentos
                </h3>
                <p className="text-sm text-gray-500">Eleitores com maior número de atendimentos registrados</p>
              </div>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[600px] px-4 sm:px-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 w-1/3">Eleitor</th>
                      <th className="text-right py-2 w-1/4">WhatsApp</th>
                      <th className="text-right py-2 w-20">Total</th>
                      <th className="px-4 py-2 w-1/4">Progresso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedData(stats.topEleitoresAtendimentos, topEleitoresPage).map((eleitor) => {
                      const maxAtendimentos = stats.topEleitoresAtendimentos[0]?.total_atendimentos || 1;

                      return (
                        <tr key={eleitor.eleitor_nome}>
                          <td className="py-2 truncate">
                            <div className="flex items-center gap-2">
                              <Link 
                                to={`/app/eleitores/${eleitor.uid}`} 
                                className="flex items-center gap-2 text-gray-900 hover:text-primary"
                              >
                                <UserCircle2 className="w-5 h-5 text-primary" />
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
            </div>
            <TablePagination
              currentPage={topEleitoresPage}
              totalItems={stats.topEleitoresAtendimentos?.length || 0}
              itemsPerPage={itemsPerPage}
              onPageChange={setTopEleitoresPage}
            />
          </Card>

          {/* Tabela de Confiabilidade */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ThumbsUp className="w-5 h-5" />
                  Confiabilidade do Voto
                </h3>
                <p className="text-sm text-gray-500">Distribuição dos eleitores por nível de confiabilidade</p>
              </div>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[600px] px-4 sm:px-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Nível</th>
                      <th className="text-right py-2">Total</th>
                      <th className="text-right py-2">%</th>
                      <th className="px-4 py-2 w-1/3">Progresso</th>
                      <th className="text-center py-2">Ações</th>
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
                        <tr key={confiabilidade} className="border-b hover:bg-gray-50">
                          <td className="py-2 flex items-center gap-2">
                            <span>{config.icon}</span>
                            {confiabilidade}
                          </td>
                          <td className="text-right py-2">{total}</td>
                          <td className="text-right py-2">{percentage.toFixed(1)}%</td>
                          <td className="px-4 py-2">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
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
                                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                title="Opções de exportação"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-600" />
                              </button>
                              
                              {openMenuConfiabilidade === confiabilidade && (
                                <div 
                                  className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportConfiabilidadeExcel(confiabilidade);
                                      setOpenMenuConfiabilidade(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                    <span>Excel</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportConfiabilidadePDF(confiabilidade);
                                      setOpenMenuConfiabilidade(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <FileText className="w-4 h-4 text-red-600" />
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
            </div>
            <TablePagination
              currentPage={confiabilidadePage}
              totalItems={stats.porConfiabilidade?.length || 0}
              itemsPerPage={itemsPerPage}
              onPageChange={setConfiabilidadePage}
            />
          </Card>

          {/* Tabela de Usuários */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold">Cadastros por Usuário</h3>
                <p className="text-sm text-gray-500">Total de usuários ativos: {stats.porUsuario.length}</p>
              </div>
              <div className="text-sm w-full sm:w-auto">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded block text-center">
                  Líder: {stats.porUsuario[0]?.usuario_nome} ({stats.porUsuario[0]?.total})
                </span>
              </div>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[600px] px-4 sm:px-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Usuário</th>
                      <th className="text-right py-2">Total</th>
                      <th className="text-right py-2">%</th>
                      <th className="px-4 py-2 w-1/3">Progresso</th>
                      <th className="text-center py-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedData(stats.porUsuario, usuarioPage).map(({ usuario_nome, total }, index) => {
                      const percentage = (total / stats.totalEleitores) * 100;
                      return (
                        <tr key={usuario_nome} className={`border-b hover:bg-gray-50 ${index === 0 ? 'bg-blue-50' : ''}`}>
                          <td className="py-2">{usuario_nome}</td>
                          <td className="text-right py-2">{total}</td>
                          <td className="text-right py-2">{percentage.toFixed(1)}%</td>
                          <td className="px-4 py-2">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
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
                                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                title="Opções de exportação"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-600" />
                              </button>
                              
                              {openMenuUsuario === usuario_nome && (
                                <div 
                                  className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportUsuarioExcel(usuario_nome);
                                      setOpenMenuUsuario(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                    <span>Excel</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportUsuarioPDF(usuario_nome);
                                      setOpenMenuUsuario(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <FileText className="w-4 h-4 text-red-600" />
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
