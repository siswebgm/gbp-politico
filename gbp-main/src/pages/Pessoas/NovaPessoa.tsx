import { ArrowLeft, Plus, Loader2, X, CheckCircle, FileText, MoreVertical, Camera, User, SwitchCamera } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import InputMask from 'react-input-mask';
import { supabaseClient } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useCategories } from '../../hooks/useCategories';
import { useIndicados } from '../../hooks/useIndicados';
import { useCategoriaTipos } from '../../hooks/useCategoriaTipos';
import { useCep } from '../../hooks/useCep';
import { useCPF } from '../../hooks/useCPF';
import { useToast } from "../../components/ui/use-toast";
import { NovaCategoriaModal } from './components/NovaCategoriaModal';
import { NovoIndicadoModal } from './components/NovoIndicadoModal';
import { NestedCategoryDropdown } from '../../components/NestedCategoryDropdown';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import jsPDF from 'jspdf';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { FileUpload } from '../../components/ui/file-upload';

interface Indicado {
  uid: string;
  id: number;
  nome: string;
}

interface NovaPessoaForm {
  nome: string;
  cpf: string;
  nome_mae: string;
  nascimento: string;
  whatsapp: string;
  telefone: string;
  genero: string;
  titulo: string;
  zona: string;
  secao: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  regiao_bairro: string;
  cidade: string;
  uf: string;
  complemento: string;
  categoria_uid: string;
  indicado_uid: string;
  latitude: string | null;
  longitude: string | null;
  numero_sus: string;
  instagram: string;
  responsavel_eleitor: string;
  confiabilidade_do_voto: string;
  quantidade_adultos_residencia: string;
  colegio_eleitoral: string;
}

const defaultValues: NovaPessoaForm = {
  nome: '',
  cpf: '',
  nome_mae: '',
  nascimento: '',
  whatsapp: '',
  telefone: '',
  genero: '',
  titulo: '',
  zona: '',
  secao: '',
  cep: '',
  endereco: '',
  numero: '',
  bairro: '',
  regiao_bairro: '',
  cidade: '',
  uf: '',
  complemento: '',
  categoria_uid: '',
  indicado_uid: '',
  latitude: null,
  longitude: null,
  numero_sus: '',
  instagram: '',
  responsavel_eleitor: '',
  confiabilidade_do_voto: '',
  quantidade_adultos_residencia: '',
  colegio_eleitoral: ''
};

const formatName = (name: string) => {
  // Remove espaços extras no início, fim e entre palavras
  const trimmedName = name.trim().replace(/\s+/g, ' ');
  
  return trimmedName
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Todas as palavras começam com maiúscula
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

// Função para formatar a data para o formato yyyy-MM-dd
const formatDateString = (dateString: string) => {
  if (!dateString) return '';
  return dateString.split(' ')[0]; // Pega apenas a parte da data, removendo o tempo
};

// Função para validar se uma data é válida
const isValidDate = (dateString: string) => {
  if (!dateString) return false;
  
  // Se estiver no formato YYYY-MM-DD
  if (dateString.includes('-')) {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }
  
  // Verifica o formato DD/MM/YYYY
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateString.match(regex);
  if (!match) return false;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Verifica se o ano é razoável (entre 1900 e o ano atual)
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear) return false;

  // Cria um objeto Date e verifica se é uma data válida
  const date = new Date(year, month - 1, day);
  return date.getDate() === day &&
         date.getMonth() === month - 1 &&
         date.getFullYear() === year;
};

// Função para converter data para exibição (YYYY-MM-DD -> DD/MM/YYYY)
const formatDateToDisplay = (dateString: string) => {
  if (!dateString) return '';
  
  // Se já estiver no formato DD/MM/YYYY, retorna como está
  if (dateString.includes('/')) return dateString;
  
  // Converte YYYY-MM-DD para DD/MM/YYYY
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

// Função para converter data para o formato do banco (DD/MM/YYYY -> YYYY-MM-DD)
const formatDateForDatabase = (dateString: string) => {
  if (!dateString) return '';
  
  // Se já estiver no formato YYYY-MM-DD, retorna como está
  if (dateString.includes('-')) return dateString;
  
  // Converte DD/MM/YYYY para YYYY-MM-DD
  const [day, month, year] = dateString.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const NovaPessoa: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const [companySettings, setCompanySettings] = useState<{ campos_adicionais: boolean }>({ campos_adicionais: false });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { data: categorias, isLoading: isLoadingCategorias } = useCategories();
  const { data: indicados, isLoading: isLoadingIndicados } = useIndicados();
  const { tipos: categoriaTipos, isLoading: isLoadingCategoriaTipos } = useCategoriaTipos();
  const { fetchAddress, isLoading: isLoadingCep } = useCep();
  const { fetchCPFData, isLoading: isLoadingCPF, error: cpfError } = useCPF();

  // Função para lidar com a foto de perfil
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPhotoFile(file);
    }
  };

  const processPhotoFile = (file: File) => {
    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A foto deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Tipo inválido",
        description: "Selecione apenas arquivos de imagem",
        variant: "destructive",
      });
      return;
    }

    setProfilePhoto(file);
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processPhotoFile(file);
    }
  };

  const removePhoto = () => {
    setProfilePhoto(null);
    setPhotoPreview(null);
  };

  // Estados e refs para opções de foto (galeria/câmera)
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async (facing: 'user' | 'environment') => {
    setShowPhotoOptions(false);
    // Encerra stream anterior para evitar câmera travada
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraFacingMode(facing);
      setShowCameraModal(true);
      // Aguarda o modal renderizar para anexar o stream ao vídeo
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err) {
      console.error('Erro ao acessar a câmera:', err);
      toast({
        title: 'Câmera indisponível',
        description: 'Não foi possível acessar a câmera. Verifique as permissões do navegador.',
        variant: 'destructive',
      });
    }
  };

  const openCamera = () => startCamera(cameraFacingMode);

  const switchCamera = () => {
    startCamera(cameraFacingMode === 'user' ? 'environment' : 'user');
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCameraModal(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
        processPhotoFile(file);
      }
      closeCamera();
    }, 'image/jpeg', 0.9);
  };

  // Encerra a câmera ao desmontar o componente
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Estado para controlar quais campos são obrigatórios
  const [camposObrigatorios, setCamposObrigatorios] = useState({
    nascimento: true,
    endereco: true,
    numero: true,
    bairro: true,
    cidade: true,
    uf: true
  });

  // Cria o schema de validação dinâmico baseado no estado
  const validationSchema = useMemo(() => z.object({
    nome: z.string().min(1, "Campo obrigatório"),
    cpf: z.string().optional(),
    whatsapp: z.string().min(1, "Campo obrigatório"),
    nascimento: z.string().refine(
      (val) => !camposObrigatorios.nascimento || (val && val.trim().length > 0),
      { message: "Campo obrigatório" }
    ),
    categoria_uid: z.string().min(1, "Campo obrigatório"),
    endereco: z.string().refine(
      (val) => !camposObrigatorios.endereco || (val && val.trim().length > 0),
      { message: "Campo obrigatório" }
    ),
    numero: z.string().refine(
      (val) => !camposObrigatorios.numero || (val && val.trim().length > 0),
      { message: "Campo obrigatório" }
    ),
    bairro: z.string().refine(
      (val) => !camposObrigatorios.bairro || (val && val.trim().length > 0),
      { message: "Campo obrigatório" }
    ),
    cidade: z.string().refine(
      (val) => !camposObrigatorios.cidade || (val && val.trim().length > 0),
      { message: "Campo obrigatório" }
    ),
    uf: z.string().refine(
      (val) => !camposObrigatorios.uf || (val && val.trim().length > 0),
      { message: "Campo obrigatório" }
    )
  }), [camposObrigatorios]);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset, trigger } = useForm<NovaPessoaForm>({
    defaultValues,
    resolver: zodResolver(validationSchema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    shouldUseNativeValidation: false,
    criteriaMode: 'firstError',
    shouldFocusError: true,
    shouldUnregister: false
  });
  
  // Validação agora ocorre apenas no submit do formulário
  
  const toggleCampoObrigatorio = (campo: keyof typeof camposObrigatorios) => {
    setCamposObrigatorios(prev => ({
      ...prev,
      [campo]: !prev[campo]
    }));
  };
  const [isLoading, setIsLoading] = useState(false);
  const [showNovaCategoriaModal, setShowNovaCategoriaModal] = useState(false);
  const [showNovoIndicadoModal, setShowNovoIndicadoModal] = useState(false);
  const [primeiroAtendimento, setPrimeiroAtendimento] = useState(false);
  const [descricaoAtendimento, setDescricaoAtendimento] = useState('');
  const [statusAtendimento, setStatusAtendimento] = useState('');
  const [categoriaAtendimento, setCategoriaAtendimento] = useState('');
  const [anexosPrimeiroAtendimento, setAnexosPrimeiroAtendimento] = useState<File[]>([]);
  const [showDadosEleitorais, setShowDadosEleitorais] = useState(false);
  const [atendimentosAdicionais, setAtendimentosAdicionais] = useState<Array<{
    categoria_uid: string;
    categoria_principal_uid: string;
    descricao: string;
    status: string;
    anexos?: File[];
  }>>([]);
  const [showModalAtendimentos, setShowModalAtendimentos] = useState(false);
  const [showConfirmarLimpar, setShowConfirmarLimpar] = useState(false);
  const [showModalPDF, setShowModalPDF] = useState(false);
  const [showMenuPDF, setShowMenuPDF] = useState(false);
  const [camposPDF, setCamposPDF] = useState({
    nomeCompleto: true,
    cpf: true,
    nascimento: true,
    nomeMae: true,
    whatsapp: true,
    telefone: true,
    genero: true,
    titulo: true,
    zona: true,
    secao: true,
    sus: true,
    cep: true,
    numero: true,
    endereco: true,
    bairro: true,
    cidade: true,
    uf: true,
    complemento: true,
    categoria: true,
    indicadoPor: true,
    statusAtendimento: true,
    observacoes: true
  });
  const [novoAtendimentoCategoria, setNovoAtendimentoCategoria] = useState('');
  const [novoAtendimentoCategoriaPrincipal, setNovoAtendimentoCategoriaPrincipal] = useState('');
  const [novoAtendimentoDescricao, setNovoAtendimentoDescricao] = useState('');
  const [novoAtendimentoStatus, setNovoAtendimentoStatus] = useState('Pendente');
  const [novoAtendimentoAnexos, setNovoAtendimentoAnexos] = useState<File[]>([]);
  const [novoAtendimentoErrors, setNovoAtendimentoErrors] = useState({
    categoria: '',
    categoriaPrincipal: '',
    descricao: '',
    status: ''
  });

  const categoriaUid = watch('categoria_uid');
  
  // Efeito para sincronizar a categoria do atendimento com a categoria do eleitor
  useEffect(() => {
    if (primeiroAtendimento) {
      setCategoriaAtendimento(categoriaUid);
    } else {
      setAnexosPrimeiroAtendimento([]);
    }
  }, [primeiroAtendimento, categoriaUid]);
  // Efeito para fechar o menu PDF ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showMenuPDF && !target.closest('.relative')) {
        setShowMenuPDF(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenuPDF]);

  const cpfValue = watch('cpf');
  const [lastCheckedCPF, setLastCheckedCPF] = useState<string>('');

  // Função para abrir o modal de atendimentos
  const abrirModalAtendimentos = () => {
    setShowModalAtendimentos(true);
    setNovoAtendimentoCategoria(categoriaUid);
    setNovoAtendimentoCategoriaPrincipal('');
    setNovoAtendimentoErrors({ categoria: '', categoriaPrincipal: '', descricao: '', status: '' });
  };

  // Função para adicionar atendimento à lista (dentro do modal)
  const adicionarAtendimentoNoModal = () => {
    if (!novoAtendimentoCategoria || !novoAtendimentoCategoriaPrincipal || !novoAtendimentoDescricao || !novoAtendimentoStatus) {
      setNovoAtendimentoErrors({
        categoria: !novoAtendimentoCategoria ? 'Campo obrigatório' : '',
        categoriaPrincipal: !novoAtendimentoCategoriaPrincipal ? 'Campo obrigatório' : '',
        descricao: !novoAtendimentoDescricao ? 'Campo obrigatório' : '',
        status: !novoAtendimentoStatus ? 'Campo obrigatório' : ''
      });
      return;
    }

    setAtendimentosAdicionais(prev => [
      ...prev,
      {
        categoria_uid: novoAtendimentoCategoria,
        categoria_principal_uid: novoAtendimentoCategoriaPrincipal,
        descricao: novoAtendimentoDescricao,
        status: novoAtendimentoStatus,
        anexos: novoAtendimentoAnexos
      }
    ]);

    // Limpar todos os campos após adicionar
    setNovoAtendimentoCategoria(categoriaUid);
    setNovoAtendimentoCategoriaPrincipal('');
    setNovoAtendimentoDescricao('');
    setNovoAtendimentoStatus('Pendente');
    setNovoAtendimentoAnexos([]);
    setNovoAtendimentoErrors({ categoria: '', categoriaPrincipal: '', descricao: '', status: '' });

    // Feedback visual
    toast({
      title: (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span>Atendimento adicionado</span>
        </div>
      ),
      description: "O atendimento foi adicionado à lista com sucesso.",
      variant: "success",
    });
  };

  // Função para remover atendimento da lista
  const removerAtendimento = (index: number) => {
    setAtendimentosAdicionais(prev => prev.filter((_, i) => i !== index));
  };

  // Função para gerar PDF em branco do formulário
  const gerarPDFEmBranco = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 12;
    const margin = 12;
    const fieldHeight = 6;
    const labelSpacing = 3;

    // Título
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Formulário de Cadastro de Eleitor', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Data
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: _____/_____/______`, pageWidth - 50, yPosition);
    yPosition += 10;

    // Função auxiliar para adicionar campo único
    const addField = (label: string) => {
      const availableWidth = pageWidth - (margin * 2);
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, yPosition);
      yPosition += labelSpacing;
      doc.setDrawColor(180);
      doc.setLineWidth(0.3);
      doc.rect(margin, yPosition, availableWidth, fieldHeight);
      yPosition += fieldHeight + 4;
    };

    // Função para adicionar dois campos lado a lado
    const addTwoFields = (label1: string, label2: string) => {
      const availableWidth = pageWidth - (margin * 2);
      const width1 = availableWidth / 2 - 4;
      const width2 = availableWidth / 2 - 4;
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(label1, margin, yPosition);
      doc.text(label2, margin + width1 + 8, yPosition);
      yPosition += labelSpacing;
      doc.setDrawColor(180);
      doc.setLineWidth(0.3);
      doc.rect(margin, yPosition, width1, fieldHeight);
      doc.rect(margin + width1 + 8, yPosition, width2, fieldHeight);
      yPosition += fieldHeight + 4;
    };

    // Função para adicionar três campos lado a lado
    const addThreeFields = (label1: string, label2: string, label3: string) => {
      const availableWidth = pageWidth - (margin * 2);
      const width1 = availableWidth / 3 - 5;
      const width2 = availableWidth / 3 - 5;
      const width3 = availableWidth / 3 - 5;
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(label1, margin, yPosition);
      doc.text(label2, margin + width1 + 8, yPosition);
      doc.text(label3, margin + width1 + width2 + 16, yPosition);
      yPosition += labelSpacing;
      doc.setDrawColor(180);
      doc.setLineWidth(0.3);
      doc.rect(margin, yPosition, width1, fieldHeight);
      doc.rect(margin + width1 + 8, yPosition, width2, fieldHeight);
      doc.rect(margin + width1 + width2 + 16, yPosition, width3, fieldHeight);
      yPosition += fieldHeight + 4;
    };

    // Função para adicionar quatro campos lado a lado
    const addFourFields = (label1: string, label2: string, label3: string, label4: string) => {
      const availableWidth = pageWidth - (margin * 2);
      const width1 = availableWidth / 4 - 6;
      const width2 = availableWidth / 4 - 6;
      const width3 = availableWidth / 4 - 6;
      const width4 = availableWidth / 4 - 6;
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(label1, margin, yPosition);
      doc.text(label2, margin + width1 + 8, yPosition);
      doc.text(label3, margin + width1 + width2 + 16, yPosition);
      doc.text(label4, margin + width1 + width2 + width3 + 24, yPosition);
      yPosition += labelSpacing;
      doc.setDrawColor(180);
      doc.setLineWidth(0.3);
      doc.rect(margin, yPosition, width1, fieldHeight);
      doc.rect(margin + width1 + 8, yPosition, width2, fieldHeight);
      doc.rect(margin + width1 + width2 + 16, yPosition, width3, fieldHeight);
      doc.rect(margin + width1 + width2 + width3 + 24, yPosition, width4, fieldHeight);
      yPosition += fieldHeight + 4;
    };

    // Função para adicionar cinco campos lado a lado
    const addFiveFields = (label1: string, label2: string, label3: string, label4: string, label5: string) => {
      const availableWidth = pageWidth - (margin * 2);
      const width1 = availableWidth / 5 - 4;
      const width2 = availableWidth / 5 - 4;
      const width3 = availableWidth / 5 - 4;
      const width4 = availableWidth / 5 - 4;
      const width5 = availableWidth / 5 - 4;
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(label1, margin, yPosition);
      doc.text(label2, margin + width1 + 4, yPosition);
      doc.text(label3, margin + width1 + width2 + 8, yPosition);
      doc.text(label4, margin + width1 + width2 + width3 + 12, yPosition);
      doc.text(label5, margin + width1 + width2 + width3 + width4 + 16, yPosition);
      yPosition += labelSpacing;
      doc.setDrawColor(180);
      doc.setLineWidth(0.3);
      doc.rect(margin, yPosition, width1, fieldHeight);
      doc.rect(margin + width1 + 4, yPosition, width2, fieldHeight);
      doc.rect(margin + width1 + width2 + 8, yPosition, width3, fieldHeight);
      doc.rect(margin + width1 + width2 + width3 + 12, yPosition, width4, fieldHeight);
      doc.rect(margin + width1 + width2 + width3 + width4 + 16, yPosition, width5, fieldHeight);
      yPosition += fieldHeight + 4;
    };

    // Função para adicionar seção
    const addSection = (title: string) => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, yPosition);
      yPosition += 6;
      doc.setDrawColor(100);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
    };

    // Dados Pessoais
    const dadosPessoaisCampos = [
      camposPDF.nomeCompleto,
      camposPDF.cpf,
      camposPDF.nascimento,
      camposPDF.nomeMae,
      camposPDF.whatsapp,
      camposPDF.telefone,
      camposPDF.genero,
      camposPDF.titulo,
      camposPDF.zona,
      camposPDF.secao,
      camposPDF.sus
    ];
    if (dadosPessoaisCampos.some(campo => campo)) {
      addSection('Dados Pessoais');
      if (camposPDF.nomeCompleto) addField('Nome Completo:');
      if (camposPDF.cpf && camposPDF.nascimento) {
        addTwoFields('CPF:', 'Nascimento:');
      } else if (camposPDF.cpf) {
        addField('CPF:');
      } else if (camposPDF.nascimento) {
        addField('Nascimento:');
      }
      if (camposPDF.nomeMae) addField('Nome da Mãe:');
      if (camposPDF.whatsapp && camposPDF.telefone) {
        addTwoFields('WhatsApp:', 'Telefone:');
      } else if (camposPDF.whatsapp) {
        addField('WhatsApp:');
      } else if (camposPDF.telefone) {
        addField('Telefone:');
      }
      if (camposPDF.genero || camposPDF.titulo || camposPDF.zona || camposPDF.secao || camposPDF.sus) {
        const camposLinha5 = [];
        if (camposPDF.genero) camposLinha5.push('Gênero:');
        if (camposPDF.titulo) camposLinha5.push('Título:');
        if (camposPDF.zona) camposLinha5.push('Zona:');
        if (camposPDF.secao) camposLinha5.push('Seção:');
        if (camposPDF.sus) camposLinha5.push('SUS:');
        
        if (camposLinha5.length === 5) {
          addFiveFields(camposLinha5[0], camposLinha5[1], camposLinha5[2], camposLinha5[3], camposLinha5[4]);
        } else if (camposLinha5.length === 4) {
          addFourFields(camposLinha5[0], camposLinha5[1], camposLinha5[2], camposLinha5[3]);
        } else if (camposLinha5.length === 3) {
          addThreeFields(camposLinha5[0], camposLinha5[1], camposLinha5[2]);
        } else if (camposLinha5.length === 2) {
          addTwoFields(camposLinha5[0], camposLinha5[1]);
        } else if (camposLinha5.length === 1) {
          addField(camposLinha5[0]);
        }
      }
      yPosition += 6;
    }

    // Endereço
    const enderecoCampos = [
      camposPDF.cep,
      camposPDF.numero,
      camposPDF.endereco,
      camposPDF.bairro,
      camposPDF.cidade,
      camposPDF.uf,
      camposPDF.complemento
    ];
    if (enderecoCampos.some(campo => campo)) {
      addSection('Endereço');
      if (camposPDF.cep && camposPDF.numero) {
        addTwoFields('CEP:', 'Número:');
      } else if (camposPDF.cep) {
        addField('CEP:');
      } else if (camposPDF.numero) {
        addField('Número:');
      }
      if (camposPDF.endereco && camposPDF.uf) {
        addTwoFields('Endereço:', 'UF:');
      } else if (camposPDF.endereco) {
        addField('Endereço:');
      } else if (camposPDF.uf) {
        addField('UF:');
      }
      if (camposPDF.bairro && camposPDF.cidade && camposPDF.complemento) {
        addThreeFields('Bairro:', 'Cidade:', 'Complemento:');
      } else if (camposPDF.bairro && camposPDF.cidade) {
        addTwoFields('Bairro:', 'Cidade:');
      } else if (camposPDF.bairro && camposPDF.complemento) {
        addTwoFields('Bairro:', 'Complemento:');
      } else if (camposPDF.cidade && camposPDF.complemento) {
        addTwoFields('Cidade:', 'Complemento:');
      } else if (camposPDF.bairro) {
        addField('Bairro:');
      } else if (camposPDF.cidade) {
        addField('Cidade:');
      } else if (camposPDF.complemento) {
        addField('Complemento:');
      }
      yPosition += 6;
    }

    // Informações Adicionais
    const infoAdicionaisCampos = [
      camposPDF.categoria,
      camposPDF.indicadoPor
    ];
    if (infoAdicionaisCampos.some(campo => campo)) {
      addSection('Informações Adicionais');
      if (camposPDF.categoria && camposPDF.indicadoPor) {
        addTwoFields('Categoria:', 'Indicado por:');
      } else if (camposPDF.categoria) {
        addField('Categoria:');
      } else if (camposPDF.indicadoPor) {
        addField('Indicado por:');
      }
      yPosition += 6;
    }

    // Atendimento
    if (camposPDF.statusAtendimento) {
      addSection('Primeiro Atendimento');
      
      // Adicionar caixas de seleção para status
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('Status do Atendimento:', margin, yPosition);
      yPosition += 6;
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      const statusOptions = ['Concluído', 'Em Andamento', 'Pendente'];
      const statusX = margin;
      const statusY = yPosition;
      const checkboxSize = 5;
      const checkboxSpacing = 50;
      
      statusOptions.forEach((option, index) => {
        const x = statusX + (index * checkboxSpacing);
        // Checkbox
        doc.setDrawColor(180);
        doc.setLineWidth(0.3);
        doc.rect(x, statusY, checkboxSize, checkboxSize);
        // Label
        doc.text(option, x + checkboxSize + 2, statusY + 4);
      });
      yPosition += 12;
      yPosition += 6;
    }

    // Observações
    if (camposPDF.observacoes) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Observações', margin, yPosition);
      yPosition += 6;
      doc.setDrawColor(100);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
      doc.setDrawColor(180);
      doc.setLineWidth(0.3);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 30);
      yPosition += 40;
    }

    // Rodapé
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('Formulário para preenchimento manual', pageWidth / 2, pageHeight - 8, { align: 'center' });

    // Salvar PDF
    doc.save('formulario-eleitor-em-branco.pdf');

    // Toast de sucesso
    toast({
      title: (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span>PDF gerado com sucesso</span>
        </div>
      ),
      description: "O formulário em branco foi baixado.",
      variant: "success",
    });
  };

  // Efeito para limpar categoria principal quando o tipo mudar
  useEffect(() => {
    setNovoAtendimentoCategoriaPrincipal('');
  }, [novoAtendimentoCategoria]);
  const [atendimentoErrors, setAtendimentoErrors] = useState({
    categoria: '',
    descricao: '',
    status: ''
  });

  // Estilos inline vazios — classes Tailwind controlam cores/placeholder
  const globalStyles = {
    input: {},
    select: {},
  };

  // Buscar configurações da empresa
  useEffect(() => {
    const fetchCompanySettings = async () => {
      if (company?.uid) {
        const { data, error } = await supabaseClient
          .from('gbp_empresas')
          .select('campos_adicionais')
          .eq('uid', company.uid)
          .single();

        if (error) {
          console.error('Erro ao buscar configurações da empresa:', error);
          return;
        }

        if (data) {
          setCompanySettings(data);
        }
      }
    };

    fetchCompanySettings();
  }, [company?.uid]);

  // Função para limpar os campos preenchidos pela API
  const clearApiFields = useCallback(() => {
    setValue('nome', '');
    setValue('nome_mae', '');
    setValue('nascimento', '');
    setValue('genero', '');
    setValue('titulo', '');
    // Força a limpeza do estado interno do formulário
    reset({
      ...defaultValues,
      nome_mae: ''
    });
    setLastCheckedCPF('');
  }, [setValue, reset]);

  // Função para limpar campos de endereço
  const clearAddressFields = useCallback(() => {
    setValue('endereco', '');
    setValue('bairro', '');
    setValue('cidade', '');
    setValue('uf', '');
    setValue('latitude', null);
    setValue('longitude', null);
  }, [setValue]);



  // Monitora mudanças no CPF
  useEffect(() => {
    const cleanCPF = cpfValue?.replace(/\D/g, '');
    
    // Se já temos um CPF verificado e o usuário tenta modificá-lo
    if (lastCheckedCPF && cleanCPF !== lastCheckedCPF) {
      setValue('cpf', ''); // Limpa o campo CPF
      clearApiFields();
      toast({
        title: "⚠️ Atenção",
        description: "CPF alterado. Os campos foram limpos para nova consulta.",
        className: "bg-yellow-50 border-yellow-200 text-yellow-800",
        duration: 3000,
      });
      return;
    }

    // Se o CPF tem 11 dígitos e ainda não foi verificado
    if (cleanCPF?.length === 11 && !lastCheckedCPF) {
      const timeoutId = setTimeout(async () => {
        try {
          setLastCheckedCPF(cleanCPF);
          const cpfData = await fetchCPFData(cleanCPF);
          
          if (cpfData) {
            // Preenche os campos com os dados da API
            if (cpfData.nome) setValue('nome', cpfData.nome);
            if (cpfData.nome_mae) setValue('nome_mae', cpfData.nome_mae);
            if (cpfData.data_nascimento) setValue('nascimento', formatDateString(cpfData.data_nascimento));
            if (cpfData.genero) setValue('genero', cpfData.genero);
            if (cpfData.titulo) setValue('titulo', cpfData.titulo);
          }
        } catch (error) {
          console.error('Erro ao preencher dados do CPF:', error);
          clearApiFields();
        }
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [cpfValue, fetchCPFData, setValue, lastCheckedCPF, clearApiFields, toast]);

  // Observa o valor do CEP
  const cepValue = watch('cep');
  const [lastCheckedCep, setLastCheckedCep] = useState<string>('');

  // Monitor de mudanças no CEP
  useEffect(() => {
    const cleanCEP = cepValue?.replace(/\D/g, '');
    
    // Limpa os campos se o CEP for modificado
    if (cleanCEP?.length !== 8) {
      clearAddressFields();
      setLastCheckedCep('');
      return;
    }
    
    // Evita consultas duplicadas
    if (cleanCEP === lastCheckedCep) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLastCheckedCep(cleanCEP);
      const data = await fetchAddress(cleanCEP);
      if (data) {
        setValue('endereco', data.logradouro || '');
        setValue('bairro', data.bairro || '');
        setValue('cidade', data.localidade || '');
        setValue('uf', data.uf || '');
        if (data.latitude && data.longitude) {
          setValue('latitude', data.latitude.toString());
          setValue('longitude', data.longitude.toString());
        } else {
          setValue('latitude', null);
          setValue('longitude', null);
        }
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [cepValue, fetchAddress, setValue, lastCheckedCep, clearAddressFields]);

  // Função para atualizar o bairro com a região
  const handleRegiaoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const regiao = e.target.value;
    const bairroAtual = watch('bairro');
    const bairroBase = bairroAtual?.split(' - ')[0] || '';
    
    if (regiao) {
      setValue('bairro', `${bairroBase} - ${regiao}`);
    } else {
      setValue('bairro', bairroBase);
    }
  };

  // Função para validar os campos de atendimento
  const validateAtendimentoFields = () => {
    const errors = {
      categoria: '',
      descricao: '',
      status: ''
    };
    let isValid = true;

    if (primeiroAtendimento) {
      if (!categoriaAtendimento) {
        errors.categoria = 'Campo obrigatório';
        isValid = false;
      }
      if (!descricaoAtendimento) {
        errors.descricao = 'Campo obrigatório';
        isValid = false;
      }
      if (!statusAtendimento) {
        errors.status = 'Campo obrigatório';
        isValid = false;
      }
    }

    setAtendimentoErrors(errors);
    return isValid;
  };

  const onSubmit = async (data: NovaPessoaForm) => {
    try {
      // Validar campos de atendimento se o checkbox estiver marcado
      if (!validateAtendimentoFields()) {
        return;
      }

      setIsLoading(true);

      // Upload da foto de perfil se houver
      let fotoUrl: string | null = null;
      if (profilePhoto && company?.uid) {
        try {
          // Buscar informações da empresa para obter o bucket de storage
          const { data: empresaData, error: empresaError } = await supabaseClient
            .from('gbp_empresas')
            .select('storage')
            .eq('uid', company.uid)
            .single();

          if (empresaError || !empresaData?.storage) {
            console.warn('Não foi possível obter o storage da empresa, usando bucket padrão');
          }

          const bucketName = empresaData?.storage?.toLowerCase() || 'fotos-perfil';
          const fileName = `${Date.now()}_${profilePhoto.name}`;
          const filePath = `pessoas/${fileName}`;

          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from(bucketName)
            .upload(filePath, profilePhoto, {
              cacheControl: '3600',
              contentType: profilePhoto.type,
              upsert: true
            });

          if (uploadError) {
            console.error('Erro ao fazer upload da foto:', uploadError);
            toast({
              title: "Erro ao fazer upload da foto",
              description: uploadError.message || "A pessoa será cadastrada sem foto",
              variant: "destructive",
            });
          } else {
            // Obter URL pública
            const { data: { publicUrl } } = supabaseClient.storage
              .from(bucketName)
              .getPublicUrl(filePath);
            fotoUrl = publicUrl;
          }
        } catch (error) {
          console.error('Erro no upload da foto:', error);
          toast({
            title: "Erro ao fazer upload da foto",
            description: "A pessoa será cadastrada sem foto",
            variant: "destructive",
          });
        }
      }

      // Verificar duplicidade de CPF antes de inserir
      const cpfLimpo = watch('cpf').replace(/\D/g, '');
      if (cpfLimpo && cpfLimpo.length === 11 && company?.uid) {
        console.log('🔍 Verificando duplicidade no submit - CPF:', cpfLimpo, 'Empresa:', company.uid);
        
        const { data: existingCPF, error: checkError } = await supabaseClient
          .from('gbp_eleitores')
          .select('uid, nome, cpf')
          .eq('cpf', cpfLimpo)
          .eq('empresa_uid', company.uid)
          .limit(1)
          .single();

        if (checkError) {
          console.error('❌ Erro ao verificar CPF:', checkError);
        }

        console.log('📊 Resultado da busca:', existingCPF ? `Encontrado: ${existingCPF.nome}` : 'Não encontrado');

        if (existingCPF) {
          setIsLoading(false);
          toast({
            title: "⚠️ CPF Duplicado",
            description: `Este CPF já está cadastrado para ${existingCPF.nome}. Redirecionando...`,
            className: "bg-yellow-50 border-yellow-200 text-yellow-800",
            duration: 3000,
          });
          setTimeout(() => {
            navigate(`/app/pessoas/${existingCPF.uid}`);
          }, 1500);
          return;
        }
      }

      // Pega todos os valores atuais diretamente dos inputs
      const currentValues = {
        nome: watch('nome'),
        cpf: watch('cpf'),
        nome_mae: watch('nome_mae'),
        nascimento: watch('nascimento'),
        whatsapp: watch('whatsapp'),
        telefone: watch('telefone'),
        genero: watch('genero'),
        titulo: watch('titulo'),
        zona: watch('zona'),
        secao: watch('secao'),
        cep: watch('cep'),
        endereco: watch('endereco'),
        numero: watch('numero'),
        bairro: watch('bairro'),
        regiao_bairro: watch('regiao_bairro'),
        cidade: watch('cidade'),
        uf: watch('uf'),
        complemento: watch('complemento'),
        categoria_uid: watch('categoria_uid'),
        indicado_uid: watch('indicado_uid'),
        latitude: watch('latitude'),
        longitude: watch('longitude'),
        numero_sus: watch('numero_sus'),
        instagram: watch('instagram'),
        responsavel_eleitor: watch('responsavel_eleitor'),
        confiabilidade_do_voto: watch('confiabilidade_do_voto'),
        quantidade_adultos_residencia: watch('quantidade_adultos_residencia'),
        colegio_eleitoral: watch('colegio_eleitoral')
      };

      // Debug da data
      console.log('Data original:', currentValues.nascimento);
      console.log('Data formatada:', formatDateForDatabase(currentValues.nascimento));

      // Extrair o mês da data formatada, garantindo que data vazia seja tratada como null
      const dataFormatada = currentValues.nascimento ? formatDateForDatabase(currentValues.nascimento) : null;
      const mes = dataFormatada ? dataFormatada.split('-')[1] : null;
      console.log('Data formatada:', dataFormatada, 'Mês extraído:', mes);

      // Preparar dados para inserção
      const formattedData: any = {
        nome: formatName(currentValues.nome),
        cpf: currentValues.cpf.replace(/\D/g, ''),
        nome_mae: formatName(currentValues.nome_mae),
        // Usar null para data vazia em vez de string vazia
        nascimento: dataFormatada || null,
        mes_nascimento: mes,
        whatsapp: currentValues.whatsapp.replace(/\D/g, ''),
        telefone: currentValues.telefone.replace(/\D/g, ''),
        genero: currentValues.genero,
        titulo: currentValues.titulo,
        zona: currentValues.zona,
        secao: currentValues.secao,
        cep: currentValues.cep.replace(/\D/g, ''),
        logradouro: currentValues.endereco, // Usando o campo endereco como logradouro
        numero: currentValues.numero,
        bairro: currentValues.bairro,
        regiao_bairro: currentValues.regiao_bairro,
        cidade: currentValues.cidade,
        uf: currentValues.uf,
        complemento: currentValues.complemento,
        empresa_uid: company?.uid || null,
        categoria_uid: currentValues.categoria_uid || null,
        indicado_uid: currentValues.indicado_uid || null,
        responsavel: user?.nome || null,
        usuario_uid: user?.uid || null,
        quantidade_adultos_residencia: currentValues.quantidade_adultos_residencia || null,
        colegio_eleitoral: currentValues.colegio_eleitoral || null,
        latitude: currentValues.latitude,
        longitude: currentValues.longitude,
        numero_do_sus: currentValues.numero_sus || null,
        instagram: currentValues.instagram || null,
        responsavel_pelo_eleitor: currentValues.responsavel_eleitor || null,
        confiabilidade_do_voto: currentValues.confiabilidade_do_voto || null
      };

      // Adicionar foto_url apenas se houver foto
      if (fotoUrl) {
        formattedData.foto_url = fotoUrl;
      }

      // Debug dos dados
      console.log('Dados formatados para envio:', formattedData);

      // Inserir eleitor
      const { data: eleitorData, error: eleitorError } = await supabaseClient
        .from('gbp_eleitores')
        .insert([formattedData])
        .select()
        .single();

      if (eleitorError) {
        console.error('Erro ao cadastrar eleitor:', eleitorError);
        console.error('Dados enviados:', formattedData);
        console.error('Detalhes completos do erro:', {
          code: eleitorError.code,
          message: eleitorError.message,
          details: eleitorError.details,
          hint: eleitorError.hint
        });

        // Log adicional para verificar a estrutura da tabela
        console.log('Colunas enviadas:', Object.keys(formattedData));

        toast({
          title: "Erro!",
          description: `Erro ao cadastrar pessoa: ${eleitorError.message}`,
          variant: "danger",
          duration: 2000,
        });
        return;
      }

      // Criar atendimentos (primeiro + adicionais)
      if (primeiroAtendimento || atendimentosAdicionais.length > 0) {
        // Buscar o último número de atendimento para a empresa atual
        const { data: ultimosAtendimentos, error: erroUltimoAtendimento } = await supabaseClient
          .from('gbp_atendimentos')
          .select('numero')
          .eq('empresa_uid', company?.uid)
          .not('numero', 'is', null)
          .order('numero', { ascending: false })
          .limit(1);

        if (erroUltimoAtendimento) {
          console.error('Erro ao buscar último número de atendimento:', erroUltimoAtendimento);
          toast({
            title: "Erro",
            description: `Erro ao buscar número de atendimento: ${erroUltimoAtendimento.message}`,
            variant: "destructive",
          });
          return;
        }

        // Definir o próximo número
        const ultimoNumero = ultimosAtendimentos && ultimosAtendimentos.length > 0 ? ultimosAtendimentos[0].numero : 0;

        // Buscar o nome do indicado selecionado no formulário
        let nomeIndicado = null;
        const indicadoUid = formattedData.indicado_uid;
        if (indicadoUid) {
          const indicadoSelecionado = indicados?.find(ind => ind.uid === indicadoUid);
          if (indicadoSelecionado) {
            nomeIndicado = indicadoSelecionado.nome;
          }
        }

        // Preparar lista de atendimentos para criar
        const atendimentosParaCriar = [];

        // Adicionar primeiro atendimento se marcado
        if (primeiroAtendimento) {
          const proximoNumero = ultimoNumero + 1;
          
          // Upload dos anexos do primeiro atendimento se houver
          const anexosUrls: string[] = [];
          if (anexosPrimeiroAtendimento && anexosPrimeiroAtendimento.length > 0) {
            const { data: empresaData, error: storageError } = await supabaseClient
              .from('gbp_empresas')
              .select('storage')
              .eq('uid', company?.uid)
              .single();

            if (storageError) {
              console.error('Erro ao buscar storage:', storageError);
              throw storageError;
            }

            const storageBucket = empresaData?.storage || 'atendimentos';

            for (const anexo of anexosPrimeiroAtendimento) {
              const fileExt = anexo.name.split('.').pop();
              const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
              const filePath = `atendimentos/${company?.uid}/${fileName}`;

              const { error: uploadError } = await supabaseClient
                .storage
                .from(storageBucket)
                .upload(filePath, anexo);

              if (uploadError) {
                console.error('Erro no upload:', uploadError);
                throw uploadError;
              }

              const { data: { publicUrl } } = supabaseClient
                .storage
                .from(storageBucket)
                .getPublicUrl(filePath);

              anexosUrls.push(publicUrl);
            }
          }
          
          const atendimentoData = {
            eleitor_uid: eleitorData.uid,
            usuario_uid: user?.uid || null,
            categoria_uid: categoriaAtendimento || null,
            descricao: descricaoAtendimento,
            empresa_uid: company?.uid || null,
            status: statusAtendimento || 'pendente',
            responsavel: user?.nome || null,
            data_atendimento: new Date().toISOString(),
            created_at: new Date().toLocaleDateString('en-CA'),
            numero: proximoNumero,
            indicado: nomeIndicado,
            tipo_de_atendimento: 'Primeiro Atendimento',
            anexos: anexosUrls.length > 0 ? anexosUrls : null,
            bairro: formattedData.bairro || null,
            cidade: formattedData.cidade || null,
            logradouro: currentValues.endereco || null,
            uf: formattedData.uf || null,
            cep: formattedData.cep || null,
            whatsapp: formattedData.whatsapp || null,
            eleitor: formattedData.nome,
            numero_do_sus: formattedData.numero_do_sus || null,
            cpf: formattedData.cpf || null,
            nascimento: formattedData.nascimento || null,
            complemento: formattedData.complemento || null,
            latitude: formattedData.latitude || null,
            longitude: formattedData.longitude || null,
            updated_at: new Date().toLocaleDateString('en-CA')
          };
          atendimentosParaCriar.push(atendimentoData);
        }

        // Adicionar atendimentos adicionais
        for (const atendimento of atendimentosAdicionais) {
          const proximoNumero = ultimoNumero + 1 + (primeiroAtendimento ? 1 : 0) + atendimentosAdicionais.indexOf(atendimento);
          const categoriaTipo = categoriaTipos?.find(cat => cat.uid === atendimento.categoria_uid);
          const categoriaNome = categoriaTipo?.nome || '';
          const categoriaPrincipal = categorias?.find(cat => cat.uid === atendimento.categoria_principal_uid);
          const categoriaPrincipalNome = categoriaPrincipal?.nome || '';
          const tipoDeAtendimento = `${categoriaNome} - ${categoriaPrincipalNome}`;
          
          // Upload dos anexos se houver
          const anexosUrls: string[] = [];
          if (atendimento.anexos && atendimento.anexos.length > 0) {
            const { data: empresaData, error: storageError } = await supabaseClient
              .from('gbp_empresas')
              .select('storage')
              .eq('uid', company?.uid)
              .single();

            if (storageError) {
              console.error('Erro ao buscar storage:', storageError);
              throw storageError;
            }

            const storageBucket = empresaData?.storage || 'atendimentos';

            for (const anexo of atendimento.anexos) {
              const fileExt = anexo.name.split('.').pop();
              const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
              const filePath = `atendimentos/${company?.uid}/${fileName}`;

              const { error: uploadError } = await supabaseClient
                .storage
                .from(storageBucket)
                .upload(filePath, anexo);

              if (uploadError) {
                console.error('Erro no upload:', uploadError);
                throw uploadError;
              }

              const { data: { publicUrl } } = supabaseClient
                .storage
                .from(storageBucket)
                .getPublicUrl(filePath);

              anexosUrls.push(publicUrl);
            }
          }
          
          const atendimentoData = {
            eleitor_uid: eleitorData.uid,
            usuario_uid: user?.uid || null,
            categoria_uid: atendimento.categoria_principal_uid,
            descricao: atendimento.descricao,
            empresa_uid: company?.uid || null,
            status: atendimento.status || 'pendente',
            responsavel: user?.nome || null,
            data_atendimento: new Date().toISOString(),
            created_at: new Date().toLocaleDateString('en-CA'),
            numero: proximoNumero,
            indicado: nomeIndicado,
            tipo_de_atendimento: tipoDeAtendimento,
            anexos: anexosUrls.length > 0 ? anexosUrls : null,
            bairro: formattedData.bairro || null,
            cidade: formattedData.cidade || null,
            logradouro: currentValues.endereco || null,
            uf: formattedData.uf || null,
            cep: formattedData.cep || null,
            whatsapp: formattedData.whatsapp || null,
            eleitor: formattedData.nome,
            numero_do_sus: formattedData.numero_do_sus || null,
            cpf: formattedData.cpf || null,
            nascimento: formattedData.nascimento || null,
            complemento: formattedData.complemento || null,
            latitude: formattedData.latitude || null,
            longitude: formattedData.longitude || null,
            updated_at: new Date().toLocaleDateString('en-CA')
          };
          atendimentosParaCriar.push(atendimentoData);
        }

        // Inserir todos os atendimentos
        if (atendimentosParaCriar.length > 0) {
          console.log('Dados dos atendimentos:', atendimentosParaCriar);
          const { error: atendimentoError } = await supabaseClient
            .from('gbp_atendimentos')
            .insert(atendimentosParaCriar);

          if (atendimentoError) {
            console.error('Erro ao criar atendimentos:', atendimentoError);
            console.error('Dados dos atendimentos:', atendimentosParaCriar);
            toast({
              title: "Erro",
              description: `Erro ao criar atendimentos: ${atendimentoError.message}`,
              variant: "destructive",
            });
          }
        }
      }

      // Sucesso
      toast({
        title: "✨ Tudo certo!",
        description: "Pessoa cadastrada com sucesso! Redirecionando...",
        className: "bg-green-50 border-green-200 text-green-800",
        duration: 3000,
      });
      resetForm();
      navigate('/app/pessoas');
    } catch (error) {
      console.error('Erro no cadastro:', error);
      toast({
        title: "Erro!",
        description: "Erro no cadastro",
        variant: "danger",
        duration: 2000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    // Reseta o formulário para os valores padrão
    reset(defaultValues);

    // Força a limpeza explícita de campos críticos
    setValue('nome_mae', '');
    setValue('nome', '');
    setValue('cpf', '');

    // Reseta a localização
    setValue('latitude', null);
    setValue('longitude', null);

    // Limpa o último CPF consultado
    setLastCheckedCPF('');

    // Reseta os estados
    setPrimeiroAtendimento(false);
    setDescricaoAtendimento('');
    setStatusAtendimento('');
    setCategoriaAtendimento('');
  };

  const handleVoltar = () => {
    navigate('/app/pessoas');
  };

  const [showExtraFields, setShowExtraFields] = useState(false);

  return (
    <>
      <div className="min-h-full bg-white dark:bg-gray-900 overflow-x-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={handleVoltar}
                  className="mr-4 rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Nova Pessoa
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowModalPDF(true)}
                  className="hidden sm:inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Baixar formulário
                </button>
                <div className="relative sm:hidden">
                  <button
                    type="button"
                    onClick={() => setShowMenuPDF(!showMenuPDF)}
                    className="inline-flex items-center px-3 py-2 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {showMenuPDF && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenuPDF(false);
                          setShowModalPDF(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Baixar formulário
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Formulário */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-6 pb-20 sm:pb-6 sm:px-6 lg:px-8">
          {/* Dados Pessoais */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex flex-row gap-6 items-start">
                <div className="flex-1">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                    <span className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg px-3 py-1">
                      Dados Pessoais
                    </span>
                  </h2>
                </div>

                {/* Seção de Foto de Perfil */}
                <div className="flex-shrink-0 relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    id="profile-photo"
                  />
                  <div
                    className={`relative w-[52px] h-[52px] md:w-16 md:h-16 rounded-xl transition-all duration-300 ${
                      isDragging ? 'ring-4 ring-blue-400 ring-offset-2' : ''
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {photoPreview ? (
                      <>
                        <img
                          src={photoPreview}
                          alt="Foto de perfil"
                          className="w-full h-full object-cover rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-gray-700 cursor-pointer transition-transform duration-300 hover:scale-[1.03]"
                          onClick={() => setShowPhotoModal(true)}
                        />
                        {/* Botão remover - badge no canto superior direito */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePhoto();
                          }}
                          className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-colors"
                          title="Remover foto"
                        >
                          <X className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        </button>
                      </>
                    ) : (
                      <div
                        className="w-full h-full rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-700 dark:to-gray-800 ring-1 ring-gray-200 dark:ring-gray-600 flex flex-col items-center justify-center cursor-pointer hover:from-blue-100 hover:to-indigo-200 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-all duration-300 group"
                        onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                      >
                        <User className="w-5 h-5 md:w-6 md:h-6 text-blue-300 dark:text-gray-500 group-hover:text-blue-400 transition-colors" />
                      </div>
                    )}

                    {/* Botão da câmera - badge flutuante no canto inferior direito */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPhotoOptions(!showPhotoOptions);
                      }}
                      className="absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-gray-800 transition-all hover:scale-110"
                      title={photoPreview ? 'Trocar foto' : 'Adicionar foto'}
                    >
                      <Camera className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    </button>
                  </div>

                  {/* Menu de opções de foto */}
                  {showPhotoOptions && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowPhotoOptions(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 z-50 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPhotoOptions(false);
                            document.getElementById('profile-photo')?.click();
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Escolher da galeria
                        </button>
                        <button
                          type="button"
                          onClick={openCamera}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          Tirar foto
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                {/* Linha 1: CPF e Nome */}
                <div className="flex flex-col md:flex-row gap-6">
                  {/* CPF Field */}
                  <div className="w-full md:w-64 flex-shrink-0">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    CPF
                  </label>
                  <div className="relative">
                    <InputMask
                      mask="999.999.999-99"
                      maskChar={null}
                      placeholder="Digite apenas números"
                      {...register('cpf')}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                      style={globalStyles.input}
                    />
                    {isLoadingCPF && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                </div>

                  {/* Nome Field */}
                  <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Apelido/Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Digite o nome completo"
                    {...register('nome', { required: true })}
                    onBlur={(e) => {
                      const formattedName = formatName(e.target.value);
                      setValue('nome', formattedName);
                    }}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                  {errors.nome && <span className="text-red-500 text-sm">Campo obrigatório</span>}
                  </div>
                </div>

                {/* Linha 2: Nome da Mãe, Nascimento e Gênero */}
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Nome da Mãe */}
                  <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Nome da Mãe
                  </label>
                  <input
                    type="text"
                    {...register('nome_mae')}
                    onBlur={(e) => {
                      const formattedName = formatName(e.target.value);
                      setValue('nome_mae', formattedName);
                    }}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    placeholder="Digite o nome da mãe"
                    style={globalStyles.input}
                  />
                  </div>

                  {/* Data de Nascimento */}
                  <div className="w-full md:w-64">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                      Nascimento {camposObrigatorios.nascimento && <span className="text-red-500">*</span>}
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={camposObrigatorios.nascimento}
                        onChange={() => toggleCampoObrigatorio('nascimento')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        title={camposObrigatorios.nascimento ? 'Campo obrigatório (clique para tornar opcional)' : 'Campo opcional (clique para tornar obrigatório)'}
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        {camposObrigatorios.nascimento ? 'Obrigatório' : 'Opcional'}
                      </span>
                    </div>
                  </div>
                  <InputMask
                    mask="99/99/9999"
                    maskChar={null}
                    placeholder="DD/MM/AAAA"
                    value={formatDateToDisplay(watch('nascimento'))}
                    {...register('nascimento', { 
                      required: camposObrigatorios.nascimento,
                      validate: {
                        isValid: (value) => {
                          if (!camposObrigatorios.nascimento || !value) return true;
                          return isValidDate(value) || 'Data inválida';
                        }
                      }
                    })}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length === 10 && isValidDate(value)) {
                        // Converte para o formato do banco antes de salvar
                        setValue('nascimento', formatDateForDatabase(value));
                      } else {
                        setValue('nascimento', value);
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                  {errors.nascimento && (
                    <span className="text-red-500 text-sm">
                      {errors.nascimento.type === 'isValid' ? 'Data inválida' : 'Campo obrigatório'}
                    </span>
                  )}
                  </div>

                  {/* Gênero */}
                  <div className="w-full md:w-64">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Gênero
                  </label>
                  <select
                    {...register('genero')}
                    className="w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                  >
                    <option value="">Selecione o gênero</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Não Binário">Não Binário</option>
                    <option value="Prefiro Não Informar">Prefiro Não Informar</option>
                  </select>
                  {errors.genero && (
                    <span className="text-sm text-red-500">{errors.genero.message}</span>
                  )}
                  </div>
                </div>

                {/* Linha 3: Categoria e WhatsApp */}
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Categoria <span className="text-red-500">*</span>
                  </label>
                  <div className="flex space-x-2">
                    <div className="flex-1 min-w-0">
                      <NestedCategoryDropdown
                        value={watch('categoria_uid')}
                        onChange={(value) => setValue('categoria_uid', value)}
                        categories={categorias || []}
                        isLoading={isLoadingCategorias}
                        error={errors.categoria_uid ? "Campo obrigatório" : undefined}
                        placeholder="Selecione uma categoria..."
                      />
                    </div>
                    {user?.nivel_acesso === 'admin' && (
                      <button
                        type="button"
                        onClick={() => setShowNovaCategoriaModal(true)}
                        className="flex-shrink-0 p-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-300 dark:border-gray-600 h-[44px]"
                        title="Nova Categoria"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  </div>

                  {/* WhatsApp */}
                  <div className="w-full md:w-64">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <InputMask
                    mask="(99) 99999-9999"
                    maskChar={null}
                    placeholder="Digite apenas números"
                    {...register('whatsapp', { required: true })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                  {errors.whatsapp && <span className="text-red-500 text-sm">Campo obrigatório</span>}
                  </div>
                </div>

                {/* Linha 4: Qtd. Adultos, Indicado por e Telefone */}
                <div>
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Quantidade de Adultos na Residência */}
                    <div className="w-full md:w-[150px] flex-shrink-0">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                        Qtd. Adultos
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qtd"
                        {...register('quantidade_adultos_residencia')}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                        style={globalStyles.input}
                      />
                    </div>

                    {/* Indicado por */}
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                        Indicado por
                      </label>
                      <div className="flex space-x-2">
                        <select
                          className="flex-1 appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                          disabled={isLoadingIndicados}
                          {...register('indicado_uid')}
                          style={{ ...globalStyles.select, WebkitAppearance: 'none', MozAppearance: 'none' }}
                        >
                          <option value="" className="text-gray-400">Selecione um indicado...</option>
                          {indicados?.map((indicado) => (
                            <option key={indicado.uid} value={indicado.uid}>
                              {indicado.nome}
                            </option>
                          ))}
                        </select>
                        {user?.nivel_acesso === 'admin' && (
                          <button
                            type="button"
                            onClick={() => setShowNovoIndicadoModal(true)}
                            className="flex-shrink-0 p-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-300 dark:border-gray-600 h-[44px]"
                            title="Novo Indicado"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Telefone */}
                    <div className="w-full md:min-w-[200px] md:max-w-[256px]">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                        Telefone
                      </label>
                      <InputMask
                        mask="(99) 99999-9999"
                        maskChar={null}
                        placeholder="Digite apenas números"
                        {...register('telefone')}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                        style={globalStyles.input}
                      />
                    </div>
                  </div>
                </div>

                {/* Confiabilidade do Voto */}
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                      Confiabilidade do Voto
                    </label>
                    <div className="relative">
                      <select
                        {...register('confiabilidade_do_voto')}
                        className="w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 pr-10 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                      >
                        <option value="">Selecione a confiabilidade</option>
                        <option value="frio">🔵 Frio 🧊 – Pouco engajado, dificilmente votará</option>
                        <option value="indeciso">🟡 Indeciso 🤔 – Ainda não definiu seu voto, precisa de convencimento</option>
                        <option value="morno">🟠 Morno 🌥️ – Demonstra interesse, mas não está totalmente convencido</option>
                        <option value="quente">🔴 Quente 🔥 – Alta chance de votar, mas ainda requer atenção</option>
                        <option value="convicto">🟢 Convicto 🏆 – Já decidiu e apoia publicamente</option>
                        <option value="fiel">🟣 Fiel ✅ – Já vota e defende a candidatura</option>
                        <option value="multiplicador">🚀 Multiplicador – Além de votar, influencia outras pessoas</option>
                      </select>
                      {watch('confiabilidade_do_voto') && (
                        <button
                          type="button"
                          onClick={() => setValue('confiabilidade_do_voto', '')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title="Limpar seleção"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dados Eleitorais */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => setShowDadosEleitorais(!showDadosEleitorais)}
            >
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <span className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg px-3 py-1">
                  Dados Eleitorais
                </span>
              </h2>
              <svg 
                className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${showDadosEleitorais ? 'transform rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className={`p-6 pt-0 ${showDadosEleitorais ? 'block' : 'hidden'}`}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Título de Eleitor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Título de Eleitor
                  </label>
                  <InputMask
                    mask="9999 9999 9999"
                    maskChar={null}
                    placeholder="Digite apenas números"
                    {...register('titulo')}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                </div>

                {/* Zona */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Zona
                  </label>
                  <InputMask
                    mask="9999"
                    maskChar={null}
                    placeholder="Digite apenas números"
                    {...register('zona')}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      if (value && value[0] === '0') {
                        e.target.value = value.replace(/^0+/, '');
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                </div>

                {/* Seção */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Seção
                  </label>
                  <InputMask
                    mask="9999"
                    maskChar={null}
                    placeholder="Digite apenas números"
                    {...register('secao')}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      if (value && value[0] === '0') {
                        e.target.value = value.replace(/^0+/, '');
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                </div>

                {/* Colégio Eleitoral */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Colégio Eleitoral
                  </label>
                  <input
                    type="text"
                    placeholder="Informe o colégio eleitoral"
                    {...register('colegio_eleitoral')}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Campos Extras - Só mostra se estiver habilitado nas configurações da empresa */}
          {companySettings.campos_adicionais && (
            <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => setShowExtraFields(!showExtraFields)}
              >
                <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <span className="bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-200 rounded-lg px-3 py-1">
                    Campos Adicionais
                  </span>
                </h2>
                <div className={`transform transition-transform ${showExtraFields ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {showExtraFields && (
                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Número do SUS */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                        Número do SUS
                      </label>
                      <input
                        type="text"
                        {...register('numero_sus')}
                        placeholder="Digite o número do SUS"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                        style={globalStyles.input}
                      />
                    </div>

                    {/* Instagram */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                        Instagram
                      </label>
                      <input
                        type="text"
                        {...register('instagram')}
                        placeholder="@usuario"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                        style={globalStyles.input}
                      />
                    </div>

                    {/* Responsável pela Pessoa */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                        Responsável pela Pessoa
                      </label>
                      <input
                        type="text"
                        {...register('responsavel_eleitor')}
                        placeholder="Nome do responsável"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                        style={globalStyles.input}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Endereço */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <span className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg px-3 py-1">
                    Endereço
                  </span>
                </h2>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={camposObrigatorios.endereco}
                    onChange={() => {
                      toggleCampoObrigatorio('endereco');
                      toggleCampoObrigatorio('numero');
                      toggleCampoObrigatorio('bairro');
                      toggleCampoObrigatorio('cidade');
                      toggleCampoObrigatorio('uf');
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    title={camposObrigatorios.endereco ? 'Campos obrigatórios (clique para tornar opcionais)' : 'Campos opcionais (clique para tornar obrigatórios)'}
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {camposObrigatorios.endereco ? 'Obrigatórios' : 'Opcionais'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* CEP */}
                <div className="col-span-1">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                      CEP <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <InputMask
                        mask="99999-999"
                        maskChar={null}
                        placeholder="Digite apenas números"
                        {...register('cep')}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                        style={globalStyles.input}
                      />
                      {isLoadingCep && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <a
                        href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-200 hover:text-blue-800 dark:hover:text-blue-300 hover:underline flex items-center space-x-1"
                      >
                        <span>Buscar CEP</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                          <path
                            d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"
                          />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
                
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Logradouro {camposObrigatorios.endereco && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="Digite o logradouro"
                    {...register('endereco', { 
                      required: camposObrigatorios.endereco 
                    })}
                    className={`w-full rounded-lg border ${errors.endereco ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500`}
                    style={globalStyles.input}
                  />
                  {errors.endereco && <span className="text-red-500 text-sm">Campo obrigatório</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Número {camposObrigatorios.numero && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="Digite o número"
                    {...register('numero', { 
                      required: camposObrigatorios.numero 
                    })}
                    className={`w-full rounded-lg border ${errors.numero ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500`}
                    style={globalStyles.input}
                  />
                  {errors.numero && <span className="text-red-500 text-sm">Campo obrigatório</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Complemento
                  </label>
                  <input
                    type="text"
                    placeholder="Digite o complemento (opcional)"
                    {...register('complemento')}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={globalStyles.input}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Bairro {camposObrigatorios.bairro && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="Digite o bairro"
                    {...register('bairro', { 
                      required: camposObrigatorios.bairro,
                      onBlur: (e) => {
                        const formattedValue = formatName(e.target.value);
                        setValue('bairro', formattedValue);
                      }
                    })}
                    className={`w-full rounded-lg border ${errors.bairro ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500`}
                    style={globalStyles.input}
                  />
                  {errors.bairro && <span className="text-red-500 text-sm">Campo obrigatório</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Região do Bairro
                  </label>
                  <select
                    {...register('regiao_bairro')}
                    onChange={(e) => {
                      register('regiao_bairro').onChange(e); // Mantém o comportamento padrão do register
                      handleRegiaoChange(e); // Adiciona nossa lógica personalizada
                    }}
                    className="w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                  >
                    <option value="">Selecione a região</option>
                    <option value="Alto">Alto</option>
                    <option value="Baixo">Baixo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Cidade {camposObrigatorios.cidade && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="Digite a cidade"
                    {...register('cidade', { 
                      required: camposObrigatorios.cidade,
                      onBlur: (e) => {
                        const formattedValue = formatName(e.target.value);
                        setValue('cidade', formattedValue);
                      }
                    })}
                    className={`w-full rounded-lg border ${errors.cidade ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500`}
                    style={globalStyles.input}
                  />
                  {errors.cidade && <span className="text-red-500 text-sm">Campo obrigatório</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                    Estado {camposObrigatorios.uf && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="UF"
                    {...register('uf', { 
                      required: camposObrigatorios.uf,
                      maxLength: 2,
                      onChange: (e) => {
                        // Converte para maiúsculas automaticamente
                        const value = e.target.value.toUpperCase();
                        setValue('uf', value);
                      }
                    })}
                    className={`w-full rounded-lg border ${errors.uf ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500`}
                    style={globalStyles.input}
                  />
                  {errors.uf && <span className="text-red-500 text-sm">Campo obrigatório</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Primeiro Atendimento */}
          <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="primeiro_atendimento"
                  checked={primeiroAtendimento}
                  onChange={(e) => {
                    setPrimeiroAtendimento(e.target.checked);
                    if (e.target.checked) {
                      // Quando marcar o checkbox, sincroniza a categoria
                      const categoria = watch('categoria_uid');
                      setCategoriaAtendimento(categoria);
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="primeiro_atendimento"
                  className="ml-2 block text-sm text-gray-900 dark:text-gray-100"
                >
                  Primeiro Atendimento
                </label>
              </div>

              {primeiroAtendimento && (
                <div className="space-y-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                      Categoria do Atendimento <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={categoriaAtendimento}
                      onChange={(e) => {
                        setCategoriaAtendimento(e.target.value);
                        setAtendimentoErrors(prev => ({ ...prev, categoria: '' }));
                      }}
                      className={`mt-1 block w-full appearance-none pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white ${atendimentoErrors.categoria ? 'border-red-500' : ''}`}
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                      disabled={true} // Campo desabilitado pois será sincronizado automaticamente
                    >
                      <option value="">Selecione a categoria</option>
                      {categorias?.map((categoria) => (
                        <option key={categoria.uid} value={categoria.uid}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                    {atendimentoErrors.categoria && (
                      <p className="mt-1 text-sm text-red-500">{atendimentoErrors.categoria}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                      Descrição do Atendimento <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Descreva o atendimento..."
                      value={descricaoAtendimento}
                      onChange={(e) => {
                        setDescricaoAtendimento(e.target.value);
                        setAtendimentoErrors(prev => ({ ...prev, descricao: '' }));
                      }}
                      className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 p-3 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                        atendimentoErrors.descricao ? 'border-red-500' : ''
                      }`}
                    />
                    {atendimentoErrors.descricao && (
                      <p className="mt-1 text-sm text-red-500">{atendimentoErrors.descricao}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                      Status do Atendimento <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={statusAtendimento}
                      onChange={(e) => {
                        setStatusAtendimento(e.target.value);
                        setAtendimentoErrors(prev => ({ ...prev, status: '' }));
                      }}
                      className={`mt-1 block w-full appearance-none pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white ${
                        atendimentoErrors.status ? 'border-red-500' : ''
                      }`}
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                    >
                      <option value="">Selecione o status</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Concluído">Concluído</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                    {atendimentoErrors.status && (
                      <p className="mt-1 text-sm text-red-500">{atendimentoErrors.status}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                      Anexos (PDF, Imagens)
                    </label>
                    <FileUpload
                      value={anexosPrimeiroAtendimento}
                      onChange={setAnexosPrimeiroAtendimento}
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      multiple={true}
                      maxFiles={5}
                      maxSize={50 * 1024 * 1024} // 50MB
                    />
                  </div>
                </div>
              )}

              {/* Botão para adicionar atendimento adicional */}
              {primeiroAtendimento && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={abrirModalAtendimentos}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                  >
                    {atendimentosAdicionais.length > 0 
                      ? `${atendimentosAdicionais.length} atendimento(s) adicional(is)` 
                      : ''}
                  </button>
                  <button
                    type="button"
                    onClick={abrirModalAtendimentos}
                    disabled={!descricaoAtendimento || !statusAtendimento}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium ${
                      !descricaoAtendimento || !statusAtendimento
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                    }`}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Atendimento
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 mb-8 flex flex-row justify-end gap-3 px-4 sm:px-0">
            <button
              type="button"
              onClick={() => navigate('/app/pessoas')}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Salvando...
                </div>
              ) : (
                'Salvar'
              )}
            </button>
          </div>
        </form>

        {/* Modal de Nova Categoria */}
        <NovaCategoriaModal
          isOpen={showNovaCategoriaModal}
          onClose={() => setShowNovaCategoriaModal(false)}
        />

        {/* Modal de Novo Indicado */}
        <NovoIndicadoModal
          isOpen={showNovoIndicadoModal}
          onClose={() => setShowNovoIndicadoModal(false)}
        />

        {/* Modal de Atendimentos Adicionais */}
        <Dialog open={showModalAtendimentos} onOpenChange={setShowModalAtendimentos}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerenciar Atendimentos</DialogTitle>
              <DialogDescription>
                Atendimentos adicionais para este eleitor
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Coluna da esquerda: Lista de atendimentos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Atendimentos ({(primeiroAtendimento && descricaoAtendimento ? 1 : 0) + atendimentosAdicionais.length})
                  </h4>
                  {atendimentosAdicionais.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowConfirmarLimpar(true)}
                      className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Limpar todos
                    </button>
                  )}
                </div>
                
                {(primeiroAtendimento && descricaoAtendimento ? 1 : 0) + atendimentosAdicionais.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Nenhum atendimento adicionado ainda
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {/* Primeiro Atendimento */}
                    {primeiroAtendimento && descricaoAtendimento && (
                      <div className="flex items-start justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex-1 min-w-0">
                          <p 
                            className="text-sm font-medium text-gray-900 dark:text-white truncate cursor-help"
                            title="Primeiro Atendimento"
                          >
                            Primeiro Atendimento
                          </p>
                          <p 
                            className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1 cursor-help"
                            title={descricaoAtendimento}
                          >
                            {descricaoAtendimento}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              statusAtendimento === 'Concluído' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              statusAtendimento === 'Em Andamento' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              statusAtendimento === 'Cancelado' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                            }`}>
                              {statusAtendimento}
                            </span>
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                              Principal
                            </span>
                            {anexosPrimeiroAtendimento && anexosPrimeiroAtendimento.length > 0 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                                {anexosPrimeiroAtendimento.length} anexo(s)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Atendimentos Adicionais */}
                    {atendimentosAdicionais.map((atendimento, index) => {
                      const categoriaTipo = categoriaTipos?.find(cat => cat.uid === atendimento.categoria_uid);
                      const categoriaNome = categoriaTipo?.nome || '';
                      const categoriaPrincipal = categorias?.find(cat => cat.uid === atendimento.categoria_principal_uid);
                      const categoriaPrincipalNome = categoriaPrincipal?.nome || '';
                      const label = `${categoriaNome} - ${categoriaPrincipalNome}`;
                      return (
                        <div key={index} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="flex-1 min-w-0">
                            <p 
                              className="text-sm font-medium text-gray-900 dark:text-white truncate cursor-help"
                              title={label}
                            >
                              {label}
                            </p>
                            <p 
                              className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1 cursor-help"
                              title={atendimento.descricao}
                            >
                              {atendimento.descricao}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                atendimento.status === 'Concluído' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                atendimento.status === 'Em Andamento' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                atendimento.status === 'Cancelado' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                              }`}>
                                {atendimento.status}
                              </span>
                              {atendimento.anexos && atendimento.anexos.length > 0 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                                  {atendimento.anexos.length} anexo(s)
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removerAtendimento(index)}
                            className="ml-3 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0"
                            title="Remover atendimento"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Coluna da direita: Formulário */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Adicionar Novo Atendimento
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                      Tipo de Categoria <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={novoAtendimentoCategoria}
                      onChange={(e) => {
                        setNovoAtendimentoCategoria(e.target.value);
                        setNovoAtendimentoErrors(prev => ({ ...prev, categoria: '' }));
                      }}
                      className={`mt-1 block w-full appearance-none pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white ${novoAtendimentoErrors.categoria ? 'border-red-500' : ''}`}
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                      disabled={isLoadingCategoriaTipos}
                    >
                      <option value="">Selecione o tipo</option>
                      {categoriaTipos?.map((categoria) => (
                        <option key={categoria.uid} value={categoria.uid}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                    {isLoadingCategoriaTipos && (
                      <p className="mt-1 text-sm text-gray-500">Carregando tipos...</p>
                    )}
                    {novoAtendimentoErrors.categoria && (
                      <p className="mt-1 text-sm text-red-500">{novoAtendimentoErrors.categoria}</p>
                    )}
                  </div>
                  {novoAtendimentoCategoria && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                        Categoria Principal <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={novoAtendimentoCategoriaPrincipal}
                        onChange={(e) => {
                          setNovoAtendimentoCategoriaPrincipal(e.target.value);
                          setNovoAtendimentoErrors(prev => ({ ...prev, categoriaPrincipal: '' }));
                        }}
                        className="mt-1 block w-full appearance-none pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                        disabled={isLoadingCategorias}
                      >
                        <option value="">Selecione a categoria</option>
                        {categorias?.filter(cat => cat.tipo_uid === novoAtendimentoCategoria).map((categoria) => (
                          <option key={categoria.uid} value={categoria.uid}>
                            {categoria.nome}
                          </option>
                        ))}
                      </select>
                      {isLoadingCategorias && (
                        <p className="mt-1 text-sm text-gray-500">Carregando categorias...</p>
                      )}
                      {novoAtendimentoErrors.categoriaPrincipal && (
                        <p className="mt-1 text-sm text-red-500">{novoAtendimentoErrors.categoriaPrincipal}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                      Descrição do Atendimento <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Descreva o atendimento..."
                      value={novoAtendimentoDescricao}
                      onChange={(e) => {
                        setNovoAtendimentoDescricao(e.target.value);
                        setNovoAtendimentoErrors(prev => ({ ...prev, descricao: '' }));
                      }}
                      className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 p-2 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                        novoAtendimentoErrors.descricao ? 'border-red-500' : ''
                      }`}
                    />
                    {novoAtendimentoErrors.descricao && (
                      <p className="mt-1 text-sm text-red-500">{novoAtendimentoErrors.descricao}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                      Status do Atendimento <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={novoAtendimentoStatus}
                      onChange={(e) => {
                        setNovoAtendimentoStatus(e.target.value);
                        setNovoAtendimentoErrors(prev => ({ ...prev, status: '' }));
                      }}
                      className={`mt-1 block w-full appearance-none pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white ${
                        novoAtendimentoErrors.status ? 'border-red-500' : ''
                      }`}
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Concluído">Concluído</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                    {novoAtendimentoErrors.status && (
                      <p className="mt-1 text-sm text-red-500">{novoAtendimentoErrors.status}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                      Anexos (PDF, Imagens)
                    </label>
                    <FileUpload
                      value={novoAtendimentoAnexos}
                      onChange={setNovoAtendimentoAnexos}
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      multiple={true}
                      maxFiles={5}
                      maxSize={50 * 1024 * 1024} // 50MB
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <button
                type="button"
                onClick={() => setShowModalAtendimentos(false)}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={adicionarAtendimentoNoModal}
                className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2 inline" />
                Adicionar Atendimento
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação para Limpar Todos */}
        <Dialog open={showConfirmarLimpar} onOpenChange={setShowConfirmarLimpar}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar Limpeza</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja remover todos os atendimentos adicionais? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <button
                type="button"
                onClick={() => setShowConfirmarLimpar(false)}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setAtendimentosAdicionais([]);
                  setShowConfirmarLimpar(false);
                }}
                className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                Sim, Limpar Todos
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Seleção de Campos do PDF */}
        <Dialog open={showModalPDF} onOpenChange={setShowModalPDF}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Selecionar Campos do PDF</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {/* Dados Pessoais */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Dados Pessoais</h3>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.nomeCompleto}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, nomeCompleto: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Nome Completo</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.cpf}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, cpf: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">CPF</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.nascimento}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, nascimento: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Nascimento</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.nomeMae}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, nomeMae: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Nome da Mãe</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.whatsapp}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, whatsapp: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">WhatsApp</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.telefone}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, telefone: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Telefone</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.genero}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, genero: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Gênero</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.titulo}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, titulo: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Título</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.zona}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, zona: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Zona</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.secao}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, secao: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Seção</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.sus}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, sus: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">SUS</span>
                  </label>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Endereço</h3>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.cep}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, cep: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">CEP</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.numero}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, numero: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Número</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.endereco}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, endereco: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Endereço</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.bairro}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, bairro: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Bairro</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.cidade}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, cidade: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Cidade</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.uf}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, uf: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">UF</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.complemento}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, complemento: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Complemento</span>
                  </label>
                </div>
              </div>

              {/* Informações Adicionais */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Informações Adicionais</h3>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.categoria}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, categoria: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Categoria</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.indicadoPor}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, indicadoPor: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Indicado por</span>
                  </label>
                </div>
              </div>

              {/* Atendimento */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Atendimento</h3>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.statusAtendimento}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, statusAtendimento: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Status do Atendimento</span>
                  </label>
                </div>
              </div>

              {/* Observações */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Outros</h3>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={camposPDF.observacoes}
                      onChange={(e) => setCamposPDF(prev => ({ ...prev, observacoes: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Observações</span>
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 flex flex-row gap-2">
              <button
                type="button"
                onClick={() => setShowModalPDF(false)}
                className="flex-1 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowModalPDF(false);
                  gerarPDFEmBranco();
                }}
                className="flex-1 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <FileText className="h-4 w-4 mr-2 inline" />
                Gerar PDF
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de visualização de foto */}
        <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Foto de Perfil</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center py-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Foto de perfil em tamanho grande"
                  className="max-w-full max-h-[50vh] rounded-lg object-contain shadow-lg"
                />
              )}
            </div>
            <DialogFooter className="flex flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  document.getElementById('profile-photo')?.click();
                  setShowPhotoModal(false);
                }}
                className="flex-1 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Trocar Foto
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal da câmera */}
        <Dialog open={showCameraModal} onOpenChange={(open) => { if (!open) closeCamera(); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Tirar Foto</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-[400px] object-contain"
              />
            </div>
            <DialogFooter className="flex flex-row gap-3">
              <button
                type="button"
                onClick={closeCamera}
                className="flex-1 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={switchCamera}
                className="flex-1 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 flex items-center justify-center gap-2"
              >
                <SwitchCamera className="h-4 w-4" />
                Alternar
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="flex-1 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Capturar
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
