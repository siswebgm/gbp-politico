import * as XLSX from 'xlsx';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Camera, ChevronRight, Clock, CheckCircle2, AlertCircle, XCircle, RotateCw, MapPin, Calendar, User, Archive, Pencil, X, Filter, Search, Download, Eye, EyeOff, Trash2, ChevronLeft, Loader2, Paperclip, FileText, Upload } from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useAuth } from '../../../providers/AuthProvider';
import { formatDate, isToday } from '../../../utils/format';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { exportOficiosToExcel } from '../../../utils/exportToExcel';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, AlignmentType, Header, Footer, ImageRun, BorderStyle } from 'docx';
import { startOfDay, differenceInDays, format, isSameDay } from 'date-fns';

interface Oficio {
  uid: string;
  numero_oficio: string;
  data_solicitacao: string;
  nivel_de_urgencia: string;
  fotos_do_problema: string[];
  status_solicitacao: string;
  tipo_de_demanda: string;
  descricao_do_problema: string;
  requerente_nome: string;
  requerente_cpf: string;
  requerente_whatsapp: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  referencia: string;
  contato: string;
  tag: string;
  created_at: string;
  visualizou: boolean;
  responsavel_nome: string;
  url_oficio_protocolado?: string;
  fd_demanda_registrada_true_false?: boolean;
  empresa_uid: string;
  gbp_indicado?: {
    nome?: string;
  };
}

interface OficiosPageProps {
  itemsPerPage?: number;
}

const STATUS_STYLES = {
  'Recebida': {
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: Clock
  },
  'Protocolada': {
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: CheckCircle2
  },
  'Em Análise': {
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: RotateCw
  },
  'Pendente': {
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    icon: AlertCircle
  },
  'Concluída': {
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: CheckCircle2
  },
  'Arquivada': {
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: Archive
  }
};

const URGENCIA_COLORS = {
  'baixa': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'média': 'bg-amber-100 text-amber-800 border-amber-200',
  'alta': 'bg-rose-100 text-rose-800 border-rose-200',
  'pendente': 'bg-gray-100 text-gray-800 border-gray-200'
};

export default function OficiosPage({ itemsPerPage = 9 }: OficiosPageProps) {
  const navigate = useNavigate();
  const company = useCompanyStore((state) => state.company);
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [oficiosCache, setOficiosCache] = useState<Oficio[]>([]);
  const [displayedOficios, setDisplayedOficios] = useState<Oficio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOficio, setSelectedOficio] = useState<any>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [filters, setFilters] = useState({
    tipo_de_demanda: '',
    nivel_de_urgencia: '',
    cep: '',
    logradouro: '',
    bairro: '',
    cidade: '',
    requerente_cpf: '',
    responsavel_nome: '',
    numero_oficio: '',
    status_solicitacao: '',
    data_inicio: '',
    data_fim: '',
    indicado_nome: ''
  });
  const [responsaveis, setResponsaveis] = useState<Array<{uid: string, nome: string}>>([]);
  const [tiposDemanda, setTiposDemanda] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [oficioToDelete, setOficioToDelete] = useState<string | null>(null);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [selectedOficioResume, setSelectedOficioResume] = useState<Oficio | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProtocoloModalOpen, setIsProtocoloModalOpen] = useState(false);
  const [oficioToProtocol, setOficioToProtocol] = useState<Oficio | null>(null);
  const [isUploadingProtocolo, setIsUploadingProtocolo] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'folder'>('grid');
  const [expandedYears, setExpandedYears] = useState<string[]>([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderYear, setNewFolderYear] = useState('');

  // Função para formatar a data atual
  const formatDateFilter = (date: Date) => {
    return format(date, 'dd/MM/yyyy');
  };

  // Estado para controlar o filtro ativo
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | '7days' | '30days' | '60days' | '90days'>('all');

  // Função para aplicar filtros localmente
  const applyLocalFilters = useCallback((data: Oficio[]) => {
    let filteredData = [...data];

    // Aplicar filtro de data
    if (activeFilter !== 'all') {
      const now = new Date();
      const today = startOfDay(now);
      
      filteredData = filteredData.filter(oficio => {
        const oficioDate = new Date(oficio.data_solicitacao);
        
        switch (activeFilter) {
          case 'today':
            return isToday(oficioDate);
          case '7days':
            return differenceInDays(now, oficioDate) <= 7;
          case '30days':
            return differenceInDays(now, oficioDate) <= 30;
          case '60days':
            return differenceInDays(now, oficioDate) <= 60;
          case '90days':
            return differenceInDays(now, oficioDate) <= 90;
          default:
            return true;
        }
      });
    }

    // Aplicar outros filtros
    if (filters.tipo_de_demanda) {
      filteredData = filteredData.filter(oficio => 
        oficio.tipo_de_demanda === filters.tipo_de_demanda
      );
    }
    if (filters.nivel_de_urgencia) {
      filteredData = filteredData.filter(oficio => 
        oficio.nivel_de_urgencia.toLowerCase() === filters.nivel_de_urgencia
      );
    }
    if (filters.status_solicitacao) {
      filteredData = filteredData.filter(oficio => 
        oficio.status_solicitacao === filters.status_solicitacao
      );
    }
    if (filters.bairro) {
      filteredData = filteredData.filter(oficio => 
        oficio.bairro.toLowerCase().includes(filters.bairro.toLowerCase())
      );
    }
    if (filters.logradouro) {
      filteredData = filteredData.filter(oficio => 
        oficio.logradouro.toLowerCase().includes(filters.logradouro.toLowerCase())
      );
    }
    if (filters.indicado_nome) {
      filteredData = filteredData.filter(oficio => 
        oficio.gbp_indicado?.nome?.toLowerCase().includes(filters.indicado_nome.toLowerCase())
      );
    }
    if (filters.numero_oficio) {
      filteredData = filteredData.filter(oficio => 
        oficio.numero_oficio.includes(filters.numero_oficio)
      );
    }

    setDisplayedOficios(filteredData);
  }, [activeFilter, filters]);

  // Efeito para carregar dados iniciais e configurar subscription em tempo real
  useEffect(() => {
    if (!company?.uid) return;

    let subscription: any = null;

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        let query = supabaseClient
          .from('gbp_oficios')
          .select('*, gbp_indicado:indicado_uid(nome)')
          .eq('empresa_uid', company.uid)
          .order('created_at', { ascending: false });

        // Aplica o filtro oficio_existente de acordo com o modo de visualização
        if (viewMode === 'folder') {
          query = query.or('oficio_existente.eq.true,url_oficio_protocolado.neq.null,url_oficio_protocolado.neq.""');
        } else {
          query = query.eq('oficio_existente', false);
        }

        const { data, error } = await query;
        
        if (error) throw error;
        
        if (data) {
          setOficiosCache(data);
          setDisplayedOficios(data);
        }
      } catch (error) {
        console.error('Erro ao carregar ofícios:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    // Configura a subscription para atualizações em tempo real
    const setupRealtime = () => {
      // Cancela a subscription anterior se existir
      if (subscription) {
        supabaseClient.removeChannel(subscription);
      }

      // Cria uma nova subscription
      subscription = supabaseClient
        .channel('oficios_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'gbp_oficios',
            filter: `empresa_uid=eq.${company.uid}`
          },
          (payload) => {
            console.log('Mudança recebida:', payload);
            
            // Atualiza o cache com base no tipo de evento
            setOficiosCache(currentOficios => {
              const updatedOficios = [...currentOficios];
              
              switch (payload.eventType) {
                case 'INSERT':
                  // Adiciona o novo ofício se não existir
                  if (!updatedOficios.some(oficio => oficio.uid === payload.new.uid)) {
                    updatedOficios.unshift(payload.new);
                  }
                  break;
                  
                case 'UPDATE':
                  // Atualiza o ofício existente
                  const index = updatedOficios.findIndex(oficio => oficio.uid === payload.new.uid);
                  if (index !== -1) {
                    updatedOficios[index] = { ...updatedOficios[index], ...payload.new };
                  }
                  break;
                  
                case 'DELETE':
                  // Remove o ofício excluído
                  return updatedOficios.filter(oficio => oficio.uid !== payload.old.uid);
              }
              
              return updatedOficios;
            });
          }
        )
        .subscribe();
    };

    // Carrega os dados iniciais e configura a subscription
    fetchInitialData().then(() => {
      setupRealtime();
    });

    // Função de limpeza para cancelar a subscription quando o componente for desmontado
    return () => {
      if (subscription) {
        supabaseClient.removeChannel(subscription);
      }
    };
  }, [company?.uid, viewMode]); // Recarrega quando mudar a empresa ou o modo de visualização

  // Efeito para aplicar filtros quando mudarem ou quando o cache for atualizado
  useEffect(() => {
    if (!oficiosCache.length) return;
    applyLocalFilters(oficiosCache);
  }, [activeFilter, filters, applyLocalFilters, oficiosCache]);

  // Função para obter os ofícios filtrados
  const getFilteredOficios = () => {
    const formatToYYYYMMDD = (date: string | Date): string => {
      const d = new Date(date);
      return d.toISOString().split('T')[0];
    };

    const isWithinDays = (date1: string, days: number): boolean => {
      const today = new Date();
      const compareDate = new Date(date1);
      const diffTime = Math.abs(today.getTime() - compareDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= days;
    };

    switch (activeFilter) {
      case 'today':
        return displayedOficios.filter(oficio => 
          isToday(new Date(oficio.data_solicitacao))
        );
      case '7days':
        return displayedOficios.filter(oficio => 
          isWithinDays(oficio.data_solicitacao, 7)
        );
      case '30days':
        return displayedOficios.filter(oficio => 
          isWithinDays(oficio.data_solicitacao, 30)
        );
      case '60days':
        return displayedOficios.filter(oficio => 
          isWithinDays(oficio.data_solicitacao, 60)
        );
      case '90days':
        return displayedOficios.filter(oficio => 
          isWithinDays(oficio.data_solicitacao, 90)
        );
      default:
        return displayedOficios;
    }
  };

  const handleExportExcel = async () => {
    try {
      const oficiosToExport = getFilteredOficios();

      const dataToExport = oficiosToExport.map(oficio => ({
        'Número do Ofício': oficio.numero_oficio || '',
        'Data da Solicitação': oficio.data_solicitacao ? new Date(oficio.data_solicitacao).toLocaleDateString('pt-BR') : '',
        'Status': oficio.status_solicitacao || '',
        'Tipo de Demanda': oficio.tipo_de_demanda || '',
        'Nível de Urgência': oficio.nivel_de_urgencia || '',
        'Requerente Nome': oficio.requerente_nome || '',
        'Requerente CPF': oficio.requerente_cpf || '',
        'Requerente WhatsApp': oficio.requerente_whatsapp || '',
        'Responsável Nome': oficio.responsavel_nome || 'Não atribuído',
        'Logradouro': oficio.logradouro || '',
        'Número': oficio.numero || '',
        'Bairro': oficio.bairro || '',
        'Cidade': oficio.cidade || '',
        'UF': oficio.uf || '',
        'CEP': oficio.cep || '',
        'Referência': oficio.referencia || '',
        'Contato': oficio.contato || '',
        'Tag': oficio.tag || '',
        'Fotos do Problema': oficio.fotos_do_problema?.length > 0 ? oficio.fotos_do_problema.join(', ') : 'Sem fotos',
        'Visualizado': oficio.visualizou ? 'Sim' : 'Não',
        'Descrição do Problema': oficio.descricao_do_problema || '',
        'Data de Criação': oficio.created_at ? new Date(oficio.created_at).toLocaleDateString('pt-BR') : ''
      }));

      if (dataToExport.length === 0) {
        toast.error('Nenhum dado encontrado para exportar');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      
      // Adiciona filtros automáticos
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      ws['!autofilter'] = { ref: ws['!ref'] || 'A1' };
      
      // Estiliza o cabeçalho
      const headerStyle = {
        font: { bold: true },
        fill: { fgColor: { rgb: "DCE6F1" } },
        alignment: { horizontal: 'center' }
      };
      
      // Aplica estilo ao cabeçalho
      const headers = Object.keys(dataToExport[0]);
      headers.forEach((header, index) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
        if (!ws[cellRef]) ws[cellRef] = {};
        ws[cellRef].s = headerStyle;
      });

      XLSX.utils.book_append_sheet(wb, ws, 'Ofícios');
      
      // Ajustando largura das colunas
      const colWidths = [
        { wch: 15 }, // Número do Ofício
        { wch: 12 }, // Data da Solicitação
        { wch: 12 }, // Status
        { wch: 15 }, // Tipo de Demanda
        { wch: 15 }, // Nível de Urgência
        { wch: 30 }, // Requerente Nome
        { wch: 15 }, // Requerente CPF
        { wch: 15 }, // Requerente WhatsApp
        { wch: 30 }, // Responsável Nome
        { wch: 40 }, // Logradouro
        { wch: 10 }, // Número
        { wch: 20 }, // Bairro
        { wch: 20 }, // Cidade
        { wch: 5 },  // UF
        { wch: 10 }, // CEP
        { wch: 30 }, // Referência
        { wch: 15 }, // Contato
        { wch: 15 }, // Tag
        { wch: 50 }, // Fotos
        { wch: 10 }, // Visualizado
        { wch: 50 }, // Descrição
        { wch: 12 }  // Data de Criação
      ];
      
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `oficios_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Arquivo Excel exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('Erro ao exportar arquivo Excel');
    }
  };

  const handleGenerateWord = async (oficio: Oficio) => {
    try {
      // Buscar dados da empresa
      const { data: empresa } = await supabaseClient
        .from('gbp_empresas')
        .select('*')
        .eq('uid', oficio.empresa_uid)
        .single();

      if (!empresa) {
        toast.error('Dados da empresa não encontrados');
        return;
      }

      // Processar imagens
      const imagePromises = oficio.fotos_do_problema?.map(async (fotoUrl) => {
        try {
          const response = await fetch(fotoUrl);
          const blob = await response.blob();
          return await convertImageToBase64(blob);
        } catch (error) {
          console.error('Erro ao processar imagem:', error);
          return null;
        }
      }) || [];

      const imageBase64Array = await Promise.all(imagePromises);
      const validImages = imageBase64Array.filter(img => img !== null);

      // Criar seções do documento
      const sections = [
        {
          properties: {
            page: {
              margin: {
                top: 1400,
                right: 1000,
                bottom: 2000,
              }
            }
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "GABINETE POLÍTICO",
                      bold: true,
                      size: 28,
                      font: "Times New Roman",
                      color: "000000"
                    })
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 200 }
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: empresa.nome.toUpperCase(),
                      size: 24,
                      font: "Times New Roman",
                      color: "000000"
                    })
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 200 }
                }),
                new Paragraph({
                  children: [new TextRun({ text: '_'.repeat(90), color: "000000" })],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 200 }
                })
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({ children: [], spacing: { before: 400 } }),
                new Paragraph({
                  children: [new TextRun({ text: '_'.repeat(90), color: "000000" })],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 200, after: 200 }
                }),
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: `${empresa.endereco} - ${empresa.cidade} - ${empresa.estado}\n`,
                      size: 16,
                      font: "Times New Roman"
                    }),
                    new TextRun({ 
                      text: `Tel: ${empresa.telefone} | Email: ${empresa.email}\n`,
                      size: 16,
                      font: "Times New Roman"
                    }),
                    new TextRun({ 
                      text: empresa.site || '',
                      size: 16,
                      font: "Times New Roman"
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ],
            }),
          },
          children: [
            // Número do ofício
            new Paragraph({
              children: [new TextRun({ 
                text: `OFICIO Nº ${oficio.numero_oficio}/2025`, 
                bold: true, 
                size: 24,
                font: "Times New Roman"
              })],
              alignment: AlignmentType.LEFT,
              spacing: { after: 200 }
            }),
            // Data
            new Paragraph({
              children: [new TextRun({ 
                text: `${oficio.cidade}, ${new Date(oficio.data_solicitacao).toLocaleDateString('pt-BR')}`, 
                size: 24,
                font: "Times New Roman"
              })],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 400 }
            }),
            // Destinatário
            new Paragraph({
              children: [
                new TextRun({ text: 'À\n', size: 24, font: "Times New Roman" }),
                new TextRun({ text: `Secretaria de ${oficio.tipo_de_demanda.split(':')[0]}\n`, bold: true, size: 24, font: "Times New Roman" }),
                new TextRun({ text: `${oficio.cidade} - ${oficio.uf}`, size: 24, font: "Times New Roman" })
              ],
              spacing: { before: 200, after: 200 }
            }),
            // Assunto
            new Paragraph({
              children: [
                new TextRun({ text: 'Assunto: ', bold: true, size: 24, font: "Times New Roman" }),
                new TextRun({ text: oficio.tipo_de_demanda.toUpperCase(), size: 24, bold: true, font: "Times New Roman" })
              ],
              spacing: { after: 400 }
            }),
            // Conteúdo
            new Paragraph({
              children: [new TextRun({ text: 'Prezados Senhores:', size: 24, font: "Times New Roman" })],
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ 
                  text: `Em nome dos moradores e cidadãos desta localidade, venho respeitosamente solicitar a análise e providências necessárias referente à situação de ${oficio.tipo_de_demanda.toLowerCase()} no seguinte endereço:\n\n`,
                  size: 24,
                  font: "Times New Roman"
                })
              ],
              spacing: { after: 200 }
            }),
            // Endereço
            new Paragraph({
              children: [
                new TextRun({ 
                  text: `${oficio.logradouro}${oficio.numero ? `, ${oficio.numero}` : ''}\n`, 
                  bold: true,
                  size: 24,
                  font: "Times New Roman"
                }),
                new TextRun({ 
                  text: `Bairro: ${oficio.bairro}\n`,
                  size: 24,
                  font: "Times New Roman"
                }),
                new TextRun({ 
                  text: `${oficio.cidade} - ${oficio.uf}\n`,
                  size: 24,
                  font: "Times New Roman"
                }),
                oficio.referencia ? new TextRun({ 
                  text: `Ponto de Referência: ${oficio.referencia}\n`,
                  size: 24,
                  font: "Times New Roman"
                }) : new TextRun({ text: '' })
              ],
              spacing: { before: 200, after: 200 }
            }),
            // Detalhamento
            new Paragraph({
              children: [
                new TextRun({ text: 'Detalhamento da Situação: ', bold: true, size: 24, font: "Times New Roman" }),
                new TextRun({ text: oficio.descricao_do_problema + '\n\n', size: 24, font: "Times New Roman" }),
                new TextRun({ 
                  text: 'Esta situação tem causado transtornos significativos aos moradores da região, necessitando de atenção prioritária dos órgãos competentes.',
                  size: 24,
                  font: "Times New Roman"
                })
              ],
              spacing: { after: 400 }
            }),
            // Urgência
            new Paragraph({
              children: [
                new TextRun({ text: 'Classificação de Urgência: ', bold: true, size: 24, font: "Times New Roman" }),
                new TextRun({ 
                  text: oficio.nivel_de_urgencia.toUpperCase(), 
                  size: 24,
                  font: "Times New Roman",
                  color: oficio.nivel_de_urgencia.toLowerCase() === 'alta' ? 'FF0000' : '000000',
                  bold: true
                })
              ],
              spacing: { after: 400 }
            }),
            // Fechamento
            new Paragraph({
              children: [
                new TextRun({ 
                  text: '\nAgradeço antecipadamente a atenção dispensada a esta solicitação e aguardo um posicionamento sobre as medidas que serão adotadas.',
                  size: 24,
                  font: "Times New Roman"
                })
              ],
              spacing: { before: 200, after: 200 }
            }),
            new Paragraph({
              children: [new TextRun({ text: 'Atenciosamente,', size: 24, font: "Times New Roman" })],
              spacing: { before: 200, after: 400 }
            }),
            // Espaço flexível
            new Paragraph({
              children: [new TextRun({ text: '\n\n\n' })],
              spacing: { before: 200, after: 200 }
            }),
            // Assinatura
            new Paragraph({
              children: [
                new TextRun({ text: '_'.repeat(30) + '\n', size: 24 }),
                new TextRun({ text: `${empresa.nome}\n`, bold: true, size: 24, font: "Times New Roman" }),
                new TextRun({ text: 'Vereador', size: 24, font: "Times New Roman" })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 400 }
            })
          ]
        }
      ];

      // Se houver imagens, adiciona uma nova seção
      if (validImages.length > 0) {
        sections.push({
          properties: {
            page: {
              margin: {
                top: 1400,
                right: 1000,
                bottom: 1400,
              }
            }
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "GABINETE POLÍTICO",
                      bold: true,
                      size: 28,
                      font: "Times New Roman",
                      color: "000000"
                    })
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 200 }
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: empresa.nome.toUpperCase(),
                      size: 24,
                      font: "Times New Roman",
                      color: "000000"
                    })
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 200 }
                })
              ]
            })
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({ 
                  text: 'ANEXO - REGISTROS FOTOGRÁFICOS',
                  bold: true,
                  size: 28,
                  font: "Times New Roman",
                  color: "000000"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            ...validImages.map(imageBase64 => 
              new Paragraph({
                children: [
                  new ImageRun({
                    data: imageBase64,
                    transformation: {
                      width: 500,
                      height: 375
                    }
                  })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 200 }
              })
            )
          ]
        });
      }

      const doc = new Document({ sections });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `oficio_${oficio.numero_oficio}.docx`);
      toast.success('Documento Word gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar documento Word:', error);
      toast.error('Erro ao gerar documento Word');
    }
  };

  // Função auxiliar para converter imagem para base64
  const convertImageToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Buscar responsáveis e tipos de demanda
  useEffect(() => {
    const fetchResponsaveis = async () => {
      const { data, error } = await supabaseClient
        .from('gbp_usuarios')
        .select('uid, nome')
        .eq('empresa_uid', company?.uid)
        .order('nome');
      
      if (data && !error) {
        setResponsaveis(data);
      }
    };

    const fetchTiposDemanda = async () => {
      const { data, error } = await supabaseClient
        .from('gbp_oficios')
        .select('tipo_de_demanda')
        .eq('empresa_uid', company.uid)
        .not('tipo_de_demanda', 'is', null);
      
      if (data && !error) {
        const tipos = [...new Set(data.map(d => d.tipo_de_demanda))];
        setTiposDemanda(tipos);
      }
    };

    fetchResponsaveis();
    fetchTiposDemanda();
  }, [company]);

  // Efeito para atualizar em tempo real
  useEffect(() => {
    // Inscreve-se para atualizações em tempo real
    const channel = supabaseClient
      .channel('gbp_oficios_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gbp_oficios'
        },
        (payload) => {
          // Atualiza o cache quando houver mudanças
          setOficiosCache(currentCache => {
            return currentCache.map(oficio => {
              if (oficio.uid === payload.new.uid) {
                return { ...oficio, ...payload.new };
              }
              return oficio;
            });
          });
        }
      )
      .subscribe();

    // Cleanup na desmontagem
    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Função para carregar mais ofícios
  const fetchMoreOficios = useCallback(async () => {
    if (isFetchingMore || !hasMore) return;
    
    setIsFetchingMore(true);
    try {
      const nextPage = currentPage + 1;
      const start = (nextPage - 1) * 9;
      
      let query = supabaseClient
        .from('gbp_oficios')
        .select('*', { count: 'exact' })
        .eq('empresa_uid', company?.uid)
        .eq('oficio_existente', false)
        .order('created_at', { ascending: false })
        .range(start, start + 8);

      const { data, count, error } = await query;
      
      if (error) throw error;

      if (data) {
        setOficiosCache(prev => [...prev, ...data]);
        setDisplayedOficios(prev => [...prev, ...data]);
        setCurrentPage(nextPage);
        setHasMore((count || 0) > start + (data?.length || 0));
      }
    } catch (error) {
      console.error('Erro ao carregar mais ofícios:', error);
      setError(error.message);
    } finally {
      setIsFetchingMore(false);
    }
  }, [currentPage, hasMore, isFetchingMore, company?.uid]);

  // Observer para infinite scroll
  useEffect(() => {
    if (!observerTarget.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMoreOficios();
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(observerTarget.current);

    return () => observer.disconnect();
  }, [fetchMoreOficios]);

  const handleStatusChange = async (oficio: Oficio, newStatus: string) => {
    if (newStatus === 'Protocolada') {
      if (oficio.fd_demanda_registrada_true_false === false) {
        return; // Não permite selecionar Protocolada se fd_demanda_registrada_true_false for false
      }
      setOficioToProtocol(oficio);
      setIsProtocoloModalOpen(true);
      return;
    }

    try {
      const { error: updateError } = await supabaseClient
        .from('gbp_oficios')
        .update({ 
          status_solicitacao: newStatus
        })
        .eq('uid', oficio.uid);

      if (updateError) {
        console.error('Erro ao atualizar status:', updateError);
        return;
      }

      // Atualiza o cache e a lista exibida
      const updatedOficios = oficiosCache.map(o => 
        o.uid === oficio.uid 
          ? { ...o, status_solicitacao: newStatus }
          : o
      );
      setOficiosCache(updatedOficios);
      setDisplayedOficios(updatedOficios);

      toast.success('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleUpdateOficio = async (data: any) => {
    try {
      const { error } = await supabaseClient
        .from('gbp_oficios')
        .update(data)
        .eq('uid', selectedOficio.uid);

      if (error) throw error;

      // Atualiza a lista local
      setOficiosCache(oficiosCache.map(oficio => 
        oficio.uid === selectedOficio.uid ? { ...oficio, ...data } : oficio
      ));

      setIsEditModalOpen(false);
      setSelectedOficio(null);

      toast.success('Ofício atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar ofício:', error);
    }
  };

  const handleDeleteOficio = async () => {
    if (!oficioToDelete) return;

    try {
      const { error } = await supabaseClient
        .from('gbp_oficios')
        .delete()
        .eq('uid', oficioToDelete);

      if (error) throw error;

      // Atualiza a lista local removendo o ofício excluído
      setOficiosCache(oficiosCache.filter(oficio => oficio.uid !== oficioToDelete));
      setIsDeleteModalOpen(false);
      setOficioToDelete(null);
      toast.success('Ofício excluído com sucesso');
    } catch (error) {
      console.error('Erro ao excluir ofício:', error);
      toast.error('Erro ao excluir ofício');
    }
  };

  const formatTipoDemanda = (tipo: string) => {
    const [categoria, subcategoria] = tipo.split('::');
    return (
      <div className="flex flex-col">
        <span className="text-xs text-gray-500 font-medium">{categoria}</span>
        <span className="text-base font-semibold text-gray-900 dark:text-white truncate">
          {subcategoria}
        </span>
      </div>
    );
  };

  const handleViewResume = async (oficio: Oficio) => {
    setSelectedOficioResume(oficio);
    setIsResumeModalOpen(true);
    
    // Marca como visualizado ao abrir o resumo
    try {
      const { error } = await supabaseClient
        .from('gbp_oficios')
        .update({ visualizou: true })
        .eq('uid', oficio.uid);

      if (error) throw error;

      // Atualiza a lista local
      setOficiosCache(oficiosCache.map(item => 
        item.uid === oficio.uid ? { ...item, visualizou: true } : item
      ));
    } catch (error) {
      console.error('Erro ao marcar ofício como visualizado:', error);
    }
  };

  const handleMarkAsViewed = async (oficioUid: string) => {
    try {
      const { error } = await supabaseClient
        .from('gbp_oficios')
        .update({ visualizou: true })
        .eq('uid', oficioUid);

      if (error) throw error;

      // Atualiza a lista local
      setOficiosCache(oficiosCache.map(oficio => 
        oficio.uid === oficioUid ? { ...oficio, visualizou: true } : oficio
      ));

      toast.success('Ofício marcado como visualizado');
    } catch (error) {
      console.error('Erro ao marcar ofício como visualizado:', error);
      toast.error('Erro ao marcar ofício como visualizado');
    }
  };

  const handleUploadProtocolo = async (oficio: Oficio, file: File) => {
    setIsUploadingProtocolo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${oficio.numero_oficio}_protocolo.${fileExt}`;
      const filePath = `${company?.uid}/oficios/${oficio.uid}/${fileName}`;

      const { error: uploadError, data } = await supabaseClient.storage
        .from('gbp_oficios')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage
        .from('gbp_oficios')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabaseClient
        .from('gbp_oficios')
        .update({ 
          status_solicitacao: 'Protocolada',
          url_oficio_protocolado: publicUrl,
          numero_oficio: oficio.numero_oficio,
          fd_demanda_registrada_true_false: false
        })
        .eq('uid', oficio.uid);

      if (updateError) throw updateError;

      // Atualiza o cache e a lista exibida
      const updatedOficios = oficiosCache.map(o => 
        o.uid === oficio.uid 
          ? { ...o, status_solicitacao: 'Protocolada', url_oficio_protocolado: publicUrl, numero_oficio: oficio.numero_oficio, fd_demanda_registrada_true_false: false }
          : o
      );
      setOficiosCache(updatedOficios);
      setDisplayedOficios(updatedOficios);
      
      // Enviar post com informações da página
      try {
        const response = await fetch('https://whkn8n.guardia.work/webhook/solicitacao_atualização', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            oficio: oficio,
            url_protocolo: publicUrl,
            status: 'Protocolada',
            data_protocolo: new Date().toISOString(),
            empresa: company,
            usuario: user
          })
        });

        if (!response.ok) {
          console.error('Erro ao enviar notificação:', await response.text());
        }
      } catch (error) {
        console.error('Erro ao enviar notificação:', error);
      }

      toast.success('Protocolo enviado com sucesso!');
      setIsProtocoloModalOpen(false);
      setOficioToProtocol(null);
    } catch (error) {
      console.error('Erro ao fazer upload do protocolo:', error);
      toast.error('Erro ao enviar protocolo');
    } finally {
      setIsUploadingProtocolo(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || !oficioToProtocol || !company) return;

    try {
      setIsUploadingProtocolo(true);
      const timestamp = new Date().getTime();
      
      // Remove caracteres especiais e espaços do nome do arquivo
      const cleanFileName = selectedFile.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^\w\d.-]/g, '_') // Substitui caracteres especiais por _
        .replace(/_{2,}/g, '_') // Remove múltiplos _ consecutivos
        .toLowerCase();
        
      const fileName = `${timestamp}_${cleanFileName}`;
      
      // Primeiro, buscar o bucket correto da empresa
      const { data: empresaData, error: empresaError } = await supabaseClient
        .from('gbp_empresas')
        .select('storage')
        .eq('uid', company.uid)
        .single();

      if (empresaError || !empresaData?.storage) {
        throw new Error('Não foi possível obter o bucket de armazenamento da empresa');
      }

      // Usar o bucket específico da empresa
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from(empresaData.storage)
        .upload(`${company.uid}/${fileName}`, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: selectedFile.type || 'application/octet-stream'
        });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
      }

      // Se chegou aqui, o upload foi bem sucedido
      const fileUrl = `https://studio.gbppolitico.com/storage/v1/object/${empresaData.storage}/${company.uid}/${fileName}`;

      const { error: updateError } = await supabaseClient
        .from('gbp_oficios')
        .update({ 
          status_solicitacao: 'Protocolada',
          url_oficio_protocolado: fileUrl,
          numero_oficio: oficioToProtocol.numero_oficio,
          fd_demanda_registrada_true_false: false
        })
        .eq('uid', oficioToProtocol.uid);

      if (updateError) {
        console.error('Erro na atualização:', updateError);
        throw new Error(`Erro ao atualizar ofício: ${updateError.message}`);
      }

      // Enviar post com informações da página
      try {
        const response = await fetch('https://whkn8n.guardia.work/webhook/solicitacao_atualização', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            oficio: oficioToProtocol,
            url_protocolo: fileUrl,
            status: 'Protocolada',
            data_protocolo: new Date().toISOString(),
            empresa: company,
            usuario: user
          })
        });

        if (!response.ok) {
          console.error('Erro ao enviar notificação:', await response.text());
        }
      } catch (error) {
        console.error('Erro ao enviar notificação:', error);
      }

      toast.success('Protocolo enviado com sucesso!');
      setIsProtocoloModalOpen(false);
      setOficioToProtocol(null);
      setSelectedFile(null);
      
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      // Aqui você pode adicionar uma notificação de erro para o usuário se desejar
    } finally {
      setIsUploadingProtocolo(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedOficio) return;

    try {
      // Preparando os dados para atualização
      const updateData = {
        status_solicitacao: selectedOficio.status_solicitacao,
        tipo_de_demanda: selectedOficio.tipo_de_demanda,
        nivel_de_urgencia: selectedOficio.nivel_de_urgencia,
        descricao_do_problema: selectedOficio.descricao_do_problema,
        logradouro: selectedOficio.logradouro,
        cep: selectedOficio.cep,
        cidade: selectedOficio.cidade,
        bairro: selectedOficio.bairro,
        uf: selectedOficio.uf
      };

      console.log('Dados para atualização:', updateData);

      // Atualizando o ofício
      const { error } = await supabaseClient
        .from('gbp_oficios')
        .update(updateData)
        .eq('uid', selectedOficio.uid);

      if (error) throw error;

      // Recarregando os dados
      const { data, error: fetchError } = await supabaseClient
        .from('gbp_oficios')
        .select('*')
        .eq('empresa_uid', company.uid)
        .eq('oficio_existente', false)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (data) {
        setOficiosCache(data);
        setDisplayedOficios(data);
      }

      // Fechando o modal e limpando a seleção
      setIsEditModalOpen(false);
      setSelectedOficio(null);

      toast.success('Ofício atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar ofício:', error);
      toast.error(`Erro ao atualizar ofício: ${error.message}`);
    }
  };

  const handleUploadProtocoloModal = async (oficio: Oficio, file: File) => {
    setIsUploadingProtocolo(true);
    try {
      // Remove caracteres especiais e espaços do nome do arquivo
      const cleanFileName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^\w\d.-]/g, '_') // Substitui caracteres especiais por _
        .replace(/_{2,}/g, '_') // Remove múltiplos _ consecutivos
        .toLowerCase();
      
      const fileExt = cleanFileName.split('.').pop();
      const fileName = `${oficio.numero_oficio}_protocolo_${Date.now()}.${fileExt}`;
      const filePath = `${company?.uid}/oficios/${oficio.uid}/${fileName}`;

      const { error: uploadError, data } = await supabaseClient.storage
        .from('gbp_oficios')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage
        .from('gbp_oficios')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabaseClient
        .from('gbp_oficios')
        .update({
          status_solicitacao: 'Protocolada',
          url_oficio_protocolado: publicUrl,
          numero_oficio: oficio.numero_oficio,
          fd_demanda_registrada_true_false: false
        })
        .eq('uid', oficio.uid);

      if (updateError) throw updateError;

      // Atualiza o cache e a lista exibida
      const updatedOficios = oficiosCache.map(o => 
        o.uid === oficio.uid 
          ? { ...o, status_solicitacao: 'Protocolada', url_oficio_protocolado: publicUrl, numero_oficio: oficio.numero_oficio, fd_demanda_registrada_true_false: false }
          : o
      );
      setOficiosCache(updatedOficios);
      setDisplayedOficios(updatedOficios);
      
      // Enviar post com informações da página
      try {
        const response = await fetch('https://whkn8n.guardia.work/webhook/solicitacao_atualização', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            oficio: oficio,
            url_protocolo: publicUrl,
            status: 'Protocolada',
            data_protocolo: new Date().toISOString(),
            empresa: company,
            usuario: user
          })
        });

        if (!response.ok) {
          console.error('Erro ao enviar notificação:', await response.text());
        }
      } catch (error) {
        console.error('Erro ao enviar notificação:', error);
      }

      toast.success('Protocolo enviado com sucesso!');
      setIsProtocoloModalOpen(false);
      setOficioToProtocol(null);
    } catch (error) {
      console.error('Erro ao fazer upload do protocolo:', error);
      toast.error('Erro ao enviar protocolo');
    } finally {
      setIsUploadingProtocolo(false);
    }
  };

  const buscarEnderecoPorCep = async (cep: string) => {
    if (!cep || cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setSelectedOficio(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          uf: data.uf || prev.uf
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 mb-6">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between min-h-[48px]">
              {/* Lado esquerdo - Título e navegação */}
              <div className="flex items-center min-w-0">
                <Link 
                  to="/app/documentos"
                  className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0 mr-2 sm:mr-3"
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
                <div className="flex items-center min-w-0">
                  <h1 className="header-title text-lg sm:text-xl md:text-2xl font-semibold truncate">Ofícios</h1>
                  <span className="ml-2 sm:ml-3 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium flex-shrink-0">
                    {displayedOficios.length}
                  </span>
                </div>
              </div>

              {/* Lado direito - Ações */}
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                {/* Seletor de visualização */}
                <div className="flex items-center bg-white rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium rounded-full transition-all ${
                      viewMode === 'grid'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4 sm:hidden" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 3H10V10H3V3Z" className={viewMode === 'grid' ? 'fill-blue-700' : 'fill-gray-600'} />
                      <path d="M14 3H21V10H14V3Z" className={viewMode === 'grid' ? 'fill-blue-700' : 'fill-gray-600'} />
                      <path d="M3 14H10V21H3V14Z" className={viewMode === 'grid' ? 'fill-blue-700' : 'fill-gray-600'} />
                      <path d="M14 14H21V21H14V14Z" className={viewMode === 'grid' ? 'fill-blue-700' : 'fill-gray-600'} />
                    </svg>
                    <span className="hidden sm:inline">Demanda</span>
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('folder');
                      setActiveFilter('all');
                      setFilters({
                        tipo_de_demanda: '',
                        nivel_de_urgencia: '',
                        cep: '',
                        logradouro: '',
                        bairro: '',
                        cidade: '',
                        requerente_cpf: '',
                        responsavel_nome: '',
                        numero_oficio: '',
                        status_solicitacao: '',
                        data_inicio: '',
                        data_fim: ''
                      });
                      setIsFilterOpen(false);
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium rounded-full transition-all ${
                      viewMode === 'folder'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <FileText className="h-4 w-4 sm:hidden" />
                    <span className="hidden sm:inline">Pastas</span>
                  </button>
                </div>

                {/* Botões adicionais apenas visíveis em telas maiores */}
                <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 md:gap-3">
                  {viewMode === 'grid' && (
                    <>
                      {user?.nivel_acesso === 'admin' && (
                        <button
                          onClick={() => handleExportExcel()}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-white bg-[#217346] rounded-lg hover:bg-[#1e6b41] transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          <span className="hidden md:inline">Excel</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          isFilterOpen
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Filter className="h-4 w-4" />
                        <span className="hidden md:inline">Filtros</span>
                      </button>

                      <Link
                        to="/app/documentos/oficios/novo"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="hidden md:inline">Novo Ofício</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Filtros de data - Mobile */}
            <div className="sm:hidden flex items-center w-full px-4 py-3">
              {viewMode === 'grid' && (
                <div className="flex w-full">
                  <select
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}
                    className="w-full px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Ofícios</option>
                    <option value="today">Hoje</option>
                    <option value="7days">Últimos 7 dias</option>
                    <option value="30days">Últimos 30 dias</option>
                    <option value="60days">Últimos 60 dias</option>
                    <option value="90days">Últimos 90 dias</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex relative">
          {/* Lista de Ofícios */}
          <div className="flex flex-col flex-1 h-full">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 px-4 sm:px-6 lg:px-8 pb-6">
                {!isLoading && displayedOficios.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center min-h-[60vh] w-full">
                    <FileText className="h-20 w-20 text-gray-300 mb-6" />
                    <h3 className="text-xl font-medium text-gray-900 mb-3 text-center">Nenhum ofício encontrado</h3>
                    <p className="text-sm text-gray-500 text-center">
                      Clique em "Novo Ofício" para criar seu primeiro documento
                    </p>
                  </div>
                )}
                {displayedOficios.map((oficio) => (
                  <motion.div
                    key={oficio.uid}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="p-4">
                      {(!oficio.fotos_do_problema || oficio.fotos_do_problema.length === 0) ? (
                        <div className="w-full h-48 rounded-t-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                          <svg className="w-96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="12" y="12" width="72" height="72" rx="4" stroke="#D1D5DB" strokeWidth="2"/>
                            <circle cx="32" cy="32" r="8" stroke="#D1D5DB" strokeWidth="2"/>
                            <path d="M12 60L30 42L48 60L66 42L84 60" stroke="#D1D5DB" strokeWidth="2"/>
                          </svg>
                        </div>
                      ) : (
                        <div className="relative w-full h-48">
                          <div className={`w-full h-full ${oficio.fotos_do_problema.length > 1 ? 'grid grid-cols-2 gap-0.5' : ''}`}>
                            <div 
                              className="relative h-48 overflow-hidden cursor-pointer rounded-tl-xl"
                              onClick={() => {
                                setSelectedImages(oficio.fotos_do_problema);
                                setCurrentImageIndex(0);
                                setIsModalOpen(true);
                              }}
                            >
                              <img 
                                src={oficio.fotos_do_problema[0]} 
                                alt="Foto do problema 1" 
                                className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                              />
                            </div>
                            {oficio.fotos_do_problema.length > 1 && (
                              <div 
                                className="relative h-48 overflow-hidden cursor-pointer rounded-tr-xl"
                                onClick={() => {
                                  setSelectedImages(oficio.fotos_do_problema);
                                  setCurrentImageIndex(1);
                                  setIsModalOpen(true);
                                }}
                              >
                                <img 
                                  src={oficio.fotos_do_problema[1]} 
                                  alt="Foto do problema 2" 
                                  className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                />
                              </div>
                            )}
                            {/* Indicador de visualização */}
                            <div className="absolute top-2 left-2 z-10">
                              <span className={`${
                                !oficio.visualizou 
                                  ? 'bg-blue-500'
                                  : 'bg-gray-500 bg-opacity-90'
                              } text-white text-xs font-medium px-2.5 py-0.5 rounded-full shadow-md ring-1 ring-black ring-opacity-5`}>
                                {!oficio.visualizou ? 'Novo' : 'Visto'}
                              </span>
                            </div>
                            {oficio.fotos_do_problema.length > 2 && (
                              <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-md text-xs">
                                +{oficio.fotos_do_problema.length - 2}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600">#{oficio.numero_oficio}</span>
                          </div>
                          {user?.nivel_acesso === 'admin' ? (
                            <select
                              value={oficio.status_solicitacao}
                              onChange={(e) => handleStatusChange(oficio, e.target.value)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer appearance-none pr-8 ${STATUS_STYLES[oficio.status_solicitacao]?.color || STATUS_STYLES['Recebida'].color}`}
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4L6 8'/%3e%3c/svg%3e")`,
                                backgroundPosition: 'right 0.5rem center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: '1.5em 1.5em'
                              }}
                            >
                              <option value="Recebida">Recebida</option>
                              <option value="Protocolada" disabled={oficio.fd_demanda_registrada_true_false === false}>Protocolada</option>
                              <option value="Em Análise">Em Análise</option>
                              <option value="Pendente">Pendente</option>
                              <option value="Concluída">Concluída</option>
                              <option value="Arquivada">Arquivada</option>
                            </select>
                          ) : (
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${STATUS_STYLES[oficio.status_solicitacao]?.color || STATUS_STYLES['Recebida'].color}`}>
                              {oficio.status_solicitacao}
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                              {oficio.tipo_de_demanda.split('::')[1]}
                            </h3>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${URGENCIA_COLORS[oficio.nivel_de_urgencia.toLowerCase()] || URGENCIA_COLORS['pendente']}`}>
                                {oficio.nivel_de_urgencia}
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {oficio.tipo_de_demanda.split('::')[0]}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {oficio.requerente_nome}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                              <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {oficio.logradouro}, {oficio.bairro}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 flex-shrink-0 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(oficio.data_solicitacao)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {user?.nivel_acesso === 'admin' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOficioToDelete(oficio.uid);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-red-500 hover:text-red-600"
                                title="Excluir ofício"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOficio(oficio);
                                setIsEditModalOpen(true);
                              }}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                              title="Editar ofício"
                            >
                              <Pencil className="h-4 w-4 text-gray-400" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewResume(oficio);
                              }}
                              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              title="Visualizar detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {renderActionButtons(oficio)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-4 p-4 h-[calc(100vh-10rem)] overflow-y-auto">
                {/* Botão de Nova Pasta */}
                <div className="flex-[0_0_auto] min-w-[160px] max-w-[200px]">
                  <button
                    onClick={() => setShowNewFolderModal(true)}
                    className="w-full text-left"
                  >
                    <div className="flex flex-col items-center p-3 hover:bg-gray-50 rounded transition-colors">
                      <svg className="w-16 h-16 text-gray-300 mb-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M2 6C2 4.89543 2.89543 4 4 4H9L11 6H20C21.1046 6 22 6.89543 22 8V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6Z"
                          fill="currentColor"
                        />
                        <path d="M12 10v6m-3-3h6" stroke="#D1D5DB" strokeWidth="2"/>
                      </svg>
                      <span className="text-sm font-medium text-gray-600">Nova Pasta</span>
                    </div>
                  </button>
                </div>

                {Object.entries(
                  displayedOficios.reduce((acc, oficio) => {
                    const ano = oficio.numero_oficio.split('/')[1] || new Date(oficio.created_at).getFullYear().toString();
                    if (!acc[ano]) acc[ano] = [];
                    acc[ano].push(oficio);
                    return acc;
                  }, {} as Record<string, typeof displayedOficios>)
                )
                .sort(([anoA], [anoB]) => Number(anoB) - Number(anoA))
                .map(([ano, oficios]) => (
                  <div key={ano} className="flex-[0_0_auto] min-w-[160px] max-w-[200px]">
                    <button
                      onClick={() => navigate(`/app/documentos/oficios/${ano}`)}
                      className="w-full text-left"
                    >
                      <div className="flex flex-col items-center p-3 hover:bg-gray-50 rounded transition-colors">
                        <svg className="w-16 h-16 text-yellow-400 mb-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M2 6C2 4.89543 2.89543 4 4 4H9L11 6H20C21.1046 6 22 6.89543 22 8V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6Z"
                            fill="currentColor"
                          />
                        </svg>
                        <div className="flex flex-col items-center text-center">
                          <span className="text-lg font-medium text-gray-900">{ano}</span>
                          <span className="mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                            {oficios.length} {oficios.length === 1 ? 'ofício' : 'ofícios'}
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {isFetchingMore && (
              <div className="flex justify-center items-center py-4 mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            )}
            
            <div ref={observerTarget} className="h-4 mt-2" />
          </div>

          {/* Painel Lateral de Filtros */}
          <div className={`w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 fixed right-0 top-0 bottom-0 transform transition-transform duration-300 ease-in-out ${isFilterOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto shadow-xl z-40 pt-20`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Filtros</h3>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tipo de Demanda
                  </label>
                  <select
                    value={filters.tipo_de_demanda}
                    onChange={(e) => setFilters({...filters, tipo_de_demanda: e.target.value})}
                    className="w-full rounded-md border border-gray-300 p-2"
                  >
                    <option value="">Todos</option>
                    {tiposDemanda.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo.split('::')[1]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nível de Urgência
                  </label>
                  <select
                    value={filters.nivel_de_urgencia}
                    onChange={(e) => setFilters({...filters, nivel_de_urgencia: e.target.value})}
                    className="w-full rounded-md border border-gray-300 p-2"
                  >
                    <option value="">Todos</option>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Status da Solicitação
                  </label>
                  <select
                    value={filters.status_solicitacao}
                    onChange={(e) => setFilters({...filters, status_solicitacao: e.target.value})}
                    className="w-full rounded-md border border-gray-300 p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Todos</option>
                    <option value="Recebida">Recebida</option>
                    <option value="Protocolada" disabled={true}>Protocolada</option>
                    <option value="Em Análise">Em Análise</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Concluída">Concluída</option>
                    <option value="Arquivada">Arquivada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={filters.cep}
                    onChange={(e) => setFilters({...filters, cep: e.target.value})}
                    className="w-full rounded-md border border-gray-300 p-2"
                    placeholder="00000-000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    value={filters.logradouro}
                    onChange={(e) => setFilters({...filters, logradouro: e.target.value})}
                    className="w-full rounded-md border border-gray-300 p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={filters.bairro}
                    onChange={(e) => setFilters({...filters, bairro: e.target.value})}
                    className="w-full rounded-md border border-gray-300 p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={filters.cidade}
                    onChange={(e) => setFilters({...filters, cidade: e.target.value})}
                    className="w-full rounded-md border border-gray-300 p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    CPF do Requerente
                  </label>
                  <input
                    type="text"
                    value={filters.requerente_cpf}
                    onChange={(e) => setFilters({...filters, requerente_cpf: e.target.value})}
                    className="w-full rounded-md border border-gray-300 p-2"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Responsável
                  </label>
                  <select
                    value={filters.responsavel_nome}
                    onChange={(e) => setFilters({...filters, responsavel_nome: e.target.value})}
                    className="w-full rounded-md border border-gray-300 p-2"
                  >
                    <option value="">Todos</option>
                    {responsaveis.map((resp) => (
                      <option key={resp.uid} value={resp.nome}>{resp.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Indicado
                  </label>
                  <input
                    type="text"
                    value={filters.indicado_nome}
                    onChange={(e) => setFilters({...filters, indicado_nome: e.target.value})}
                    className="w-full rounded-md border border-gray-300 p-2"
                    placeholder="Nome do indicado"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Número do Ofício
                  </label>
                  <input
                    type="text"
                    value={filters.numero_oficio}
                    onChange={(e) => setFilters({...filters, numero_oficio: e.target.value})}
                    className="w-full rounded-md border border-gray-300 p-2"
                    placeholder="000/2025"
                  />
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => {
                      // Implementar lógica de filtro
                      setIsFilterOpen(false);
                    }}
                    className="w-full bg-blue-600 text-white rounded-md py-2 px-4 hover:bg-blue-700 transition-colors"
                  >
                    Aplicar Filtros
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Edição */}
      {isEditModalOpen && selectedOficio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-modal-scale">
            {/* Header do Modal */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-lg p-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold">
                  Editar Ofício <span className="text-blue-600">#{selectedOficio.numero_oficio}</span>
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedOficio(null);
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 space-y-6">
              {/* Título e Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Título
                  </label>
                  <input
                    type="text"
                    value={selectedOficio.numero_oficio}
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    value={selectedOficio.status_solicitacao}
                    onChange={(e) => handleStatusChange(selectedOficio, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Recebida">Recebida</option>
                    <option value="Protocolada" disabled={selectedOficio.fd_demanda_registrada_true_false === false}>Protocolada</option>
                    <option value="Em Análise">Em Análise</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Concluída">Concluída</option>
                    <option value="Arquivada">Arquivada</option>
                  </select>
                </div>
              </div>

              {/* Tipo de Demanda e Nível de Urgência */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Tipo de Demanda
                  </label>
                  <select
                    value={selectedOficio.tipo_de_demanda || ''}
                    onChange={(e) => setSelectedOficio({...selectedOficio, tipo_de_demanda: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {tiposDemanda.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Nível de Urgência
                  </label>
                  <select
                    value={selectedOficio.nivel_de_urgencia || ''}
                    onChange={(e) => setSelectedOficio({...selectedOficio, nivel_de_urgencia: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4" />
                  <h3 className="text-sm font-medium">Endereço</h3>
                </div>
                <div className="grid grid-cols-6 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CEP
                    </label>
                    <input
                      type="text"
                      value={selectedOficio.cep || ''}
                      onChange={(e) => {
                        const cep = e.target.value.replace(/\D/g, '');
                        setSelectedOficio(prev => ({
                          ...prev,
                          cep
                        }));
                        if (cep.length === 8) {
                          buscarEnderecoPorCep(cep);
                        }
                      }}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="00000-000"
                      maxLength={9}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logradouro
                    </label>
                    <input
                      type="text"
                      value={selectedOficio.logradouro || ''}
                      onChange={(e) => setSelectedOficio({...selectedOficio, logradouro: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      UF
                    </label>
                    <input
                      type="text"
                      value={selectedOficio.uf || ''}
                      onChange={(e) => setSelectedOficio({...selectedOficio, uf: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      maxLength={2}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={selectedOficio.cidade || ''}
                      onChange={(e) => setSelectedOficio({...selectedOficio, cidade: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={selectedOficio.bairro || ''}
                      onChange={(e) => setSelectedOficio({...selectedOficio, bairro: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Descrição do Problema */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Descrição do Problema
                </label>
                <textarea
                  value={selectedOficio.descricao_do_problema || ''}
                  onChange={(e) => setSelectedOficio({...selectedOficio, descricao_do_problema: e.target.value})}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Footer com Botões */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedOficio(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirmar Exclusão
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Tem certeza que deseja excluir este ofício? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setOficioToDelete(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                disabled={isUploadingProtocolo}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteOficio}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resumo */}
      {isResumeModalOpen && selectedOficioResume && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full mx-auto overflow-hidden max-w-4xl">
            {/* Cabeçalho do Modal */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Resumo do Ofício #{selectedOficioResume.numero_oficio}
                </h3>
                <button
                  onClick={() => setIsResumeModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal com Scroll */}
            <div className="p-4 sm:p-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <div className="space-y-8">
                {/* Grid de Informações */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Informações Gerais */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-4">Informações Gerais</h4>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 w-32">Status:</span>
                        <span className={`${
                          !selectedOficioResume.visualizou 
                            ? 'bg-blue-500'
                            : 'bg-gray-500 bg-opacity-90'
                        } text-white text-xs font-medium px-2.5 py-0.5 rounded-full shadow-md ring-1 ring-black ring-opacity-5`}>
                          {selectedOficioResume.status_solicitacao}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500 block mb-1">Tipo de Demanda:</span>
                        <div className="ml-2">{formatTipoDemanda(selectedOficioResume.tipo_de_demanda)}</div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 w-32">Nível de Urgência:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${URGENCIA_COLORS[selectedOficioResume.nivel_de_urgencia.toLowerCase()]}`}>
                          {selectedOficioResume.nivel_de_urgencia}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 w-32">Data:</span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {formatDate(selectedOficioResume.data_solicitacao)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Localização */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-4">Localização</h4>
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm text-gray-500 block mb-1">Logradouro:</span>
                        <span className="text-gray-900 dark:text-gray-100">{selectedOficioResume.logradouro}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500 block mb-1">Bairro:</span>
                        <span className="text-gray-900 dark:text-gray-100">{selectedOficioResume.bairro}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500 block mb-1">Cidade:</span>
                        <span className="text-gray-900 dark:text-gray-100">{selectedOficioResume.cidade}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Descrição */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-4">Descrição da Solicitação</h4>
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {selectedOficioResume.descricao_do_problema}
                  </p>
                </div>

                {/* Requerente e Responsável */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-4">Informações de Contato</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Requerente:</span>
                      <span className="text-gray-900 dark:text-gray-100">{selectedOficioResume.requerente_nome}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Responsável:</span>
                      <span className="text-gray-900 dark:text-gray-100">{selectedOficioResume.responsavel_nome || 'Não atribuído'}</span>
                    </div>
                    {selectedOficioResume.gbp_indicado?.nome && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-4">Indicado</h4>
                        <div className="space-y-4">
                          <span className="text-gray-900 dark:text-gray-100">{selectedOficioResume.gbp_indicado.nome}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fotos */}
                {selectedOficioResume.fotos_do_problema && selectedOficioResume.fotos_do_problema.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-4">Fotos do Problema</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedOficioResume.fotos_do_problema.map((foto, index) => (
                        <div 
                          key={index} 
                          className="relative w-14 h-14 cursor-pointer group overflow-hidden rounded-lg flex-shrink-0"
                          onClick={() => {
                            setSelectedImage(foto);
                          }}
                        >
                          <img 
                            src={foto} 
                            alt={`Foto ${index + 1}`} 
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 flex items-center justify-center">
                            <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-3 w-3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Imagem em Tela Cheia */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={selectedImage}
            alt="Imagem em tela cheia"
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
        </div>
      )}
      
      {/* Modal de Upload de Protocolo */}
      {isProtocoloModalOpen && oficioToProtocol && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Upload do Protocolo</h3>
            
            <div className="space-y-4">
              {/* Campo de número do ofício */}
              <div className="space-y-2">
                <label htmlFor="numero_oficio" className="block text-sm font-medium text-gray-700">
                  Número do Ofício
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="numero_oficio"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={oficioToProtocol.numero_oficio.split('/')[0]}
                    onChange={(e) => {
                      const year = new Date().getFullYear();
                      setOficioToProtocol(prev => prev ? {
                        ...prev,
                        numero_oficio: `${e.target.value}/${year}`
                      } : null);
                    }}
                    placeholder="Número"
                  />
                  <input
                    type="text"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                    value={oficioToProtocol.numero_oficio.split('/')[1] || new Date().getFullYear()}
                    readOnly
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>Importante:</strong> Ao fazer o upload, o documento será automaticamente enviado ao requerente da demanda: <span className="font-medium">{oficioToProtocol.requerente_nome}</span>
                </p>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <label 
                  htmlFor="protocolo-upload-modal" 
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <Upload className={`w-8 h-8 ${selectedFile ? 'text-green-500' : 'text-gray-400'}`} />
                  {selectedFile ? (
                    <span className="text-sm text-green-600">
                      Arquivo selecionado: {selectedFile.name}
                    </span>
                  ) : (
                    <>
                      <span className="text-sm text-gray-600">
                        Clique para selecionar ou arraste o arquivo
                      </span>
                      <span className="text-xs text-gray-500">
                        Formatos aceitos: PDF, DOC, DOCX
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    id="protocolo-upload-modal"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setIsProtocoloModalOpen(false);
                    setOficioToProtocol(null);
                    setSelectedFile(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  disabled={isUploadingProtocolo}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmUpload}
                  disabled={!selectedFile || isUploadingProtocolo}
                  className={`px-4 py-2 text-sm text-white rounded-lg ${
                    selectedFile && !isUploadingProtocolo
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isUploadingProtocolo ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enviando...</span>
                    </div>
                  ) : (
                    'Confirmar Protocolada'
                  )}
                </button>
              </div>
            </div>

            {isUploadingProtocolo && (
              <div className="flex items-center justify-center gap-2 mt-4 text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Enviando protocolo...</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Modal de Nova Pasta */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Nova Pasta de Ofícios</h2>
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Ano da Pasta
                </label>
                <input
                  type="text"
                  value={newFolderYear}
                  onChange={(e) => setNewFolderYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 2025"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (newFolderYear) {
                    navigate(`/app/documentos/oficios/${newFolderYear}`);
                    setShowNewFolderModal(false);
                    setNewFolderYear('');
                  }
                }}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Criar Pasta
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Botão flutuante para mobile com menu */}
      {viewMode === 'grid' && (
        <div className="sm:hidden fixed bottom-4 right-4 flex flex-col items-end gap-2">
          {/* Menu de opções */}
          <div className={`flex flex-col gap-2 transition-all duration-200 ${isMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <button
              onClick={() => {
                setIsFilterOpen(true);
                setIsMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 px-6 h-12 bg-white text-gray-600 rounded-full shadow-lg hover:bg-gray-50"
            >
              <Filter className="h-5 w-5" />
              <span className="text-sm font-medium whitespace-nowrap">Filtros</span>
            </button>
            <Link
              to="/app/documentos/oficios/novo"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center justify-center gap-2 px-6 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm font-medium whitespace-nowrap">Novo Ofício</span>
            </Link>
          </div>
          
          {/* Botão principal */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200 ease-in-out ${isMenuOpen ? 'bg-gray-600 text-white rotate-45' : 'bg-blue-600 text-white'}`}
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Estado de carregamento */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-2 text-gray-600">Carregando mais ofícios...</span>
        </div>
      )}

      {/* Estado de erro */}
      {error && (
        <div className="flex justify-center items-center py-8 text-red-600">
          <AlertCircle className="w-6 h-6 mr-2" />
          <span>Erro ao carregar ofícios. Tente novamente.</span>
        </div>
      )}

      {/* Sem mais ofícios */}
      {!hasMore && displayedOficios.length > 0 && (
        <div className="text-center py-8 text-gray-600">
          Não há mais ofícios para carregar.
        </div>
      )}
    </div>
  );
}

const renderActionButtons = (oficio: Oficio) => (
  <div className="flex items-center gap-1">
    <button
      onClick={() => handleGenerateWord(oficio)}
      className="p-2 hover:bg-gray-100 rounded-lg"
      title="Gerar Documento"
    >
      <FileText className="w-4 h-4" />
    </button>
    
    {oficio.url_oficio_protocolado ? (
      <a
        href={oficio.url_oficio_protocolado}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-full text-sm font-medium"
      >
        <Paperclip className="h-4 w-4" />
        Anexo
      </a>
    ) : (
      <button
        onClick={() => {
          setOficioToProtocol(oficio);
          setIsProtocoloModalOpen(true);
        }}
        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
        title="Enviar Protocolo"
      >
        <Upload className="w-4 h-4" />
      </button>
    )}
  </div>
);
