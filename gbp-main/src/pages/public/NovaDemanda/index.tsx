import { useState, FormEvent, useEffect, useRef, type CSSProperties } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabaseClient as supabase } from '../../../lib/supabase';
import { getEmpresa } from '../../../services/empresa';
import { createDemandaRua, uploadDemandaFiles, uploadBoletimOcorrencia, DemandaRuaInput } from '../../../services/demandasRua';
import { indicadoService, type Indicado } from '../../../services/indicadoService';
import { compressImages } from '../../../utils/imageCompression';
import { mergeCamposConfig, mergeCabecalhoConfig, type CamposConfigDemanda, type CabecalhoConfig } from '../../../config/demandaCampos';
import { toast } from 'react-toastify';
import { X, Loader2, ImagePlus } from 'lucide-react';
import './global.css';

// ─── Utilitários de cor para o cabeçalho dinâmico ───
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const clean = (hex || '').trim().replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
};

const rgbToHex = (r: number, g: number, b: number): string =>
  '#' + [r, g, b]
    .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('');

// amount: -1 (preto) a 1 (branco)
const shadeHex = (hex: string, amount: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const target = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  return rgbToHex(
    rgb.r + (target - rgb.r) * p,
    rgb.g + (target - rgb.g) * p,
    rgb.b + (target - rgb.b) * p,
  );
};

const relativeLuminance = (hex: string): number => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastRatio = (hex1: string, hex2: string): number => {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

// Retorna a cor configurada se tiver contraste >= 3:1 com o fundo;
// caso contrário, escolhe automaticamente branco ou quase-preto.
const ensureReadableColor = (fg: string | undefined, bg: string, fallback: string): string => {
  const candidate = fg && hexToRgb(fg) ? fg : fallback;
  if (hexToRgb(candidate) && contrastRatio(candidate, bg) >= 3) return candidate;
  return relativeLuminance(bg) > 0.5 ? '#1f2937' : '#ffffff';
};

// ─── Derivação de cor de destaque (acento) a partir da cor base ───
const hexToHsl = (hex: string): { h: number; s: number; l: number } | null => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
};

const hslToHex = (h: number, s: number, l: number): string => {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return rgbToHex(r * 255, g * 255, b * 255);
};

// Gera a cor de destaque a partir da cor base mantendo matiz e saturação —
// altera apenas a luminosidade para destacar do fundo sem destoar da identidade.
const deriveAccentColor = (baseHex: string): string => {
  const hsl = hexToHsl(baseHex);
  if (!hsl) return '#f97316';
  let l = hsl.l;
  if (l < 0.3) l = 0.55;                    // fundo muito escuro → acento claro
  else if (l > 0.7) l = 0.4;                // fundo muito claro → acento escuro
  else l = l + (l > 0.5 ? -0.12 : 0.12);    // afastamento sutil do fundo
  l = Math.min(0.75, Math.max(0.25, l));
  return hslToHex(hsl.h, hsl.s, l);
};

interface Empresa {
  uid: string;
  nome: string;
  logo_url?: string;
  link_demanda_disponivel?: boolean;
}

interface Endereco {
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  referencia?: string;
}

type FormData = {
  tipo_de_demanda: string;
  descricao_do_problema: string;
  nivel_de_urgencia: 'baixa' | 'média' | 'alta';
  indicado_uid: string;
  requerente_nome: string;
  requerente_cpf: string;
  requerente_whatsapp: string;
  requerente_data_nascimento: string;
  genero: 'masculino' | 'feminino' | 'outro' | 'prefiro_nao_informar' | '';
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  referencia: string;
  boletim_ocorrencia: string;
  link_da_demanda: string;
  aceite_termos: boolean;
  latitude?: string;
  longitude?: string;
};

export function NovaDemanda() {
  const { empresa_uid } = useParams<{ empresa_uid: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingBoletim, setIsUploadingBoletim] = useState(false);
  const [isConsultingCpf, setIsConsultingCpf] = useState(false);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [linkDisabled, setLinkDisabled] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [boletimFile, setBoletimFile] = useState<File | null>(null);
  // Estado para erro de data de nascimento
  const [dataNascimentoError, setDataNascimentoError] = useState<string>('');
  const dataNascimentoRef = useRef<HTMLInputElement>(null);
  const [temEnderecoRequerente, setTemEnderecoRequerente] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'buscando' | 'ok' | 'nao_localizado'>('idle');
  
  // Estado para paginação do formulário
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  // Capturar usuário que compartilhou o link
  const usuarioCompartilhador = searchParams.get('user');
  
  // FORÇA scroll na página pública e previne reload
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const prevHtmlStyle = html.getAttribute('style');
    const prevBodyStyle = body.getAttribute('style');
    
    // Adiciona classe para permitir scroll
    body.classList.add('public-page-scroll');
    html.classList.add('public-page-scroll');
    
    // Força estilos diretamente
    html.style.cssText = 'overflow-x: hidden !important; overflow-y: auto !important; height: auto !important; position: relative !important; inset: auto !important; top: auto !important; right: auto !important; bottom: auto !important; left: auto !important;';
    body.style.cssText = 'overflow-x: hidden !important; overflow-y: auto !important; height: auto !important; position: relative !important; inset: auto !important; top: auto !important; right: auto !important; bottom: auto !important; left: auto !important; -webkit-overflow-scrolling: touch !important;';
    
    return () => {
      body.classList.remove('public-page-scroll');
      html.classList.remove('public-page-scroll');
      if (prevHtmlStyle !== null) {
        html.setAttribute('style', prevHtmlStyle);
      } else {
        html.removeAttribute('style');
      }
      if (prevBodyStyle !== null) {
        body.setAttribute('style', prevBodyStyle);
      } else {
        body.removeAttribute('style');
      }
    };
  }, []);
  
  // Buscar dados da empresa
  useEffect(() => {
    const fetchEmpresa = async () => {
      if (!empresa_uid) {
        toast.error('Link de demanda inválido');
        navigate('/');
        return;
      }

      try {
        const empresaData = await getEmpresa(empresa_uid);

        if (!empresaData) {
          toast.error('Empresa não encontrada');
          navigate('/');
          return;
        }

        // Verifica se o link público está disponível (só se o campo existir)
        if (empresaData.link_demanda_disponivel === false) {
          setLinkDisabled(true);
          setInitialLoading(false);
          return;
        }

        // Atualiza o estado da empresa
        setEmpresa(empresaData);
        setInitialLoading(false);

      } catch (error) {
        console.error('Erro ao carregar empresa:', error);
        toast.error('Erro ao carregar dados da empresa');
        navigate('/');
      }
    };

    fetchEmpresa();
  }, [empresa_uid, navigate]);

  const [tiposDemanda, setTiposDemanda] = useState<Array<{value: string, label: string, group?: string}>>([]);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [indicados, setIndicados] = useState<Indicado[]>([]);
  const [loadingIndicados, setLoadingIndicados] = useState(true);

  // Buscar tipos de demanda
  useEffect(() => {
    const fetchTiposDemanda = async () => {
      if (!empresa_uid) return;
      
      try {
        setLoadingTipos(true);
        const { data, error } = await supabase
          .from('gbp_demanda_tipo')
          .select('tipo_demanda_rua, campos_config, cabecalho_config')
          .eq('empresa_uid', empresa_uid);

        if (error) throw error;

        // Carrega a configuração de visibilidade dos campos
        if (data && data.length > 0) {
          setCamposConfig(mergeCamposConfig(data[0].campos_config));
          const cabecalhoMerged = mergeCabecalhoConfig(data[0].cabecalho_config);
          console.log('[DEBUG] Configuração do cabeçalho:', cabecalhoMerged);
          console.log('[DEBUG] Configuração original:', data[0].cabecalho_config);
          setCabecalhoConfig(cabecalhoMerged);
          setCabecalhoLoaded(true);
        }
        
        if (data && data.length > 0 && data[0].tipo_demanda_rua) {
          // Usar o array de tipos da coluna tipo_demanda_rua
          const tipos = data[0].tipo_demanda_rua || [];

          // Estruturas auxiliares
          const categorias: Record<string, Array<{ value: string, label: string }>> = {};
          const opcoesFormatadas: Array<{ value: string, label: string, group?: string }> = [];

          // Organizar os itens por categoria e incluir itens sem categoria
          tipos.forEach((tipo: string) => {
            const partes = tipo.split('::');

            if (partes.length > 1) {
              // É um item com categoria
              const categoria = partes[0];
              const descricao = partes[1];

              if (!categorias[categoria]) {
                categorias[categoria] = [];
              }

              categorias[categoria].push({ value: tipo, label: descricao });
            } else {
              // Sem categoria: adiciona como opção simples
              opcoesFormatadas.push({ value: tipo, label: tipo });
            }
          });

          // Adicionar itens agrupados por categoria
          Object.entries(categorias).forEach(([categoria, itens]) => {
            // Cabeçalho do grupo (usado para renderizar optgroup)
            opcoesFormatadas.push({ value: `header-${categoria}`, label: categoria, group: categoria });

            // Itens da categoria
            itens.forEach((item) => opcoesFormatadas.push({ ...item, group: categoria }));
          });

          setTiposDemanda(opcoesFormatadas);
        }
      } catch (error) {
        console.error('Erro ao buscar tipos de demanda:', error);
        toast.error('Erro ao carregar os tipos de demanda');
      } finally {
        setLoadingTipos(false);
      }
    };

    fetchTiposDemanda();
  }, [empresa_uid]);

  // Buscar indicados da empresa
  useEffect(() => {
    const fetchIndicados = async () => {
      if (!empresa_uid) return;
      
      try {
        setLoadingIndicados(true);
        const indicadosData = await indicadoService.listByEmpresa(empresa_uid);
        setIndicados(indicadosData);
      } catch (error) {
        console.error('Erro ao buscar indicados:', error);
        toast.error('Erro ao carregar indicados');
      } finally {
        setLoadingIndicados(false);
      }
    };

    fetchIndicados();
  }, [empresa_uid]);

  const [formData, setFormData] = useState<FormData>({
    tipo_de_demanda: '',
    descricao_do_problema: '',
    nivel_de_urgencia: 'média',
    indicado_uid: '',
    requerente_nome: '',
    requerente_cpf: '',
    requerente_whatsapp: '',
    requerente_data_nascimento: '',
    genero: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    referencia: '',
    boletim_ocorrencia: 'não',
    link_da_demanda: '',
    aceite_termos: false,
    latitude: '',
    longitude: '',
  });
  
  // Estado para controlar se o endereço da demanda é o mesmo do requerente
  const [usarEnderecoRequerente, setUsarEnderecoRequerente] = useState<boolean>(false);
  
  // Estado para controlar se tem indicado
  const [temIndicado, setTemIndicado] = useState<string>('não');

  // Configuração de visibilidade dos campos do formulário (por empresa)
  const [camposConfig, setCamposConfig] = useState<CamposConfigDemanda>(() => mergeCamposConfig(null));
  const campoVisivel = (id: string) => {
    const config = camposConfig[id];
    return config ? config.visivel !== false : true;
  };
  const campoObrigatorio = (id: string) => {
    const config = camposConfig[id];
    return config ? config.obrigatorio === true : false;
  };
  
  // Configuração visual do cabeçalho
  const [cabecalhoConfig, setCabecalhoConfig] = useState<CabecalhoConfig>(() => mergeCabecalhoConfig(null));
  const [cabecalhoLoaded, setCabecalhoLoaded] = useState(false);
  const camposRequerente = ['requerente_cpf', 'requerente_nome', 'requerente_whatsapp', 'requerente_data_nascimento', 'genero'];
  const camposEndereco = ['cep', 'logradouro', 'numero', 'bairro', 'referencia', 'cidade', 'uf'];
  const camposDemanda = ['tipo_de_demanda', 'nivel_de_urgencia', 'indicado', 'link_da_demanda', 'descricao_do_problema'];
  const secaoRequerenteVisivel = camposRequerente.some(campoVisivel);
  const secaoEnderecoVisivel = camposEndereco.some(campoVisivel);
  const secaoDemandaVisivel = camposDemanda.some(campoVisivel);

  // Funções de formatação
  const formatPhone = (value: string): string => {
    // Remove tudo que não for dígito
    const cleaned = value.replace(/\D/g, '');
    
    // Aplica a formatação do telefone (00) 00000-0000
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const formatCEP = (value: string): string => {
    // Remove tudo que não for dígito
    const cleaned = value.replace(/\D/g, '');
    
    // Aplica a formatação do CEP (00000-000)
    if (cleaned.length <= 5) return cleaned;
    
    // Se o CEP estiver completo (8 dígitos), busca o endereço
    if (cleaned.length === 8) {
      buscarEndereco(cleaned);
    }
    
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
  };

  const formatarCPF = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue.length <= 11) {
      return numericValue
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(\-\d{2})\d+?$/, '$1');
    }
    return value;
  };

  const formatarDataNascimento = (value: string): string => {
    // Remove tudo que não for dígito
    const cleaned = value.replace(/\D/g, '');
    
    // Aplica a formatação dd/mm/yyyy
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  };

  const formatarNome = (value: string): string => {
    // Lista de preposições e artigos que devem permanecer em minúsculas
    const preposicoes = ['de', 'da', 'do', 'das', 'dos', 'e'];
    
    return value
      .toLowerCase()
      .split(' ')
      .map((palavra, index) => {
        // Primeira palavra sempre maiúscula
        if (index === 0) {
          return palavra.charAt(0).toUpperCase() + palavra.slice(1);
        }
        
        // Verifica se é uma preposição
        if (preposicoes.includes(palavra)) {
          return palavra;
        }
        
        // Capitaliza a primeira letra das outras palavras
        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
      })
      .join(' ');
  };

  const buscarCoordenadas = async (logradouro: string, bairro: string, cidade: string, uf: string, cep: string = '', numero: string = '') => {
    setGeoStatus('buscando');
    try {
      const enderecoCompleto = numero
        ? `${logradouro} ${numero}, ${bairro}, ${cidade} - ${uf}, Brasil`
        : `${logradouro}, ${bairro}, ${cidade} - ${uf}, Brasil`;
      const enderecoSemBairro = numero
        ? `${logradouro} ${numero}, ${cidade} - ${uf}, Brasil`
        : `${logradouro}, ${cidade} - ${uf}, Brasil`;
      const queries = [
        // 1. Endereço completo com número
        logradouro && cidade && uf ? enderecoCompleto : '',
        // 2. Endereço sem bairro com número
        logradouro && cidade && uf ? enderecoSemBairro : '',
        // 3. CEP
        cep ? cep : '',
        // 4. Bairro + cidade + UF
        bairro && cidade && uf ? `${bairro}, ${cidade} - ${uf}, Brasil` : '',
        // 5. Cidade + UF
        cidade && uf ? `${cidade} - ${uf}, Brasil` : ''
      ].filter(q => q.length > 0);

      for (const query of queries) {
        const encodedQuery = encodeURIComponent(query);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1`, {
          headers: {
            'Accept-Language': 'pt-BR',
            'User-Agent': 'GBPPolitico/1.0'
          }
        });
        const data = await response.json();
        if (data && data.length > 0) {
          setFormData(prev => ({
            ...prev,
            latitude: data[0].lat,
            longitude: data[0].lon
          }));
          setGeoStatus('ok');
          return;
        }
      }

      setGeoStatus('nao_localizado');
    } catch (error) {
      console.error('Erro ao buscar coordenadas:', error);
      setGeoStatus('nao_localizado');
    }
  };

  const buscarEndereco = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          uf: data.uf || ''
        }));
        // Busca latitude e longitude automaticamente pelo endereço
        buscarCoordenadas(data.logradouro || '', data.bairro || '', data.localidade || '', data.uf || '', cepLimpo, formData.numero);
      }
    } catch (error) {
      console.error('Erro ao buscar endereço:', error);
    }
  };

  const consultarCpf = async (cpf: string) => {
    if (!cpf || cpf.length < 11) return;
    
    try {
      setIsConsultingCpf(true);
      
      // Busca o requerente na tabela de requerentes, filtrando pelo CPF e empresa_uid
      const { data: requerente, error } = await supabase
        .from('gbp_requerentes_demanda_rua')
        .select('*')
        .eq('cpf', cpf.replace(/\D/g, ''))
        .eq('empresa_uid', empresa_uid)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }
      
      if (requerente) {
        // Verifica se o requerente tem endereço válido
        const temEnderecoValido = requerente.cep && 
                                 requerente.logradouro && 
                                 requerente.bairro && 
                                 requerente.cidade && 
                                 requerente.uf;
        
        setTemEnderecoRequerente(!!temEnderecoValido);
        
        // Converte data de nascimento do formato do banco (yyyy-mm-dd) para o formato do input (dd/mm/yyyy)
        const dataNascimentoFormatada = requerente.nascimento
          ? requerente.nascimento.split('-').reverse().join('/')
          : '';

        // Carrega apenas os dados pessoais, NÃO carrega o endereço
        setFormData(prev => ({
          ...prev,
          requerente_nome: requerente.nome || '',
          requerente_whatsapp: requerente.whatsapp || '',
          requerente_data_nascimento: dataNascimentoFormatada,
          genero: requerente.genero || ''
        }));
        
        // NÃO carrega o endereço automaticamente - usuário deve clicar no botão
      } else {
        // Se não encontrou o requerente, reseta o estado
        setTemEnderecoRequerente(false);
        setUsarEnderecoRequerente(false);
      }
    } catch (error) {
      console.error('Erro ao consultar CPF:', error);
      // Se der erro, não faz nada e deixa o usuário preencher manualmente
    } finally {
      setIsConsultingCpf(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Se for checkbox, usa checked ao invés de value
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }
    
    // Se for o campo CPF
    if (name === 'requerente_cpf') {
      // Aplica formatação ao CPF
      const formattedValue = formatarCPF(value);
      
      // Atualiza o valor do CPF primeiro
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
      
      // Se o CPF foi removido (tem menos de 11 dígitos), limpa os campos do requerente
      if (value.replace(/\D/g, '').length < 11) {
        setFormData(prev => ({
          ...prev,
          requerente_nome: '',
          requerente_whatsapp: '',
          genero: '',
          cep: '',
          logradouro: '',
          numero: '',
          bairro: '',
          cidade: '',
          uf: '',
          referencia: ''
        }));
        setTemEnderecoRequerente(false);
        setUsarEnderecoRequerente(false);
        return;
      }
      
      // Se tem 11 dígitos, faz a consulta
      if (value.replace(/\D/g, '').length === 11) {
        consultarCpf(value);
      }
      
      return; // Já atualizamos o estado, então podemos sair da função
    }
    
    // Aplica formatação específica para cada campo
    let formattedValue = value;
    
    if (name === 'requerente_whatsapp') {
      formattedValue = formatPhone(value);
    } else if (name === 'requerente_data_nascimento') {
      formattedValue = formatarDataNascimento(value);
    } else if (name === 'cep') {
      formattedValue = formatCEP(value);
      const cepLimpo = value.replace(/\D/g, '');
      if (cepLimpo.length < 8) {
        // Limpa endereço e coordenadas quando o CEP é apagado ou incompleto
        setFormData(prev => ({
          ...prev,
          cep: formattedValue,
          logradouro: '',
          bairro: '',
          cidade: '',
          uf: '',
          referencia: '',
          latitude: '',
          longitude: ''
        }));
        return;
      }
      // Se é um CEP válido (8 dígitos), limpa coordenadas antigas antes de buscar novas
      setFormData(prev => ({
        ...prev,
        cep: formattedValue,
        latitude: '',
        longitude: ''
      }));
      return;
    } else if (name === 'numero') {
      // Quando o número é preenchido e o endereço já existe, rebusca coordenadas com número
      setFormData(prev => ({
        ...prev,
        numero: value
      }));
      if (formData.logradouro && formData.cidade && formData.uf && (formData.latitude || formData.longitude)) {
        buscarCoordenadas(formData.logradouro, formData.bairro, formData.cidade, formData.uf, formData.cep.replace(/\D/g, ''), value);
      }
      return;
    } else if (name === 'requerente_nome' || name === 'logradouro' || name === 'bairro' || name === 'cidade' || name === 'referencia') {
      formattedValue = formatarNome(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  const [isCompressing, setIsCompressing] = useState(false);

  const processImageFiles = async (fileList: FileList | File[]) => {
    try {
      if (!fileList || fileList.length === 0) {
        return;
      }

      const newFiles = Array.from(fileList);
      const totalFiles = files.length + newFiles.length;

      if (totalFiles > 2) {
        toast.warning('Máximo de 2 imagens permitidas');
        return;
      }

      // Verifica se os arquivos são imagens
      const validFiles = newFiles.filter(file => file.type.startsWith('image/'));

      if (validFiles.length === 0) {
        toast.warning('Por favor, selecione apenas arquivos de imagem');
        return;
      }

      // Limita ao máximo de 2 imagens
      const filesToProcess = validFiles.slice(0, 2 - files.length);

      // Comprime as imagens automaticamente
      setIsCompressing(true);
      toast.info('Comprimindo imagens...', { autoClose: 2000 });

      const compressedFiles = await compressImages(filesToProcess, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        maxSizeMB: 1.5 // Target: 1.5MB máximo
      });

      setFiles(prev => [...prev, ...compressedFiles]);

      // Criar URLs de visualização
      const urls = compressedFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...urls]);

      toast.success(`${compressedFiles.length} imagem(ns) adicionada(s)`);
    } catch (error) {
      console.error('Erro no processImageFiles:', error);
      toast.error('Erro ao processar as imagens');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processImageFiles(e.target.files);
    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    await processImageFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleBoletimChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];

    // Validar tamanho do arquivo
    if (file.size > maxSize) {
      toast.error('O arquivo do boletim de ocorrência não pode ser maior que 10MB');
      // Limpar o input
      e.target.value = '';
      return;
    }

    // Validar tipo do arquivo
    if (!allowedTypes.includes(file.type)) {
      toast.error('Por favor, envie um arquivo PDF, JPG ou PNG');
      // Limpar o input
      e.target.value = '';
      return;
    }

    setBoletimFile(file);
  };

  const removeBoletim = () => {
    setBoletimFile(null);
    // Se houver um input file, limpa seu valor
    const fileInput = document.getElementById('boletim_arquivo') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    const newPreviewUrls = [...previewUrls];
    
    // Revogar a URL para liberar memória
    URL.revokeObjectURL(newPreviewUrls[index]);
    
    newFiles.splice(index, 1);
    newPreviewUrls.splice(index, 1);
    
    setFiles(newFiles);
    setPreviewUrls(newPreviewUrls);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log('[DEBUG] handleSubmit iniciado');
    
    if (!empresa_uid) {
      console.log('[DEBUG] Empresa não identificada');
      toast.error('Empresa não identificada');
      return;
    }

    console.log('[DEBUG] Validando termos...');
    if (campoVisivel('aceite_termos') && !formData.aceite_termos) {
      console.log('[DEBUG] Termos não aceitos');
      toast.error('Você precisa aceitar os termos de uso para continuar');
      return;
    }

    console.log('[DEBUG] Validando boletim...');
    // Validar se o boletim foi anexado quando necessário
    if (formData.boletim_ocorrencia === 'sim' && !boletimFile) {
      console.log('[DEBUG] Boletim obrigatório mas não anexado');
      toast.error('Por favor, anexe o boletim de ocorrência');
      return;
    }

    // Validar se pelo menos uma foto foi anexada (se configurado como obrigatório)
    console.log('[DEBUG] Validando fotos...');
    if (campoObrigatorio('fotos') && campoVisivel('fotos') && files.length === 0) {
      console.log('[DEBUG] Nenhuma foto anexada');
      toast.error('Por favor, anexe pelo menos uma foto do problema');
      return;
    }

    // Validar data de nascimento (somente se o campo estiver visível no formulário)
    if (campoVisivel('requerente_data_nascimento')) {
    console.log('[DEBUG] Validando data de nascimento...');
    setDataNascimentoError(''); // Limpa erro anterior
    
    if (!formData.requerente_data_nascimento) {
      console.log('[DEBUG] Data de nascimento vazia');
      setDataNascimentoError('Por favor, informe a data de nascimento');
      dataNascimentoRef.current?.focus();
      toast.error('Por favor, informe a data de nascimento');
      return;
    }

    // Validar formato da data (dd/mm/aaaa)
    const dataRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(19|20)\d{2}$/;
    if (!dataRegex.test(formData.requerente_data_nascimento)) {
      console.log('[DEBUG] Formato de data inválido:', formData.requerente_data_nascimento);
      setDataNascimentoError('Data inválida. Use o formato: dd/mm/aaaa');
      dataNascimentoRef.current?.focus();
      toast.error('Data de nascimento inválida. Use o formato: dd/mm/aaaa');
      return;
    }

    // Validar se a data é válida (ex: não aceitar 31/02/2020)
    const [dia, mes, ano] = formData.requerente_data_nascimento.split('/').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);
    if (dataObj.getDate() !== dia || dataObj.getMonth() !== mes - 1 || dataObj.getFullYear() !== ano) {
      console.log('[DEBUG] Data inválida:', formData.requerente_data_nascimento);
      setDataNascimentoError('Data inválida. Verifique dia, mês e ano');
      dataNascimentoRef.current?.focus();
      toast.error('Data de nascimento inválida. Verifique dia, mês e ano');
      return;
    }

    // Validar se a data não é futura
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (dataObj > hoje) {
      console.log('[DEBUG] Data no futuro:', formData.requerente_data_nascimento);
      setDataNascimentoError('Data não pode ser no futuro');
      dataNascimentoRef.current?.focus();
      toast.error('Data de nascimento não pode ser no futuro');
      return;
    }

    // Validar idade mínima (18 anos)
    const idadeMinima = new Date();
    idadeMinima.setFullYear(idadeMinima.getFullYear() - 18);
    if (dataObj > idadeMinima) {
      console.log('[DEBUG] Menor de 18 anos:', formData.requerente_data_nascimento);
      setDataNascimentoError('O requerente deve ter pelo menos 18 anos');
      dataNascimentoRef.current?.focus();
      toast.error('O requerente deve ter pelo menos 18 anos');
      return;
    }
    }

    console.log('[DEBUG] Todas validações passadas! Prosseguindo...');
    setIsLoading(true);

    try {
      // CPF do requerente (se o campo estiver oculto, gera um identificador único)
      const cpfRequerente = formData.requerente_cpf.replace(/\D/g, '') || `9${Date.now().toString().slice(-10)}`;

      // 1. Verificar se o requerente já existe
      const { data: requerenteExistente } = await supabase
        .from('gbp_requerentes_demanda_rua')
        .select('*')
        .eq('cpf', cpfRequerente)
        .eq('empresa_uid', empresa_uid)
        .maybeSingle();

      let requerenteUid = requerenteExistente?.uid;
      let enderecoRequerente: Endereco = {};

      // 2. Se não existir ou se o endereço for diferente, criar/atualizar o requerente
      if (!requerenteUid || !usarEnderecoRequerente) {
        // Converte data de nascimento de dd/mm/yyyy para yyyy-mm-dd (formato do banco)
        const dataNascimentoFormatada = formData.requerente_data_nascimento
          ? formData.requerente_data_nascimento.split('/').reverse().join('-')
          : null;

        const dadosRequerente = {
          nome: formData.requerente_nome || 'Não informado',
          cpf: cpfRequerente,
          whatsapp: formData.requerente_whatsapp || '',
          nascimento: dataNascimentoFormatada,
          genero: formData.genero || 'prefiro_nao_informar',
          empresa_uid: empresa_uid
        };

        // Se for usar o endereço do requerente, inclui os dados de endereço
        if (usarEnderecoRequerente || !requerenteUid) {
          Object.assign(dadosRequerente, {
            cep: formData.cep,
            logradouro: formData.logradouro,
            numero: formData.numero,
            bairro: formData.bairro,
            cidade: formData.cidade,
            uf: formData.uf,
            referencia: formData.referencia
          });
        }

        if (requerenteUid) {
          // Atualiza o requerente existente
          const { data: requerenteAtualizado, error: erroAtualizarRequerente } = await supabase
            .from('gbp_requerentes_demanda_rua')
            .update(dadosRequerente)
            .eq('uid', requerenteUid)
            .select('*')
            .single();

          if (erroAtualizarRequerente) throw erroAtualizarRequerente;
          enderecoRequerente = {
            cep: requerenteAtualizado.cep,
            logradouro: requerenteAtualizado.logradouro,
            numero: requerenteAtualizado.numero,
            bairro: requerenteAtualizado.bairro,
            cidade: requerenteAtualizado.cidade,
            uf: requerenteAtualizado.uf,
            referencia: requerenteAtualizado.referencia
          };
        } else {
          // Cria um novo requerente
          const { data: novoRequerente, error: erroCriarRequerente } = await supabase
            .from('gbp_requerentes_demanda_rua')
            .insert([dadosRequerente])
            .select('*')
            .single();

          if (erroCriarRequerente) throw erroCriarRequerente;
          requerenteUid = novoRequerente.uid;
          enderecoRequerente = {
            cep: novoRequerente.cep,
            logradouro: novoRequerente.logradouro,
            numero: novoRequerente.numero,
            bairro: novoRequerente.bairro,
            cidade: novoRequerente.cidade,
            uf: novoRequerente.uf,
            referencia: novoRequerente.referencia
          };
        }
      } else {
        // Usa os dados existentes do requerente
        enderecoRequerente = {
          cep: requerenteExistente.cep,
          logradouro: requerenteExistente.logradouro,
          numero: requerenteExistente.numero,
          bairro: requerenteExistente.bairro,
          cidade: requerenteExistente.cidade,
          uf: requerenteExistente.uf,
          referencia: requerenteExistente.referencia
        };
      }

      // 3. Criar a demanda de rua com o UID do requerente
      const endereco: Endereco = usarEnderecoRequerente ? enderecoRequerente : {
        logradouro: formData.logradouro,
        numero: formData.numero,
        bairro: formData.bairro,
        cidade: formData.cidade,
        uf: formData.uf,
        cep: formData.cep,
        referencia: formData.referencia
      };

      // Garante que todos os campos obrigatórios tenham valores
      const dadosDemanda: DemandaRuaInput = {
        // Dados básicos da demanda
        tipo_de_demanda: formData.tipo_de_demanda || 'Outros',
        descricao_do_problema: formData.descricao_do_problema || 'Sem descrição',
        nivel_de_urgencia: formData.nivel_de_urgencia as 'baixa' | 'média' | 'alta' || 'média',
        
        // Dados da empresa e requerente
        empresa_uid: empresa_uid!,
        requerente_uid: requerenteUid,
        indicado_uid: formData.indicado_uid || undefined,
        atribuido_para_uid: usuarioCompartilhador ? [usuarioCompartilhador] : null,
        atribuido_por_uid: usuarioCompartilhador,
        data_atribuicao: usuarioCompartilhador ? new Date().toISOString() : null,
        
        // Dados do endereço (obrigatórios)
        logradouro: endereco.logradouro || 'Não informado',
        bairro: endereco.bairro || 'Não informado',
        cidade: endereco.cidade || 'Não informado',
        uf: endereco.uf || 'PE',
        cep: endereco.cep || '00000-000',
        numero: endereco.numero || '',
        referencia: endereco.referencia || '',
        
        // Coordenadas GPS (se disponível)
        latitude: formData.latitude,
        longitude: formData.longitude,
        
        // Outros campos
        boletim_ocorrencia: formData.boletim_ocorrencia || 'não',
        link_da_demanda: formData.link_da_demanda || undefined,
        observacoes: formData.referencia || undefined,
        aceite_termos: true,
        fotos_do_problema: []
      };

      console.log('Criando demanda com dados:', JSON.stringify(dadosDemanda, null, 2));
      const demanda = await createDemandaRua(dadosDemanda);
      console.log('Demanda criada com sucesso:', demanda);

      // 2. Fazer upload do boletim de ocorrência se existir
      let boletimUrl = null;
      if (formData.boletim_ocorrencia === 'sim' && boletimFile) {
        try {
          setIsUploadingBoletim(true);
          boletimUrl = await uploadBoletimOcorrencia(empresa_uid, demanda.uid, boletimFile);
          
          // Atualizar a demanda com a URL do boletim
          await supabase
            .from('gbp_demandas_ruas')
            .update({ anexar_boletim_de_correncia: boletimUrl })
            .eq('uid', demanda.uid);
            
          console.log('Boletim de ocorrência salvo com sucesso:', boletimUrl);
        } catch (error) {
          console.error('Erro ao enviar boletim de ocorrência:', error);
          // Não interrompe o fluxo, apenas registra o erro
          toast.error('Erro ao enviar boletim de ocorrência. A demanda foi salva, mas sem o anexo.');
        } finally {
          setIsUploadingBoletim(false);
        }
      }

      // 3. Fazer upload das fotos do problema se houver
      let fotosUrls: string[] = [];
      if (files.length > 0) {
        try {
          fotosUrls = await uploadDemandaFiles(empresa_uid, demanda.uid, files);
          
          // Atualizar a demanda com as URLs das imagens
          await supabase
            .from('gbp_demandas_ruas')
            .update({ 
              fotos_do_problema: fotosUrls,
              // Atualiza o boletim também se já tiver sido enviado
              ...(boletimUrl ? { anexar_boletim_de_correncia: boletimUrl } : {})
            })
            .eq('uid', demanda.uid);
            
          console.log('Fotos do problema salvas com sucesso:', fotosUrls);
        } catch (error) {
          console.error('Erro ao enviar fotos do problema:', error);
          // Não interrompe o fluxo, apenas registra o erro
        }
      }

      // Atualização da demanda com os dados finais é feita diretamente no banco

      toast.success('Demanda de rua registrada com sucesso!');
      navigate(`/demanda-sucesso/${demanda.uid}`);
    } catch (error) {
      console.error('Erro ao registrar demanda de rua:', error);
      toast.error('Erro ao registrar demanda. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const buscarEnderecoPorCep = async (cep: string) => {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          uf: data.uf || '',
        }));
        // Busca latitude e longitude automaticamente pelo endereço
        buscarCoordenadas(data.logradouro || '', data.bairro || '', data.localidade || '', data.uf || '', cep, formData.numero);
      }
    } catch (error) {
      console.error('Erro ao buscar endereço:', error);
      // Não interrompe o fluxo, apenas registra o erro
    }
  };

  // Cores derivadas do cabeçalho — sempre consistentes com a cor base configurada
  const cabecalhoBase = cabecalhoConfig.corCabecalho || '#1e3a8a';
  const cabecalhoGradiente = shadeHex(cabecalhoBase, -0.22);
  const cabecalhoClaro = relativeLuminance(cabecalhoBase) > 0.5;
  const overlayCor = cabecalhoClaro ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)';
  const cabecalhoTitulo = ensureReadableColor(cabecalhoConfig.corTitulo, cabecalhoBase, '#ffffff');
  const cabecalhoDescricao = ensureReadableColor(cabecalhoConfig.corDescricao, cabecalhoBase, '#f8fafc');
  const cabecalhoAccent = deriveAccentColor(cabecalhoBase);
  const cabecalhoAccentTexto = ensureReadableColor(undefined, cabecalhoAccent, '#ffffff');
  // Cores do cabeçalho do card — usam exatamente as cores de texto configuradas
  const cardHeaderTitulo = cabecalhoConfig.corTitulo || cabecalhoConfig.corTexto || '#1f2937';
  const cardHeaderDescricao = cabecalhoConfig.corDescricao || cabecalhoConfig.corTexto || '#64748b';

  // Renderiza o formulário
  return (
    <div className="page-wrapper">
      <div className="content-wrapper min-h-screen overflow-y-auto">
        {initialLoading ? (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Carregando...</p>
            </div>
          </div>
        ) : linkDisabled ? (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">Ops, ocorreu um erro.</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                A página que você está tentando acessar está temporariamente indisponível devido a instabilidades técnicas.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full">
          {/* Cabeçalho Horizontal Moderno */}
          {cabecalhoLoaded && (
          <div 
            className="shadow-lg pb-14 sm:pb-16 lg:pb-20 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${cabecalhoBase} 0%, ${cabecalhoGradiente} 100%)`
            }}
          >
            {/* Faixas diagonais decorativas — cor do overlay adaptada ao fundo */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-96 h-96 transform rotate-45 translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: overlayCor }}></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 transform -rotate-45 -translate-x-1/2 translate-y-1/2" style={{ backgroundColor: overlayCor }}></div>
            </div>
            
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-12 relative z-10">
              {(() => {
                const temLogo = !!(cabecalhoConfig.logoUrl || empresa?.logo_url);
                return (
              <div className="flex flex-row items-center justify-center gap-4 sm:gap-6 lg:gap-12">
                {/* Foto/Logo ao lado do texto */}
                {temLogo && (
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <div className="absolute inset-0 bg-white opacity-10 rounded-2xl blur-2xl transform scale-110"></div>
                      <img
                        className="h-32 w-32 sm:h-40 sm:w-40 lg:h-56 lg:w-56 object-contain relative z-10 drop-shadow-2xl"
                        src={cabecalhoConfig.logoUrl || empresa?.logo_url}
                        alt={`Foto ${empresa?.nome || 'Empresa'}`}
                      />
                    </div>
                  </div>
                )}
                
                {/* Lado Direito - Identificação */}
                <div className="max-w-2xl text-left">
                  {/* Cargo/Função - Etiqueta */}
                  {cabecalhoConfig.subtitulo && (
                    <div className="inline-flex items-center gap-2 mb-2 sm:mb-3">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse" style={{ backgroundColor: cabecalhoAccent }}></span>
                      <span 
                        style={{ 
                          backgroundColor: cabecalhoAccent,
                          color: cabecalhoAccentTexto,
                          boxShadow: `0 2px 8px ${cabecalhoAccent}55`,
                          fontSize: 'clamp(0.65rem, 0.58rem + 0.35vw, 0.9rem)'
                        }}
                        className="px-2 sm:px-4 py-1 sm:py-2 rounded-full font-semibold uppercase tracking-wide"
                      >
                        {cabecalhoConfig.subtitulo}
                      </span>
                    </div>
                  )}
                  
                  {/* Nome com linha decorativa */}
                  <div className="mb-2 sm:mb-4">
                    <h1 style={{ color: cabecalhoTitulo, textShadow: cabecalhoClaro ? '0 1px 2px rgba(255,255,255,0.4)' : '0 2px 4px rgba(0,0,0,0.15)', fontSize: 'clamp(1.5rem, 0.9rem + 2.8vw, 3.25rem)' }} className="font-bold mb-1 sm:mb-2 leading-tight tracking-tight">
                      {cabecalhoConfig.titulo}
                    </h1>
                  </div>
                  
                  {/* Texto de orientação */}
                  <p style={{ color: cabecalhoDescricao, fontSize: 'clamp(0.8rem, 0.72rem + 0.45vw, 1.15rem)' }} className="font-medium leading-relaxed">
                    {cabecalhoConfig.descricao || 'Registre ou consulte sua demanda'}
                  </p>
                </div>
              </div>
                );
              })()}
            </div>
          </div>
          )}
          {/* Cartão Principal */}
          <div className="form-card">
            {/* Cabeçalho do formulário */}
            <div className="form-header">
              <div className="flex items-center gap-3">
                <div className="form-header-icon">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Formulário de Registro</h2>
                  <p className="font-semibold text-gray-500">Envie sua demanda</p>
                </div>
              </div>
            </div>

            {/* Indicador de etapas */}
            <div 
              className="wizard-steps"
              style={{
                '--wizard-active-gradient': `linear-gradient(135deg, ${cabecalhoBase} 0%, ${cabecalhoGradiente} 100%)`,
                '--wizard-active-shadow': `${cabecalhoBase}40`,
                '--wizard-active-label': '#1f2937',
              } as CSSProperties}
            >
              <div className={`wizard-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                <div className="wizard-step-line"></div>
                <div className="wizard-step-number">1</div>
                <div className="wizard-step-label">Seus Dados</div>
              </div>
              <div className={`wizard-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                <div className="wizard-step-line"></div>
                <div className="wizard-step-number">2</div>
                <div className="wizard-step-label">Endereço</div>
              </div>
              <div className={`wizard-step ${currentStep >= 3 ? 'active' : ''}`}>
                <div className="wizard-step-number">3</div>
                <div className="wizard-step-label">Demanda</div>
              </div>
            </div>

            {/* Dados do Requerente - Etapa 1 */}
            {secaoRequerenteVisivel && currentStep === 1 && (
            <div className="form-section">
              <h3>Dados do Requerente</h3>
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:gap-x-6 sm:gap-y-4">
                {/* CPF */}
                {campoVisivel('requerente_cpf') && (
                <div className="col-span-full">
                  <label htmlFor="requerente_cpf" className="form-label">
                    CPF {campoObrigatorio('requerente_cpf') && <span className="required">*</span>}
                    {isConsultingCpf && (
                      <span className="ml-2 text-xs text-gray-500 flex items-center">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Buscando dados...
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    id="requerente_cpf"
                    name="requerente_cpf"
                    required={campoObrigatorio('requerente_cpf')}
                    maxLength={14}
                    placeholder="000.000.000-00"
                    value={formData.requerente_cpf}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                )}

                {/* Nome Completo */}
                {campoVisivel('requerente_nome') && (
                <div className="col-span-full">
                  <label htmlFor="requerente_nome" className="form-label">
                    Nome Completo {campoObrigatorio('requerente_nome') && '*'}
                  </label>
                  <input
                    type="text"
                    id="requerente_nome"
                    name="requerente_nome"
                    required={campoObrigatorio('requerente_nome')}
                    value={formData.requerente_nome}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                )}

                {campoVisivel('requerente_whatsapp') && (
                <div className="col-span-full">
                  <label htmlFor="requerente_whatsapp" className="form-label">
                    WhatsApp {campoObrigatorio('requerente_whatsapp') && '*'}
                  </label>
                  <input
                    type="tel"
                    name="requerente_whatsapp"
                    id="requerente_whatsapp"
                    required={campoObrigatorio('requerente_whatsapp')}
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    value={formData.requerente_whatsapp}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                )}

                {campoVisivel('requerente_data_nascimento') && (
                <div className="col-span-full">
                  <label htmlFor="requerente_data_nascimento" className={`form-label ${dataNascimentoError ? 'text-red-600' : ''}`}>
                    Data de Nascimento {campoObrigatorio('requerente_data_nascimento') && '*'}
                  </label>
                  <input
                    type="text"
                    name="requerente_data_nascimento"
                    id="requerente_data_nascimento"
                    ref={dataNascimentoRef}
                    required={campoObrigatorio('requerente_data_nascimento')}
                    maxLength={10}
                    placeholder="dd/mm/aaaa"
                    value={formData.requerente_data_nascimento}
                    onChange={(e) => {
                      handleInputChange(e);
                      if (dataNascimentoError) setDataNascimentoError('');
                    }}
                    className={`form-input ${dataNascimentoError ? 'border-red-500 bg-red-50' : ''}`}
                  />
                  {dataNascimentoError && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {dataNascimentoError}
                    </p>
                  )}
                </div>
                )}

                {campoVisivel('genero') && (
                <div className="col-span-full">
                  <label htmlFor="genero" className="form-label">
                    Gênero {campoObrigatorio('genero') && '*'}
                  </label>
                  <select
                    id="genero"
                    name="genero"
                    required={campoObrigatorio('genero')}
                    value={formData.genero}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="">Selecione...</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                    <option value="outro">Outro</option>
                    <option value="prefiro_nao_informar">Prefiro não informar</option>
                  </select>
                </div>
                )}

              </div>
            </div>
            )}

            {/* Endereço - Etapa 2 */}
            {secaoEnderecoVisivel && currentStep === 2 && (
            <div className="form-section">
              <h3>Endereço do Problema</h3>
              <div className="mb-3 sm:mb-4">
                {temEnderecoRequerente && (
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <button 
                      type="button" 
                      onClick={async () => {
                        if (!formData.requerente_cpf) {
                          toast.error('Por favor, informe o CPF primeiro');
                          return;
                        }
                        
                        try {
                          const { data: requerente, error } = await supabase
                            .from('gbp_requerentes_demanda_rua')
                            .select('*')
                            .eq('cpf', formData.requerente_cpf.replace(/\D/g, ''))
                            .eq('empresa_uid', empresa_uid)
                            .single();
                          
                          if (error) {
                            toast.error('CPF não encontrado no cadastro');
                            return;
                          }
                          
                          if (requerente) {
                            setFormData(prev => ({
                              ...prev,
                              cep: requerente.cep || '',
                              logradouro: requerente.logradouro || '',
                              numero: requerente.numero || '',
                              bairro: requerente.bairro || '',
                              cidade: requerente.cidade || '',
                              uf: requerente.uf || '',
                              referencia: requerente.referencia || ''
                            }));
                            // Busca latitude e longitude pelo endereço do cadastro
                            buscarCoordenadas(
                              requerente.logradouro || '',
                              requerente.bairro || '',
                              requerente.cidade || '',
                              requerente.uf || '',
                              (requerente.cep || '').replace(/\D/g, ''),
                              requerente.numero || ''
                            );
                            toast.success('Endereço do cadastro carregado!');
                          }
                        } catch (error) {
                          console.error('Erro ao buscar endereço:', error);
                          toast.error('Erro ao buscar endereço do cadastro');
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-primary-600 text-sm font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 transition-colors"
                    >
                      ✓ Usar Endereço do Cadastro
                    </button>
                  </div>
                )}
              </div>
              <div className="hidden">
                <div className="flex items-center">
                  <input id="usarEnderecoRequerente"
                        name="usarEnderecoRequerente"
                        type="checkbox"
                        checked={usarEnderecoRequerente}
                        onChange={async (e) => {
                          const isChecked = e.target.checked;
                          setUsarEnderecoRequerente(isChecked);
                          
                          
                          if (isChecked && formData.requerente_cpf) {
                            // Buscar dados do requerente no banco
                            try {
                              const { data: requerente } = await supabase
                                .from('gbp_requerentes_demanda_rua')
                                .select('*')
                                .eq('cpf', formData.requerente_cpf.replace(/\D/g, ''))
                                .eq('empresa_uid', empresa_uid)
                                .single();
                              
                              if (requerente) {
                                setFormData(prev => ({
                                  ...prev,
                                  cep: requerente.cep || '',
                                  logradouro: requerente.logradouro || '',
                                  numero: requerente.numero || '',
                                  bairro: requerente.bairro || '',
                                  cidade: requerente.cidade || '',
                                  uf: requerente.uf || '',
                                  referencia: requerente.referencia || ''
                                }));
                                // Busca latitude e longitude pelo endereço do cadastro
                                buscarCoordenadas(
                                  requerente.logradouro || '',
                                  requerente.bairro || '',
                                  requerente.cidade || '',
                                  requerente.uf || '',
                                  (requerente.cep || '').replace(/\D/g, ''),
                                  requerente.numero || ''
                                );
                              }
                            } catch (error) {
                              console.error('Erro ao buscar endereço do requerente:', error);
                            }
                          } else if (!isChecked) {
                            // Limpa os campos quando desmarcar
                            setFormData(prev => ({
                              ...prev,
                              logradouro: '',
                              numero: '',
                              bairro: '',
                              cidade: '',
                              uf: '',
                              cep: '',
                              referencia: ''
                            }));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor="usarEnderecoRequerente" className="ml-2 block text-sm text-gray-700">
                        Usar mesmo endereço do cadastro
                      </label>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-12">
                {campoVisivel('cep') && (
                <div className="sm:col-span-4">
                  <label htmlFor="cep" className="form-label">
                    CEP {campoObrigatorio('cep') && '*'}
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      name="cep"
                      id="cep"
                      required={campoObrigatorio('cep')}
                      value={formData.cep}
                      onChange={handleInputChange}
                      onBlur={(e) => {
                        // Remove formatação para buscar o CEP
                        const cepLimpo = e.target.value.replace(/\D/g, '');
                        if (cepLimpo.length === 8) {
                          buscarEnderecoPorCep(cepLimpo);
                        }
                      }}
                      className="form-input"
                      maxLength={9}
                      placeholder="00000-000"
                    />
                  </div>
                </div>
                )}

                {campoVisivel('logradouro') && (
                <div className="sm:col-span-6">
                  <label htmlFor="logradouro" className="form-label">
                    Logradouro {campoObrigatorio('logradouro') && '*'}
                  </label>
                  <input
                    type="text"
                    name="logradouro"
                    id="logradouro"
                    required={campoObrigatorio('logradouro')}
                    value={formData.logradouro}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Nome da rua"
                  />
                </div>
                )}

                {campoVisivel('numero') && (
                <div className="sm:col-span-2">
                  <label htmlFor="numero" className="form-label">
                    Nº {campoObrigatorio('numero') && '*'}
                  </label>
                  <input
                    type="text"
                    name="numero"
                    id="numero"
                    required={campoObrigatorio('numero')}
                    value={formData.numero}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                )}

                {campoVisivel('bairro') && (
                <div className="sm:col-span-6">
                  <label htmlFor="bairro" className="form-label">
                    Bairro {campoObrigatorio('bairro') && '*'}
                  </label>
                  <input
                    type="text"
                    name="bairro"
                    id="bairro"
                    required={campoObrigatorio('bairro')}
                    value={formData.bairro}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                )}

                {campoVisivel('referencia') && (
                <div className="sm:col-span-6">
                  <label htmlFor="referencia" className="form-label">
                    Referência {campoObrigatorio('referencia') && '*'}
                  </label>
                  <input
                    type="text"
                    name="referencia"
                    id="referencia"
                    required={campoObrigatorio('referencia')}
                    value={formData.referencia}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Ex: Próximo ao mercado, em frente à praça, etc."
                  />
                </div>
                )}

                {campoVisivel('cidade') && (
                <div className="sm:col-span-8">
                  <label htmlFor="cidade" className="form-label">
                    Cidade {campoObrigatorio('cidade') && '*'}
                  </label>
                  <input
                    type="text"
                    name="cidade"
                    id="cidade"
                    required={campoObrigatorio('cidade')}
                    value={formData.cidade}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                )}

                {campoVisivel('uf') && (
                <div className="sm:col-span-4">
                  <label htmlFor="uf" className="form-label">
                    UF {campoObrigatorio('uf') && '*'}
                  </label>
                  <input
                    type="text"
                    name="uf"
                    id="uf"
                    required={campoObrigatorio('uf')}
                    maxLength={2}
                    value={formData.uf}
                    onChange={handleInputChange}
                    className="form-input uppercase"
                  />
                </div>
                )}

                {/* Campos provisórios para conferir geocoding - OCULTOS */}
                <div className="hidden">
                  <input
                    type="hidden"
                    name="latitude"
                    id="latitude"
                    value={formData.latitude || ''}
                  />
                  <input
                    type="hidden"
                    name="longitude"
                    id="longitude"
                    value={formData.longitude || ''}
                  />
                </div>
              </div>
            </div>
            )}

            {/* Detalhes da Demanda - Etapa 3 */}
            {secaoDemandaVisivel && currentStep === 3 && (
            <div className="form-section">
              <h3>Detalhes da Demanda</h3>
              
              <div className="grid grid-cols-1 gap-y-3 gap-x-4 sm:grid-cols-12 sm:gap-y-4 sm:gap-x-6">
                <div className="col-span-full w-full">
                  {campoVisivel('tipo_de_demanda') && (
                  <>
                  <label htmlFor="tipo_de_demanda" className="form-label">
                    Tipo de Demanda {campoObrigatorio('tipo_de_demanda') && '*'}
                  </label>
                  <select
                    id="tipo_de_demanda"
                    name="tipo_de_demanda"
                    required={campoObrigatorio('tipo_de_demanda')}
                    value={formData.tipo_de_demanda}
                    onChange={handleInputChange}
                    disabled={loadingTipos}
                    className="form-select w-full block"
                    style={{ width: '100%' }}
                  >
                    <option value="">
                      {loadingTipos ? 'Carregando tipos...' : 'Selecione o tipo de demanda...'}
                    </option>
                    {tiposDemanda.map((tipo) => {
                      // Se for um cabeçalho de grupo, renderizar como optgroup
                      if (tipo.value.startsWith('header-')) {
                        return (
                          <optgroup 
                            key={tipo.value} 
                            label={tipo.label}
                            className="font-semibold text-blue-600"
                          >
                            {tiposDemanda
                              .filter(t => t.group === tipo.group && !t.value.startsWith('header-'))
                              .map((item) => (
                                <option key={item.value} value={item.value}>
                                  {item.label}
                                </option>
                              ))
                            }
                          </optgroup>
                        );
                      }
                      // Se não tiver grupo, renderizar como opção normal
                      if (!tipo.group) {
                        return (
                          <option key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </option>
                        );
                      }
                      // Itens em grupos são renderizados dentro do optgroup
                      return null;
                    })}
                    {tiposDemanda.length === 0 && !loadingTipos && (
                      <option value="" disabled>Nenhum tipo de demanda disponível</option>
                    )}
                  </select>
                  </>
                  )}
                </div>

                <div className="sm:col-span-3">
                  {campoVisivel('nivel_de_urgencia') && (
                  <>
                  <label htmlFor="nivel_de_urgencia" className="form-label">
                    Nível de Urgência {campoObrigatorio('nivel_de_urgencia') && '*'}
                  </label>
                  <select
                    id="nivel_de_urgencia"
                    name="nivel_de_urgencia"
                    required={campoObrigatorio('nivel_de_urgencia')}
                    value={formData.nivel_de_urgencia}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="média">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                  </>
                  )}
                </div>

                {campoVisivel('indicado') && (
                <div className="sm:col-span-6">
                  <label htmlFor="tem_indicado" className="form-label">
                    Esta demanda foi indicada por alguém?
                  </label>
                  <select
                    id="tem_indicado"
                    value={temIndicado}
                    onChange={(e) => {
                      setTemIndicado(e.target.value);
                      // Limpa o indicado_uid se a resposta for "não"
                      if (e.target.value === 'não') {
                        setFormData(prev => ({ ...prev, indicado_uid: '' }));
                      }
                    }}
                    className="form-select"
                  >
                    <option value="não">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </div>
                )}

                {campoVisivel('indicado') && temIndicado === 'sim' && (
                  <div className="sm:col-span-6">
                    <label htmlFor="indicado_uid" className="form-label">
                      Selecione o indicado {campoObrigatorio('indicado') && '*'}
                    </label>
                    <select
                      id="indicado_uid"
                      name="indicado_uid"
                      required={campoObrigatorio('indicado')}
                      value={formData.indicado_uid}
                      onChange={handleInputChange}
                      disabled={loadingIndicados}
                      className="form-select"
                    >
                      <option value="">
                        {loadingIndicados ? 'Carregando indicados...' : 'Selecione um indicado...'}
                      </option>
                      {indicados.map((indicado) => (
                        <option key={indicado.uid} value={indicado.uid}>
                          {indicado.nome}
                          {indicado.bairro && indicado.cidade && ` - ${indicado.bairro}, ${indicado.cidade}`}
                        </option>
                      ))}
                      {indicados.length === 0 && !loadingIndicados && (
                        <option value="" disabled>Nenhum indicado disponível</option>
                      )}
                    </select>
                  </div>
                )}

                <div className="sm:col-span-6 hidden">
                  <label htmlFor="boletim_ocorrencia" className="form-label">
                    Denúncia com boletim de ocorrência? *
                  </label>
                  <select
                    id="boletim_ocorrencia"
                    name="boletim_ocorrencia"
                    value={formData.boletim_ocorrencia}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="não">Não</option>
                    <option value="sim">Sim</option>
                  </select>

                  {formData.boletim_ocorrencia === 'sim' && (
                    <div className="mt-4">
                      <label htmlFor="boletim_arquivo" className="block text-sm font-medium text-gray-700 mb-1">
                        Anexar Boletim de Ocorrência (PDF ou imagem) *
                        {isUploadingBoletim && (
                          <span className="ml-2 text-xs text-yellow-600">
                            <Loader2 className="h-3 w-3 inline-block animate-spin mr-1" />
                            Enviando...
                          </span>
                        )}
                      </label>
                      {boletimFile ? (
                        <div className="flex items-center justify-between p-3 border border-green-300 bg-green-50 rounded-md">
                          <div className="flex items-center">
                            <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm text-gray-700">{boletimFile.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={removeBoletim}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isUploadingBoletim}
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                          <div className="space-y-3 text-center w-full">
                            <svg
                              className="mx-auto h-12 w-12 text-gray-400"
                              stroke="currentColor"
                              fill="none"
                              viewBox="0 0 48 48"
                              aria-hidden="true"
                            >
                              <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <div className="flex flex-row gap-2 justify-center items-center">
                              <label
                                htmlFor="boletim_arquivo"
                                className="cursor-pointer bg-white border-2 border-primary-600 text-primary-600 px-4 py-2 rounded-md font-medium hover:bg-primary-50"
                              >
                                <span>Enviar arquivo</span>
                                <input
                                  id="boletim_arquivo"
                                  name="boletim_arquivo"
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  className="sr-only"
                                  onChange={handleBoletimChange}
                                />
                              </label>
                              
                            </div>
                            <p className="text-xs text-gray-500">PDF, JPG ou PNG (máx. 5MB)</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {campoVisivel('link_da_demanda') && (
                <div className="sm:col-span-6">
                  <label htmlFor="link_da_demanda" className="form-label">
                    Link da demanda nas redes sociais {campoObrigatorio('link_da_demanda') && '*'}
                  </label>
                  <input
                    type="url"
                    name="link_da_demanda"
                    id="link_da_demanda"
                    required={campoObrigatorio('link_da_demanda')}
                    value={formData.link_da_demanda}
                    onChange={handleInputChange}
                    placeholder="https://exemplo.com"
                    className="form-input"
                  />
                </div>
                )}

                {campoVisivel('descricao_do_problema') && (
                <div className="col-span-full">
                  <label htmlFor="descricao_do_problema" className="form-label">
                    Descrição Detalhada {campoObrigatorio('descricao_do_problema') && '*'}
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="descricao_do_problema"
                      name="descricao_do_problema"
                      rows={4}
                      required={campoObrigatorio('descricao_do_problema')}
                      value={formData.descricao_do_problema}
                      onChange={handleInputChange}
                      className="form-textarea"
                      placeholder="Descreva detalhadamente a demanda..."
                      style={{ lineHeight: '1.5' }}
                    />
                  </div>
                </div>
                )}
              </div>

            {/* Fotos do Problema */}
            {campoVisivel('fotos') && (
            <div className="border-b border-gray-200 pb-4 sm:pb-6 mt-4 sm:mt-6">
              <label className="block text-base sm:text-lg font-medium text-gray-900 mb-1 sm:mb-2">
                Fotos do Problema {campoObrigatorio('fotos') && <span className="text-red-500">*</span>}
              </label>
              <p className="text-xs text-gray-500 mb-3">
                {files.length === 0
                  ? 'Adicione até 2 fotos'
                  : `${files.length} de 2 fotos`}
              </p>

              <div
                className="flex flex-wrap gap-3"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group flex-1 min-w-[120px] h-24 sm:h-28">
                    <img
                      src={url}
                      alt={`Foto ${index + 1}`}
                      className="h-full w-full object-cover rounded-xl border border-gray-200 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors"
                      aria-label="Remover foto"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {files.length < 2 && (
                  <label
                    htmlFor="file-upload"
                    className={`relative flex flex-col items-center justify-center flex-1 min-w-[120px] h-24 sm:h-28 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                      isCompressing
                        ? 'border-gray-200 bg-gray-50 opacity-60 cursor-wait'
                        : 'border-gray-300 bg-gray-50/50 hover:border-primary-500 hover:bg-primary-50/40'
                    }`}
                  >
                    {isCompressing ? (
                      <Loader2 className="h-7 w-7 text-primary-600 animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="h-7 w-7 text-gray-400 group-hover:text-primary-600 transition-colors" />
                        <span className="mt-1 text-[11px] font-medium text-gray-500">
                          {files.length === 0 ? 'Foto do problema' : 'Mais uma'}
                        </span>
                      </>
                    )}
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      multiple
                      onChange={handleFileChange}
                      disabled={isCompressing}
                    />
                  </label>
                )}
              </div>
            </div>
            )}

            {/* Termos de uso */}
            {campoVisivel('aceite_termos') && (
            <div className="mt-6">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="aceite_termos"
                    name="aceite_termos"
                    type="checkbox"
                    required={campoObrigatorio('aceite_termos')}
                    checked={formData.aceite_termos}
                    onChange={handleInputChange}
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="aceite_termos" className="font-medium text-gray-700">
                    Eu concordo com os <a href="/termos-uso" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-500 underline">termos de uso e política de privacidade</a> {campoObrigatorio('aceite_termos') && '*'}
                  </label>
                </div>
              </div>
            </div>
            )}
            </div>
            )}

            {/* Navegação do Wizard */}
            <div className="wizard-nav">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="wizard-nav-btn wizard-nav-btn-prev"
                >
                  Voltar
                </button>
              )}
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="wizard-nav-btn wizard-nav-btn-next"
                  style={{
                    backgroundColor: cabecalhoConfig.corBotao,
                    color: cabecalhoConfig.corBotaoTexto
                  }}
                >
                  Próximo
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading || isUploadingBoletim}
                  className="wizard-nav-btn wizard-nav-btn-next"
                  style={{
                    backgroundColor: cabecalhoConfig.corBotao,
                    color: cabecalhoConfig.corBotaoTexto
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Demanda'
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
