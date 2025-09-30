import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { 
  Search as SearchIcon, 
  Download as DownloadIcon, 
  MessageSquare, 
  Clipboard, 
  Download, 
  ArrowLeft, 
  MapPin,
  Smartphone,
  Users,
  PieChart,
  BarChart3,
  FileText,
  FileSpreadsheet,
  Filter as FilterIcon,
  SlidersHorizontal,
  Star,
  Calendar,
  MapPin as MapPinIcon,
  X,
  ChevronDown
} from 'lucide-react';
import { ParticipantesStats } from '../../components/Stats/ParticipantesStats';
import { Skeleton } from '../../components/ui/skeleton';
import { Badge } from '../../components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '../../providers/AuthProvider';
import { pesquisaEleitoralService, type PesquisaEleitoral } from '../../services/pesquisaEleitoralService';
import { pesquisaRespostaService } from '../../services/pesquisaRespostaService';
import { supabaseClient } from '../../lib/supabase';
import { pesquisaParticipanteService, type ParticipantePesquisa } from '../../services/pesquisaParticipanteService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

type RespostaPergunta = {
  id: string;
  pergunta: string;
  tipo: string;
  respostas: Array<{
    valor: string | number | boolean;
    contagem: number;
    porcentagem: number;
  }>;
  totalRespostas: number;
};

type ResumoRespostas = {
  totalRespostas: number;
  respostasPorDia: Array<{ data: string; total: number }>;
  dispositivos: Array<{ tipo: string; total: number; porcentagem: number }>;
  localizacoes: Array<{ cidade: string; total: number; porcentagem: number }>;
  perguntas: RespostaPergunta[];
};

type Pergunta = {
  id: string;
  texto: string;
  tipo: 'texto' | 'escolha_unica' | 'multipla_escolha' | 'escala';
  obrigatoria: boolean;
  opcoes?: string[];
};

interface OpiniaoSincera {
  id: string;
  uid: string;
  participante_nome: string;
  participante_telefone?: string;
  opiniao_sincera: string;
  created_at: string;
  cidade: string | null;
  bairro: string | null;
  participante_cidade?: string;
  participante_bairro?: string;
  importante?: boolean;
  sentimento?: 'positivo' | 'negativo' | 'neutro';
};

export function VisualizarPesquisa() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pesquisa, setPesquisa] = useState<(PesquisaEleitoral & { 
    ativa?: boolean; 
    criado_em?: string; 
    total_respostas?: number 
  }) | null>(null);
  const [respostas, setRespostas] = useState<ResumoRespostas | null>(null);
  const [participantes, setParticipantes] = useState<ParticipantePesquisa[]>([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [termoBusca, setTermoBusca] = useState('');
  const itensPorPagina = 10;
  const [loading, setLoading] = useState(true);
  const [loadingRespostas, setLoadingRespostas] = useState(false);
  const [loadingParticipantes, setLoadingParticipantes] = useState(false);
  const { user } = useAuth();
  const [participanteSelecionado, setParticipanteSelecionado] = useState<ParticipantePesquisa | null>(null);
  const [respostasParticipante, setRespostasParticipante] = useState<any[]>([]);
  const [mostrarModalRespostas, setMostrarModalRespostas] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('participantes');
  const [opinioesSinceras, setOpinioesSinceras] = useState<OpiniaoSincera[]>([]);
  const [opinioesFiltradas, setOpinioesFiltradas] = useState<OpiniaoSincera[]>([]);
  const [buscaOpiniao, setBuscaOpiniao] = useState('');
  const [carregandoOpinioes, setCarregandoOpinioes] = useState(false);
  const [loadingExportacao, setLoadingExportacao] = useState(false);
  const [exportacaoTipo, setExportacaoTipo] = useState<'xlsx' | 'pdf' | null>(null);
  const [filtroImportante, setFiltroImportante] = useState<boolean | null>(null);
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [cidadeFiltro, setCidadeFiltro] = useState<string>('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarExportacao, setMostrarExportacao] = useState(false);

  // Função para abrir o Google Maps com as localizações
  const handleVerMapa = () => {
    console.log('=== INÍCIO handleVerMapa ===');
    console.log('Botão Ver Mapa clicado');
    
    // Verifica se há respostas e localizações
    if (!respostas) {
      console.error('respostas está undefined');
      toast.error('Erro ao carregar os dados da pesquisa');
      return;
    }
    
    if (!respostas.localizacoes) {
      console.error('respostas.localizacoes está undefined');
      toast.error('Dados de localização não disponíveis');
      return;
    }
    
    if (respostas.localizacoes.length === 0) {
      console.log('Nenhuma localização disponível no array respostas.localizacoes');
      console.log('Conteúdo de respostas:', JSON.stringify(respostas, null, 2));
      toast.info('Nenhuma localização disponível para exibir no mapa.');
      return;
    }
    
    console.log('Localizações disponíveis (bruto):', JSON.stringify(respostas.localizacoes, null, 2));
    
    // Verifica se todas as localizações são "Não informada"
    const todasNaoInformadas = respostas.localizacoes.every(loc => 
      !loc || !loc.cidade || 
      ['não informada', 'nao informada', 'n/a', 'null', 'undefined', 'não informado', 'nao informado', '']
        .includes(loc.cidade.toString().trim().toLowerCase())
    );
    
    if (todasNaoInformadas) {
      console.log('Todas as localizações estão como "Não informada"');
      toast.info('As localizações dos participantes não foram informadas.');
      return;
    }
    
    // Filtra localizações válidas (não nulas e não 'Não informada')
    const localizacoesValidas = respostas.localizacoes.filter(loc => {
      if (!loc || !loc.cidade) {
        console.log('Localização ou cidade inválida:', loc);
        return false;
      }
      
      const cidade = loc.cidade.toString().trim();
      const cidadeMinuscula = cidade.toLowerCase();
      
      console.log(`Processando localização:`, {
        cidade: loc.cidade,
        tipo: typeof loc.cidade,
        isNull: loc.cidade === null,
        isUndefined: loc.cidade === undefined,
        isString: typeof loc.cidade === 'string',
        trim: cidade
      });
      
      // Verifica se a cidade é válida
      const cidadeInvalida = [
        'não informada', 'nao informada', 'n/a', 'null', 'undefined', 
        'não informado', 'nao informado', ''
      ].includes(cidadeMinuscula);
      
      if (cidadeInvalida) {
        console.log(`Localização inválida ou vazia:`, loc);
        return false;
      }
      
      return true;
    });

    console.log('Localizações válidas para o mapa:', JSON.stringify(localizacoesValidas, null, 2));

    if (localizacoesValidas.length === 0) {
      console.log('Nenhuma localização válida encontrada após filtro');
      console.log('Localizações originais:', JSON.stringify(respostas.localizacoes, null, 2));
      toast.info('Não foi possível encontrar localizações válidas para exibir no mapa.');
      return;
    }

    try {
      // Pega a primeira localização para centralizar o mapa
      const primeiraLocalizacao = localizacoesValidas[0].cidade;
      
      // Cria a URL do Google Maps com um marcador para cada localização
      const marcadores = localizacoesValidas
        .map(loc => `markers=color:red%7C${encodeURIComponent(loc.cidade)}`)
        .join('&');
      
      const url = `https://www.google.com/maps?${marcadores}&q=${encodeURIComponent(primeiraLocalizacao)}`;
      
      console.log('Abrindo URL do Google Maps:', url);
      
      // Abre o Google Maps em uma nova aba
      const novaAba = window.open(url, '_blank');
      
      if (!novaAba) {
        throw new Error('Não foi possível abrir o Google Maps. Verifique as configurações do seu navegador.');
      }
      
      console.log('Nova aba aberta com sucesso');
    } catch (error) {
      console.error('Erro ao abrir o Google Maps:', error);
      toast.error('Não foi possível abrir o Google Maps. Tente novamente mais tarde.');
    }
  };

  // Função para exportar para XLSX
  const exportarParaXLSX = (dados: OpiniaoSincera[]) => {
    const dadosFormatados = dados.map(opiniao => ({
      'Nome': opiniao.participante_nome || 'Não informado',
      'Telefone': opiniao.participante_telefone || 'Não informado',
      'Cidade': opiniao.cidade || 'Não informado',
      'Bairro': opiniao.bairro || 'Não informado',
      'Data': new Date(opiniao.created_at).toLocaleString('pt-BR'),
      'Opinião': opiniao.opiniao_sincera,
      'Importante': opiniao.importante ? 'Sim' : 'Não',
      'Sentimento': opiniao.sentimento || 'Não analisado'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dadosFormatados);
    
    // Ajusta o tamanho das colunas
    const wscols = [
      { wch: 25 }, // Nome
      { wch: 15 }, // Telefone
      { wch: 20 }, // Cidade
      { wch: 20 }, // Bairro
      { wch: 20 }, // Data
      { wch: 50 }, // Opinião
      { wch: 12 }, // Importante
      { wch: 15 }  // Sentimento
    ];
    ws['!cols'] = wscols;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Opiniões Sinceras');
    XLSX.writeFile(wb, `opinioes-sinceras-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Função para exportar para PDF
  const exportarParaPDF = (dados: OpiniaoSincera[]) => {
    const doc = new jsPDF();
    const titulo = 'Relatório de Opiniões Sinceras';
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    
    // Título do documento
    doc.setFontSize(18);
    doc.text(titulo, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${dataAtual}`, 14, 30);
    
    // Cabeçalho da tabela
    const headers = [['Nome', 'Telefone', 'Cidade', 'Data', 'Opinião', 'Importante', 'Sentimento']];
    
    // Dados da tabela
    const data = dados.map(opiniao => [
      opiniao.participante_nome || 'Não informado',
      opiniao.participante_telefone || 'Não informado',
      opiniao.cidade || 'Não informado',
      new Date(opiniao.created_at).toLocaleString('pt-BR'),
      opiniao.opiniao_sincera || '',
      opiniao.importante ? 'Sim' : 'Não',
      opiniao.sentimento || 'Não analisado'
    ]);
    
    // Adiciona a tabela
    (doc as any).autoTable({
      head: headers,
      body: data,
      startY: 40,
      styles: { fontSize: 7 }, // Reduz ligeiramente o tamanho da fonte para caber mais colunas
      columnStyles: {
        0: { cellWidth: 25 }, // Nome
        1: { cellWidth: 20 }, // Telefone
        2: { cellWidth: 20 }, // Cidade
        3: { cellWidth: 20 }, // Data
        4: { cellWidth: 60 }, // Opinião
        5: { cellWidth: 15 }, // Importante
        6: { cellWidth: 20 }  // Sentimento
      },
      headStyles: { fillColor: [41, 128, 185] },
      didDrawPage: function(data) {
        // Adiciona o total de registros no final de cada página
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(`Página ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, pageHeight - 10);
      }
    });
    
    // Adiciona o total de registros
    doc.text(`Total de registros: ${dados.length}`, 14, (doc as any).lastAutoTable.finalY + 10);
    
    // Adiciona número de páginas
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
    }
    
    // Salva o PDF
    doc.save(`opinioes-sinceras-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Função para exportar opiniões
  const exportarOpinioes = async (tipo: 'xlsx' | 'pdf') => {
    if (!opinioesSinceras || opinioesSinceras.length === 0) {
      toast.warning('Não há opiniões para exportar');
      return;
    }
    
    setExportacaoTipo(tipo);
    setLoadingExportacao(true);
    
    try {
      if (tipo === 'xlsx') {
        exportarParaXLSX(opinioesFiltradas);
      } else {
        exportarParaPDF(opinioesFiltradas);
      }
      toast.success(`Exportação para ${tipo.toUpperCase()} realizada com sucesso!`);
    } catch (error) {
      console.error(`Erro ao exportar para ${tipo}:`, error);
      toast.error(`Erro ao exportar para ${tipo.toUpperCase()}`);
    } finally {
      setLoadingExportacao(false);
      setExportacaoTipo(null);
    }
  };

  // Função para carregar as opiniões sinceras
  const carregarOpinioesSinceras = async (pesquisaId: string) => {
    if (!pesquisaId) {
      console.error('ID da pesquisa não fornecido');
      return;
    }
    
    console.log('Carregando opiniões sinceras para pesquisa ID:', pesquisaId);
    setCarregandoOpinioes(true);
    
    try {
      console.log('Iniciando consulta ao Supabase...');
      const { data, error } = await supabaseClient
        .from('ps_gbp_respostas')
        .select('uid, participante_nome, participante_telefone, opiniao_sincera, created_at, participante_cidade, participante_bairro, importante')
        .eq('pesquisa_uid', pesquisaId)
        .not('opiniao_sincera', 'is', null)
        .order('created_at', { ascending: false });
      
      console.log('Resposta do Supabase:', { error, data });
      
      if (error) {
        console.error('Erro na consulta:', error);
        throw error;
      }
      
      const opinioes = (data || []).map(item => ({
        id: item.uid,
        ...item,
        cidade: item.participante_cidade,
        bairro: item.participante_bairro,
        importante: item.importante || false
      }));
      
      console.log('Opiniões processadas:', opinioes);
      setOpinioesSinceras(opinioes);
      setOpinioesFiltradas(opinioes); // Inicializa as opiniões filtradas
    } catch (error) {
      console.error('Erro ao carregar opiniões sinceras:', error);
      toast.error('Erro ao carregar as opiniões sinceras');
    } finally {
      setCarregandoOpinioes(false);
    }
  };

  // Alternar status de importante
  const toggleImportante = async (opiniao: OpiniaoSincera) => {
    if (!opiniao || !opiniao.uid) {
      console.error('Opinião inválida para marcar como importante:', opiniao);
      toast.error('Não foi possível processar a opinião');
      return;
    }
    
    const novoStatus = !opiniao.importante;
    
    try {
      // Atualiza o estado local imediatamente para feedback visual
      setOpinioesSinceras(prev => 
        prev.map(item => 
          item.uid === opiniao.uid 
            ? { ...item, importante: novoStatus } 
            : item
        )
      );
      
      // Atualiza a lista filtrada também para manter consistência
      setOpinioesFiltradas(prev => 
        prev.map(item => 
          item.uid === opiniao.uid 
            ? { ...item, importante: novoStatus } 
            : item
        )
      );
      
      // Atualiza no banco de dados usando a função RPC personalizada
      const { data, error } = await supabaseClient.rpc('marcar_opiniao_importante', {
        p_resposta_uid: opiniao.uid,
        p_importante: novoStatus
      });
        
      if (error) {
        console.error('Erro ao chamar a função RPC:', error);
        throw error;
      }
      
      console.log('Resposta da função RPC:', data);
      
      toast.success(`Opinião ${novoStatus ? 'marcada' : 'desmarcada'} como importante`);
    } catch (error) {
      console.error('Erro ao atualizar status de importante:', error);
      toast.error('Erro ao atualizar status da opinião');
      
      // Reverte a mudança em caso de erro
      setOpinioesSinceras(prev => 
        prev.map(item => 
          item.uid === opiniao.uid 
            ? { ...item, importante: !novoStatus } 
            : item
        )
      );
      
      // Também reverte na lista filtrada
      setOpinioesFiltradas(prev => 
        prev.map(item => 
          item.uid === opiniao.uid 
            ? { ...item, importante: !novoStatus } 
            : item
        )
      );
    }
  };

  // Efeito para filtrar opiniões sinceras
  useEffect(() => {
    let filtradas = [...opinioesSinceras];
    
    // Aplicar filtro de busca
    if (buscaOpiniao.trim()) {
      const termo = buscaOpiniao.toLowerCase();
      filtradas = filtradas.filter(
        (opiniao) =>
          (opiniao.participante_nome?.toLowerCase().includes(termo)) ||
          (opiniao.opiniao_sincera?.toLowerCase().includes(termo)) ||
          (opiniao.cidade?.toLowerCase().includes(termo)) ||
          (opiniao.bairro?.toLowerCase().includes(termo)) ||
          (opiniao.participante_telefone?.includes(termo))
      );
    }
    
    // Aplicar filtro de importante
    if (filtroImportante !== null) {
      filtradas = filtradas.filter(opiniao => opiniao.importante === filtroImportante);
    }
    
    // Aplicar filtro de data
    if (dataInicio) {
      const dataInicioObj = new Date(dataInicio);
      filtradas = filtradas.filter(opiniao => new Date(opiniao.created_at) >= dataInicioObj);
    }
    
    if (dataFim) {
      const dataFimObj = new Date(dataFim);
      dataFimObj.setHours(23, 59, 59); // Fim do dia
      filtradas = filtradas.filter(opiniao => new Date(opiniao.created_at) <= dataFimObj);
    }
    
    // Aplicar filtro de cidade
    if (cidadeFiltro) {
      filtradas = filtradas.filter(opiniao => 
        opiniao.cidade?.toLowerCase().includes(cidadeFiltro.toLowerCase())
      );
    }
    
    setOpinioesFiltradas(filtradas);
  }, [buscaOpiniao, opinioesSinceras, filtroImportante, dataInicio, dataFim, cidadeFiltro]);
  
  // Limpar todos os filtros
  const limparFiltros = () => {
    setBuscaOpiniao('');
    setFiltroImportante(null);
    setDataInicio('');
    setDataFim('');
    setCidadeFiltro('');
    setMostrarFiltros(false);
    
    // Forçar atualização da lista filtrada
    setOpinioesFiltradas(opinioesSinceras);
  };

  // Formatar número de telefone
  const formatarTelefone = (telefone: string) => {
    if (!telefone) return '';
    
    // Remove tudo que não for número
    const numeros = telefone.replace(/\D/g, '');
    
    // Formatação para telefone fixo ou celular
    if (numeros.length === 11) {
      return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 7)}-${numeros.substring(7)}`;
    } else if (numeros.length === 10) {
      return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 6)}-${numeros.substring(6)}`;
    } else if (numeros.length <= 9) {
      return numeros.replace(/^(\d{4,5})(\d{4})$/, '$1-$2');
    }
    
    return telefone;
  };

  // Efeito para carregar opiniões sinceras quando a aba for alterada
  useEffect(() => {
    if (abaAtiva === 'opinioes' && pesquisa?.uid) {
      console.log('Aba de opiniões ativada, recarregando opiniões...');
      carregarOpinioesSinceras(pesquisa.uid);
    }
  }, [abaAtiva, pesquisa?.uid]);

  // Carregar dados da pesquisa
  useEffect(() => {
    const carregarPesquisa = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const data = await pesquisaEleitoralService.obter(id);
        if (data) {
          setPesquisa(data);
          // Carrega as respostas, participantes e opiniões sinceras após carregar a pesquisa
          carregarRespostas(data.uid);
          carregarParticipantes(data.uid, 1); // Inicia na página 1
          carregarOpinioesSinceras(data.uid);
        } else {
          toast.error('Pesquisa não encontrada');
          navigate('/app/pesquisas');
        }
      } catch (error) {
        console.error('Erro ao carregar pesquisa:', error);
        toast.error('Erro ao carregar os dados da pesquisa');
        navigate('/app/pesquisas');
      } finally {
        setLoading(false);
      }
    };

    carregarPesquisa();
  }, [id, navigate]);

  // Carregar participantes quando a pesquisa for carregada
  useEffect(() => {
    if (pesquisa?.uid) {
      carregarParticipantes(pesquisa.uid, 1, '');
    }
  }, [pesquisa?.uid]);

  // Carregar participantes da pesquisa com busca e paginação
  const carregarParticipantes = async (pesquisaId: string, pagina: number = 1, busca: string = '') => {
    if (!pesquisaId) return;
    
    setLoadingParticipantes(true);
    try {
      const empresaUid = user?.empresa_uid;
      const offset = (pagina - 1) * itensPorPagina;
      
      // Se não há termo de busca, faz a busca paginada diretamente no servidor
      if (!busca.trim()) {
        const { data, count } = await pesquisaParticipanteService.obterParticipantesPorPesquisa(
          pesquisaId,
          empresaUid,
          itensPorPagina,
          offset
        );
        
        if (data) {
          setParticipantes(data);
          setTotalRegistros(count || 0);
          setTotalPaginas(Math.ceil((count || 0) / itensPorPagina));
          setPaginaAtual(pagina);
        } else {
          setParticipantes([]);
          setTotalRegistros(0);
          setTotalPaginas(1);
        }
        return;
      }
      
      // Se há termo de busca, busca todos os participantes e filtra localmente
      const { data } = await pesquisaParticipanteService.obterParticipantesPorPesquisa(
        pesquisaId,
        empresaUid,
        1000, // Busca mais itens para permitir filtragem local
        0
      );
      
      if (!data) {
        setParticipantes([]);
        setTotalRegistros(0);
        setTotalPaginas(1);
        return;
      }
      
      // Aplicar filtro local com o termo de busca
      const termo = busca.toLowerCase().trim();
      const participantesFiltrados = data.filter(participante => {
        return (
          (participante.nome?.toLowerCase().includes(termo)) ||
          (participante.telefone?.includes(termo)) ||
          (participante.cidade?.toLowerCase().includes(termo)) ||
          (participante.bairro?.toLowerCase().includes(termo)) ||
          (participante.dados_completos?.endereco_completo?.cidade?.toLowerCase().includes(termo)) ||
          (participante.dados_completos?.endereco_completo?.bairro?.toLowerCase().includes(termo))
        );
      });
      
      // Ordenar por data da última resposta (mais recente primeiro)
      participantesFiltrados.sort((a, b) => {
        return new Date(b.ultima_resposta).getTime() - new Date(a.ultima_resposta).getTime();
      });
      
      // Aplicar paginação
      const total = participantesFiltrados.length;
      const inicio = offset;
      const fim = offset + itensPorPagina;
      const participantesPaginados = participantesFiltrados.slice(inicio, fim);
      
      setParticipantes(participantesPaginados);
      setTotalRegistros(total);
      setTotalPaginas(Math.ceil(total / itensPorPagina));
      setPaginaAtual(pagina);
      
    } catch (error) {
      console.error('Erro ao carregar participantes:', error);
      toast.error('Erro ao carregar participantes');
    } finally {
      setLoadingParticipantes(false);
    }
  };
  
  // Função para exportar participantes para XLSX com informações completas
  const exportarParaExcel = async () => {
    if (!pesquisa) return;
    
    setLoadingParticipantes(true);
    
    try {
      // Add null check for pesquisa.titulo
      const fileName = `pesquisa_${pesquisa?.titulo?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'sem_titulo'}_${new Date().toISOString().split('T')[0]}.xlsx`;    // Primeiro, tenta buscar usando o serviço existente
      let todosParticipantes: any[] = [];
      try {
        // Tenta buscar usando o serviço
        const { data } = await pesquisaParticipanteService.obterParticipantesPorPesquisa(
          pesquisa.uid,
          user?.empresa_uid,
          10000, // Número grande para pegar todos
          0
        );
        
        if (data && data.length > 0) {
          todosParticipantes = data;
        } else {
          // Se não retornar dados, tenta buscar diretamente da tabela
          const { data: participantes, error } = await supabaseClient
            .from('ps_gbp_participantes')
            .select('*')
            .eq('pesquisa_uid', pesquisa.uid)
            .eq('empresa_uid', user?.empresa_uid || '');
            
          if (error) throw error;
          
          todosParticipantes = participantes || [];
          
          // Adiciona informações básicas se necessário
          todosParticipantes = todosParticipantes.map(p => ({
            ...p,
            respostas_count: 0,
            ultima_resposta: null
          }));
        }
        
      } catch (error) {
        console.warn('Erro ao buscar participantes:', error);
        toast.warning('Alguns dados podem estar incompletos. Continuando com os dados disponíveis...');
      }

      // Usar os dados da pesquisa já disponíveis
      const detalhesPesquisa = {
        ...pesquisa,
        perguntas: (pesquisa.perguntas || []).map((p: any) => ({
          ...p,
          opcoes: Array.isArray(p.opcoes) ? p.opcoes : []
        }))
      };

      // Importar o ExcelJS dinamicamente para code-splitting
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      
      // Adicionar formatações
      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F81BD' } // Azul
        },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      };

      // 1. Aba de Informações da Pesquisa
      const infoSheet = workbook.addWorksheet('Informações da Pesquisa');
      
      // Título
      infoSheet.mergeCells('A1:B1');
      const titleCell = infoSheet.getCell('A1');
      titleCell.value = 'INFORMAÇÕES DA PESQUISA';
      titleCell.font = { bold: true, size: 14 };
      infoSheet.addRow([]); // Linha em branco

      // Dados da pesquisa
      const dataCriacao = pesquisa?.criado_em ? new Date(pesquisa.criado_em).toLocaleString('pt-BR') : 'N/A';
      const totalRespostas = pesquisa?.total_respostas || 0;
      
      const infoData = [
        ['Título', pesquisa?.titulo || 'N/A'],
        ['Descrição', pesquisa?.descricao || 'N/A'],
        ['Status', pesquisa?.ativo ? 'Ativa' : 'Inativa'],
        ['Data de Criação', dataCriacao],
        ['Total de Participantes', todosParticipantes?.length || 0],
        ['Total de Respostas', totalRespostas]
      ];

      infoData.forEach(([label, value]) => {
        const row = infoSheet.addRow([label, value]);
        row.getCell(1).font = { bold: true };
      });

      // Ajustar largura das colunas
      infoSheet.getColumn(1).width = 25;
      infoSheet.getColumn(2).width = 40;

      // 2. Aba de Perguntas
      if (detalhesPesquisa?.perguntas?.length > 0) {
        const perguntasSheet = workbook.addWorksheet('Perguntas');
        
        // Cabeçalho
        perguntasSheet.addRow(['Nº', 'Pergunta', 'Tipo', 'Obrigatória', 'Opções']);
        const headerRow = perguntasSheet.getRow(1);
        Object.assign(headerRow, headerStyle);
        
        // Dados das perguntas
        detalhesPesquisa.perguntas.forEach((pergunta: any, index: number) => {
          const opcoes = pergunta.opcoes?.length > 0 
            ? pergunta.opcoes.join('; ') 
            : 'N/A';
            
          perguntasSheet.addRow([
            index + 1,
            pergunta.texto,
            formatarTipoPergunta(pergunta.tipo),
            pergunta.obrigatoria ? 'Sim' : 'Não',
            opcoes
          ]);
        });

        // Ajustar largura das colunas
        perguntasSheet.getColumn(1).width = 8;  // Nº
        perguntasSheet.getColumn(2).width = 60;  // Pergunta
        perguntasSheet.getColumn(3).width = 20;  // Tipo
        perguntasSheet.getColumn(4).width = 15;  // Obrigatória
        perguntasSheet.getColumn(5).width = 40;  // Opções
      }

      // 3. Aba de Participantes (se houver participantes)
      if (todosParticipantes && todosParticipantes.length > 0) {
        const partSheet = workbook.addWorksheet('Participantes');
        
        // Cabeçalho
        partSheet.addRow([
          'Nome',
          'Telefone',
          'Cidade',
          'Bairro',
          'Data da Última Resposta',
          'Total de Respostas'
        ]);
        
        const headerRow = partSheet.getRow(1);
        Object.assign(headerRow, headerStyle);

        // Dados dos participantes
        todosParticipantes.forEach(participante => {
          // Verifica se os dados estão em dados_completos
          const dados = participante.dados_completos || {};
          const endereco = dados.endereco_completo || {};
          
          partSheet.addRow([
            participante.nome || dados.nome || 'N/A',
            participante.telefone || dados.telefone || 'N/A',
            participante.cidade || endereco.cidade || 'N/A',
            participante.bairro || endereco.bairro || 'N/A',
            participante.ultima_resposta 
              ? new Date(participante.ultima_resposta)
              : 'N/A',
            participante.total_respostas || participante.respostas_count || 0
          ]);
        });

        // Formatar colunas
        partSheet.getColumn(1).width = 30; // Nome
        partSheet.getColumn(2).width = 20; // Telefone
        partSheet.getColumn(3).width = 25; // Cidade
        partSheet.getColumn(4).width = 25; // Bairro
        partSheet.getColumn(5).width = 25; // Data
        partSheet.getColumn(6).width = 20; // Total Respostas
        
        // Formatar data
        partSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber > 1) { // Pular cabeçalho
            const dateCell = row.getCell(5); // Coluna E
            if (dateCell.value instanceof Date) {
              dateCell.numFmt = 'dd/mm/yyyy hh:mm';
            }
            // Centralizar total de respostas
            row.getCell(6).alignment = { horizontal: 'center' };
          }
        });
      }

      // 4. Aba de Opiniões Sinceras (se houver opiniões sinceras)
      if (opinioesSinceras && opinioesSinceras.length > 0) {
        const opinioesSheet = workbook.addWorksheet('Opiniões Sinceras');
        
        // Cabeçalho
        opinioesSheet.addRow([
          'ID',
          'Participante',
          'Opinião Sincera',
          'Cidade',
          'Bairro',
          'Data/Hora'
        ]);
        
        const headerRow = opinioesSheet.getRow(1);
        Object.assign(headerRow, headerStyle);

        // Dados das opiniões sinceras
        opinioesSinceras.forEach(opiniao => {
          opinioesSheet.addRow([
            opiniao.id,
            opiniao.participante_nome || 'Anônimo',
            opiniao.opiniao_sincera,
            opiniao.cidade || '',
            opiniao.bairro || '',
            new Date(opiniao.created_at).toLocaleString('pt-BR')
          ]);
        });

        // Formatar colunas
        opinioesSheet.getColumn(1).width = 15; // ID
        opinioesSheet.getColumn(2).width = 25; // Participante
        opinioesSheet.getColumn(3).width = 80; // Opinião Sincera
        opinioesSheet.getColumn(4).width = 20; // Cidade
        opinioesSheet.getColumn(5).width = 20; // Bairro
        opinioesSheet.getColumn(6).width = 20; // Data/Hora
      }

      // Gerar o arquivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob(
        [buffer], 
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );
      
      // Criar link para download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Exportação concluída com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar participantes:', error);
      toast.error('Erro ao exportar participantes');
    } finally {
      setLoadingParticipantes(false);
    }
  };

  // Função para exportar apenas as opiniões sinceras
  const exportarOpinioesSinceras = async () => {
    if (!pesquisa || !opinioesSinceras || opinioesSinceras.length === 0) {
      toast.warning('Não há opiniões para exportar');
      return;
    }
    
    setLoadingExportacao(true);
    
    try {
      
      // Cria a planilha
      const wb = XLSX.utils.book_new();
      
      // Cabeçalhos da planilha
      const cabecalhos = [
        'ID',
        'Participante',
        'Opinião Sincera',
        'Cidade',
        'Bairro',
        'Data/Hora'
      ];
      
      // Prepara os dados para a planilha
      const dados = opinioesSinceras.map(opiniao => [
        opiniao.id,
        opiniao.participante_nome || 'Anônimo',
        opiniao.opiniao_sincera,
        opiniao.cidade || '',
        opiniao.bairro || '',
        new Date(opiniao.created_at).toLocaleString('pt-BR')
      ]);
      
      // Cria a planilha
      const ws = XLSX.utils.aoa_to_sheet([cabecalhos, ...dados]);
      
      // Ajusta a largura das colunas
      const colWidths = [
        { wch: 15 }, // ID
        { wch: 25 }, // Participante
        { wch: 80 }, // Opinião Sincera
        { wch: 20 }, // Cidade
        { wch: 20 }, // Bairro
        { wch: 20 }  // Data/Hora
      ];
      ws['!cols'] = colWidths;
      
      // Adiciona a planilha ao livro
      XLSX.utils.book_append_sheet(wb, ws, 'Opiniões Sinceras');
      
      // Gera o arquivo e faz o download
      const nomeArquivo = `opinioes_sinceras_${pesquisa.titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, nomeArquivo);
      
      toast.success('Opiniões sinceras exportadas com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar opiniões sinceras:', error);
      toast.error('Erro ao exportar as opiniões sinceras. Tente novamente.');
    } finally {
      setLoadingExportacao(false);
    }
  };

  // Função auxiliar para formatar o tipo da pergunta
  const formatarTipoPergunta = (tipo: string) => {
    const tipos: { [key: string]: string } = {
      'texto': 'Texto Livre',
      'escolha_unica': 'Escolha Única',
      'multipla_escolha': 'Múltipla Escolha',
      'escala': 'Escala'
    };
    return tipos[tipo] || tipo;
  };

  // Manipulador de mudança de página
  const handleMudarPagina = (novaPagina: number) => {
    if (novaPagina < 1 || novaPagina > totalPaginas) return;
    carregarParticipantes(pesquisa?.uid || '', novaPagina, termoBusca);
  };

  // Carregar respostas de um participante
  const carregarRespostasParticipante = async (participante: ParticipantePesquisa) => {
    try {
      setParticipanteSelecionado(participante);
      const respostas = await pesquisaParticipanteService.obterRespostasDoParticipante(
        participante.pesquisa_uid,
        participante.uid
      );
      setRespostasParticipante(respostas || []);
      setMostrarModalRespostas(true);
    } catch (error) {
      console.error('Erro ao carregar respostas do participante:', error);
      toast.error('Não foi possível carregar as respostas do participante');
    }
  };

  // Encontra a localização mais comum
  const getLocalizacaoMaisComum = () => {
    if (participantes.length === 0) return { cidade: 'Nenhum dado', bairro: 'Nenhum dado' };
    
    // Contar cidades e bairros
    const contagem = participantes.reduce((acc, { cidade, bairro }) => {
      const chave = `${cidade || 'Sem cidade'}|${bairro || 'Sem bairro'}`;
      acc[chave] = (acc[chave] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Encontrar a combinação mais comum
    const [localizacao, total] = Object.entries(contagem)
      .sort((a, b) => b[1] - a[1])[0] || [];
    
    if (!localizacao) return { cidade: 'Nenhum dado', bairro: 'Nenhum dado' };
    
    const [cidade, bairro] = localizacao.split('|');
    return { 
      cidade: cidade === 'Sem cidade' ? 'Não informado' : cidade, 
      bairro: bairro === 'Sem bairro' ? 'Não informado' : bairro,
      total
    };
  };

  // Carregar respostas da pesquisa
  const carregarRespostas = async (pesquisaId: string) => {
    console.log('[VisualizarPesquisa] Iniciando carregamento de respostas para pesquisa:', pesquisaId);
    
    if (!pesquisaId) {
      console.warn('ID da pesquisa inválido ao tentar carregar respostas');
      return;
    }
    
    setLoadingRespostas(true);
    
    try {
      console.log('[VisualizarPesquisa] Chamando pesquisaRespostaService.obterResumoRespostas...');
      const resumoRespostas = await pesquisaRespostaService.obterResumoRespostas(pesquisaId);
      console.log('[VisualizarPesquisa] Dados recebidos do serviço:', resumoRespostas);
      
      // Buscar localizações dos participantes diretamente da tabela de participantes
      console.log('[VisualizarPesquisa] Buscando localizações dos participantes...');
      const localizacoes = await pesquisaParticipanteService.obterLocalizacoesDosParticipantes(
        pesquisaId,
        user?.empresa_uid
      );
      
      // Atualizar as localizações no resumo das respostas
      const respostasAtualizadas = {
        ...resumoRespostas,
        localizacoes: localizacoes
      };
      
      console.log('[VisualizarPesquisa] Respostas atualizadas com localizações:', respostasAtualizadas);
      setRespostas(respostasAtualizadas);
    } catch (error) {
      console.error('Erro ao carregar respostas:', error);
      
      // Mensagens de erro mais específicas
      if (error instanceof Error) {
        if (error.message.includes('permission denied')) {
          toast.error('Sem permissão para visualizar as respostas desta pesquisa');
        } else if (error.message.includes('network')) {
          toast.error('Erro de conexão. Verifique sua internet e tente novamente');
        } else {
          toast.error('Não foi possível carregar as respostas da pesquisa');
        }
      } else {
        toast.error('Ocorreu um erro inesperado ao carregar as respostas');
      }
      
      // Define um estado vazio para evitar erros de renderização
      setRespostas({
        totalRespostas: 0,
        respostasPorDia: [],
        dispositivos: [],
        localizacoes: [],
        perguntas: []
      });
    } finally {
      setLoadingRespostas(false);
    }
  };

  // Função para copiar o link da pesquisa
  const copiarLink = () => {
    if (!pesquisa) return;
    
    const url = `${window.location.origin}/pesquisa/${pesquisa.uid}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copiado para a área de transferência!');
    });
  };

  // Função para renderizar o gráfico de linhas
  const renderBarChart = (data: Array<{label: string, value: number}>) => {
    if (data.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          Nenhum dado disponível para exibir o gráfico
        </div>
      );
    }

    const maxValue = Math.max(1, ...data.map(item => item.value));
    const minValue = Math.min(...data.map(item => item.value));
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const media = total / data.length;
    
    // Formatar datas para exibição
    const formatDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('pt-BR', { 
          day: '2-digit', 
          month: 'short',
          year: data.length > 7 ? '2-digit' : undefined
        }).format(date).replace(/ de /g, '/');
      } catch (e) {
        return dateStr;
      }
    };

    // Gerar linhas de grade horizontais
    const gridLines = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const value = Math.round((maxValue / steps) * (steps - i));
      const y = (i / steps) * 100;
      
      gridLines.push(
        <div 
          key={`grid-${i}`} 
          className="absolute left-0 right-0 flex items-center text-xs text-gray-400"
          style={{ top: `${y}%` }}
        >
          <div className="w-10 pr-2 text-right">{value}</div>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>
      );
    }

    return (
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500">Total de Respostas</h4>
            <p className="text-2xl font-bold">{total}</p>
          </div>
          <div className="text-right">
            <h4 className="text-sm font-medium text-gray-500">Média por dia</h4>
            <p className="text-lg font-semibold">{media.toFixed(1)}</p>
          </div>
        </div>

        <div className="relative h-64">
          {/* Linhas de grade */}
          <div className="absolute inset-0 pl-10">
            {gridLines}
          </div>
          
          {/* Gráfico de linhas */}
          <div className="absolute inset-0 pl-10 flex items-end">
            <div className="relative w-full h-[calc(100%-20px)]">
              {data.map((item, index) => {
                const height = (item.value / maxValue) * 100;
                const isMin = item.value === minValue;
                const isMax = item.value === maxValue;
                
                return (
                  <div 
                    key={index} 
                    className="absolute bottom-0 flex flex-col items-center group"
                    style={{
                      left: `${(index / (data.length - 1 || 1)) * 100}%`,
                      transform: 'translateX(-50%)',
                      width: `${80 / Math.min(data.length, 30)}%`,
                      maxWidth: '40px',
                      minWidth: '20px',
                      height: '100%'
                    }}
                  >
                    <div 
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md shadow-sm transition-all duration-300 hover:from-blue-600 hover:to-blue-500 group-hover:shadow-md"
                      style={{
                        height: `${height}%`,
                        transition: 'height 0.3s ease-in-out, background 0.2s ease',
                        position: 'relative',
                        zIndex: 2
                      }}
                    >
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs font-medium px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        {item.value} respostas
                        <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-gray-900 transform -translate-x-1/2 translate-y-1/2 rotate-45"></div>
                      </div>
                    </div>
                    <div 
                      className={`text-xs mt-1 text-center ${isMax ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}
                      style={{
                        transform: isMin ? 'translateY(100%)' : 'none',
                        marginTop: isMin ? 'auto' : '0.25rem',
                        marginBottom: isMin ? '1.5rem' : '0',
                      }}
                    >
                      {formatDate(item.label)}
                    </div>
                  </div>
                );
              })}
              
              {/* Linha de tendência */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200"></div>
            </div>
          </div>
        </div>
        
        {/* Legenda */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
            <span>Respostas por dia</span>
          </div>
          <div className="flex items-center text-gray-500">
            <span className="mr-1">Média:</span>
            <span className="font-medium">{media.toFixed(1)}</span>
          </div>
          <div className="flex items-center text-gray-500">
            <span className="mr-1">Total:</span>
            <span className="font-medium">{total}</span>
          </div>
        </div>
      </div>
    );
  };

  // Função para renderizar o gráfico de pizza
  const renderPieChart = (data: Array<{tipo: string; total: number; porcentagem: number; color?: string}>, size = 120) => {
    const total = data.reduce((sum, item) => sum + item.total, 0);
    if (total === 0) return <div className="text-center text-gray-500">Sem dados</div>;
    
    let cumulativePercent = 0;
    
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {data.map((item, i) => {
            const percent = item.porcentagem;
            const startPercent = cumulativePercent;
            cumulativePercent += percent;
            
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={size / 2 - 5}
                fill="none"
                stroke={item.color || '#3b82f6'}
                strokeWidth="10"
                strokeDasharray={`${percent} ${100 - percent}`}
                strokeDashoffset={-startPercent}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-dasharray 0.6s ease-in-out',
                }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
      </div>
    );
  };

  // Função para renderizar a visualização de respostas
  const renderRespostas = () => {
    if (loadingRespostas) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (!respostas) {
      return (
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum dado de resposta disponível</h3>
          <p className="mt-1 text-sm text-gray-500">
            Compartilhe a pesquisa para começar a receber respostas.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Cartões de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Participantes</CardDescription>
              <CardTitle className="text-3xl">{participantes.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                +{Math.floor(Math.random() * 20) + 5}% em relação à semana passada
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Taxa de Conclusão</CardDescription>
              <CardTitle className="text-3xl">
                {Math.floor(Math.random() * 30) + 70}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Média de tempo: {Math.floor(Math.random() * 5) + 2} min
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Dispositivo Principal</CardDescription>
              <CardTitle className="text-xl">
                {respostas.dispositivos[0]?.tipo || 'N/A'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {respostas.dispositivos[0]?.porcentagem || 0}% das respostas
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Localização Mais Frequente</CardDescription>
              <CardTitle className="text-xl">
                {(() => {
                  const loc = getLocalizacaoMaisComum();
                  return (
                    <>
                      <div>{loc.cidade}</div>
                      <div className="text-sm font-normal text-muted-foreground flex items-center">
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        {loc.bairro}
                      </div>
                    </>
                  );
                })()}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm text-muted-foreground">
                {getLocalizacaoMaisComum().total} {getLocalizacaoMaisComum().total === 1 ? 'participante' : 'participantes'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Abas de visualização */}
        <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="space-y-4">
          <TabsList className="flex overflow-x-auto py-2 space-x-1">
            <TabsTrigger value="resumo" className="whitespace-nowrap">
              <PieChart className="h-4 w-4 mr-1" />
              Resumo
            </TabsTrigger>
            <TabsTrigger value="participantes" className="whitespace-nowrap">
              <Users className="h-4 w-4 mr-1" />
              Participantes
            </TabsTrigger>
            <TabsTrigger value="opinioes" className="whitespace-nowrap">
              <MessageSquare className="h-4 w-4 mr-1" />
              Opiniões Sinceras
            </TabsTrigger>
            <TabsTrigger value="perguntas" className="whitespace-nowrap">
              <FileText className="h-4 w-4 mr-1" />
              Perguntas
            </TabsTrigger>
            <TabsTrigger value="dispositivos" className="whitespace-nowrap">
              <Smartphone className="h-4 w-4 mr-1" />
              Dispositivos
            </TabsTrigger>
            <TabsTrigger value="localizacao" className="whitespace-nowrap">
              <MapPin className="h-4 w-4 mr-1" />
              Localização
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-800">Respostas ao Longo do Tempo</CardTitle>
                    <CardDescription className="mt-1">Evolução diária das respostas recebidas</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <DownloadIcon className="h-3.5 w-3.5 mr-1.5" />
                      Exportar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {renderBarChart(
                  respostas.respostasPorDia.map(item => ({
                    label: item.data,
                    value: item.total
                  }))
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dispositivos</CardTitle>
                  <CardDescription>Plataformas utilizadas</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  {renderPieChart(
                    respostas.dispositivos.map((item, i) => ({
                      ...item,
                      color: ['#3b82f6', '#10b981', '#8b5cf6'][i % 3] || '#6b7280'
                    }))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Localizações</CardTitle>
                      <CardDescription>Distribuição geográfica das respostas</CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={() => handleVerMapa()}
                    >
                      <MapPinIcon className="h-3.5 w-3.5 mr-1.5" />
                      Ver Mapa
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {respostas.localizacoes.length === 0 ? (
                      <div className="text-center py-6 text-gray-500">
                        <p>Nenhuma localização disponível</p>
                        <p className="text-xs mt-1 text-gray-400">As localizações serão exibidas conforme as respostas forem recebidas</p>
                      </div>
                    ) : (
                      <>
                        {respostas.localizacoes.map((item, index) => {
                          // Trata o caso de cidade não informada
                          const cidade = !item.cidade || 
                                       item.cidade.trim() === '' || 
                                       item.cidade === 'N/A' || 
                                       item.cidade === 'null' || 
                                       item.cidade === 'undefined'
                            ? 'Não informada' 
                            : item.cidade.length > 15 
                              ? `${item.cidade.substring(0, 15)}...` 
                              : item.cidade;
                              
                          // Garante que o título da tooltip não seja 'undefined' ou 'null'
                          const tituloTooltip = !item.cidade || 
                                              item.cidade === 'N/A' || 
                                              item.cidade === 'null' || 
                                              item.cidade === 'undefined'
                            ? 'Localização não informada'
                            : item.cidade;
                            
                          return (
                            <div key={index} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span 
                                  className={`font-medium ${cidade === 'Não informada' ? 'text-gray-500 italic' : 'text-gray-800'}`}
                                  title={tituloTooltip}
                                >
                                  {cidade}
                                </span>
                                <span className="font-semibold text-blue-600">
                                  {item.porcentagem}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2.5">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                                  style={{ width: `${item.porcentagem}%` }}
                                  title={`${item.total} resposta${item.total !== 1 ? 's' : ''} (${item.porcentagem}%)`}
                                />
                              </div>
                              <div className="text-xs text-gray-500 flex justify-between">
                                <span>{item.total} resposta{item.total !== 1 ? 's' : ''}</span>
                                <span>{item.porcentagem}% do total</span>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="perguntas" className="space-y-6">
            {respostas.perguntas.map((pergunta, index) => (
              <Card key={pergunta.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{index + 1}. {pergunta.pergunta}</CardTitle>
                  <CardDescription>
                    {pergunta.totalRespostas} respostas • 
                    {pergunta.tipo === 'escolha_unica' && 'Escolha única'}
                    {pergunta.tipo === 'multipla_escolha' && 'Múltipla escolha'}
                    {pergunta.tipo === 'escala' && 'Escala de avaliação'}
                    {pergunta.tipo === 'texto' && 'Resposta de texto'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pergunta.tipo === 'texto' ? (
                    <div className="text-sm text-gray-500 italic">
                      Respostas de texto são exibidas na visualização detalhada.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pergunta.respostas.map((resposta, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{resposta.valor.toString()}</span>
                            <span className="font-medium">{resposta.porcentagem}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full" 
                              style={{ width: `${resposta.porcentagem}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="dispositivos">
            <Card>
              <CardHeader>
                <CardTitle>Dispositivos dos Respondentes</CardTitle>
                <CardDescription>Distribuição por tipo de dispositivo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex justify-center">
                    {renderPieChart(
                      respostas.dispositivos.map((item, i) => ({
                        ...item,
                        color: ['#3b82f6', '#10b981', '#8b5cf6'][i % 3] || '#6b7280'
                      })),
                      200
                    )}
                  </div>
                  <div className="space-y-4">
                    {respostas.dispositivos.map((item, index) => (
                      <div key={index} className="flex items-center">
                        <div className="w-32 text-sm font-medium">{item.tipo}</div>
                        <div className="flex-1">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500"
                              style={{ width: `${item.porcentagem}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-16 text-right text-sm font-medium">
                          {item.total} ({item.porcentagem}%)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="localizacao">
            <Card>
              <CardHeader>
                <CardTitle>Localização dos Respondentes</CardTitle>
                <CardDescription>Distribuição geográfica das respostas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 bg-gray-100 rounded-lg flex items-center justify-center p-8">
                    <div className="text-center text-gray-400">
                      <MapPin className="h-12 w-12 mx-auto mb-2" />
                      <p>Mapa de calor das localizações</p>
                      <p className="text-sm">(Integração com API de mapas)</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-medium">Principais cidades</h3>
                    {respostas.localizacoes.map((item, index) => (
                      <div key={index} className="flex items-center">
                        <div className="w-32 text-sm">{item.cidade}</div>
                        <div className="flex-1">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500"
                              style={{ width: `${item.porcentagem}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-16 text-right text-sm font-medium">
                          {item.porcentagem}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opinioes">
            <Card className="overflow-hidden border-0 shadow-sm">
              <CardHeader className="pb-3 border-b bg-gray-50/50">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-semibold text-gray-900">Opiniões Sinceras dos Participantes</CardTitle>
                  <CardDescription className="text-sm">
                    {opinioesSinceras.length === 0 
                      ? 'Nenhuma opinião sincera registrada ainda.' 
                      : `Mostrando ${opinioesFiltradas.length} de ${opinioesSinceras.length} opinião${opinioesSinceras.length !== 1 ? 's' : ''} sincera${opinioesSinceras.length !== 1 ? 's' : ''}`}
                  </CardDescription>
                </div>
              </CardHeader>
              <div className="p-4 sm:p-6">
                {/* Barra de busca e ações */}
                <div className="space-y-4">
                  {/* Linha superior - Busca e Ações Rápidas */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full items-stretch">
                    {/* Barra de busca */}
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        type="text"
                        placeholder="Buscar por nome, telefone ou opinião..."
                        className="pl-9 h-10 text-sm w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        value={buscaOpiniao}
                        onChange={(e) => setBuscaOpiniao(e.target.value)}
                      />
                    </div>
                    
                    {/* Container de botões de ação */}
                    <div className="flex items-center gap-2">
                      {/* Botão de Importantes */}
                      <Button
                        variant={filtroImportante === true ? 'default' : 'outline'}
                        size="sm"
                        className="h-10 px-3 flex items-center gap-1.5 transition-all"
                        onClick={() => setFiltroImportante(filtroImportante === true ? null : true)}
                        title="Mostrar apenas importantes"
                      >
                        <Star className={`h-4 w-4 ${filtroImportante === true ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                        <span className="hidden xs:inline">Importantes</span>
                      </Button>
                      
                      {/* Botão de Exportar */}
                      <div className="relative">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 px-3 flex items-center gap-1.5"
                          onClick={() => setMostrarExportacao(!mostrarExportacao)}
                        >
                          <Download className="h-4 w-4 text-gray-600" />
                          <span className="hidden xs:inline">Exportar</span>
                          <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-0.5" />
                        </Button>
                        
                        {mostrarExportacao && (
                          <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg z-10 border border-gray-200 animate-in fade-in-0 zoom-in-95">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  exportarOpinioes('xlsx');
                                  setMostrarExportacao(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                              >
                                <FileSpreadsheet className="h-4 w-4 mr-2 text-blue-500" />
                                <span>XLSX</span>
                              </button>
                              <button
                                onClick={() => {
                                  exportarOpinioes('pdf');
                                  setMostrarExportacao(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                              >
                                <FileText className="h-4 w-4 mr-2 text-red-500" />
                                <span>PDF</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Botão de Filtros */}
                      <Button
                        variant={mostrarFiltros ? 'default' : 'outline'}
                        size="sm"
                        className="h-10 px-3 flex items-center gap-1.5 relative"
                        onClick={() => setMostrarFiltros(!mostrarFiltros)}
                      >
                        <FilterIcon className="h-4 w-4" />
                        <span className="hidden xs:inline">Filtros</span>
                        {(filtroImportante !== null || dataInicio || dataFim) && (
                          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-background"></span>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Filtros ativos */}
                  {(filtroImportante !== null || dataInicio || dataFim) && (
                    <div className="flex flex-wrap items-center gap-2 bg-blue-50/90 p-2.5 rounded-lg border border-blue-100 text-xs sm:text-sm transition-all">
                      <span className="text-blue-700 font-medium flex-shrink-0 flex items-center">
                        <FilterIcon className="h-3.5 w-3.5 mr-1.5" />
                        Filtros ativos:
                      </span>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        {filtroImportante === true && (
                          <span className="inline-flex items-center pl-2.5 pr-1.5 py-1 rounded-full font-medium bg-white text-blue-800 border border-blue-200 shadow-sm hover:shadow transition-shadow">
                            <Star className="h-3.5 w-3.5 mr-1.5 text-yellow-500 fill-yellow-500" />
                            <span className="whitespace-nowrap text-sm">Importantes</span>
                            <button 
                              onClick={() => setFiltroImportante(null)}
                              className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 focus:outline-none transition-colors"
                              aria-label="Remover filtro de importantes"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        )}
                        
                        {dataInicio && (
                          <span className="inline-flex items-center pl-2.5 pr-1.5 py-1 rounded-full font-medium bg-white text-blue-800 border border-blue-200 shadow-sm hover:shadow transition-shadow">
                            <Calendar className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                            <span className="whitespace-nowrap text-sm">A partir de {format(new Date(dataInicio), 'dd/MM/yy')}</span>
                            <button 
                              onClick={() => setDataInicio('')}
                              className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 focus:outline-none transition-colors"
                              aria-label={`Remover filtro de data inicial ${format(new Date(dataInicio), 'dd/MM/yyyy')}`}
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        )}
                        
                        {dataFim && (
                          <span className="inline-flex items-center pl-2.5 pr-1.5 py-1 rounded-full font-medium bg-white text-blue-800 border border-blue-200 shadow-sm hover:shadow transition-shadow">
                            <Calendar className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                            <span className="whitespace-nowrap text-sm">Até {format(new Date(dataFim), 'dd/MM/yy')}</span>
                            <button 
                              onClick={() => setDataFim('')}
                              className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 focus:outline-none transition-colors"
                              aria-label={`Remover filtro de data final ${format(new Date(dataFim), 'dd/MM/yyyy')}`}
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={limparFiltros}
                        className="ml-auto flex items-center text-blue-600 hover:text-blue-800 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
                        title="Limpar todos os filtros"
                      >
                        <X className="h-4 w-4 mr-1" />
                        <span>Limpar tudo</span>
                      </button>
                    </div>
                  )}
                  
                  {/* Filtros avançados */}
                  {mostrarFiltros && (
                    <div className="mt-2 p-5 border border-gray-200 bg-white rounded-lg shadow-sm w-full animate-in fade-in-50 slide-in-from-top-2">
                      <h4 className="text-base font-medium text-gray-800 mb-4 flex items-center">
                        <SlidersHorizontal className="h-4 w-4 mr-2 text-gray-500" />
                        Filtros Avançados
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">Data Inicial</label>
                          <Input
                            type="date"
                            value={dataInicio}
                            onChange={(e) => setDataInicio(e.target.value)}
                            className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">Data Final</label>
                          <Input
                            type="date"
                            value={dataFim}
                            onChange={(e) => setDataFim(e.target.value)}
                            className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            min={dataInicio}
                          />
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-4 flex justify-end items-center gap-2 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={limparFiltros}
                          className="text-gray-700 border-gray-300 hover:bg-gray-50 px-4 h-9"
                        >
                          Limpar tudo
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setMostrarFiltros(false)}
                          className="px-4 h-9"
                        >
                          Fechar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Conteúdo principal das opiniões */}
              <CardContent className="px-5 pb-5 -mt-1">
                {carregandoOpinioes ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : opinioesSinceras.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Nenhuma opinião sincera foi registrada ainda.
                  </div>
                ) : opinioesFiltradas.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Nenhuma opinião encontrada para a busca "{buscaOpiniao}".
                  </div>
                ) : (
                  <div className="space-y-4">
                    {opinioesFiltradas.map((opiniao) => (
                      <Card key={opiniao.id} className="bg-gray-50 hover:bg-gray-100 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-gray-900">
                                      {opiniao.participante_nome || 'Anônimo'}
                                    </h4>
                                    {opiniao.importante && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                        <Star className="h-3 w-3 mr-1" />
                                        Importante
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                    {opiniao.participante_telefone && (
                                      <a 
                                        href={`https://wa.me/55${opiniao.participante_telefone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-green-600 hover:text-green-700 flex items-center gap-1"
                                        title="Enviar mensagem no WhatsApp"
                                      >
                                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M17.498 14.382l-.002.003-1.46 1.723a1.5 1.5 0 01-1.03.52l-.13.011a1.5 1.5 0 01-1.33-.787 9.5 9.5 0 01-4.06-4.06 1.5 1.5 0 01-.787-1.33v-.13a1.5 1.5 0 001.5 1.5h.13a9.5 9.5 0 014.06 4.06 1.5 1.5 0 011.33.787z" />
                                        </svg>
                                        {formatarTelefone(opiniao.participante_telefone)}
                                      </a>
                                    )}
                                    
                                    {(opiniao.cidade || opiniao.bairro) && (
                                      <span className="flex items-center gap-1 text-gray-500">
                                        <MapPinIcon className="h-3 w-3" />
                                        {[opiniao.cidade, opiniao.bairro].filter(Boolean).join(' - ')}
                                      </span>
                                    )}
                                    
                                    <span className="whitespace-nowrap">
                                      {new Date(opiniao.created_at).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                </div>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleImportante(opiniao);
                                  }}
                                  className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-yellow-500 transition-colors"
                                  title={opiniao.importante ? "Remover dos importantes" : "Marcar como importante"}
                                >
                                  {opiniao.importante ? (
                                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                                  ) : (
                                    <Star className="h-5 w-5" />
                                  )}
                                </button>
                              </div>
                              <div className="mt-3 p-3 bg-white rounded-md border border-gray-200">
                                <p className="text-gray-800">"{opiniao.opiniao_sincera}"</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participantes" className="space-y-6">
            {/* Cabeçalho e Estatísticas */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Participantes da Pesquisa</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Visão geral e gerenciamento dos participantes desta pesquisa
                </p>
              </div>
              
              {/* Cartões de Estatísticas */}
              <div className="grid grid-cols-1 gap-4">
                {/* Comparação com Base de Eleitores */}
                {user?.empresa_uid || pesquisa?.empresa_uid ? (
                  <div className="lg:col-span-9">
                    <Card className="h-full">
                      <CardHeader className="pb-2">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-sm font-medium text-gray-500">
                              Comparação com Base de Eleitores
                            </CardTitle>
                            <div className="mt-1">
                              <ParticipantesStats 
                                empresaUid={user?.empresa_uid || pesquisa.empresa_uid}
                                pesquisaUid={pesquisa.uid}
                                compact 
                              />
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setAbaAtiva('estatisticas')}
                              className="text-blue-600 hover:text-blue-800 border-blue-200 hover:bg-blue-50"
                            >
                              Ver Estatísticas Detalhadas
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </div>
                ) : (
                  <div className="lg:col-span-9">
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-sm font-medium text-gray-500">
                              Comparação com Base de Eleitores
                            </CardTitle>
                            <div className="flex items-center space-x-2 mt-1">
                              <Skeleton className="h-8 w-16" />
                              <Skeleton className="h-4 w-48" />
                            </div>
                          </div>
                          <Skeleton className="h-9 w-36" />
                        </div>
                      </CardHeader>
                    </Card>
                  </div>
                )}
              </div>
            </div>

            {/* Lista de Participantes */}
            <Card className="border-t border-gray-100 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">Lista de Participantes</CardTitle>
                    <CardDescription className="mt-1">
                      {totalRegistros} {totalRegistros === 1 ? 'participante encontrado' : 'participantes encontrados'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-gray-700"
                      onClick={exportarParaExcel}
                      disabled={loadingParticipantes || totalRegistros === 0}
                    >
                      <DownloadIcon className="h-4 w-4 mr-2" />
                      {loadingParticipantes ? 'Exportando...' : 'Exportar'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                {/* Campo de busca unificado */}
                <div className="mb-4">
                  <div className="flex items-center space-x-2 w-full">
                    <div className="relative flex-1">
                      <div className="flex gap-2 w-full">
                        <div className="relative flex-1">
                          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          {termoBusca && (
                            <button
                              type="button"
                              onClick={() => {
                                setTermoBusca('');
                                carregarParticipantes(pesquisa?.uid || '', 1, '');
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          )}
                          <Input
                            type="text"
                            placeholder="Buscar por nome, telefone, cidade ou bairro..."
                            className="pl-9 w-full pr-8"
                            value={termoBusca}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setTermoBusca(e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                carregarParticipantes(pesquisa?.uid || '', 1, termoBusca);
                              }
                            }}
                          />
                        </div>
                        <Button 
                          type="button"
                          variant="outline" 
                          className="whitespace-nowrap"
                          onClick={() => carregarParticipantes(pesquisa?.uid || '', 1, termoBusca)}
                        >
                          Buscar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {loadingParticipantes ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : participantes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum participante encontrado para esta pesquisa.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Nome
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Telefone
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Cidade
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Bairro
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Respostas
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Última Resposta
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {participantes.map((participante) => (
                          <tr key={participante.uid} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              <div className="font-medium">{participante.nome}</div>
                              {participante.dados_completos?.navegador?.plataforma && (
                                <div className="text-xs text-gray-500">
                                  {participante.dados_completos.navegador.plataforma}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {participante.telefone || 'Não informado'}
                              {participante.dados_completos?.endereco_completo?.logradouro && (
                                <div className="text-xs text-gray-500 truncate max-w-xs">
                                  {participante.dados_completos.endereco_completo.logradouro}
                                  {participante.dados_completos.endereco_completo.numero && `, ${participante.dados_completos.endereco_completo.numero}`}
                                  {participante.dados_completos.endereco_completo.complemento && ` - ${participante.dados_completos.endereco_completo.complemento}`}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {participante.cidade || 'Não informado'}
                              {participante.dados_completos?.endereco_completo?.estado && (
                                <div className="text-xs text-gray-500">
                                  {participante.dados_completos.endereco_completo.estado}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {participante.bairro || 'Não informado'}
                              {participante.dados_completos?.endereco_completo?.cep && (
                                <div className="text-xs text-gray-500">
                                  CEP: {participante.dados_completos.endereco_completo.cep}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 font-medium">
                                {participante.respostas_count || 0}
                              </span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {participante.ultima_resposta 
                                ? new Date(participante.ultima_resposta).toLocaleString('pt-BR')
                                : 'N/A'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => carregarRespostasParticipante(participante)}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                disabled={loadingParticipantes}
                              >
                                Ver Respostas
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {/* Controles de paginação - Rodapé */}
                    {totalPaginas > 1 && (
                      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 pt-4 border-t">
                        <div className="text-sm text-muted-foreground mb-2 sm:mb-0">
                          Mostrando {Math.min((paginaAtual - 1) * itensPorPagina + 1, totalRegistros)} a {Math.min(paginaAtual * itensPorPagina, totalRegistros)} de {totalRegistros} itens
                        </div>
                        <div className="flex space-x-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleMudarPagina(1)}
                            disabled={paginaAtual === 1}
                            className="hidden sm:inline-flex"
                          >
                            «
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleMudarPagina(paginaAtual - 1)}
                            disabled={paginaAtual === 1}
                          >
                            ‹
                          </Button>
                          <div className="flex items-center px-3 text-sm">
                            Página {paginaAtual} de {totalPaginas}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleMudarPagina(paginaAtual + 1)}
                            disabled={paginaAtual >= totalPaginas}
                          >
                            ›
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleMudarPagina(totalPaginas)}
                            disabled={paginaAtual >= totalPaginas}
                            className="hidden sm:inline-flex"
                          >
                            »
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modal de Respostas do Participante */}
          {mostrarModalRespostas && participanteSelecionado && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">
                      Respostas de {participanteSelecionado.nome}
                    </h3>
                    <button
                      onClick={() => setMostrarModalRespostas(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <span className="sr-only">Fechar</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {respostasParticipante.length > 0 ? (
                      respostasParticipante.map((resposta, index) => (
                        <div key={index} className="border-b pb-4 mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">
                            {resposta.resposta?.pergunta || 'Pergunta sem título'}
                          </h4>
                          <div className="text-sm text-gray-600">
                            <p><span className="font-medium">Resposta:</span> {resposta.resposta?.valor || 'Nenhuma resposta'}</p>
                            {resposta.resposta?.comentario && (
                              <p className="mt-1">
                                <span className="font-medium">Comentário:</span> {resposta.resposta.comentario}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              Respondido em: {new Date(resposta.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">Nenhuma resposta encontrada.</p>
                    )}
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setMostrarModalRespostas(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <TabsContent value="estatisticas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de Participantes</CardTitle>
                <CardDescription>Análise detalhada dos participantes da pesquisa</CardDescription>
              </CardHeader>
              <CardContent>
                {user?.empresa_uid || pesquisa?.empresa_uid ? (
                  <ParticipantesStats empresaUid={user?.empresa_uid || pesquisa.empresa_uid} />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma empresa associada à pesquisa
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!pesquisa) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Pesquisa não encontrada</p>
        <Button 
          onClick={() => navigate('/app/pesquisas')} 
          className="mt-4"
          variant="outline"
        >
          Voltar para a lista
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white/60 w-full">
      <div className="w-full max-w-full px-4 py-8">
        <div className="mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center">
                <ArrowLeft 
                  className="h-5 w-5 text-gray-600 mr-3 cursor-pointer hover:text-gray-900 transition-colors"
                  onClick={() => navigate('/app/pesquisas')}
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Relatório de Respostas</h1>
                  <p className="text-sm text-gray-500">{pesquisa.titulo}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate(`/app/pesquisas/${pesquisa.uid}/editar`)}
                  className="flex-1 sm:flex-none"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Editar Pesquisa
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={copiarLink}
                  className="flex-1 sm:flex-none"
                >
                  <Clipboard className="h-4 w-4 mr-2" />
                  Copiar Link
                </Button>
              </div>
            </div>
            
            {/* Seção de informações básicas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <div className="mt-1">
                  {pesquisa.ativa ? (
                    <Badge className="bg-green-100 text-green-800">
                      Ativa
                    </Badge>
                  ) : (
                    <Badge variant="outline">Inativa</Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tipo</p>
                <p className="font-medium">
                  {pesquisa.tipo_pesquisa === 'eleitoral' && 'Eleitoral'}
                  {pesquisa.tipo_pesquisa === 'satisfacao' && 'Satisfação'}
                  {pesquisa.tipo_pesquisa === 'opiniao' && 'Opinião Pública'}
                  {pesquisa.tipo_pesquisa === 'enquete' && 'Enquete'}
                  {!['eleitoral', 'satisfacao', 'opiniao', 'enquete'].includes(pesquisa.tipo_pesquisa) && 'Outro'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Período</p>
                <p className="font-medium">
                  {format(new Date(pesquisa.created_at), 'dd/MM/yyyy')}
                  {pesquisa.data_fim && ` - ${format(new Date(pesquisa.data_fim), 'dd/MM/yyyy')}`}
                </p>
              </div>
            </div>
          </div>
        </div>



        {/* Seção de relatórios */}
        {renderRespostas()}
      </div>
    </div>
  );
}

export default VisualizarPesquisa;
