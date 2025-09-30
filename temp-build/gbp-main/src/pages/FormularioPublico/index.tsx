import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Container, 
  TextField, 
  Typography, 
  Paper, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Stepper,
  Step,
  StepLabel,
  FormHelperText,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  GroupIcon,
  Grid,
  Link
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { eleitorService } from '../../services/eleitorService';
import { useCategories } from '../../hooks/useCategories';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import HomeIcon from '@mui/icons-material/Home';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CategoryIcon from '@mui/icons-material/Category';
import { supabaseClient as supabase } from '../../lib/supabase';
import { LoadingButton } from '@mui/lab';
import SaveIcon from '@mui/icons-material/Save';
import Backdrop from '@mui/material/Backdrop';
import ClearIcon from '@mui/icons-material/Clear';
import BadgeIcon from '@mui/icons-material/Badge';
import InputAdornment from '@mui/material/InputAdornment';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WcIcon from '@mui/icons-material/Wc';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import NumbersIcon from '@mui/icons-material/Numbers';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ApartmentIcon from '@mui/icons-material/Apartment';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import MarkunreadMailboxIcon from '@mui/icons-material/MarkunreadMailbox';
import GavelIcon from '@mui/icons-material/Gavel';
import BallotIcon from '@mui/icons-material/Ballot';
import SendIcon from '@mui/icons-material/Send';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

const FormContainer = styled(Container)(({ theme }) => ({
  padding: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    padding: 0,
    '& > .MuiPaper-root': {
      borderRadius: 0,
      boxShadow: 'none'
    }
  }
}));

const FormSection = styled(Box)(({ theme }) => ({
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: theme.spacing(3),
  paddingLeft: theme.spacing(6),
  paddingRight: theme.spacing(6),
  marginBottom: theme.spacing(2),
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  transition: 'all 0.3s ease',
  [theme.breakpoints.down('sm')]: {
    borderRadius: 0,
    boxShadow: 'none',
    marginBottom: theme.spacing(1),
    padding: theme.spacing(2),
    paddingLeft: theme.spacing(4),
    paddingRight: theme.spacing(4)
  },
  '&:hover': {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
  }
}));

const SectionTitle = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(3),
  '& .MuiSvgIcon-root': {
    color: theme.palette.primary.main,
    fontSize: '1.75rem'
  },
  '& .MuiTypography-h6': {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: theme.palette.text.primary,
    letterSpacing: '0.5px'
  }
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    backgroundColor: '#f8f9fa',
    '&:hover': {
      backgroundColor: '#f3f4f6'
    },
    '&.Mui-focused': {
      backgroundColor: '#ffffff',
      boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)'
    }
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(0, 0, 0, 0.12)'
  },
  '& .MuiInputLabel-root': {
    color: theme.palette.text.secondary,
    fontWeight: 500
  },
  '& .MuiInputAdornment-root .MuiSvgIcon-root': {
    color: theme.palette.primary.main,
    opacity: 0.8
  }
}));

const FieldGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(12, 1fr)',
  gap: theme.spacing(2.5),
  [theme.breakpoints.down('sm')]: {
    gap: theme.spacing(2)
  }
}));

const FormField = styled(Box)({
  width: '100%'
});

interface FieldConfig {
  id: string;
  visivel: boolean;
  obrigatorio: boolean;
  anexo?: boolean;
}

interface FormConfig {
  uid: string;
  categoria_uid: string;
  empresa_uid: string;
  campos_config: string[];
  form_status: boolean;
  registration_limit: number;
  url_slug: string | null;
  form_title?: string;
  form_title_color?: string;
  form_logo_url?: string;
  form_theme?: {
    primaryColor: string;
    backgroundColor: string;
    subtitle?: string;
    subtitleColor?: string;
  };
  categoria_tipos?: string;
  varias_categorias?: string[];
}

interface CpfApiResponse {
  nome?: string;
  nome_mae?: string;
  nascimento?: string;
  genero?: string;
  titulo?: string;
}

export function FormularioPublico() {
  const { slug, categoria, empresa_uid } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Estados
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingCep, setLoadingCep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [parsedFields, setParsedFields] = useState<FieldConfig[]>([]);
  const [completed, setCompleted] = useState(false);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const arquivoInputRef = useRef<HTMLInputElement>(null);
  const [cpfChecking, setCpfChecking] = useState(false);
  const [cpfExists, setCpfExists] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{
    [key: string]: { file: File; name: string }[];
  }>({
    rg_cnh: [],
    cpf_anexo: [],
    certidao_nascimento: [],
    titulo_eleitor: [],
    comprovante_residencia: [],
    foto_3x4: []
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categorias, setCategorias] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitStatus, setSubmitStatus] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  useEffect(() => {
    setSelectedCategory('');
  }, [formConfig?.categoria_tipos]);

  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    nascimento: '', 
    nome_mae: '',
    genero: '',
    whatsapp: '',
    telefone: '',
    titulo: '', 
    zona: '',
    secao: '',
    cep: '',
    logradouro: '',
    numero: '', 
    complemento: '', 
    bairro: '',
    cidade: '',
    uf: '', 
    latitude: '', 
    longitude: '', 
    categoria_uid: '',
    empresa_uid: '',
    upload_url: '',
    categoriaId: '',
    empresaId: '',
    mes_nascimento: '',
    responsavel: '',
  });

  useEffect(() => {
    const loadFormConfig = async () => {
      try {
        console.log('Carregando formConfig com:', { slug, categoria, empresa_uid });
        
        let query = supabase.from('gbp_form_config').select('*');

        // Se tiver slug, busca por ele
        if (slug) {
          query = query.eq('url_slug', slug);
        } 
        // Se não tiver slug, busca por categoria e empresa_uid
        else if (categoria && empresa_uid) {
          query = query
            .eq('categoria_uid', categoria)
            .eq('empresa_uid', empresa_uid);
        } else {
          throw new Error('Parâmetros inválidos');
        }

        const { data, error } = await query.single();

        if (error) {
          console.error('Erro ao carregar formConfig:', error);
          throw error;
        }
        if (!data) throw new Error('Formulário não encontrado');

        // Verifica se o formulário está ativo
        if (!data.form_status) {
          throw new Error('Este formulário está desativado');
        }

        console.log('FormConfig carregado:', data);
        setFormConfig(data);

        // Parse campos_config
        console.log('Configuração dos campos:', data.campos_config);
        const fields = data.campos_config.map(configStr => {
          try {
            return JSON.parse(configStr) as FieldConfig;
          } catch (e) {
            console.error('Erro ao fazer parse do campo:', configStr);
            return null;
          }
        }).filter((field): field is FieldConfig => field !== null);

        setParsedFields(fields);
      } catch (error) {
        console.error('Erro ao carregar configuração do formulário:', error);
        setError(error instanceof Error ? error.message : 'Erro ao carregar formulário');
      } finally {
        setLoading(false);
      }
    };

    loadFormConfig();
  }, [slug, categoria, empresa_uid]);

  useEffect(() => {
    if (formConfig) {
      setSelectedCategory(formConfig.categoria_uid);
    }
  }, [formConfig]);

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        if (!formConfig) {
          console.log('formConfig não disponível');
          return;
        }

        // Buscar apenas as categorias que estão em varias_categorias
        const { data: categoriasFiltradas, error } = await supabase
          .from('gbp_categorias')
          .select(`
            *,
            tipo:gbp_categoria_tipos(*)
          `)
          .eq('empresa_uid', formConfig.empresa_uid)
          .in('uid', formConfig.varias_categorias || []);

        if (error) {
          console.error('Erro ao buscar categorias:', error);
          setCategorias([]);
          setSelectedCategory(formConfig.categoria_uid);
          return;
        }

        console.log('Categorias encontradas:', categoriasFiltradas);
        setCategorias(categoriasFiltradas || []);
        setSelectedCategory(formConfig.categoria_uid);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        setCategorias([]);
        setSelectedCategory(formConfig.categoria_uid);
      }
    };

    if (formConfig?.categoria_uid) {
      loadCategorias();
    }
  }, [formConfig]);

  useEffect(() => {
    if (categoria && empresa_uid) {
      setFormData(prev => ({
        ...prev,
        categoriaId: categoria,
        empresaId: empresa_uid
      }));
    }
  }, [categoria, empresa_uid]);

  const formatCpf = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const cpf = numbers.slice(0, 11);
    
    // Aplica a máscara
    if (cpf.length <= 3) return cpf;
    if (cpf.length <= 6) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`;
    if (cpf.length <= 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`;
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
  };

  const handleCpfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const numericValue = value.replace(/\D/g, '');
    const formattedValue = numericValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    
    handleChange({
      target: {
        name: 'cpf',
        value: formattedValue.slice(0, 14)
      }
    } as React.ChangeEvent<HTMLInputElement>);

    // Limpar erros anteriores ao começar a digitar
    if (numericValue.length < 11) {
      setFieldErrors(prev => ({ ...prev, cpf: '' }));
      return;
    }

    // Verificar CPF quando estiver completo
    if (numericValue.length === 11) {
      try {
        setCpfChecking(true);
        const { data: existingCpf, error } = await supabase
          .from('gbp_eleitores')
          .select('id')
          .eq('cpf', numericValue)
          .eq('empresa_uid', formConfig?.empresa_uid)
          .maybeSingle();

        if (error) {
          console.error('Erro ao verificar CPF:', error);
          return;
        }

        if (existingCpf) {
          setFieldErrors(prev => ({ ...prev, cpf: 'CPF já cadastrado para esta empresa' }));
          setFormData(prev => ({ ...prev, cpf: '' }));
          setOpenModal(true);
        }
      } catch (error) {
        console.error('Erro ao verificar CPF:', error);
      } finally {
        setCpfChecking(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formConfig) {
      return;
    }

    if (!selectedCategory) {
      return;
    }

    if (isSubmitting) {
      return;
    }

    try {
      // Validar campos obrigatórios
      const missingFields = parsedFields
        .filter(field => field.obrigatorio && isFieldVisible(field.id))
        .filter(field => {
          if (field.anexo) {
            return !uploadedFiles[field.id]?.length;
          }
          return !formData[field.id as keyof typeof formData];
        })
        .map(field => field.id);

      // Atualizar estado dos campos inválidos
      setInvalidFields(missingFields);

      if (missingFields.length > 0) {
        return;
      }

      // Validar CPF antes de prosseguir
      if (formData.cpf) {
        const cpfNumerico = formData.cpf.replace(/\D/g, '');
        if (cpfNumerico.length !== 11) {
          setFieldErrors(prev => ({ ...prev, cpf: 'CPF inválido' }));
          return;
        }

        // Verificar se CPF já existe
        const { data: existingCpf } = await supabase
          .from('gbp_eleitores')
          .select('id')
          .eq('cpf', cpfNumerico)
          .eq('empresa_uid', formConfig.empresa_uid)
          .maybeSingle();

        if (existingCpf) {
          setFieldErrors(prev => ({ ...prev, cpf: 'CPF já cadastrado' }));
          return;
        }
      }

      setIsSubmitting(true);
      setSubmitProgress(0);
      setSubmitStatus('Iniciando envio do cadastro...');

      // Validar data de nascimento e converter para formato ISO (apenas se o campo estiver preenchido ou for obrigatório)
      let nascimentoFormatado = null;
      if (formData.nascimento) {
        const dateParts = formData.nascimento.split('-');
        nascimentoFormatado = dateParts.length === 3 ? 
          `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : null;

        if (!nascimentoFormatado) {
          setFieldErrors(prev => ({ ...prev, nascimento: 'Data de nascimento inválida' }));
          setIsSubmitting(false);
          return;
        }
      } else if (isFieldRequired('nascimento')) {
        // Se o campo for obrigatório e não estiver preenchido
        setFieldErrors(prev => ({ ...prev, nascimento: 'Data de nascimento é obrigatória' }));
        setIsSubmitting(false);
        return;
      }

      setSubmitProgress(20);
      setSubmitStatus('Validando seus dados...');

      // Buscar dados da empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from('gbp_empresas')
        .select('storage')
        .eq('uid', formConfig.empresa_uid)
        .single();

      if (empresaError || !empresaData) {
        throw new Error('Erro ao buscar dados da empresa');
      }

      setSubmitProgress(40);
      setSubmitStatus('Enviando seus documentos...');

      const storage = empresaData.storage;
      
      // Função auxiliar para fazer upload de arquivo
      const uploadFile = async (file: File, path: string) => {
        if (!file) return null;
        
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `${path}/${fileName}`;
          
          const { error: uploadError, data } = await supabase.storage
            .from(storage)
            .upload(filePath, file);

          if (uploadError) {
            console.error(`Erro ao fazer upload do arquivo ${path}:`, uploadError);
            throw uploadError;
          }

          const { data: urlData } = supabase.storage
            .from(storage)
            .getPublicUrl(filePath);

          return urlData.publicUrl;
        } catch (error) {
          console.error(`Erro no upload do arquivo ${path}:`, error);
          throw error;
        }
      };

      // Fazer upload dos arquivos
      const uploadedUrls = {
        ax_rg_cnh: null as string | null,
        ax_cpf: null as string | null,
        ax_cert_nascimento: null as string | null,
        ax_titulo: null as string | null,
        ax_comp_residencia: null as string | null,
        ax_foto_3x4: null as string | null
      };

      // Upload RG/CNH
      if (uploadedFiles.rg_cnh?.[0]) {
        uploadedUrls.ax_rg_cnh = await uploadFile(uploadedFiles.rg_cnh[0].file, 'rg-cnh');
      }

      // Upload CPF
      if (uploadedFiles.cpf_anexo?.[0]) {
        uploadedUrls.ax_cpf = await uploadFile(uploadedFiles.cpf_anexo[0].file, 'cpf');
      }

      // Upload Certidão de Nascimento
      if (uploadedFiles.certidao_nascimento?.[0]) {
        uploadedUrls.ax_cert_nascimento = await uploadFile(uploadedFiles.certidao_nascimento[0].file, 'certidao-nascimento');
      }

      // Upload Título de Eleitor
      if (uploadedFiles.titulo_eleitor?.[0]) {
        uploadedUrls.ax_titulo = await uploadFile(uploadedFiles.titulo_eleitor[0].file, 'titulo-eleitor');
      }

      // Upload Comprovante de Residência
      if (uploadedFiles.comprovante_residencia?.[0]) {
        uploadedUrls.ax_comp_residencia = await uploadFile(uploadedFiles.comprovante_residencia[0].file, 'comprovante-residencia');
      }

      // Upload Foto 3x4
      if (uploadedFiles.foto_3x4?.[0]) {
        uploadedUrls.ax_foto_3x4 = await uploadFile(uploadedFiles.foto_3x4[0].file, 'foto-3x4');
      }

      setSubmitProgress(60);
      setSubmitStatus('Quase lá! Finalizando seu cadastro...');

      // Extrai o mês do nascimento
      const mesNascimento = nascimentoFormatado ? new Date(nascimentoFormatado).getMonth() + 1 : null;

      // Prepara os dados para envio
      const dataToSubmit = {
        nome: formData.nome?.trim(),
        cpf: formData.cpf?.replace(/\D/g, ''),
        nascimento: nascimentoFormatado, 
        nome_mae: formData.nome_mae?.trim(),
        genero: formData.genero, 
        whatsapp: formData.whatsapp?.replace(/\D/g, ''), 
        telefone: formData.telefone?.replace(/\D/g, ''), 
        titulo: formData.titulo?.replace(/\D/g, ''), 
        zona: formData.zona?.trim(),
        secao: formData.secao?.trim(),
        cep: formData.cep?.replace(/\D/g, ''),
        logradouro: formData.logradouro || '',
        numero: formData.numero || '', 
        complemento: formData.complemento || '', 
        bairro: formData.bairro || '',
        cidade: formData.cidade || '',
        uf: formData.uf || '', 
        categoria_uid: selectedCategory,
        empresa_uid: formConfig.empresa_uid,
        latitude: formData.latitude, 
        longitude: formData.longitude, 
        mes_nascimento: mesNascimento, 
        responsavel: 'Formulario', 
        ...uploadedUrls 
      };

      console.log('Dados para inserção:', dataToSubmit);

      setSubmitProgress(80);
      setSubmitStatus('Enviando suas informações...');

      // Gera um ID numérico único de 6 dígitos
      let newId: number;
      let idExists = true;
      
      while (idExists) {
        newId = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
        const { data: existingId, error: idError } = await supabase
          .from('gbp_eleitores')
          .select('id')
          .eq('id', newId)
          .maybeSingle();
          
        if (idError) {
          console.error('Erro ao verificar ID:', idError);
          throw idError;
        }
        
        idExists = !!existingId;
      }

      const { data, error } = await supabase
        .from('gbp_eleitores')
        .insert([{ id: newId, ...dataToSubmit }])
        .select()
        .single();

      if (error) {
        console.error('Erro ao inserir dados:', error);
        throw error;
      }

      console.log('Dados inseridos com sucesso:', data);
      setSubmitProgress(100);
      setSubmitStatus('Tudo certo! Seu cadastro foi realizado com sucesso! ');
      setCompleted(true);
      
      // Aguarda um momento para mostrar o 100% antes de completar
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Se for o campo de nascimento, formata a data
    if (name === 'nascimento') {
      const formattedDate = formatBirthDate(value);
      // Salva no estado mantendo o formato DD-MM-AAAA para exibição
      setFormData(prev => ({
        ...prev,
        [name]: formattedDate
      }));
    }
    // Se for campo de nome, nome da mãe ou campos de endereço, formata com iniciais maiúsculas
    else if (['nome', 'nome_mae', 'logradouro', 'complemento', 'bairro', 'cidade'].includes(name)) {
      setFormData(prev => ({
        ...prev,
        [name]: formatProperName(value)
      }));
    }
    // Se for campo de telefone, aplica a máscara
    else if (name === 'whatsapp' || name === 'telefone') {
      setFormData(prev => ({
        ...prev,
        [name]: formatPhoneNumber(value)
      }));
    }
    // Formatação dos campos eleitorais
    else if (name === 'titulo') {
      setFormData(prev => ({
        ...prev,
        [name]: formatTituloEleitor(value)
      }));
    }
    else if (name === 'zona') {
      setFormData(prev => ({
        ...prev,
        [name]: formatZona(value)
      }));
    }
    else if (name === 'secao') {
      setFormData(prev => ({
        ...prev,
        [name]: formatSecao(value)
      }));
    }
    else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleArquivosChange = async (event: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).map(file => ({
        file,
        name: file.name,
      }));

      setUploadedFiles(prev => ({
        ...prev,
        [documentType]: [...(prev[documentType] || []), ...newFiles]
      }));
    }
  };

  const handleRemoveFile = (fieldId: string) => {
    setUploadedFiles(prev => ({
      ...prev,
      [fieldId]: []
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Função para buscar coordenadas geográficas
  const fetchGeocoding = async (address: string) => {
    try {
      const query = encodeURIComponent(address);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          latitude: data[0].lat,
          longitude: data[0].lon
        };
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar coordenadas:', error);
      return null;
    }
  };

  // Função para buscar CEP
  const fetchAddressByCep = async (cep: string) => {
    try {
      const cleanCep = cep.replace(/[^\d]/g, '');
      
      if (cleanCep.length !== 8) return;

      setLoadingCep(true);
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        // Monta o endereço completo para buscar as coordenadas
        const fullAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}, ${cleanCep}, Brasil`;
        console.log('Buscando coordenadas para:', fullAddress);
        
        const coordinates = await fetchGeocoding(fullAddress);
        console.log('Coordenadas encontradas:', coordinates);

        // Atualiza os campos de endereço incluindo as coordenadas
        setFormData(prev => ({
          ...prev,
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          uf: data.uf || '',
          latitude: coordinates?.latitude || '',
          longitude: coordinates?.longitude || ''
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setLoadingCep(false);
    }
  };

  // Handler para mudança no campo CEP
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { value } = e.target;
    
    // Remove caracteres não numéricos
    const numericValue = value.replace(/\D/g, '');
    
    // Formata o CEP (00000-000)
    let formattedValue = numericValue;
    if (numericValue.length > 5) {
      formattedValue = `${numericValue.slice(0, 5)}-${numericValue.slice(5, 8)}`;
    }
    
    // Atualiza o campo CEP
    setFormData(prev => ({ ...prev, cep: formattedValue }));

    // Se o CEP tem 8 dígitos, busca o endereço
    if (numericValue.length === 8) {
      fetchAddressByCep(numericValue);
    }
  };

  // Função auxiliar para verificar se um campo está visível
  const isFieldVisible = (fieldId: string) => {
    return parsedFields.some(field => field.id === fieldId && field.visivel);
  };

  // Função auxiliar para verificar se um campo é obrigatório
  const isFieldRequired = (fieldId: string) => {
    return parsedFields.some(field => field.id === fieldId && field.obrigatorio);
  };

  // Função auxiliar para verificar se os anexos estão ativos
  const areAttachmentsEnabled = () => {
    return parsedFields.some(field => field.id === 'anexos_ativos' && field.visivel);
  };

  // Função auxiliar para obter a lista de anexos configurados
  const getConfiguredAttachments = () => {
    return parsedFields.filter(field => 
      field.visivel && [
        'rg_cnh',
        'cpf_anexo',
        'certidao_nascimento',
        'titulo_eleitor',
        'comprovante_residencia',
        'foto_3x4'
      ].includes(field.id)
    );
  };

  const steps = [
    { label: 'Dados Pessoais', fields: ['nome', 'cpf', 'nascimento', 'nome_mae', 'genero'] },
    { label: 'Contato', fields: ['whatsapp', 'telefone'] },
    { label: 'Endereço', fields: ['cep', 'logradouro', 'cidade', 'bairro', 'numero', 'complemento'] },
    { label: 'Informações Eleitorais', fields: ['titulo', 'zona', 'secao'] },
    { label: 'Anexos', fields: ['rg_cnh', 'cpf_anexo', 'certidao_nascimento', 'titulo_eleitor', 'comprovante_residencia', 'foto_3x4'] }
  ];

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleSubmit();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const renderCategoryField = () => {
    console.log('Renderizando campo de categoria:', {
      categorias,
      selectedCategory,
      formConfig
    });

    return (
      <FormField sx={{ gridColumn: '1/-1' }}>
        <StyledTextField
          select
          fullWidth
          label="Categoria"
          value={selectedCategory || ''}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            handleFieldChange('categoria');
          }}
          required
          error={!!fieldErrors.categoria}
          helperText={fieldErrors.categoria}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <CategoryIcon />
              </InputAdornment>
            )
          }}
        >
          <MenuItem value="">Selecione...</MenuItem>
          {categorias.map(categoria => (
            <MenuItem key={categoria.uid} value={categoria.uid}>
              {categoria.nome}
            </MenuItem>
          ))}
        </StyledTextField>
      </FormField>
    );
  };

  const validateFields = () => {
    const errors: { [key: string]: string } = {};
    let hasErrors = false;

    // Verifica cada campo obrigatório
    parsedFields.forEach(field => {
      if (field.obrigatorio && (!formData[field.id] || formData[field.id].trim() === '')) {
        errors[field.id] = 'Obrigatório';
        hasErrors = true;
      }
    });

    // Verifica a categoria
    if (!selectedCategory) {
      errors['categoria'] = 'Obrigatório';
      hasErrors = true;
    }

    setFieldErrors(errors);

    // Se houver erros, rola até o primeiro campo com erro
    if (hasErrors) {
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (firstErrorField === 'categoria') {
        // Caso especial para a categoria que não tem atributo name
        const categoryElement = document.querySelector(`[aria-labelledby="select-categoria"]`);
        if (categoryElement) {
          categoryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }

    return !hasErrors;
  };

  const handleFieldChange = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const UploadBox = styled(Box)(({ theme }) => ({
    border: '2px dashed rgba(0, 0, 0, 0.12)',
    borderRadius: '12px',
    padding: theme.spacing(3),
    backgroundColor: '#f8f9fa',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    textAlign: 'center',
    '&:hover': {
      backgroundColor: '#f3f4f6',
      borderColor: theme.palette.primary.main
    },
    '& .MuiTypography-root': {
      color: theme.palette.text.secondary
    },
    '& .MuiSvgIcon-root': {
      fontSize: '2rem',
      color: theme.palette.primary.main,
      marginBottom: theme.spacing(1)
    }
  }));

  const FilePreview = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1.5),
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    marginTop: theme.spacing(1),
    '& .MuiTypography-root': {
      marginLeft: theme.spacing(1),
      flex: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    '& .MuiIconButton-root': {
      padding: theme.spacing(0.5),
      '&:hover': {
        backgroundColor: 'error.main',
        '& .MuiSvgIcon-root': {
          color: '#ffffff'
        }
      }
    }
  }));

  const ActionButton = styled(Button)(({ theme }) => ({
    borderRadius: '8px',
    padding: '10px 24px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    boxShadow: 'none',
    transition: 'all 0.2s ease',
    '&.MuiButton-contained': {
      background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
      '&:hover': {
        background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.25)'
      }
    },
    '&.MuiButton-outlined': {
      borderWidth: '1.5px',
      borderColor: '#1976d2',
      color: '#1976d2',
      '&:hover': {
        borderWidth: '1.5px',
        background: 'rgba(25, 118, 210, 0.04)',
        borderColor: '#1565c0',
        color: '#1565c0'
      }
    },
    '& .MuiButton-startIcon': {
      marginRight: theme.spacing(1)
    }
  }));

  const renderUploadField = (fieldId: string) => {
    const isOptional = !parsedFields.find(f => f.id === fieldId)?.obrigatorio;
    const hasFile = uploadedFiles[fieldId]?.length > 0;

    return (
      <Box>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            mb: 1,
            fontWeight: 500,
            color: theme => theme.palette.text.primary,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {getFieldLabel(fieldId)}
          {isFieldRequired(fieldId) && (
            <Typography 
              component="span" 
              sx={{ 
                color: 'error.main',
                ml: 0.5,
                fontSize: '1.2rem',
                lineHeight: 1
              }}
            >
              *
            </Typography>
          )}
        </Typography>

        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => handleArquivosChange(e, fieldId)}
          style={{ display: 'none' }}
          id={`file-input-${fieldId}`}
        />

        <label htmlFor={`file-input-${fieldId}`}>
          <UploadBox>
            <CloudUploadIcon />
            <Typography>
              {uploadedFiles[fieldId]?.length > 0 
                ? 'Clique para trocar o arquivo' 
                : 'Clique para anexar'}
            </Typography>
          </UploadBox>
        </label>

        {uploadedFiles[fieldId]?.map((file, index) => (
          <FilePreview key={index}>
            <InsertDriveFileIcon sx={{ color: 'primary.main' }} />
            <Typography>{file.file.name}</Typography>
            <IconButton 
              size="small"
              onClick={() => handleRemoveFile(fieldId)}
              sx={{ 
                color: 'error.main',
                '&:hover': {
                  backgroundColor: 'error.light'
                }
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </FilePreview>
        ))}
      </Box>
    );
  };

  const isFieldInvalid = (fieldId: string) => invalidFields.includes(fieldId);

  const errorFieldStyle = {
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: '#d32f2f',
        borderWidth: 2
      }
    },
    '& .MuiInputLabel-root': {
      color: '#d32f2f'
    },
    '& .MuiFormHelperText-root': {
      color: '#d32f2f'
    }
  };

  const formatBirthDate = (value: string) => {
    // Remove caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 8 dígitos
    const date = numbers.slice(0, 8);
    
    // Aplica a máscara DD-MM-AAAA
    if (date.length <= 2) return date;
    if (date.length <= 4) return `${date.slice(0, 2)}-${date.slice(2)}`;
    return `${date.slice(0, 2)}-${date.slice(2, 4)}-${date.slice(4)}`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBirthDate(e.target.value);
    // Salva no estado mantendo o formato DD-MM-AAAA para exibição
    setFormData(prev => ({ ...prev, [e.target.name]: formatted }));
    // Salva no localStorage para persistência
    const formDataStr = localStorage.getItem('formData');
    if (formDataStr) {
      const storedData = JSON.parse(formDataStr);
      localStorage.setItem('formData', JSON.stringify({
        ...storedData,
        [e.target.name]: formatted
      }));
    }
  };

  if (loading) {
    return (
      <FormContainer>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} />
          <Typography sx={{ mt: 2, color: '#4a5568' }}>
            Carregando formulário...
          </Typography>
        </Box>
      </FormContainer>
    );
  }

  if (error || !formConfig) {
    return (
      <FormContainer>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ mt: 2, color: '#4a5568' }}>
            {error}
          </Typography>
        </Box>
    </FormContainer>
    );
  }

  if (completed) {
    return (
      <FormContainer>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: '100vh',
          p: 3
        }}>
          <CheckCircleIcon sx={{ 
            fontSize: 64, 
            color: 'success.main',
            mb: 2 
          }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Cadastro Realizado!
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Obrigado por se cadastrar. Suas informações foram enviadas com sucesso.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => window.location.reload()}
            sx={{ mt: 3 }}
          >
            FAZER NOVO CADASTRO
          </Button>
        </Box>
      </FormContainer>
    );
  }

  // Função para formatar nome próprio (cada palavra com inicial maiúscula)
  const formatProperName = (name: string) => {
    return name
      .toLowerCase()
      .split(' ')
      .map(word => {
        // Ignora palavras vazias
        if (!word) return word;
        
        // Lista de preposições e artigos que devem permanecer em minúsculo
        const minusculas = ['de', 'da', 'do', 'das', 'dos', 'e'];
        
        // Se for uma preposição ou artigo, mantém em minúsculo
        if (minusculas.includes(word.toLowerCase())) {
          return word.toLowerCase();
        }
        
        // Caso contrário, capitaliza a primeira letra
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  };

  // Função para formatar a data no formato YYYY-MM-DD ou vazio
  const formatDate = (date: string): string => {
    if (!date) return '';
    // Remove caracteres não numéricos e hífens
    const cleanDate = date.replace(/[^\d-]/g, '');
    // Se estiver vazio ou não tiver o formato correto, retorna vazio
    if (!cleanDate || !/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      return '';
    }
    return cleanDate;
  };

  // Função auxiliar para formatar o gênero com inicial maiúscula
  const formatGender = (gender: string) => {
    if (!gender) return null;
    return gender; // Não precisa mais formatar pois já vem com a palavra completa
  };

  // Função para formatar número de telefone
  const formatPhoneNumber = (value: string) => {
    // Remove tudo que não for número
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limitedNumbers = numbers.slice(0, 11);
    
    // Aplica a máscara (00) 0 0000-0000
    if (limitedNumbers.length === 11) {
      return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 3)} ${limitedNumbers.slice(3, 7)}-${limitedNumbers.slice(7)}`;
    } else if (limitedNumbers.length > 2) {
      // Formatação parcial conforme o usuário digita
      let formatted = `(${limitedNumbers.slice(0, 2)})`;
      if (limitedNumbers.length > 2) formatted += ` ${limitedNumbers.slice(2, 3)}`;
      if (limitedNumbers.length > 3) formatted += ` ${limitedNumbers.slice(3, 7)}`;
      if (limitedNumbers.length > 7) formatted += `-${limitedNumbers.slice(7)}`;
      return formatted;
    }
    return limitedNumbers;
  };

  // Função para formatar título de eleitor (12 dígitos: 0000 0000 0000)
  const formatTituloEleitor = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const limitedNumbers = numbers.slice(0, 12);
    
    if (limitedNumbers.length >= 8) {
      return `${limitedNumbers.slice(0, 4)} ${limitedNumbers.slice(4, 8)} ${limitedNumbers.slice(8, 12)}`.trim();
    } else if (limitedNumbers.length >= 4) {
      return `${limitedNumbers.slice(0, 4)} ${limitedNumbers.slice(4)}`.trim();
    }
    return limitedNumbers;
  };

  // Função para formatar zona (3 dígitos)
  const formatZona = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.slice(0, 3);
  };

  // Função para formatar seção (4 dígitos)
  const formatSecao = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.slice(0, 4);
  };

  const handleClearForm = () => {
    // Reseta o formulário para o estado inicial
    setFormData({
      nome: '',
      cpf: '',
      nascimento: '',
      nome_mae: '',
      genero: '',
      whatsapp: '',
      telefone: '',
      titulo: '',
      zona: '',
      secao: '',
      cep: '',
      logradouro: '',
      numero: '', 
      complemento: '', 
      bairro: '',
      cidade: '',
      uf: '', 
      latitude: '', 
      longitude: '' 
    });

    // Limpa os arquivos
    setUploadedFiles({});
    
    // Limpa erros se houver
    setError(null);
  };

  const FormHeader = styled(Box)(({ theme }) => ({
    backgroundColor: formConfig?.form_theme?.backgroundColor || '#ffffff',
    margin: 0,
    width: '100%',
    padding: theme.spacing(4, 3, 3),
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    borderRadius: '8px 8px 0 0',
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(3, 2, 2),
      borderRadius: 0
    }
  }));

  const LogoContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: theme.spacing(3),
    padding: theme.spacing(0, 1, 1, 1),
    borderBottom: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down('sm')]: {
      marginBottom: theme.spacing(2),
      paddingBottom: theme.spacing(1.5)
    }
  }));

  return (
    <FormContainer maxWidth="md">
      <Backdrop open={isSubmitting}>
        <CircularProgress
          variant="determinate"
          value={submitProgress}
          size={60}
          thickness={4}
        />
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          {submitStatus}
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
          {submitProgress}% concluído
        </Typography>
      </Backdrop>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 0,
          display: 'flex',
          flexDirection: 'column',
mb: 3, // Adiciona margem inferior
          [theme.breakpoints.down('sm')]: {
            borderRadius: 0,
            boxShadow: 'none',
            minHeight: 'auto',
            height: 'auto',
            mb: 2 // Margem menor em telas pequenas
          }
        }}
      >
        <FormHeader>
          {formConfig?.form_logo_url && (
            <LogoContainer>
              <Box 
                component="img"
                src={formConfig.form_logo_url}
                alt="Logo"
                sx={{ 
                  height: { xs: 60, sm: 80 },
                  width: 'auto',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  margin: '0 auto',
                  display: 'block'
                }}
              />
            </LogoContainer>
          )}
          <Box sx={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <Typography 
              variant="h4"
              sx={{ 
                color: formConfig?.form_title_color || theme.palette.primary.main,
                fontWeight: 700,
                marginBottom: 1.5,
                lineHeight: 1.2,
                [theme.breakpoints.down('sm')]: {
                  fontSize: '1.5rem'
                }
              }}
            >
              {formConfig?.form_title || 'Formulário de Cadastro'}
            </Typography>
            {formConfig?.form_theme?.subtitle && (
              <Typography 
                variant="body1"
                sx={{ 
                  color: formConfig?.form_theme?.subtitleColor || theme.palette.text.secondary,
                  maxWidth: '80%',
                  margin: '0 auto',
                  lineHeight: 1.6,
                  [theme.breakpoints.down('sm')]: {
                    maxWidth: '100%',
                    fontSize: '0.9rem'
                  }
                }}
              >
                {formConfig.form_theme.subtitle}
              </Typography>
            )}
          </Box>
        </FormHeader>

        <Box 
          component="form" 
          onSubmit={handleSubmit}
          sx={{
            width: '100%',
            [theme.breakpoints.down('sm')]: {
              paddingBottom: theme.spacing(10),
              '& .MuiFormControl-root': {
                marginBottom: theme.spacing(2)
              }
            }
          }}
        >
          {/* Categoria */}
          <FormSection>
            <SectionTitle>
              <CategoryIcon />
              <Typography variant="h6">Categoria</Typography>
            </SectionTitle>

            <FieldGrid>
              <Box sx={{ gridColumn: '1/-1' }}>
                {renderCategoryField()}
              </Box>
            </FieldGrid>
          </FormSection>

          {/* Dados Pessoais */}
          {['nome', 'cpf', 'nascimento', 'nome_mae', 'genero'].some(field => isFieldVisible(field)) && (
            <FormSection>
              <SectionTitle>
                <PersonIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6">Dados Pessoais</Typography>
              </SectionTitle>
              
              <FieldGrid>
                {isFieldVisible('cpf') && (
                  <FormField sx={{ gridColumn: { xs: '1/-1', sm: 'span 4' } }}>
                    <StyledTextField
                      fullWidth
                      label="CPF"
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleCpfChange}
                      required={isFieldRequired('cpf')}
                      error={!!fieldErrors.cpf || isFieldInvalid('cpf')}
                      helperText={fieldErrors.cpf || (isFieldInvalid('cpf') ? 'Este campo é obrigatório' : '')}
                      placeholder="000.000.000-00"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BadgeIcon />
                          </InputAdornment>
                        )
                      }}
                    />
                  </FormField>
                )}

                {isFieldVisible('nome') && (
                  <FormField sx={{ gridColumn: { xs: '1/-1', sm: 'span 8' } }}>
                    <StyledTextField
                      fullWidth
                      label="Nome Completo"
                      name="nome"
                      value={formData.nome}
                      onChange={(e) => {
                        handleChange(e);
                        handleFieldChange('nome');
                      }}
                      required={isFieldRequired('nome')}
                      error={!!fieldErrors.nome || isFieldInvalid('nome')}
                      helperText={fieldErrors.nome || (isFieldInvalid('nome') ? 'Este campo é obrigatório' : '')}
                      placeholder="Digite seu nome completo"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonOutlineIcon />
                          </InputAdornment>
                        )
                      }}
                    />
                  </FormField>
                )}

                {isFieldVisible('nascimento') && (
                  <FormField sx={{ gridColumn: { xs: '1/-1', sm: 'span 4' } }}>
                    <StyledTextField
                      fullWidth
                      label="Data de Nascimento"
                      name="nascimento"
                      value={formData.nascimento}
                      onChange={handleDateChange}
                      required={isFieldRequired('nascimento')}
                      error={!!fieldErrors.nascimento || isFieldInvalid('nascimento')}
                      helperText={fieldErrors.nascimento || (isFieldInvalid('nascimento') ? 'Este campo é obrigatório' : '')}
                      placeholder="DD-MM-AAAA"
                      inputProps={{ maxLength: 10 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarTodayIcon />
                          </InputAdornment>
                        )
                      }}
                    />
                  </FormField>
                )}

                {isFieldVisible('nome_mae') && (
                  <FormField sx={{ gridColumn: { xs: '1/-1', sm: 'span 8' } }}>
                    <StyledTextField
                      fullWidth
                      label="Nome da Mãe"
                      name="nome_mae"
                      value={formData.nome_mae}
                      onChange={(e) => {
                        handleChange(e);
                        handleFieldChange('nome_mae');
                      }}
                      required={isFieldRequired('nome_mae')}
                      error={!!fieldErrors.nome_mae || isFieldInvalid('nome_mae')}
                      helperText={fieldErrors.nome_mae || (isFieldInvalid('nome_mae') ? 'Este campo é obrigatório' : '')}
                      placeholder="Digite o nome completo da mãe"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <FamilyRestroomIcon />
                          </InputAdornment>
                        )
                      }}
                    />
                  </FormField>
                )}

                {isFieldVisible('genero') && (
                  <FormField sx={{ gridColumn: { xs: '1/-1', sm: '1/-1' } }}>
                    <StyledTextField
                      select
                      fullWidth
                      label="Gênero"
                      name="genero"
                      value={formData.genero}
                      onChange={handleChange}
                      required={isFieldRequired('genero')}
                      error={!!fieldErrors.genero || isFieldInvalid('genero')}
                      helperText={fieldErrors.genero || (isFieldInvalid('genero') ? 'Este campo é obrigatório' : '')}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <WcIcon />
                          </InputAdornment>
                        )
                      }}
                    >
                      <MenuItem value="">Selecione</MenuItem>
                      <MenuItem value="Masculino">Masculino</MenuItem>
                      <MenuItem value="Feminino">Feminino</MenuItem>
                      <MenuItem value="Outro">Outro</MenuItem>
                    </StyledTextField>
                  </FormField>
                )}
              </FieldGrid>
            </FormSection>
          )}

          {/* Contato */}
          {['whatsapp', 'telefone'].some(field => isFieldVisible(field)) && (
            <FormSection>
              <SectionTitle>
                <ContactPhoneIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6">Contato</Typography>
              </SectionTitle>

              <FieldGrid>
                {/* WhatsApp */}
                {isFieldVisible('whatsapp') && (
                  <FormField sx={{ gridColumn: { xs: '1/-1', sm: 'span 6' } }}>
                    <StyledTextField
                      fullWidth
                      label="WhatsApp"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleChange}
                      required={isFieldRequired('whatsapp')}
                      error={!!fieldErrors.whatsapp || isFieldInvalid('whatsapp')}
                      helperText={fieldErrors.whatsapp || (isFieldInvalid('whatsapp') ? 'Este campo é obrigatório' : '')}
                      placeholder="(00) 00000-0000"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <WhatsAppIcon />
                          </InputAdornment>
                        )
                      }}
                    />
                  </FormField>
                )}

                {/* Telefone */}
                {isFieldVisible('telefone') && (
                  <FormField sx={{ gridColumn: { xs: '1/-1', sm: 'span 6' } }}>
                    <StyledTextField
                      fullWidth
                      label="Telefone"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handleChange}
                      required={isFieldRequired('telefone')}
                      error={!!fieldErrors.telefone || isFieldInvalid('telefone')}
                      helperText={fieldErrors.telefone || (isFieldInvalid('telefone') ? 'Este campo é obrigatório' : '')}
                      placeholder="(00) 00000-0000"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneIcon />
                          </InputAdornment>
                        )
                      }}
                    />
                  </FormField>
                )}
              </FieldGrid>
            </FormSection>
          )}

          {/* Endereço */}
          {['cep', 'logradouro', 'cidade', 'bairro', 'numero', 'complemento'].some(field => isFieldVisible(field)) && (
            <FormSection>
              <SectionTitle>
                <LocationOnIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6">Endereço</Typography>
              </SectionTitle>

              <FieldGrid>
                {/* CEP */}
                {isFieldVisible('cep') && (
                  <FormField sx={{ gridColumn: { xs: '1/-1', sm: 'span 4' } }}>
                    <Box>
                      <StyledTextField
                        fullWidth
                        label="CEP"
                        name="cep"
                        value={formData.cep}
                        onChange={handleCepChange}
                        required={isFieldRequired('cep')}
                        error={!!fieldErrors.cep || isFieldInvalid('cep')}
                        helperText={fieldErrors.cep || (isFieldInvalid('cep') ? 'Este campo é obrigatório' : '')}
                        placeholder="00000-000"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <MarkunreadMailboxIcon />
                            </InputAdornment>
                          )
                        }}
                      />
                      <Link
                        href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          display: 'block',
                          mt: 0.5,
                          fontSize: '0.875rem',
                          color: 'primary.main',
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        Não sei meu CEP
                      </Link>
                    </Box>
                  </FormField>
                )}

                {/* LOGRADOURO */}
                {isFieldVisible('logradouro') && (
                  <FormField sx={{ gridColumn: { xs: '1/-1', sm: 'span 8' } }}>
                    <StyledTextField
                      fullWidth
                      label="Logradouro"
                      name="logradouro"
                      value={formData.logradouro}
                      onChange={handleChange}
                      required={isFieldRequired('logradouro')}
                      error={!!fieldErrors.logradouro || isFieldInvalid('logradouro')}
                      helperText={fieldErrors.logradouro || (isFieldInvalid('logradouro') ? 'Este campo é obrigatório' : '')}
                      placeholder="Digite o nome da rua"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationOnIcon />
                          </InputAdornment>
                        )
                      }}
                    />
                  </FormField>
                )}

                {/* CIDADE */}
                {isFieldVisible('cidade') && (
                  <FormField sx={{ gridColumn: { xs: '1/-1', sm: 'span 6' } }}>
                    <StyledTextField
                      fullWidth
                      label="Cidade"
                      name="cidade"
                      value={formData.cidade}
                      onChange={handleChange}
                      required={isFieldRequired('cidade')}
                      error={!!fieldErrors.cidade || isFieldInvalid('cidade')}
                      helperText={fieldErrors.cidade || (isFieldInvalid('cidade') ? 'Este campo é obrigatório' : '')}
                      placeholder="Digite o nome da cidade"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationCityIcon />
                          </InputAdornment>
                        )
                      }}
                    />
                  </FormField>
                )}

                {/* BAIRRO */}
                {isFieldVisible('bairro') && (
                  <FormField sx={{ gridColumn: { xs: '1/-1', sm: 'span 6' } }}>
                    <StyledTextField
                      fullWidth
                      label="Bairro"
                      name="bairro"
                      value={formData.bairro}
                      onChange={handleChange}
                      required={isFieldRequired('bairro')}
                      error={!!fieldErrors.bairro || isFieldInvalid('bairro')}
                      helperText={fieldErrors.bairro || (isFieldInvalid('bairro') ? 'Este campo é obrigatório' : '')}
                      placeholder="Digite o nome do bairro"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationCityIcon />
                          </InputAdornment>
                        )
                      }}
                    />
                  </FormField>
                )}

                {/* NÚMERO */}
                {isFieldVisible('numero') && (
                  <FormField sx={{ gridColumn: { xs: '1/-1', sm: 'span 3' } }}>
                    <StyledTextField
                      fullWidth
                      label="Número"
                      name="numero"
                      value={formData.numero}
                      onChange={handleChange}
                      required={isFieldRequired('numero')}
                      error={!!fieldErrors.numero || isFieldInvalid('numero')}
                      helperText={fieldErrors.numero || (isFieldInvalid('numero') ? 'Este campo é obrigatório' : '')}
                      placeholder="Nº"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <NumbersIcon />
                          </InputAdornment>
                        )
                      }}
                    />
                  </FormField>
                )}

                {/* COMPLEMENTO */}
                {isFieldVisible('complemento') && (
                  <FormField sx={{ gridColumn: { xs: '1/-1', sm: 'span 9' } }}>
                    <StyledTextField
                      fullWidth
                      label="Complemento"
                      name="complemento"
                      value={formData.complemento}
                      onChange={handleChange}
                      required={isFieldRequired('complemento')}
                      error={!!fieldErrors.complemento || isFieldInvalid('complemento')}
                      helperText={fieldErrors.complemento || (isFieldInvalid('complemento') ? 'Este campo é obrigatório' : '')}
                      placeholder="Apartamento, bloco, etc."
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <ApartmentIcon />
                          </InputAdornment>
                        )
                      }}
                    />
                  </FormField>
                )}
              </FieldGrid>
            </FormSection>
          )}

          {/* Informações Eleitorais */}
          {['titulo', 'zona', 'secao'].some(field => isFieldVisible(field)) && (
            <FormSection>
              <SectionTitle>
                <HowToVoteIcon />
                <Typography variant="h6">Informações Eleitorais</Typography>
              </SectionTitle>
              
              <FieldGrid>
                {isFieldVisible('titulo') && (
                  <FormField sx={{ gridColumn: { xs: '1/-1', sm: 'span 4' } }}>
                    <StyledTextField
                      fullWidth
                      label="Título de Eleitor"
                      name="titulo"
                      value={formData.titulo}
                      onChange={handleChange}
                      required={isFieldRequired('titulo')}
                      error={!!fieldErrors.titulo || isFieldInvalid('titulo')}
                      helperText={fieldErrors.titulo || (isFieldInvalid('titulo') ? 'Este campo é obrigatório' : '')}
                      placeholder="0000 0000 0000"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <HowToVoteIcon />
                          </InputAdornment>
                        )
                      }}
                    />
                  </FormField>
                )}

                {isFieldVisible('zona') && (
                  <FormField sx={{ gridColumn: { xs: '1/-1', sm: 'span 4' } }}>
                    <StyledTextField
                      fullWidth
                      label="Zona"
                      name="zona"
                      value={formData.zona}
                      onChange={handleChange}
                      required={isFieldRequired('zona')}
                      error={!!fieldErrors.zona || isFieldInvalid('zona')}
                      helperText={fieldErrors.zona || (isFieldInvalid('zona') ? 'Este campo é obrigatório' : '')}
                      placeholder="000"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <GavelIcon />
                          </InputAdornment>
                        )
                      }}
                    />
                  </FormField>
                )}

                {isFieldVisible('secao') && (
                  <FormField sx={{ gridColumn: { xs: '1/-1', sm: 'span 4' } }}>
                    <StyledTextField
                      fullWidth
                      label="Seção"
                      name="secao"
                      value={formData.secao}
                      onChange={handleChange}
                      required={isFieldRequired('secao')}
                      error={!!fieldErrors.secao || isFieldInvalid('secao')}
                      helperText={fieldErrors.secao || (isFieldInvalid('secao') ? 'Este campo é obrigatório' : '')}
                      placeholder="0000"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BallotIcon />
                          </InputAdornment>
                        )
                      }}
                    />
                  </FormField>
                )}
              </FieldGrid>
            </FormSection>
          )}

          {/* Documentos */}
          {[
            'rg_cnh',
            'cpf_anexo',
            'certidao_nascimento',
            'titulo_eleitor',
            'comprovante_residencia',
            'foto_3x4'
          ].some(doc => isFieldVisible(doc)) && (
            <FormSection>
              <SectionTitle>
                <UploadFileIcon />
                <Typography>Documentos</Typography>
              </SectionTitle>
              <Grid container spacing={3}>
                {[
                  { id: 'rg_cnh', label: 'RG/CNH' },
                  { id: 'cpf_anexo', label: 'CPF Anexo' },
                  { id: 'certidao_nascimento', label: 'Certidão de Nascimento' },
                  { id: 'titulo_eleitor', label: 'Título de Eleitor' },
                  { id: 'comprovante_residencia', label: 'Comprovante de Residência' },
                  { id: 'foto_3x4', label: 'Foto 3x4' }
                ].map((doc) => (
                  isFieldVisible(doc.id) && (
                    <Grid item xs={12} sm={6} key={doc.id}>
                      {renderUploadField(doc.id)}
                    </Grid>
                  )
                ))}
              </Grid>
            </FormSection>
          )}

          {/* Botões de ação */}
          <FormSection sx={{ 
            textAlign: 'right', 
            borderBottom: 'none',
            padding: '12px',
            marginBottom: 0,
            [theme.breakpoints.down('sm')]: {
              borderRadius: 0,
              boxShadow: 'none',
              padding: '12px 16px',
              backgroundColor: 'transparent',
              '& .MuiPaper-root': {
                borderRadius: 0,
                boxShadow: 'none'
              }
            }
          }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: { xs: 1.5, sm: 2 },
                mt: 0,
                flexDirection: 'row'
              }}
            >
              <ActionButton
                variant="outlined"
                color="primary"
                startIcon={<ClearIcon />}
                onClick={handleClearForm}
                id=":r11:"
                sx={{
                  flex: { xs: 0.3, sm: 'initial' },
                  maxWidth: { xs: '35%', sm: '160px' },
                  py: { xs: 1.5, sm: 1 },
                  fontSize: { xs: '0.875rem', sm: 'inherit' }
                }}
              >
                LIMPAR
              </ActionButton>
              <ActionButton
                variant="contained"
                color="primary"
                startIcon={<SendIcon />}
                onClick={handleSubmit}
                id=":r13:"
                disabled={isSubmitting}
                sx={{
                  flex: { xs: 0.7, sm: 'initial' },
                  maxWidth: { xs: '62%', sm: '240px' },
                  py: { xs: 1.5, sm: 1 },
                  fontSize: { xs: '0.875rem', sm: 'inherit' }
                }}
              >
                {isSubmitting ? 'ENVIANDO...' : 'ENVIAR CADASTRO'}
              </ActionButton>
            </Box>
          </FormSection>
        </Box>
      </Paper>

      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            padding: '16px',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)'
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: theme.palette.primary.main, 
          color: 'white',
          textAlign: 'center',
          py: 2,
          mb: 2,
          borderRadius: '8px'
        }}>
          Atenção
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Typography variant="body1" sx={{ textAlign: 'center', mb: 2 }}>
            CPF já cadastrado para esta empresa.
          </Typography>
          <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary' }}>
            Por favor, informe ao administrador que você já possui um cadastro para que ele possa adicionar seu novo atendimento ao cadastro existente.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button 
            variant="contained" 
            onClick={() => setOpenModal(false)}
            sx={{ 
              minWidth: 120,
              borderRadius: '25px',
              textTransform: 'none',
              px: 4,
              py: 1,
              fontSize: '1rem',
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
              '&:hover': {
                boxShadow: '0 6px 16px rgba(25, 118, 210, 0.3)'
              }
            }}
          >
            Entendi
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isSubmitting}
        aria-labelledby="submit-dialog-title"
        maxWidth="sm"
        fullWidth
        PaperProps={{
          elevation: 24,
          sx: {
            borderRadius: '16px',
            padding: '24px',
            background: 'rgba(255,255,255,0.98)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 12px 24px rgba(0,0,0,0.15)'
          }
        }}
      >
        <DialogTitle 
          id="submit-dialog-title"
          sx={{
            textAlign: 'center',
            pb: 1,
            fontSize: '1.5rem',
            fontWeight: 600,
            color: theme => completed ? theme.palette.success.main : theme.palette.primary.main
          }}
        >
          {completed ? '✨ Cadastro Realizado!' : 'Processando seu Cadastro'}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 3
            }}
          >
            {!completed ? (
              <>
                <CircularProgress
                  variant="determinate"
                  value={submitProgress}
                  size={80}
                  thickness={4}
                  sx={{
                    mb: 3,
                    color: theme => theme.palette.primary.main,
                    '& .MuiCircularProgress-circle': {
                      strokeLinecap: 'round',
                      transition: 'all 0.3s ease'
                    }
                  }}
                />
                <Typography
                  variant="h6"
                  sx={{
                    textAlign: 'center',
                    color: 'primary.main',
                    fontWeight: 500,
                    mb: 1
                  }}
                >
                  {submitProgress}%
                </Typography>
              </>
            ) : (
              <CheckCircleIcon 
                color="success" 
                sx={{ 
                  fontSize: 80,
                  mb: 3,
                  animation: 'fadeIn 0.5s ease'
                }}
              />
            )}
            <Typography
              variant="body1"
              sx={{
                textAlign: 'center',
                color: theme => completed ? theme.palette.success.main : theme.palette.text.primary,
                fontWeight: 500,
                fontSize: '1.1rem',
                maxWidth: '80%',
                margin: '0 auto'
              }}
            >
              {submitStatus}
            </Typography>
          </Box>
        </DialogContent>
        {completed && (
          <DialogActions sx={{ justifyContent: 'center', pb: 2, pt: 1 }}>
            <Button
              onClick={() => {
                setCompleted(false);
                setIsSubmitting(false);
                handleClearForm();
              }}
              variant="contained"
              color="primary"
              startIcon={<ArrowBackIcon />}
              sx={{
                borderRadius: '25px',
                textTransform: 'none',
                px: 4,
                py: 1,
                fontSize: '1rem',
                fontWeight: 500,
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(25, 118, 210, 0.3)'
                }
              }}
            >
              Voltar ao Início
            </Button>
          </DialogActions>
        )}
      </Dialog>

      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            padding: '16px',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)'
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: theme.palette.primary.main, 
          color: 'white',
          textAlign: 'center',
          py: 2,
          mb: 2,
          borderRadius: '8px'
        }}>
          Atenção
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Typography variant="body1" sx={{ textAlign: 'center', mb: 2 }}>
            CPF já cadastrado para esta empresa.
          </Typography>
          <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary' }}>
            Por favor, informe ao administrador que você já possui um cadastro para que ele possa adicionar seu novo atendimento ao cadastro existente.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button 
            variant="contained" 
            onClick={() => setOpenModal(false)}
            sx={{ 
              minWidth: 120,
              borderRadius: '25px',
              textTransform: 'none',
              px: 4,
              py: 1,
              fontSize: '1rem',
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
              '&:hover': {
                boxShadow: '0 6px 16px rgba(25, 118, 210, 0.3)'
              }
            }}
          >
            Entendi
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isSubmitting}
        aria-labelledby="submit-dialog-title"
        maxWidth="sm"
        fullWidth
        PaperProps={{
          elevation: 24,
          sx: {
            borderRadius: '16px',
            padding: '24px',
            background: 'rgba(255,255,255,0.98)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 12px 24px rgba(0,0,0,0.15)'
          }
        }}
      >
        <DialogTitle 
          id="submit-dialog-title"
          sx={{
            textAlign: 'center',
            pb: 1,
            fontSize: '1.5rem',
            fontWeight: 600,
            color: theme => completed ? theme.palette.success.main : theme.palette.primary.main
          }}
        >
          {completed ? '✨ Cadastro Realizado!' : 'Processando seu Cadastro'}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 3
            }}
          >
            {!completed ? (
              <>
                <CircularProgress
                  variant="determinate"
                  value={submitProgress}
                  size={80}
                  thickness={4}
                  sx={{
                    mb: 3,
                    color: theme => theme.palette.primary.main,
                    '& .MuiCircularProgress-circle': {
                      strokeLinecap: 'round',
                      transition: 'all 0.3s ease'
                    }
                  }}
                />
                <Typography
                  variant="h6"
                  sx={{
                    textAlign: 'center',
                    color: 'primary.main',
                    fontWeight: 500,
                    mb: 1
                  }}
                >
                  {submitProgress}%
                </Typography>
              </>
            ) : (
              <CheckCircleIcon 
                color="success" 
                sx={{ 
                  fontSize: 80,
                  mb: 3,
                  animation: 'fadeIn 0.5s ease'
                }}
              />
            )}
            <Typography
              variant="body1"
              sx={{
                textAlign: 'center',
                color: theme => completed ? theme.palette.success.main : theme.palette.text.primary,
                fontWeight: 500,
                fontSize: '1.1rem',
                maxWidth: '80%',
                margin: '0 auto'
              }}
            >
              {submitStatus}
            </Typography>
          </Box>
        </DialogContent>
        {completed && (
          <DialogActions sx={{ justifyContent: 'center', pb: 2, pt: 1 }}>
            <Button
              onClick={() => {
                setCompleted(false);
                setIsSubmitting(false);
                handleClearForm();
              }}
              variant="contained"
              color="primary"
              startIcon={<ArrowBackIcon />}
              sx={{
                borderRadius: '25px',
                textTransform: 'none',
                px: 4,
                py: 1,
                fontSize: '1rem',
                fontWeight: 500,
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(25, 118, 210, 0.3)'
                }
              }}
            >
              Voltar ao Início
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </FormContainer>
  );
}

// Funções auxiliares
function getFieldLabel(fieldId: string): string {
  const labels: Record<string, string> = {
    nome: 'Nome Completo',
    cpf: 'CPF',
    nascimento: 'Data de Nascimento',
    nome_mae: 'Nome da Mãe',
    genero: 'Gênero',
    whatsapp: 'WhatsApp',
    telefone: 'Telefone',
    cep: 'CEP',
    logradouro: 'Logradouro',
    numero: 'Número',
    complemento: 'Complemento',
    bairro: 'Bairro',
    cidade: 'Cidade',
    titulo: 'Título de Eleitor',
    zona: 'Zona',
    secao: 'Seção',
  };
  return labels[fieldId] || fieldId;
}

function getFieldType(fieldId: string): string {
  const types: Record<string, string> = {
    nascimento: 'text',
    whatsapp: 'tel',
    telefone: 'tel',
    numero: 'number',
  };
  return types[fieldId] || 'text';
}
