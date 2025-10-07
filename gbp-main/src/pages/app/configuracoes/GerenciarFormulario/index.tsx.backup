import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  FormControlLabel,
  TextField,
  Typography,
  Switch,
  FormGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Tooltip,
  SelectChangeEvent,
  OutlinedInput,
  InputAdornment
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { QRCodeSVG } from 'qrcode.react';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Share from '@mui/icons-material/Share';
import QrCode2 from '@mui/icons-material/QrCode2';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import { supabaseClient } from '../../../../lib/supabase';
import { useCompanyStore } from '../../../../store/useCompanyStore';
import { categoryService } from '../../../../services/categories';
import { Category } from '../../../../types/category';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../../../../providers/AuthProvider';
import { hasRestrictedAccess } from '../../../../constants/accessLevels';
import { v4 as uuidv4 } from 'uuid';

interface Field {
  id: string;
  label: string;
  isAnexo?: boolean;
}

interface FormConfig {
  id: number | null;
  uid: string;
  categoria_uid: string;
  campos_config: string[];
  form_status: boolean;
  registration_limit: number;
  empresa_uid: string;
  url_slug: string | null;
  form_title: string;
  form_title_color: string;
  form_logo_url: string | null;
  form_theme: {
    primaryColor: string;
    backgroundColor: string;
    subtitle?: string;
    subtitleColor?: string;
  };
  empresa_nome: string | null;
  categoria_tipos: string;
  varias_categorias: string[];
}

interface Category {
  uid: string;
  nome: string;
  empresa_uid: string;
  created_at: string;
  tipo_uid: string;
  categoria_tipo?: {
    uid: string;
    nome: string;
  };
}

interface TipoCategoria {
  uid: string;
  nome: string;
  descricao?: string;
}

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  boxShadow: theme.shadows[2]
}));

const fields: Field[] = [
  { id: 'nome', label: 'Nome' },
  { id: 'cpf', label: 'CPF' },
  { id: 'nascimento', label: 'Data de Nascimento' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'telefone', label: 'Telefone' },
  { id: 'genero', label: 'Gênero' },
  { id: 'titulo', label: 'Título de Eleitor' },
  { id: 'zona', label: 'Zona' },
  { id: 'secao', label: 'Seção' },
  { id: 'cep', label: 'CEP' },
  { id: 'logradouro', label: 'Logradouro' },
  { id: 'cidade', label: 'Cidade' },
  { id: 'bairro', label: 'Bairro' },
  { id: 'numero', label: 'Número' },
  { id: 'complemento', label: 'Complemento' },
  { id: 'nome_mae', label: 'Nome da Mãe' }
];

const documentosDisponiveis = [
  { id: 'rg_cnh', label: 'RG/CNH' },
  { id: 'cpf_anexo', label: 'CPF' },
  { id: 'certidao_nascimento', label: 'Certidão de Nascimento' },
  { id: 'titulo_eleitor', label: 'Título de Eleitor' },
  { id: 'comprovante_residencia', label: 'Comprovante de Residência' },
  { id: 'foto_3x4', label: 'Foto 3x4' }
];

const predefinedColors = [
  { name: 'Branco', color: '#ffffff' },
  { name: 'Azul', color: '#1976d2' },
  { name: 'Verde', color: '#2e7d32' },
  { name: 'Vermelho', color: '#d32f2f' },
  { name: 'Roxo', color: '#7b1fa2' },
  { name: 'Laranja', color: '#ed6c02' },
  { name: 'Rosa', color: '#c2185b' },
  { name: 'Cinza', color: '#424242' },
  { name: 'Preto', color: '#000000' }
];

const predefinedBackgrounds = [
  // Cores Claras
  { name: 'Branco', color: '#ffffff' },
  { name: 'Azul Claro', color: '#e3f2fd' },
  { name: 'Verde Claro', color: '#e8f5e9' },
  { name: 'Rosa Claro', color: '#fce4ec' },
  { name: 'Cinza Claro', color: '#f5f5f5' },
  // Cores Escuras
  { name: 'Azul Escuro', color: '#1a237e' },
  { name: 'Verde Escuro', color: '#1b5e20' },
  { name: 'Vermelho Escuro', color: '#b71c1c' },
  { name: 'Roxo Escuro', color: '#4a148c' },
  { name: 'Cinza Escuro', color: '#212121' },
  { name: 'Azul Marinho', color: '#0d47a1' },
  { name: 'Verde Musgo', color: '#33691e' },
  { name: 'Preto', color: '#000000' }
];

export default function GerenciarFormulario() {
  const { id: formularioId } = useParams();
  const company = useCompanyStore((state) => state.company);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const canAccess = hasRestrictedAccess(user?.nivel_acesso);

  // Obtém a URL base do sistema
  const baseUrl = useMemo(() => {
    const url = new URL(window.location.href);
    return `${url.protocol}//${url.host}`;
  }, []);

  useEffect(() => {
    if (!canAccess) {
      navigate('/app');
      return;
    }
  }, [canAccess, navigate]);

  const [categorias, setCategorias] = useState<Category[]>([]);
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]);
  const [selectedTipoCategoria, setSelectedTipoCategoria] = useState<string>('');
  const [formConfigs, setFormConfigs] = useState<FormConfig[]>([]);
  const [pendingChanges, setPendingChanges] = useState<FormConfig | null>(null);
  const [formularioAtivo, setFormularioAtivo] = useState(false);
  const [limiteCadastros, setLimiteCadastros] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formUrl, setFormUrl] = useState<string>('');
  const [formSlug, setFormSlug] = useState<string>('');
  const [autoId, setAutoId] = useState<string>('');
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'error'>('success');
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);

  // Estados de personalização
  const [formTitle, setFormTitle] = useState<string>('Formulário de Cadastro');
  const [formTitleColor, setFormTitleColor] = useState<string>('#000000');
  const [formLogoUrl, setFormLogoUrl] = useState<string>('');
  const [themePrimaryColor, setThemePrimaryColor] = useState<string>('#1976d2');
  const [themeBackgroundColor, setThemeBackgroundColor] = useState<string>('#f5f5f5');
  const [themeSubtitle, setThemeSubtitle] = useState<string>('');
  const [themeSubtitleColor, setThemeSubtitleColor] = useState<string>('#666666');

  // Estados para gerenciar seleção e loading
  const [tiposCategorias, setTiposCategorias] = useState<TipoCategoria[]>([]);
  const [isLoadingCategorias, setIsLoadingCategorias] = useState(false);

  // Carregar tipos de categorias
  useEffect(() => {
    async function loadTiposCategorias() {
      if (!company?.uid) return;
      
      try {
        const { data, error } = await supabaseClient
          .from('gbp_categoria_tipos')
          .select('uid, nome')
          .eq('empresa_uid', company.uid)
          .order('nome');

        if (error) {
          console.error('Erro ao carregar tipos de categorias:', error);
          toast.error('Erro ao carregar tipos de categorias');
          return;
        }
        
        setTiposCategorias(data || []);
      } catch (error) {
        console.error('Erro ao carregar tipos de categorias:', error);
        toast.error('Erro ao carregar tipos de categorias');
      }
    }

    loadTiposCategorias();
  }, [company?.uid]);

  // Carregar categorias baseado no tipo selecionado
  useEffect(() => {
    async function loadCategorias() {
      if (!company?.uid || !selectedTipoCategoria) {
        setCategorias([]);
        return;
      }
      
      try {
        setIsLoadingCategorias(true);
        const { data, error } = await supabaseClient
          .from('gbp_categorias')
          .select(`
            uid,
            nome,
            empresa_uid,
            created_at,
            tipo_uid,
            categoria_tipo:gbp_categoria_tipos!inner(uid, nome)
          `)
          .eq('empresa_uid', company.uid)
          .eq('tipo_uid', selectedTipoCategoria)
          .order('nome');

        if (error) {
          console.error('Erro ao carregar categorias:', error);
          toast.error('Erro ao carregar categorias');
          return;
        }

        setCategorias(data || []);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        toast.error('Erro ao carregar categorias');
      } finally {
        setIsLoadingCategorias(false);
      }
    }

    loadCategorias();
  }, [company?.uid, selectedTipoCategoria]);

  // Efeito para carregar configurações quando a categoria é selecionada
  useEffect(() => {
    const loadFormConfig = async () => {
      try {
        if (!Boolean(selectedCategorias.length) || !company?.uid) return;

        const { data: existingConfig, error } = await supabaseClient
          .from('gbp_form_config')
          .select('*')
          .eq('empresa_uid', company.uid)
          .in('categoria_uid', selectedCategorias)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao carregar configuração:', error);
          return;
        }

        if (existingConfig) {
          setPendingChanges(existingConfig as FormConfig);
          setFormularioAtivo(existingConfig.form_status);
          setLimiteCadastros(existingConfig.registration_limit);
          setFormTitle(existingConfig.form_title || 'Formulário de Cadastro');
          setFormTitleColor(existingConfig.form_title_color || '#000000');
          setFormLogoUrl(existingConfig.form_logo_url || '');
          setThemePrimaryColor(existingConfig.form_theme?.primaryColor || '#1976d2');
          setThemeBackgroundColor(existingConfig.form_theme?.backgroundColor || '#f5f5f5');
          setThemeSubtitle(existingConfig.form_theme?.subtitle || '');
          setThemeSubtitleColor(existingConfig.form_theme?.subtitleColor || '#666666');
        }
      } catch (error) {
        console.error('Erro ao carregar configuração:', error);
      }
    };

    loadFormConfig();
  }, [selectedCategorias, company?.uid]);

  // Carregar dados iniciais quando o ID do formulário estiver disponível
  useEffect(() => {
    if (formularioId && company?.uid) {
      loadFormConfigs(formularioId);
    }
  }, [formularioId, company?.uid]);

  // Carregar configurações do formulário
  const loadFormConfigs = async (categoriaUid: string) => {
    setIsLoadingConfig(true);
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(categoriaUid);

      let { data: configs, error } = await supabaseClient
        .from('gbp_form_config')
        .select('*')
        .eq(isUUID ? 'categoria_uid' : 'url_slug', categoriaUid)
        .eq('empresa_uid', company?.uid)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!configs && isUUID) {
        // Gerar novo ID apenas quando não existe configuração
        const newId = await generateNewId();
        
        const defaultConfig: FormConfig = {
          id: newId,
          uid: uuidv4(),
          empresa_uid: company?.uid || '',
          categoria_uid: categoriaUid,
          campos_config: fields.map(field => 
            JSON.stringify({
              id: field.id,
              visivel: false,
              obrigatorio: false
            })
          ),
          form_status: false,
          registration_limit: 0,
          url_slug: `${newId}`,
          form_title: 'Formulário de Cadastro',
          form_title_color: '#000000',
          form_logo_url: null,
          form_theme: {
            primaryColor: '#1976d2',
            backgroundColor: '#f5f5f5',
            subtitle: '',
            subtitleColor: '#666666'
          },
          empresa_nome: company?.nome || '',
          categoria_tipos: '',
          varias_categorias: []
        };

        setPendingChanges(defaultConfig);
        setFormSlug('');
        setFormUrl(`${baseUrl}/cadastro/${newId}`);
      } else if (configs) {
        setPendingChanges(configs);
        // Extrair o slug personalizado do url_slug
        const customSlug = extractSlugFromUrlSlug(configs.url_slug, configs.id);
        setFormSlug(customSlug);
        setFormUrl(`${baseUrl}/cadastro/${configs.id}${customSlug ? `-${customSlug}` : ''}`);
      }

      setFormularioAtivo(configs?.form_status || false);
      setLimiteCadastros(configs?.registration_limit || 0);
      setFormTitle(configs?.form_title || 'Formulário de Cadastro');
      setFormTitleColor(configs?.form_title_color || '#000000');
      setFormLogoUrl(configs?.form_logo_url || '');
      setThemePrimaryColor(configs?.form_theme?.primaryColor || '#1976d2');
      setThemeBackgroundColor(configs?.form_theme?.backgroundColor || '#f5f5f5');
      setThemeSubtitle(configs?.form_theme?.subtitle || '');
      setThemeSubtitleColor(configs?.form_theme?.subtitleColor || '#666666');
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      showSnackbar('Erro ao carregar configurações', 'error');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Função auxiliar para extrair o slug do url_slug
  const extractSlugFromUrlSlug = (url_slug: string | null, id: number | null): string => {
    if (!url_slug || !id) return '';
    const idStr = id.toString();
    return url_slug.startsWith(idStr) ? url_slug.slice(idStr.length).replace(/^-/, '') : '';
  };

  // Handler para alternar o estado visível/obrigatório de um campo
  const handleFieldToggle = (fieldId: string, type: 'visivel' | 'obrigatorio') => (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!pendingChanges?.campos_config) return;
    
    const updatedCamposConfig = pendingChanges.campos_config.map(configStr => {
      try {
        const config = JSON.parse(configStr);
        if (config.id === fieldId) {
          return JSON.stringify({
            ...config,
            [type]: event.target.checked,
            // Se tornar visível false, obrigatório também deve ser false
            // Se tornar obrigatório true, visível também deve ser true
            ...(type === 'visivel' && !event.target.checked ? { obrigatorio: false } : {}),
            ...(type === 'obrigatorio' && event.target.checked ? { visivel: true } : {})
          });
        }
        return configStr;
      } catch {
        return configStr;
      }
    });

    setPendingChanges({
      ...pendingChanges,
      campos_config: updatedCamposConfig
    });
  };

  useEffect(() => {
    if (company?.uid && selectedCategorias.length > 0) {
      // Verificar permissões antes de tentar salvar
      const checkPermissions = async () => {
        try {
          const { data, error } = await supabaseClient
            .from('gbp_form_config')
            .select('id')
            .limit(1);

          if (error && error.code === '42501') {
            showSnackbar('Você não tem permissão para acessar os formulários. Por favor, verifique suas credenciais.', 'error');
          }
        } catch (error) {
          console.error('Erro ao verificar permissões:', error);
        }
      };

      checkPermissions();
    }
  }, [company?.uid, selectedCategorias]);

  const [formId, setFormId] = useState<number | null>(null);

  // Gera o ID apenas uma vez quando necessário
  useEffect(() => {
    const generateIdIfNeeded = async () => {
      if (!pendingChanges?.id && !formId && selectedCategorias.length > 0) {
        try {
          // Buscar o maior ID existente
          const { data: maxIdResult, error } = await supabaseClient
            .from('gbp_form_config')
            .select('id')
            .order('id', { ascending: false })
            .limit(1);

          if (error) throw error;

          // Gerar novo ID (entre 100000 e 999999)
          const startId = 100000;
          const maxId = maxIdResult?.[0]?.id || startId - 1;
          const newId = Math.max(maxId + 1, startId);

          // Verificar se o ID já existe
          const { data: existingId } = await supabaseClient
            .from('gbp_form_config')
            .select('id')
            .eq('id', newId)
            .maybeSingle();

          if (!existingId) {
            setFormId(newId);
            setFormUrl(`${baseUrl}/cadastro/${newId}${formSlug ? `-${formSlug}` : ''}`);
          }
        } catch (error) {
          console.error('Erro ao gerar ID:', error);
        }
      }
    };

    generateIdIfNeeded();
  }, [pendingChanges?.id, selectedCategorias, baseUrl]);

  // Atualiza a URL quando o slug muda
  useEffect(() => {
    const id = pendingChanges?.id || formId;
    if (id) {
      setFormUrl(`${baseUrl}/cadastro/${id}${formSlug ? `-${formSlug}` : ''}`);
    }
  }, [formSlug, pendingChanges?.id, formId, baseUrl]);

  const handleSave = async () => {
    if (!company?.uid || !Boolean(selectedCategorias.length) || !selectedTipoCategoria) {
      toast.error('Selecione uma categoria e tipo antes de salvar');
      return;
    }

    setIsSaving(true);

    try {
      const formTheme = {
        primaryColor: themePrimaryColor,
        backgroundColor: themeBackgroundColor,
        subtitle: themeSubtitle,
        subtitleColor: themeSubtitleColor
      };

      // Garantir que campos_config seja um array válido
      const camposConfig = pendingChanges?.campos_config || fields.map(field => JSON.stringify({
        id: field.id,
        visivel: false,
        obrigatorio: false
      }));

      // Usar o ID existente ou o ID gerado
      const newId = pendingChanges?.id || formId;
      if (!newId) {
        throw new Error('ID do formulário não foi gerado corretamente');
      }

      const formData: FormConfig = {
        id: newId,
        uid: pendingChanges?.uid || uuidv4(),
        categoria_uid: selectedCategorias[0],
        campos_config: camposConfig,
        form_status: formularioAtivo,
        registration_limit: limiteCadastros,
        empresa_uid: company.uid,
        url_slug: `${newId}${formSlug ? `-${formSlug}` : ''}`,
        form_title: formTitle || 'Formulário de Cadastro',
        form_title_color: formTitleColor || '#000000',
        form_logo_url: formLogoUrl || null,
        form_theme: formTheme,
        empresa_nome: company.nome || '',
        categoria_tipos: selectedTipoCategoria,
        varias_categorias: selectedCategorias
      };

      // Verifica se já existe uma configuração com o mesmo url_slug para esta empresa
      let { data: existingUrlSlug, error: urlSlugError } = await supabaseClient
        .from('gbp_form_config')
        .select('id')
        .eq('empresa_uid', company.uid)
        .eq('url_slug', formData.url_slug)
        .neq('id', formData.id)
        .maybeSingle();

      if (urlSlugError && urlSlugError.code !== 'PGRST116') throw urlSlugError;

      // Se já existe um url_slug igual para esta empresa, gera um novo
      if (existingUrlSlug) {
        formData.url_slug = `${formData.id}${formSlug ? `-${formSlug}-` : '-'}${Math.floor(Math.random() * 1000)}`;
      }

      // Tenta inserir o registro
      const { data: insertData, error: insertError } = await supabaseClient
        .from('gbp_form_config')
        .insert([formData])
        .select();

      if (insertError) {
        if (insertError.code === '23505') { // Violação de chave única
          // Tenta atualizar o registro existente
          const { data: updateData, error: updateError } = await supabaseClient
            .from('gbp_form_config')
            .update(formData)
            .eq('id', formData.id)
            .select();

          if (updateError) {
            if (updateError.code === '42501') {
              throw new Error('Você não tem permissão para atualizar este formulário');
            }
            throw updateError;
          }
          if (!updateData || updateData.length === 0) {
            throw new Error('Erro ao atualizar: nenhum dado retornado');
          }
          setPendingChanges(updateData[0]);
          setFormUrl(`${baseUrl}/cadastro/${updateData[0].id}${formSlug ? `-${formSlug}` : ''}`);
        } else if (insertError.code === '42501') {
          throw new Error('Você não tem permissão para criar um novo formulário');
        } else {
          throw insertError;
        }
      } else {
        if (!insertData || insertData.length === 0) {
          throw new Error('Erro ao inserir: nenhum dado retornado');
        }
        setPendingChanges(insertData[0]);
        setFormUrl(`${baseUrl}/cadastro/${insertData[0].id}${formSlug ? `-${formSlug}` : ''}`);
      }

      showSnackbar('Configurações salvas com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      showSnackbar(error instanceof Error ? error.message : 'Erro ao salvar configurações', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Carregar configurações quando a categoria é selecionada
  useEffect(() => {
    if (Boolean(selectedCategorias.length) && company?.uid) {
      loadFormConfigs(selectedCategorias[0]);
      // Limpar o formId quando carregar novas configurações
      setFormId(null);
    }
  }, [selectedCategorias, company?.uid]);

  // Handler para o toggle do formulário ativo
  const handleFormularioAtivoToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setFormularioAtivo(checked);
    if (pendingChanges) {
      setPendingChanges({
        ...pendingChanges,
        form_status: checked
      });
    }
  };

  // Handler para o limite de cadastros
  const handleLimiteCadastrosChange = (value: number) => {
    setLimiteCadastros(value);
    if (pendingChanges) {
      setPendingChanges({
        ...pendingChanges,
        registration_limit: value
      });
    }
  };

  useEffect(() => {
    // Gera um ID numérico aleatório
    const generateFriendlyId = () => {
      const randomNum = Math.floor(Math.random() * 90000) + 10000; // Gera número entre 10000 e 99999
      return `${randomNum}`;
    };
    setAutoId(generateFriendlyId());
  }, []);

  useEffect(() => {
    if (autoId && formSlug) {
      setFormUrl(`${baseUrl}/cadastro/${autoId}${formSlug ? `-${formSlug}` : ''}`);
    } else if (autoId) {
      setFormUrl(`${baseUrl}/cadastro/${autoId}`);
    }
  }, [autoId, formSlug, baseUrl]);

  useEffect(() => {
    if (selectedCategorias.length > 0 && pendingChanges?.id) {
      const baseUrl = window.location.origin;
      setFormUrl(`${baseUrl}/cadastro/${pendingChanges.url_slug}`);
    } else {
      setFormUrl('');
    }
  }, [selectedCategorias, pendingChanges?.id, pendingChanges?.url_slug]);

  const getFormUrl = () => {
    if (!Boolean(selectedCategorias.length) || !pendingChanges?.id) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/cadastro/${pendingChanges.url_slug}`;
  };

  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSeverity(type);
    setOpenSnackbar(true);
  };

  const handleCopyUrl = async () => {
    const url = getFormUrl();
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        setShowCopySuccess(true);
      } catch (err) {
        console.error('Erro ao copiar URL:', err);
      }
    }
  };

  const handleUrlSlugChange = (value: string) => {
    if (pendingChanges) {
      const newSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      setPendingChanges({
        ...pendingChanges,
        url_slug: pendingChanges.id ? `${pendingChanges.id}${newSlug}` : newSlug
      });
    }
  };

  // Handler para upload do logo
  const handleLogoUpload = async (file: File) => {
    if (!company?.uid) {
      toast.error('Empresa não identificada');
      return;
    }

    try {
      setIsLoadingConfig(true);

      // Primeiro, busca o storage da empresa
      const { data: empresaData, error: empresaError } = await supabaseClient
        .from('gbp_empresas')
        .select('storage')
        .eq('uid', company.uid)
        .single();

      if (empresaError) {
        console.error('Erro ao buscar storage da empresa:', empresaError);
        toast.error('Erro ao buscar informações da empresa');
        return;
      }

      if (!empresaData?.storage) {
        toast.error('Storage da empresa não configurado');
        return;
      }

      // Gera um nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${empresaData.storage}/form-logos/${fileName}`;

      // Faz o upload para o bucket específico da empresa
      const { error: uploadError } = await supabaseClient.storage
        .from(empresaData.storage)
        .upload(`form-logos/${fileName}`, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Erro ao fazer upload:', uploadError);
        toast.error('Erro ao fazer upload do logo');
        return;
      }

      // Gera a URL pública
      const { data: publicUrl } = supabaseClient.storage
        .from(empresaData.storage)
        .getPublicUrl(`form-logos/${fileName}`);

      if (!publicUrl?.publicUrl) {
        toast.error('Erro ao gerar URL pública do arquivo');
        return;
      }

      // Atualiza o form_logo_url
      setFormLogoUrl(publicUrl.publicUrl);
      toast.success('Logo atualizado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao processar upload:', error);
      toast.error('Erro ao processar upload do logo');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Carregar tipos de categorias
  useEffect(() => {
    async function loadTiposCategorias() {
      try {
        const { data, error } = await supabaseClient
          .from('gbp_categoria_tipos')
          .select('uid, nome, empresa_uid')
          .eq('empresa_uid', company?.uid)
          .order('nome');

        if (error) {
          console.error('Erro ao carregar tipos de categorias:', error);
          toast.error('Erro ao carregar tipos de categorias');
          return;
        }
        
        setTiposCategorias(data || []);
      } catch (error) {
        console.error('Erro ao carregar tipos de categorias:', error);
        toast.error('Erro ao carregar tipos de categorias');
      }
    }

    if (company?.uid) {
      loadTiposCategorias();
    }
  }, [company?.uid]);

  // Função para filtrar categorias por tipo
  const categoriasFiltradas = useMemo(() => {
    if (!selectedTipoCategoria) return categorias;
    return categorias.filter(cat => cat.tipo_uid === selectedTipoCategoria);
  }, [categorias, selectedTipoCategoria]);

  // Handler para mudança de categoria
  const handleCategoryChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const selectedValues = typeof value === 'string' ? value.split(',') : value;
    setSelectedCategorias(selectedValues);
    // Carregando configurações para a primeira categoria selecionada
    if (selectedValues.length > 0) {
      loadFormConfigs(selectedValues[0]);
    }
  };

  const handleDownloadQRCode = () => {
    const canvas = document.createElement("canvas");
    const svg = document.querySelector('.qr-code-svg');
    const svgData = new XMLSerializer().serializeToString(svg as Node);
    const img = new Image();
    img.onload = () => {
      // Definindo um tamanho maior para melhor qualidade
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Fundo branco
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Centralizar e escalar o QR Code
        const margin = 40;
        const size = canvas.width - (margin * 2);
        ctx.drawImage(img, margin, margin, size, size);
      }
      const pngFile = canvas.toDataURL("image/png", 1.0);
      const downloadLink = document.createElement("a");
      downloadLink.download = `qrcode-formulario-${formConfig?.url_slug || 'cadastro'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Formulário de Cadastro',
          text: 'Acesse nosso formulário de cadastro',
          url: formUrl
        });
      } catch (err) {
        console.error('Erro ao compartilhar:', err);
      }
    } else {
      handleCopyUrl();
    }
  };

  // Gera um novo ID apenas quando não existe configuração
  const generateNewId = async () => {
    try {
      // Buscar o maior ID existente
      const { data: maxIdResult, error } = await supabaseClient
        .from('gbp_form_config')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

      if (error) throw error;

      // Gerar novo ID (entre 100000 e 999999)
      const startId = 100000;
      const maxId = maxIdResult?.[0]?.id || startId - 1;
      return Math.max(maxId + 1, startId);
    } catch (error) {
      console.error('Erro ao gerar novo ID:', error);
      // Em caso de erro, gera um ID aleatório dentro do intervalo
      return Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CircularProgress size={40} color="primary" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 pb-12">
      {/* Header com gradiente */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800">
        <header className="px-4 py-6 pb-8 sm:py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 pb-4 sm:pb-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                Gerenciar Formulário de Cadastro
              </h1>
              <p className="mt-1 sm:mt-2 text-sm text-blue-100">
                Configure os campos e documentos necessários para o formulário de cadastro.
              </p>
            </div>
            {Boolean(selectedCategorias.length) && (
              <div className="flex items-center justify-between mb-4">
                <FormControlLabel
                  control={
                    <Switch
                      checked={formularioAtivo}
                      onChange={handleFormularioAtivoToggle}
                      color="primary"
                      size="medium"
                    />
                  }
                  label={
                    <Typography className="text-sm font-medium text-white">
                      {formularioAtivo ? "Formulário Ativo" : "Formulário Inativo"}
                    </Typography>
                  }
                />
              </div>
            )}
          </div>
        </header>
      </div>

      {/* Aviso Informativo */}
      <div className="px-4 -mt-6 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-white rounded-lg border border-blue-100 p-4 shadow-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900">
                Importante: Configurações por Categoria
              </h3>
              <div className="mt-1 text-sm text-gray-500">
                As configurações de campos e documentos são específicas para cada categoria. 
                Ao gerar URLs para diferentes categorias, você pode personalizar quais campos 
                e documentos serão exibidos em cada formulário. Isso permite criar formulários 
                customizados para cada tipo de cadastro.
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="space-y-6">
            {/* Select da Categoria */}
            <div className="bg-white rounded-lg border-0 p-6 shadow-lg ring-1 ring-black ring-opacity-5">
              <div className="flex flex-col space-y-4">
                <div className="text-center">
                  <h2 className="text-lg font-medium text-gray-900">Selecione as Categorias</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Escolha uma ou mais categorias para configurar seus campos e documentos
                  </p>
                </div>
                <Box sx={{ mb: 3 }}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="tipo-categoria-select-label">Filtrar por Tipo de Categoria</InputLabel>
                    <Select
                      labelId="tipo-categoria-select-label"
                      value={selectedTipoCategoria}
                      onChange={(e) => {
                        setSelectedTipoCategoria(e.target.value);
                        setSelectedCategorias([]); // Limpa as categorias selecionadas ao mudar o tipo
                      }}
                      label="Filtrar por Tipo de Categoria"
                    >
                      <MenuItem value="">Selecione um tipo</MenuItem>
                      {tiposCategorias.map((tipo) => (
                        <MenuItem key={tipo.uid} value={tipo.uid}>
                          {tipo.nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedTipoCategoria && (
                    <FormControl fullWidth>
                      <InputLabel id="categoria-select-label">Selecione as Categorias</InputLabel>
                      <Select
                        labelId="categoria-select-label"
                        multiple
                        value={selectedCategorias}
                        onChange={handleCategoryChange}
                        input={<OutlinedInput label="Selecione as Categorias" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => {
                              const categoria = categorias.find(cat => cat.uid === value);
                              return (
                                <Chip
                                  key={value}
                                  label={categoria?.nome}
                                  size="small"
                                  sx={{
                                    backgroundColor: '#e3f2fd',
                                    color: '#1976d2',
                                    '& .MuiChip-deleteIcon': {
                                      color: '#1976d2',
                                      '&:hover': {
                                        color: '#d32f2f'
                                      }
                                    }
                                  }}
                                  onDelete={() => {
                                    const newSelected = selectedCategorias.filter(id => id !== value);
                                    setSelectedCategorias(newSelected);
                                    if (newSelected.length > 0) {
                                      loadFormConfigs(newSelected[0]);
                                    }
                                  }}
                                />
                              );
                            })}
                          </Box>
                        )}
                      >
                        {isLoadingCategorias ? (
                          <MenuItem value="" disabled>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CircularProgress size={20} />
                              <Typography>Carregando categorias...</Typography>
                            </Box>
                          </MenuItem>
                        ) : (
                          categorias.map((categoria) => (
                            <MenuItem key={categoria.uid} value={categoria.uid}>
                              <Checkbox checked={selectedCategorias.indexOf(categoria.uid) > -1} />
                              <Box sx={{ display: 'flex', flexDirection: 'column', ml: 1 }}>
                                <Typography>{categoria.nome}</Typography>
                                <Typography variant="caption" color="textSecondary">
                                  Tipo: {categoria.categoria_tipo?.nome || 'Não definido'}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))
                        )}
                      </Select>
                      {!isLoadingCategorias && categorias.length === 0 && (
                        <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                          Nenhuma categoria encontrada para este tipo
                        </Typography>
                      )}
                    </FormControl>
                  )}
                </Box>
              </div>
            </div>

            {Boolean(selectedCategorias.length) && pendingChanges && (
              <>
                {/* URL do Formulário */}
                <StyledCard>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      URL do Formulário
                    </Typography>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: 2,
                      alignItems: { xs: 'center', sm: 'flex-start' }
                    }}>
                      <Box sx={{ 
                        width: { xs: '100%', sm: 'auto' },
                        maxWidth: { xs: '192px', sm: 'none' },
                        alignSelf: { xs: 'center', sm: 'flex-start' }
                      }}>
                        <div id="form-qrcode" className="w-48 h-48 bg-white p-2 border border-gray-200 rounded-lg flex items-center justify-center">
                          <QRCodeSVG 
                            value={formUrl} 
                            size={256}
                            level="H"
                            className="qr-code-svg"
                          />
                        </div>
                      </Box>
                      <Box sx={{ 
                        flex: 1,
                        width: { xs: '100%', sm: 'auto' }
                      }}>
                        <TextField
                          fullWidth
                          label="Personalizar URL"
                          value={formSlug}
                          onChange={(e) => {
                            const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                            setFormSlug(value);
                          }}
                          placeholder="Digite um identificador personalizado para a URL"
                          helperText="Use apenas letras minúsculas, números e hífens"
                          sx={{ mb: 2 }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start" sx={{ userSelect: 'none', color: 'text.secondary', pointerEvents: 'none' }}>
                                {pendingChanges?.id || formId || ''}
                              </InputAdornment>
                            ),
                            readOnly: !pendingChanges?.id && !formId,
                          }}
                        />
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          URL do formulário:
                        </Typography>
                        <Typography variant="body1" sx={{ 
                          wordBreak: 'break-all',
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}>
                          {formUrl}
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Button
                            startIcon={<ContentCopy />}
                            onClick={() => {
                              navigator.clipboard.writeText(formUrl);
                              setShowCopySuccess(true);
                              setTimeout(() => setShowCopySuccess(false), 2000);
                            }}
                            size="small"
                          >
                            COPIAR URL
                          </Button>
                          <Button
                            startIcon={<QrCode2 />}
                            onClick={handleDownloadQRCode}
                            size="small"
                            sx={{ ml: 1 }}
                          >
                            BAIXAR QRCODE
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </StyledCard>

                {/* Limite de Cadastros */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-6">
                      Limite de Cadastros
                    </h2>
                    
                    <div className="flex flex-col gap-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Limite de cadastros:</div>
                        <TextField
                          type="number"
                          value={limiteCadastros}
                          onChange={(e) => handleLimiteCadastrosChange(Number(e.target.value))}
                          variant="outlined"
                          size="small"
                          inputProps={{ min: 0 }}
                          sx={{ width: 120 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Campos do Formulário */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          Campos do Formulário
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Configure a visibilidade e obrigatoriedade dos campos
                        </p>
                      </div>
                    </div>

                    {/* Lista de campos */}
                    <div className="space-y-4">
                      {fields.map((field) => {
                        const fieldConfigStr = pendingChanges?.campos_config?.find(config => {
                          try {
                            const parsed = JSON.parse(config);
                            return parsed.id === field.id;
                          } catch {
                            return false;
                          }
                        });

                        let fieldConfig;
                        try {
                          fieldConfig = fieldConfigStr ? JSON.parse(fieldConfigStr) : {
                            id: field.id,
                            visivel: true,
                            obrigatorio: false
                          };
                        } catch {
                          fieldConfig = {
                            id: field.id,
                            visivel: true,
                            obrigatorio: false
                          };
                        }

                        return (
                          <div key={field.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex items-center space-x-4">
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    size="small"
                                    checked={fieldConfig.visivel}
                                    onChange={handleFieldToggle(field.id, 'visivel')}
                                  />
                                }
                                label={
                                  <span className="text-sm font-medium text-gray-900">
                                    {field.label}
                                  </span>
                                }
                              />
                            </div>
                            <div className="flex items-center">
                              <span className="text-sm text-gray-600 mr-2">Obrigatório</span>
                              <FormControlLabel
                                control={
                                  <Switch
                                    size="small"
                                    checked={fieldConfig.obrigatorio}
                                    disabled={!fieldConfig.visivel}
                                    onChange={handleFieldToggle(field.id, 'obrigatorio')}
                                  />
                                }
                                label=""
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Anexos do Formulário */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm mt-6">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          Anexos do Formulário
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Configure quais anexos serão solicitados
                        </p>
                      </div>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={pendingChanges?.campos_config?.some(configStr => {
                              try {
                                const config = JSON.parse(configStr);
                                return config.id === 'anexos_ativos' && config.visivel;
                              } catch {
                                return false;
                              }
                            }) ?? false}
                            onChange={(e) => {
                              if (!pendingChanges?.campos_config) return;
                              
                              // Encontra o índice do config de anexos_ativos
                              const anexosIndex = pendingChanges.campos_config.findIndex(configStr => {
                                try {
                                  const config = JSON.parse(configStr);
                                  return config.id === 'anexos_ativos';
                                } catch {
                                  return false;
                                }
                              });

                              let updatedCamposConfig = [...pendingChanges.campos_config];
                              
                              if (anexosIndex >= 0) {
                                // Atualiza o existente
                                updatedCamposConfig[anexosIndex] = JSON.stringify({
                                  id: 'anexos_ativos',
                                  visivel: e.target.checked
                                });
                              } else {
                                // Adiciona novo
                                updatedCamposConfig.push(JSON.stringify({
                                  id: 'anexos_ativos',
                                  visivel: e.target.checked
                                }));
                              }

                              // Se estiver desativando, desativa todos os anexos
                              if (!e.target.checked) {
                                updatedCamposConfig = updatedCamposConfig.map(configStr => {
                                  try {
                                    const config = JSON.parse(configStr);
                                    if (documentosDisponiveis.some(doc => doc.id === config.id)) {
                                      return JSON.stringify({ ...config, visivel: false });
                                    }
                                    return configStr;
                                  } catch {
                                    return configStr;
                                  }
                                });
                              }

                              setPendingChanges({
                                ...pendingChanges,
                                campos_config: updatedCamposConfig
                              });
                            }}
                          />
                        }
                        label={
                          <span className="text-sm font-medium text-gray-900">
                            Ativar Anexos
                          </span>
                        }
                      />
                    </div>

                    {pendingChanges?.campos_config?.some(configStr => {
                      try {
                        const config = JSON.parse(configStr);
                        return config.id === 'anexos_ativos' && config.visivel;
                      } catch {
                        return false;
                      }
                    }) && (
                      <div className="space-y-4">
                        {documentosDisponiveis.map((doc) => {
                          const docConfigStr = pendingChanges?.campos_config?.find(configStr => {
                            try {
                              const config = JSON.parse(configStr);
                              return config.id === doc.id;
                            } catch {
                              return false;
                            }
                          });

                          let docConfig;
                          try {
                            docConfig = docConfigStr ? JSON.parse(docConfigStr) : {
                              id: doc.id,
                              visivel: false
                            };
                          } catch {
                            docConfig = {
                              id: doc.id,
                              visivel: false
                            };
                          }

                          return (
                            <div key={doc.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <div className="flex items-center space-x-4">
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      size="small"
                                      checked={docConfig.visivel}
                                      onChange={(e) => {
                                        if (!pendingChanges?.campos_config) return;
                                        
                                        const docIndex = pendingChanges.campos_config.findIndex(configStr => {
                                          try {
                                            const config = JSON.parse(configStr);
                                            return config.id === doc.id;
                                          } catch {
                                            return false;
                                          }
                                        });

                                        const updatedCamposConfig = [...pendingChanges.campos_config];
                                        
                                        if (docIndex >= 0) {
                                          // Atualiza o existente
                                          updatedCamposConfig[docIndex] = JSON.stringify({
                                            id: doc.id,
                                            visivel: e.target.checked,
                                            obrigatorio: e.target.checked ? docConfig.obrigatorio : false
                                          });
                                        } else {
                                          // Adiciona novo
                                          updatedCamposConfig.push(JSON.stringify({
                                            id: doc.id,
                                            visivel: e.target.checked,
                                            obrigatorio: false
                                          }));
                                        }

                                        setPendingChanges({
                                          ...pendingChanges,
                                          campos_config: updatedCamposConfig
                                        });
                                      }}
                                    />
                                  }
                                  label={
                                    <span className="text-sm font-medium text-gray-900">
                                      {doc.label}
                                    </span>
                                  }
                                />
                              </div>
                              <div className="flex items-center">
                                <span className="text-sm text-gray-600 mr-2">Obrigatório</span>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      size="small"
                                      checked={docConfig.obrigatorio ?? false}
                                      disabled={!docConfig.visivel}
                                      onChange={(e) => {
                                        if (!pendingChanges?.campos_config) return;
                                        
                                        const docIndex = pendingChanges.campos_config.findIndex(configStr => {
                                          try {
                                            const config = JSON.parse(configStr);
                                            return config.id === doc.id;
                                          } catch {
                                            return false;
                                          }
                                        });

                                        const updatedCamposConfig = [...pendingChanges.campos_config];
                                        
                                        if (docIndex >= 0) {
                                          // Atualiza o existente
                                          updatedCamposConfig[docIndex] = JSON.stringify({
                                            id: doc.id,
                                            visivel: true,
                                            obrigatorio: e.target.checked
                                          });
                                        } else {
                                          // Adiciona novo
                                          updatedCamposConfig.push(JSON.stringify({
                                            id: doc.id,
                                            visivel: true,
                                            obrigatorio: e.target.checked
                                          }));
                                        }

                                        setPendingChanges({
                                          ...pendingChanges,
                                          campos_config: updatedCamposConfig
                                        });
                                      }}
                                    />
                                  }
                                  label=""
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Seção de Personalização do Formulário */}
                <div className="bg-white rounded-lg border-0 p-6 shadow-lg ring-1 ring-black ring-opacity-5 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">
                      Personalização do Título
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {/* Logo do Formulário */}
                    <div>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 2,
                        width: '100%'
                      }}>
                        <TextField
                          fullWidth
                          label="URL do Logo (opcional)"
                          value={formLogoUrl || ''}
                          disabled
                          InputProps={{
                            readOnly: true,
                            style: { backgroundColor: '#f5f5f5' }
                          }}
                          sx={{ flex: 1 }}
                        />
                        <Button
                          variant="contained"
                          component="label"
                          sx={{ 
                            minWidth: { xs: '100%', sm: 'auto' },
                            whiteSpace: 'nowrap'
                          }}
                        >
                          UPLOAD LOGO
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleLogoUpload(file);
                              }
                            }}
                            className="hidden"
                            id="logo-upload"
                          />
                        </Button>
                      </Box>
                      {formLogoUrl && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-gray-600">Preview da Logo:</p>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => setFormLogoUrl('')}
                            >
                              Remover
                            </Button>
                          </div>
                          <div className="flex items-center justify-center bg-gray-50 p-2 rounded border">
                            <img
                              src={formLogoUrl}
                              alt="Logo Preview"
                              className="max-h-16 object-contain"
                              onError={(e) => {
                                e.currentTarget.src = '';
                                toast.error('Erro ao carregar a imagem. Verifique a URL.');
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Título e Cor */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div className="md:col-span-2">
                        <TextField
                          fullWidth
                          label="Título do Formulário"
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          variant="outlined"
                          size="small"
                          placeholder="Ex: Formulário de Cadastro"
                        />
                      </div>
                      <div>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Cor do Título
                        </Typography>
                        <div className="flex flex-wrap gap-0.5 mb-2">
                          {predefinedColors.map((colorOption) => (
                            <Tooltip title={colorOption.name} key={colorOption.color} arrow>
                              <div
                                onClick={() => setFormTitleColor(colorOption.color)}
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  backgroundColor: colorOption.color,
                                  border: formTitleColor === colorOption.color ? '2px solid #000' : '1px solid #ddd',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  transition: 'transform 0.2s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                className="hover:scale-110"
                              />
                            </Tooltip>
                          ))}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="color"
                            value={formTitleColor}
                            onChange={(e) => setFormTitleColor(e.target.value)}
                            className="h-6 w-12 rounded border border-gray-300"
                          />
                          <span className="text-sm text-gray-500">{formTitleColor}</span>
                        </div>
                      </div>
                    </div>

                    {/* Subtítulo e Cor */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div className="md:col-span-2">
                        <TextField
                          fullWidth
                          label="Subtítulo do Formulário"
                          value={themeSubtitle}
                          onChange={(e) => setThemeSubtitle(e.target.value)}
                          variant="outlined"
                          size="small"
                          placeholder="Ex: Preencha os campos abaixo"
                        />
                      </div>
                      <div>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Cor do Subtítulo
                        </Typography>
                        <div className="flex flex-wrap gap-0.5 mb-2">
                          {predefinedColors.map((colorOption) => (
                            <Tooltip title={colorOption.name} key={colorOption.color} arrow>
                              <div
                                onClick={() => setThemeSubtitleColor(colorOption.color)}
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  backgroundColor: colorOption.color,
                                  border: themeSubtitleColor === colorOption.color ? '2px solid #000' : '1px solid #ddd',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  transition: 'transform 0.2s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                className="hover:scale-110"
                              />
                            </Tooltip>
                          ))}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="color"
                            value={themeSubtitleColor}
                            onChange={(e) => setThemeSubtitleColor(e.target.value)}
                            className="h-6 w-12 rounded border border-gray-300"
                          />
                          <span className="text-sm text-gray-500">{themeSubtitleColor}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cor de Fundo */}
                    <div>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Cor de Fundo
                      </Typography>
                      <div className="flex flex-wrap gap-0.5 mb-2">
                        {predefinedBackgrounds.map((colorOption) => (
                          <Tooltip title={colorOption.name} key={colorOption.color} arrow>
                            <div
                              onClick={() => setThemeBackgroundColor(colorOption.color)}
                              style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: colorOption.color,
                                border: themeBackgroundColor === colorOption.color ? '2px solid #000' : '1px solid #ddd',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              className="hover:scale-110"
                            />
                          </Tooltip>
                        ))}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="color"
                          value={themeBackgroundColor}
                          onChange={(e) => setThemeBackgroundColor(e.target.value)}
                          className="h-6 w-12 rounded border border-gray-300"
                        />
                        <span className="text-sm text-gray-500">{themeBackgroundColor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Preview do Formulário */}
                  <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: themeBackgroundColor }}>
                    <div className="max-w-2xl mx-auto text-center">
                      {formLogoUrl && (
                        <div className="mb-4">
                          <img
                            src={formLogoUrl}
                            alt="Logo"
                            className="h-16 mx-auto object-contain"
                            onError={(e) => {
                              e.currentTarget.src = '';
                            }}
                          />
                        </div>
                      )}
                      <h1 className="text-2xl font-bold mb-2" style={{ color: formTitleColor }}>
                        {formTitle}
                      </h1>
                      <p style={{ color: themeSubtitleColor }}>
                        {themeSubtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botões de ação */}
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 2,
                  mt: 3
                }}>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={isSaving}
                    startIcon={isSaving ? <CircularProgress size={20} /> : null}
                  >
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </Box>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Modal do QR Code */}
      <Dialog 
        open={qrDialogOpen} 
        onClose={() => setQrDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          QR Code do Formulário
        </DialogTitle>
        <DialogContent>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            p: 2 
          }}>
            <QRCodeSVG 
              value={formUrl}
              size={256}
              level="H"
              includeMargin
            />
            <Typography variant="caption" color="textSecondary" align="center">
              Escaneie este QR Code para acessar o formulário
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar de feedback */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setOpenSnackbar(false)} 
          severity={severity}
          elevation={6}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={showCopySuccess}
        autoHideDuration={3000}
        onClose={() => setShowCopySuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowCopySuccess(false)} severity="success">
          URL copiada com sucesso!
        </Alert>
      </Snackbar>

      {/* Adiciona o container do Toast */}
      <ToastContainer />
    </div>
  );
}
