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
import IconButton from '@mui/material/IconButton';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
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
  const [logoSize, setLogoSize] = useState<number>(250); // Tamanho em pixels - logo bem grande
  const [logoPosition] = useState<'absolute'>('absolute'); // Posição da logo sempre livre
  const [logoX, setLogoX] = useState<number>(85); // Posição X em % - direita
  const [logoY, setLogoY] = useState<number>(50); // Posição Y em % - centro vertical
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center'); // Alinhamento do texto
  const [textX, setTextX] = useState<number>(45); // Posição X do texto em % - mais ao centro
  const [textY, setTextY] = useState<number>(50); // Posição Y do texto em % - centro vertical
  const [textPositionMode] = useState<'absolute'>('absolute'); // Modo de posição do texto sempre livre
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [textSize, setTextSize] = useState<number>(48); // Tamanho do texto em pixels - título bem grande
  const [textFontFamily, setTextFontFamily] = useState<string>('Verdana, sans-serif'); // Fonte arredondada moderna
  const [textAlignMode, setTextAlignMode] = useState<'left' | 'center' | 'right'>('center'); // Alinhamento do texto
  const [previewMode] = useState<'desktop'>('desktop'); // Modo de preview sempre desktop
  const containerHeight = 200; // Altura fixa padrão para cabeçalho
  const [themePrimaryColor, setThemePrimaryColor] = useState<string>('#1976d2');
  const [themeBackgroundColor, setThemeBackgroundColor] = useState<string>('#f5f5f5');
  const [themeSubtitle, setThemeSubtitle] = useState<string>('Registre suas informações');
  const [themeSubtitleColor, setThemeSubtitleColor] = useState<string>('#666666');

  // Estados para gerenciar seleção e loading
  const [tiposCategorias, setTiposCategorias] = useState<TipoCategoria[]>([]);
  const [isLoadingCategorias, setIsLoadingCategorias] = useState(false);
  
  // Estados para visualização de todos os formulários
  const [allFormConfigs, setAllFormConfigs] = useState<FormConfig[]>([]);
  const [isLoadingAllForms, setIsLoadingAllForms] = useState(false);
  const [showFormList, setShowFormList] = useState(true);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentPageForms, setCurrentPageForms] = useState(1);
  const formsPerPage = 9;

  // Carregar todos os formulários criados
  useEffect(() => {
    async function loadAllFormConfigs() {
      if (!company?.uid) return;
      
      try {
        setIsLoadingAllForms(true);
        const { data, error } = await supabaseClient
          .from('gbp_form_config')
          .select(`
            *,
            categoria:gbp_categorias!gbp_form_config_categoria_uid_fkey(
              uid,
              nome
            ),
            tipo:gbp_categoria_tipos!gbp_form_config_categoria_tipos_fkey(
              uid,
              nome
            )
          `)
          .eq('empresa_uid', company.uid)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Erro ao carregar formulários:', error);
          toast.error('Erro ao carregar formulários');
          return;
        }
        
        // Buscar todas as categorias únicas de todos os formulários
        const todasCategoriasUids = new Set<string>();
        (data || []).forEach(config => {
          if (config.varias_categorias && config.varias_categorias.length > 0) {
            config.varias_categorias.forEach((uid: string) => todasCategoriasUids.add(uid));
          }
        });

        // Buscar nomes de todas as categorias de uma vez
        const { data: todasCategorias } = await supabaseClient
          .from('gbp_categorias')
          .select('uid, nome')
          .in('uid', Array.from(todasCategoriasUids));

        // Buscar contagem de cadastros de todas as categorias de uma vez
        const { data: contagemCadastros } = await supabaseClient
          .from('gbp_eleitores')
          .select('categoria_uid')
          .in('categoria_uid', Array.from(todasCategoriasUids));

        // Criar mapa de contagem por categoria
        const contagemPorCategoria = new Map<string, number>();
        (contagemCadastros || []).forEach((item: any) => {
          const count = contagemPorCategoria.get(item.categoria_uid) || 0;
          contagemPorCategoria.set(item.categoria_uid, count + 1);
        });

        // Criar mapa de categorias por UID
        const categoriasMap = new Map(
          (todasCategorias || []).map((cat: any) => [
            cat.uid,
            {
              ...cat,
              total_cadastros: contagemPorCategoria.get(cat.uid) || 0
            }
          ])
        );

        // Mapear configurações com suas categorias
        const configsWithCategoryNames = (data || []).map(config => {
          if (config.varias_categorias && config.varias_categorias.length > 0) {
            const categorias_nomes = config.varias_categorias
              .map((uid: string) => categoriasMap.get(uid))
              .filter(Boolean);
            
            return {
              ...config,
              categorias_nomes
            };
          }
          return config;
        });
        
        setAllFormConfigs(configsWithCategoryNames);
      } catch (error) {
        console.error('Erro ao carregar formulários:', error);
        toast.error('Erro ao carregar formulários');
      } finally {
        setIsLoadingAllForms(false);
      }
    }

    loadAllFormConfigs();
  }, [company?.uid]);

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
          setLogoSize(existingConfig.form_theme?.logoSize || 250);
          setLogoX(existingConfig.form_theme?.logoX || 85);
          setLogoY(existingConfig.form_theme?.logoY || 50);
          setTextSize(existingConfig.form_theme?.textSize || 48);
          setTextX(existingConfig.form_theme?.textX || 45);
          setTextY(existingConfig.form_theme?.textY || 50);
          setTextFontFamily(existingConfig.form_theme?.textFontFamily || 'Verdana, sans-serif');
          setTextAlignMode(existingConfig.form_theme?.textAlignMode || 'center');
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
      setLogoSize(configs?.form_theme?.logoSize || 250);
      setLogoX(configs?.form_theme?.logoX || 85);
      setLogoY(configs?.form_theme?.logoY || 50);
      setTextSize(configs?.form_theme?.textSize || 48);
      setTextX(configs?.form_theme?.textX || 45);
      setTextY(configs?.form_theme?.textY || 50);
      setTextFontFamily(configs?.form_theme?.textFontFamily || 'Verdana, sans-serif');
      setTextAlignMode(configs?.form_theme?.textAlignMode || 'center');
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
        subtitleColor: themeSubtitleColor,
        logoSize: logoSize,
        logoX: logoX,
        logoY: logoY,
        textSize: textSize,
        textX: textX,
        textY: textY,
        textFontFamily: textFontFamily,
        textAlignMode: textAlignMode
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
              <div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.history.back()}
                    className="text-white hover:text-blue-100 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                    Formulário de Cadastro
                  </h1>
                </div>
                <p className="mt-1 sm:mt-2 text-sm text-blue-100 ml-9">
                  {showFormList ? 'Visualize e gerencie seus formulários' : 'Configure os campos e documentos necessários'}
                </p>
              </div>
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
            {/* Lista de Formulários Criados */}
            {showFormList && (
              <div className="bg-white rounded-2xl border-0 p-8 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-gray-900">Formulários Criados</h2>
                      <Box
                        sx={{
                          px: 2,
                          py: 0.75,
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                        }}
                      >
                        {allFormConfigs.length}
                      </Box>
                    </div>
                    <p className="text-sm text-gray-600">
                      Clique em um formulário para editar suas configurações
                    </p>
                  </div>
                  <Button
                    variant="contained"
                    onClick={() => setShowFormList(false)}
                    startIcon={<CategoryOutlined />}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      px: 3,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.4)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                        boxShadow: '0 6px 20px 0 rgba(102, 126, 234, 0.6)'
                      }
                    }}
                  >
                    Novo Formulário
                  </Button>
                </div>

                {isLoadingAllForms ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : allFormConfigs.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <CategoryOutlined sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      Nenhum formulário criado ainda
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                      Crie seu primeiro formulário clicando no botão acima
                    </Typography>
                  </Box>
                ) : (
                  <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allFormConfigs
                      .slice((currentPageForms - 1) * formsPerPage, currentPageForms * formsPerPage)
                      .map((config: any) => (
                      <Card
                        key={config.uid}
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: 'grey.200',
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: config.form_status 
                              ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                              : 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)',
                          },
                          '&:hover': {
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            transform: 'translateY(-4px)',
                            borderColor: 'primary.main'
                          }
                        }}
                        onClick={() => {
                          setEditingFormId(config.uid);
                          // Carrega todas as categorias do varias_categorias ou a categoria principal
                          const categoriasParaSelecionar = config.varias_categorias && config.varias_categorias.length > 0
                            ? config.varias_categorias
                            : [config.categoria_uid];
                          setSelectedCategorias(categoriasParaSelecionar);
                          setSelectedTipoCategoria(config.categoria_tipos);
                          setShowFormList(false);
                        }}
                      >
                        <CardContent sx={{ p: 3, position: 'relative' }}>
                          {/* Botão Deletar */}
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingFormId(config.uid);
                              setShowDeleteDialog(true);
                            }}
                            sx={{
                              position: 'absolute',
                              top: 16,
                              right: 16,
                              width: 36,
                              height: 36,
                              bgcolor: 'rgba(255, 255, 255, 0.9)',
                              border: '1.5px solid',
                              borderColor: 'grey.200',
                              color: 'grey.500',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                bgcolor: '#fee2e2',
                                borderColor: '#ef4444',
                                color: '#dc2626',
                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
                                transform: 'scale(1.05)'
                              }
                            }}
                          >
                            <DeleteOutline fontSize="small" sx={{ fontSize: 20 }} />
                          </IconButton>

                          {/* Header do Card */}
                          <Box sx={{ mb: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                              <Box
                                sx={{
                                  width: 56,
                                  height: 56,
                                  borderRadius: 2.5,
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)',
                                  position: 'relative',
                                  '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    inset: 0,
                                    borderRadius: 2.5,
                                    padding: 2,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                    WebkitMaskComposite: 'xor',
                                    maskComposite: 'exclude',
                                    opacity: 0.3
                                  }
                                }}
                              >
                                <CategoryOutlined sx={{ color: 'white', fontSize: 28 }} />
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography 
                                  variant="h5" 
                                  component="div" 
                                  sx={{ 
                                    fontWeight: 800,
                                    fontSize: '1.25rem',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    letterSpacing: '-0.02em',
                                    lineHeight: 1.3,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    wordBreak: 'break-word'
                                  }}
                                >
                                  {config.form_title || 'Formulário de Cadastro'}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                          
                          {/* Tipo e Categorias - Hierarquia */}
                          <Box sx={{ mb: 2.5 }}>
                            {/* Tipo (Chefe) */}
                            {config.tipo?.nome && (
                              <Box sx={{ 
                                mb: 2.5,
                                pb: 2.5,
                                borderBottom: '1px solid',
                                borderColor: 'grey.100'
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                  <Typography variant="caption" sx={{ 
                                    color: 'grey.600', 
                                    fontWeight: 700, 
                                    textTransform: 'uppercase', 
                                    fontSize: '0.7rem',
                                    letterSpacing: '0.5px'
                                  }}>
                                    🎯 Tipo de Formulário
                                  </Typography>
                                </Box>
                                <Chip
                                  label={config.tipo.nome}
                                  size="medium"
                                  sx={{
                                    background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '0.8125rem',
                                    height: 34,
                                    px: 2,
                                    boxShadow: '0 3px 10px rgba(240, 148, 51, 0.35)',
                                    '&:hover': {
                                      boxShadow: '0 4px 14px rgba(240, 148, 51, 0.45)'
                                    }
                                  }}
                                />
                              </Box>
                            )}
                            
                            {/* Categorias (Subordinadas) */}
                            {(config.categorias_nomes && config.categorias_nomes.length > 0) || config.categoria?.nome ? (
                              <Box sx={{ minHeight: 75 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                  <Typography variant="caption" sx={{ 
                                    color: 'grey.600', 
                                    fontWeight: 700, 
                                    textTransform: 'uppercase', 
                                    fontSize: '0.7rem',
                                    letterSpacing: '0.5px'
                                  }}>
                                    📁 Categorias Vinculadas
                                  </Typography>
                                  {config.categorias_nomes && config.categorias_nomes.length > 0 && (
                                    <Box sx={{
                                      px: 1.5,
                                      py: 0.5,
                                      borderRadius: 2,
                                      bgcolor: 'grey.100',
                                      border: '1px solid',
                                      borderColor: 'grey.200'
                                    }}>
                                      <Typography variant="caption" sx={{ 
                                        color: 'grey.700', 
                                        fontSize: '0.7rem',
                                        fontWeight: 700
                                      }}>
                                        {config.categorias_nomes.length}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                                <Box sx={{ 
                                  display: 'flex', 
                                  flexWrap: 'wrap', 
                                  gap: 1,
                                  maxHeight: 60,
                                  overflow: 'hidden',
                                  position: 'relative'
                                }}>
                                  {config.categorias_nomes && config.categorias_nomes.length > 0 ? (
                                    config.categorias_nomes.slice(0, 6).map((cat: any) => (
                                      <Tooltip title={`${cat.total_cadastros ?? 0} cadastro(s)`} arrow>
                                        <Chip
                                          key={cat.uid}
                                          label={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <span>{cat.nome}</span>
                                              <Box
                                                component="span"
                                                sx={{
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  minWidth: 22,
                                                  height: 20,
                                                  px: 0.75,
                                                  borderRadius: 1.5,
                                                  background: '#667eea',
                                                  color: 'white',
                                                  fontSize: '0.7rem',
                                                  fontWeight: 700,
                                                  lineHeight: 1
                                                }}
                                              >
                                                {cat.total_cadastros ?? 0}
                                              </Box>
                                            </Box>
                                          }
                                        size="small"
                                        sx={{
                                          background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                                          color: '#667eea',
                                          fontWeight: 600,
                                          border: '1px solid #667eea30',
                                          '&:hover': {
                                            background: 'linear-gradient(135deg, #667eea25 0%, #764ba225 100%)',
                                          }
                                        }}
                                        />
                                      </Tooltip>
                                    ))
                                  ) : (
                                    <Chip
                                      label={config.categoria?.nome || 'Sem categoria'}
                                      size="small"
                                      sx={{
                                        background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                                        color: '#667eea',
                                        fontWeight: 600,
                                        border: '1px solid #667eea30'
                                      }}
                                    />
                                  )}
                                  {config.categorias_nomes && config.categorias_nomes.length > 6 && (
                                    <Chip
                                      label={`+${config.categorias_nomes.length - 6}`}
                                      size="small"
                                      sx={{
                                        background: 'grey.200',
                                        color: 'grey.700',
                                        fontWeight: 700,
                                        fontSize: '0.7rem'
                                      }}
                                    />
                                  )}
                                </Box>
                              </Box>
                            ) : null}
                          </Box>

                          {/* Status com Toggle */}
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            p: 2.5,
                            borderRadius: 2.5,
                            bgcolor: 'grey.50',
                            border: '1px solid',
                            borderColor: 'grey.100',
                            mt: 3
                          }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'grey.700' }}>
                              Status do Formulário
                            </Typography>
                            <Switch
                              checked={config.form_status}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              onChange={async (e) => {
                                e.stopPropagation();
                                const newStatus = e.target.checked;
                                try {
                                  const { error } = await supabaseClient
                                    .from('gbp_form_config')
                                    .update({ form_status: newStatus })
                                    .eq('uid', config.uid);
                                  
                                  if (error) throw error;
                                  
                                  // Atualiza o estado local
                                  setAllFormConfigs(prev => 
                                    prev.map(f => 
                                      f.uid === config.uid 
                                        ? { ...f, form_status: newStatus }
                                        : f
                                    )
                                  );
                                  
                                  toast.success(`Formulário ${newStatus ? 'ativado' : 'desativado'} com sucesso!`);
                                } catch (error) {
                                  console.error('Erro ao atualizar status:', error);
                                  toast.error('Erro ao atualizar status do formulário');
                                }
                              }}
                              sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                  color: '#10b981',
                                },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                  backgroundColor: '#10b981',
                                }
                              }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {/* Paginação */}
                  {allFormConfigs.length > formsPerPage && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 6 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setCurrentPageForms(prev => Math.max(1, prev - 1))}
                        disabled={currentPageForms === 1}
                        sx={{
                          minWidth: 40,
                          borderColor: 'grey.300',
                          color: 'grey.700',
                          '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'primary.50'
                          },
                          '&.Mui-disabled': {
                            borderColor: 'grey.200',
                            color: 'grey.400'
                          }
                        }}
                      >
                        ←
                      </Button>
                      
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {Array.from({ length: Math.ceil(allFormConfigs.length / formsPerPage) }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentPageForms === page ? 'contained' : 'outlined'}
                            size="small"
                            onClick={() => setCurrentPageForms(page)}
                            sx={{
                              minWidth: 40,
                              ...(currentPageForms === page ? {
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                '&:hover': {
                                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'
                                }
                              } : {
                                borderColor: 'grey.300',
                                color: 'grey.700',
                                '&:hover': {
                                  borderColor: 'primary.main',
                                  bgcolor: 'primary.50'
                                }
                              })
                            }}
                          >
                            {page}
                          </Button>
                        ))}
                      </Box>
                      
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setCurrentPageForms(prev => Math.min(Math.ceil(allFormConfigs.length / formsPerPage), prev + 1))}
                        disabled={currentPageForms === Math.ceil(allFormConfigs.length / formsPerPage)}
                        sx={{
                          minWidth: 40,
                          borderColor: 'grey.300',
                          color: 'grey.700',
                          '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'primary.50'
                          },
                          '&.Mui-disabled': {
                            borderColor: 'grey.200',
                            color: 'grey.400'
                          }
                        }}
                      >
                        →
                      </Button>
                      
                      <Typography variant="body2" sx={{ color: 'grey.600', ml: 2 }}>
                        Página {currentPageForms} de {Math.ceil(allFormConfigs.length / formsPerPage)}
                      </Typography>
                    </Box>
                  )}
                  </>
                )}
              </div>
            )}

            {/* Select da Categoria */}
            {!showFormList && (
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
            )}

            {!showFormList && Boolean(selectedCategorias.length) && pendingChanges && (
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

                  {/* Controles de Logo */}
                  {formLogoUrl && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                        🖼️ Ajustar Logo
                      </Typography>
                      
                      {/* Tamanho da Logo e Texto */}
                      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'grey.700' }}>
                            Tamanho da Logo: {logoSize}px
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="caption" sx={{ minWidth: 30 }}>32px</Typography>
                            <input
                              type="range"
                              min="32"
                              max="400"
                              value={logoSize}
                              onChange={(e) => setLogoSize(Number(e.target.value))}
                              className="flex-1"
                              style={{ accentColor: '#667eea' }}
                            />
                            <Typography variant="caption" sx={{ minWidth: 40 }}>400px</Typography>
                          </Box>
                        </div>
                        <div>
                          <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'grey.700' }}>
                            Tamanho do Texto: {textSize}px
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="caption" sx={{ minWidth: 30 }}>12px</Typography>
                            <input
                              type="range"
                              min="12"
                              max="72"
                              value={textSize}
                              onChange={(e) => setTextSize(Number(e.target.value))}
                              className="flex-1"
                              style={{ accentColor: '#10b981' }}
                            />
                            <Typography variant="caption" sx={{ minWidth: 40 }}>72px</Typography>
                          </Box>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Preview do Formulário */}
                  <div className="mt-6 p-4 rounded-lg border-2 border-dashed border-gray-300" style={{ backgroundColor: themeBackgroundColor }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2, position: 'relative', zIndex: 100 }}>
                      <Typography variant="caption" sx={{ color: 'grey.600', fontWeight: 600 }}>
                        👆 Arraste para mover | 📱 Preview simula smartphone real
                      </Typography>
                    </Box>
                    {/* Preview Mobile com Margens - INTERATIVO */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                      <Box sx={{ 
                        width: '400px', 
                        border: '8px solid #333',
                        borderRadius: '30px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        <Box 
                          sx={{ 
                            height: '220px',
                            backgroundColor: themeBackgroundColor,
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: isDraggingLogo || isDraggingText ? 'grabbing' : 'default'
                          }}
                          onMouseMove={(e) => {
                            if (isDraggingLogo || isDraggingText) {
                              const container = e.currentTarget.getBoundingClientRect();
                              const x = ((e.clientX - container.left) / container.width) * 100;
                              const y = ((e.clientY - container.top) / container.height) * 100;
                              if (isDraggingLogo) {
                                setLogoX(x);
                                setLogoY(y);
                              }
                              if (isDraggingText) {
                                setTextX(x);
                                setTextY(y);
                              }
                            }
                          }}
                          onMouseUp={() => {
                            setIsDraggingLogo(false);
                            setIsDraggingText(false);
                          }}
                          onMouseLeave={() => {
                            setIsDraggingLogo(false);
                            setIsDraggingText(false);
                          }}
                        >
                          {/* Guias de alinhamento */}
                          <Box sx={{ position: 'absolute', left: '25%', top: 0, bottom: 0, width: '1px', bgcolor: 'rgba(0,255,0,0.2)', zIndex: 1 }} />
                          <Box sx={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', bgcolor: 'rgba(255,0,0,0.4)', zIndex: 1 }} />
                          <Box sx={{ position: 'absolute', left: '75%', top: 0, bottom: 0, width: '1px', bgcolor: 'rgba(0,255,0,0.2)', zIndex: 1 }} />
                          <Box sx={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '2px', bgcolor: 'rgba(255,0,0,0.4)', zIndex: 1 }} />
                          
                          {/* Logo Preview Mobile - ARRASTÁVEL */}
                          {formLogoUrl && (
                            <Box
                              component="img"
                              src={formLogoUrl}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setIsDraggingLogo(true);
                              }}
                              sx={{
                                cursor: 'move',
                                position: 'absolute',
                                left: `${logoX}%`,
                                top: `${logoY}%`,
                                transform: 'translate(-50%, -50%)',
                                width: 'auto',
                                height: `${logoSize * 0.5}px`,
                                maxWidth: '50%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                zIndex: 10
                              }}
                            />
                          )}
                          {/* Texto Preview Mobile - ARRASTÁVEL */}
                          <Box
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setIsDraggingText(true);
                            }}
                            sx={{
                              cursor: 'move',
                              position: 'absolute',
                              left: `${textX}%`,
                              top: `${textY}%`,
                              transform: 'translate(-50%, -50%)',
                              zIndex: 5,
                              textAlign: textAlignMode,
                              maxWidth: '55%',
                              maxWidth: '55%'
                            }}
                          >
                            <Typography
                              sx={{
                                color: formTitleColor,
                                fontWeight: 700,
                                fontSize: `${textSize * 0.5}px`,
                                fontFamily: textFontFamily,
                                lineHeight: 1.2,
                                whiteSpace: 'normal'
                              }}
                            >
                              {formTitle || 'Formulário de Cadastro'}
                            </Typography>
                            {themeSubtitle && (
                              <Typography
                                sx={{
                                  color: themeSubtitleColor,
                                  fontSize: `${textSize * 0.3}px`,
                                  fontFamily: textFontFamily,
                                  lineHeight: 1.6,
                                  mt: 0.5
                                }}
                              >
                                {themeSubtitle}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', py: 1, bgcolor: '#f5f5f5', color: 'grey.700' }}>
                          📱 Preview Mobile (400px)
                        </Typography>
                      </Box>
                    </Box>
                    {/* Controles de Texto */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          const alignments: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];
                          const currentIndex = alignments.indexOf(textAlignMode);
                          const nextIndex = (currentIndex + 1) % alignments.length;
                          setTextAlignMode(alignments[nextIndex]);
                        }}
                        sx={{ minWidth: '140px' }}
                      >
                        Alinhamento: {textAlignMode === 'left' ? '← Esquerda' : textAlignMode === 'center' ? '↕️ Centro' : '→ Direita'}
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          const fonts = [
                            'Arial, sans-serif',
                            'Georgia, serif',
                            'Times New Roman, serif',
                            'Courier New, monospace',
                            'Verdana, sans-serif',
                            'Impact, fantasy',
                            'Comic Sans MS, cursive'
                          ];
                          const currentIndex = fonts.indexOf(textFontFamily);
                          const nextIndex = (currentIndex + 1) % fonts.length;
                          setTextFontFamily(fonts[nextIndex]);
                        }}
                        sx={{ minWidth: '140px' }}
                      >
                        Fonte: {textFontFamily.split(',')[0]}
                      </Button>
                    </Box>
                    <div 
                      className="mx-auto" 
                      id="preview-container"
                      style={{
                        position: 'relative',
                        height: `${containerHeight}px`,
                        maxWidth: '800px',
                        width: '100%',
                        display: 'none',
                        overflow: 'visible',
                        border: previewMode === 'mobile' ? '8px solid #333' : 'none',
                        borderRadius: previewMode === 'mobile' ? '30px' : '0',
                        boxShadow: previewMode === 'mobile' ? '0 10px 40px rgba(0,0,0,0.3)' : 'none',
                        transition: 'all 0.3s ease',
                        margin: '0 auto'
                      }}
                      onMouseMove={(e) => {
                        if (isDraggingLogo) {
                          const container = e.currentTarget.getBoundingClientRect();
                          const x = ((e.clientX - container.left) / container.width) * 100;
                          const y = ((e.clientY - container.top) / container.height) * 100;
                          setLogoX(x);
                          setLogoY(y);
                        }
                        if (isDraggingText) {
                          const container = e.currentTarget.getBoundingClientRect();
                          const x = ((e.clientX - container.left) / container.width) * 100;
                          const y = ((e.clientY - container.top) / container.height) * 100;
                          setTextX(x);
                          setTextY(y);
                        }
                      }}
                      onMouseUp={() => {
                        setIsDraggingLogo(false);
                        setIsDraggingText(false);
                      }}
                      onMouseLeave={() => {
                        setIsDraggingLogo(false);
                        setIsDraggingText(false);
                      }}
                    >
                      {formLogoUrl && (
                        <div 
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setIsDraggingLogo(true);
                          }}
                          onWheel={(e) => {
                            e.preventDefault();
                            const delta = e.deltaY > 0 ? -5 : 5;
                            setLogoSize(prev => Math.max(32, Math.min(400, prev + delta)));
                          }}
                          style={{
                            position: 'absolute',
                            left: `calc(${logoX}% - ${logoSize / 2}px)`,
                            top: `calc(${logoY}% - ${logoSize / 2}px)`,
                            zIndex: 10,
                            cursor: 'move',
                            border: isDraggingLogo ? '2px dashed #667eea' : '2px dashed transparent',
                            padding: '4px',
                            borderRadius: '8px',
                            backgroundColor: isDraggingLogo ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                            transition: isDraggingLogo ? 'none' : 'all 0.1s ease',
                            width: `${logoSize}px`,
                            height: `${logoSize}px`
                          }}>
                          <img
                            src={formLogoUrl}
                            alt="Logo"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              display: 'block'
                            }}
                            onError={(e) => {
                              e.currentTarget.src = '';
                            }}
                          />
                        </div>
                      )}
                      <div 
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setIsDraggingText(true);
                        }}
                        style={{ 
                          position: 'absolute',
                          left: `${textX}%`,
                          top: `${textY}%`,
                          transform: 'translate(-50%, -50%)',
                          zIndex: 5,
                          width: 'auto',
                          cursor: 'move',
                          border: isDraggingText ? '2px dashed #10b981' : '2px dashed transparent',
                          padding: '8px',
                          borderRadius: '8px',
                          backgroundColor: isDraggingText ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                          transition: isDraggingText ? 'none' : 'all 0.1s ease'
                        }}>
                        {/* Botões de Controle do Texto */}
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            display: 'flex',
                            gap: '4px',
                            zIndex: 20
                          }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const alignments: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];
                              const currentIndex = alignments.indexOf(textAlignMode);
                              const nextIndex = (currentIndex + 1) % alignments.length;
                              setTextAlignMode(alignments[nextIndex]);
                            }}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              border: '2px solid #10b981',
                              background: 'white',
                              color: '#10b981',
                              fontSize: '14px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#10b981';
                              e.currentTarget.style.color = 'white';
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'white';
                              e.currentTarget.style.color = '#10b981';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title={`Alinhamento: ${textAlignMode === 'left' ? 'Esquerda' : textAlignMode === 'center' ? 'Centro' : 'Direita'}`}
                          >
                            {textAlignMode === 'left' ? '←' : textAlignMode === 'center' ? '↕️' : '→'}
                          </button>
                          
                          {/* Botão de Fonte */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const fonts = [
                                'Arial, sans-serif',
                                'Georgia, serif',
                                'Times New Roman, serif',
                                'Courier New, monospace',
                                'Verdana, sans-serif',
                                'Impact, fantasy',
                                'Comic Sans MS, cursive'
                              ];
                              const currentIndex = fonts.indexOf(textFontFamily);
                              const nextIndex = (currentIndex + 1) % fonts.length;
                              setTextFontFamily(fonts[nextIndex]);
                            }}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              border: '2px solid #10b981',
                              background: 'white',
                              color: '#10b981',
                              fontSize: '16px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              transition: 'all 0.2s',
                              fontFamily: 'serif'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#10b981';
                              e.currentTarget.style.color = 'white';
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'white';
                              e.currentTarget.style.color = '#10b981';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title={`Fonte: ${textFontFamily.split(',')[0]}`}
                          >
                            A
                          </button>
                        </div>
                        <div style={{ textAlign: textAlignMode }}>
                          <h1 style={{ 
                            color: formTitleColor, 
                            whiteSpace: 'nowrap',
                            fontSize: `${textSize}px`,
                            fontWeight: 'bold',
                            marginBottom: '8px',
                            fontFamily: textFontFamily
                          }}>
                            {formTitle}
                          </h1>
                          <p style={{ 
                            color: themeSubtitleColor, 
                            whiteSpace: 'nowrap',
                            fontSize: `${textSize * 0.6}px`,
                            fontFamily: textFontFamily
                          }}>
                            {themeSubtitle}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card de Ações */}
                <Card sx={{ mt: 4, borderRadius: 3, boxShadow: 3 }}>
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'grey.800', mb: 0.5 }}>
                          💾 Salvar Configurações
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'grey.600' }}>
                          Clique no botão abaixo para salvar todas as alterações feitas no formulário
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 2,
                      pt: 2,
                      borderTop: '1px solid',
                      borderColor: 'grey.200'
                    }}>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={handleSave}
                        disabled={isSaving}
                        startIcon={isSaving ? <CircularProgress size={20} /> : null}
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          px: 4,
                          py: 1.5,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '1rem',
                          boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.4)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                            boxShadow: '0 6px 20px 0 rgba(102, 126, 234, 0.6)'
                          },
                          '&:disabled': {
                            background: 'grey.300',
                            color: 'grey.500'
                          }
                        }}
                      >
                        {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
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

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <DialogTitle>Excluir Formulário</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir este formulário? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              if (!deletingFormId) return;
              
              try {
                const { error } = await supabaseClient
                  .from('gbp_form_config')
                  .delete()
                  .eq('uid', deletingFormId);
                
                if (error) throw error;
                
                // Remove do estado local
                setAllFormConfigs(prev => prev.filter(f => f.uid !== deletingFormId));
                
                toast.success('Formulário excluído com sucesso!');
                setShowDeleteDialog(false);
                setDeletingFormId(null);
              } catch (error) {
                console.error('Erro ao excluir formulário:', error);
                toast.error('Erro ao excluir formulário');
              }
            }}
            color="error"
            variant="contained"
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Adiciona o container do Toast */}
      <ToastContainer />
    </div>
  );
}
