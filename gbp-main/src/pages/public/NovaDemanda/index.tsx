import { useState, FormEvent, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabaseClient as supabase } from '../../../lib/supabase';
import { getEmpresa } from '../../../services/empresa';
import { createDemandaRua, uploadDemandaFiles, uploadBoletimOcorrencia, DemandaRuaInput } from '../../../services/demandasRua';
import { indicadoService, type Indicado } from '../../../services/indicadoService';
import { compressImages } from '../../../utils/imageCompression';
import { toast } from 'react-toastify';
import { X, Loader2 } from 'lucide-react';
import './global.css';

interface Empresa {
  uid: string;
  nome: string;
  logo_url?: string;
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
  const [isLoadingEmpresa, setIsLoadingEmpresa] = useState(true);
  const [isUploadingBoletim, setIsUploadingBoletim] = useState(false);
  const [isConsultingCpf, setIsConsultingCpf] = useState(false);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [linkDesativado, setLinkDesativado] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [boletimFile, setBoletimFile] = useState<File | null>(null);
  // Estado para erro de data de nascimento
  const [dataNascimentoError, setDataNascimentoError] = useState<string>('');
  const dataNascimentoRef = useRef<HTMLInputElement>(null);
  const [temEnderecoRequerente, setTemEnderecoRequerente] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'buscando' | 'ok' | 'nao_localizado'>('idle');
  
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
        setIsLoadingEmpresa(true);
        const empresaData = await getEmpresa(empresa_uid);
        
        if (!empresaData) {
          toast.error('Empresa não encontrada');
          navigate('/');
          return;
        }

        // Se o link de demanda público não estiver ativo/disponível
        if (!empresaData.link_demanda_disponivel) {
          setLinkDesativado(true);
        }

        // Atualiza o estado da empresa mesmo se o link estiver desativado
        setEmpresa(empresaData);

        // Link de demanda está sempre disponível
        setIsLoadingEmpresa(false);
        
      } catch (error) {
        console.error('Erro ao carregar empresa:', error);
        toast.error('Erro ao carregar dados da empresa');
        navigate('/');
      } finally {
        setIsLoadingEmpresa(false);
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
          .select('tipo_demanda_rua')
          .eq('empresa_uid', empresa_uid);

        if (error) throw error;
        
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) {
        return;
      }
      
      const newFiles = Array.from(e.target.files);
      const totalFiles = files.length + newFiles.length;
      
      if (totalFiles > 2) {
        toast.warning('Máximo de 2 imagens permitidas');
        e.target.value = '';
        return;
      }
      
      // Verifica se os arquivos são imagens
      const validFiles = newFiles.filter(file => file.type.startsWith('image/'));
      
      if (validFiles.length === 0) {
        toast.warning('Por favor, selecione apenas arquivos de imagem');
        e.target.value = '';
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
      
      // Mostrar informações sobre a compressão
      const originalSize = filesToProcess.reduce((acc, f) => acc + f.size, 0);
      const compressedSize = compressedFiles.reduce((acc, f) => acc + f.size, 0);
      const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(0);
      
      if (parseInt(reduction) > 10) {
        toast.success(`${compressedFiles.length} imagem(ns) adicionada(s) - ${reduction}% menor`, {
          autoClose: 3000
        });
      } else {
        toast.success(`${compressedFiles.length} imagem(ns) adicionada(s)`);
      }
      
      // Limpa o input para permitir selecionar o mesmo arquivo novamente
      e.target.value = '';
    } catch (error) {
      console.error('Erro no handleFileChange:', error);
      toast.error('Erro ao processar as imagens');
    } finally {
      setIsCompressing(false);
    }
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
    if (!formData.aceite_termos) {
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

    // Validar se pelo menos uma foto foi anexada
    console.log('[DEBUG] Validando fotos...');
    if (files.length === 0) {
      console.log('[DEBUG] Nenhuma foto anexada');
      toast.error('Por favor, anexe pelo menos uma foto do problema');
      return;
    }

    // Validar data de nascimento
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

    console.log('[DEBUG] Todas validações passadas! Prosseguindo...');
    setIsLoading(true);

    try {
      // 1. Verificar se o requerente já existe
      const { data: requerenteExistente } = await supabase
        .from('gbp_requerentes_demanda_rua')
        .select('*')
        .eq('cpf', formData.requerente_cpf.replace(/\D/g, ''))
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
          nome: formData.requerente_nome,
          cpf: formData.requerente_cpf.replace(/\D/g, ''),
          whatsapp: formData.requerente_whatsapp,
          nascimento: dataNascimentoFormatada,
          genero: formData.genero,
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

  if (isLoadingEmpresa) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Verifica se o link de demanda público não está ativo
  if (linkDesativado) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6 py-12 font-sans light">
        <div className="max-w-3xl w-full flex flex-col md:flex-row items-center justify-between gap-8 md:gap-16">
          
          {/* Lado Esquerdo: Conteúdo de Texto */}
          <div className="flex-1 text-center md:text-left space-y-5">
            {/* Logo da Instituição */}
            <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
              {empresa?.logo_url ? (
                <img
                  className="h-10 w-auto max-w-[150px] object-contain"
                  src={empresa.logo_url}
                  alt={`Logo ${empresa.nome}`}
                />
              ) : (
                <span className="text-xl font-bold tracking-tight text-gray-800">
                  {empresa?.nome || 'GBP Político'}
                </span>
              )}
            </div>
            
            <div className="space-y-3">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                <span className="text-blue-600 font-extrabold">404.</span> Ops, ocorreu um erro.
              </h1>
              <p className="text-gray-600 text-base leading-relaxed max-w-md">
                A página que você está tentando acessar está temporariamente indisponível devido a instabilidades técnicas.
              </p>
            </div>
            
            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex justify-center items-center py-2 px-5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors font-semibold"
              >
                Tentar novamente
              </button>
            </div>
          </div>
          
          {/* Lado Direito: Ilustração SVG Robô Quebrado */}
          <div className="flex-shrink-0 flex items-center justify-center text-blue-500/80">
            <svg className="w-56 h-56 md:w-64 md:h-64" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Ground Shadow */}
              <path d="M30 180 H170" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="5 5" />
              
              {/* Antenna */}
              <path d="M100 40 V20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="100" cy="17" r="4" fill="currentColor" />
              
              {/* Head */}
              <rect x="70" y="40" width="60" height="40" rx="8" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
              
              {/* Left Eye (Normal) */}
              <circle cx="88" cy="55" r="5" stroke="currentColor" strokeWidth="2" />
              <circle cx="88" cy="55" r="2" fill="currentColor" />
              
              {/* Right Eye (X shape for broken/error) */}
              <path d="M108 51 L116 59 M116 51 L108 59" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              
              {/* Mouth (Sad/Wavy) */}
              <path d="M85 70 Q100 64 115 70" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              
              {/* Neck */}
              <rect x="92" y="80" width="16" height="10" stroke="currentColor" strokeWidth="2.5" />
              
              {/* Body */}
              <rect x="60" y="90" width="80" height="60" rx="10" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
              
              {/* Heart/Battery indicator on chest */}
              <rect x="75" y="105" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
              <line x1="78" y1="110" x2="84" y2="110" stroke="currentColor" strokeWidth="2" />
              
              {/* Broken gauge meter scale on chest */}
              <path d="M110 115 A 10 10 0 0 1 125 115" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="117.5" y1="115" x2="113" y2="108" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              
              {/* Left Arm (Holding wrench) */}
              <path d="M60 105 H40 V125" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Wrench head */}
              <path d="M35 125 H45 M35 130 H45 M37 125 V130 M40 120 L40 125" stroke="currentColor" strokeWidth="2" />
              <path d="M35 130 A 5 5 0 0 0 45 130" stroke="currentColor" strokeWidth="2" fill="none" />
              
              {/* Right Arm (Disconnected/Sparking) */}
              <path d="M140 105 Q155 105 160 115" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              {/* Sparkles */}
              <path d="M165 110 L170 112 M162 120 L165 125 M155 120 L153 125" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              
              {/* Debris on ground */}
              <circle cx="145" cy="165" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="145" cy="165" r="4" stroke="currentColor" strokeWidth="2" />
              
              <line x1="55" y1="165" x2="65" y2="165" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <line x1="60" y1="161" x2="60" y2="169" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              
              <line x1="80" y1="175" x2="95" y2="171" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          
        </div>
      </div>
    );
  }

  // Verifica se o link de demanda está disponível
  if (!empresa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Empresa não encontrada</h2>
          <p className="text-gray-600 mb-6">O link de acesso é inválido ou a empresa não existe mais.</p>
          <button
            onClick={() => navigate('/')}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Voltar para a página inicial
          </button>
        </div>
      </div>
    );
  }

  // Renderiza o formulário (link sempre disponível)
  return (
    <div className="page-wrapper">
      <div className="content-wrapper">
        <form onSubmit={handleSubmit} className="w-full">
          {/* Banner da Empresa */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-xl">
            <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 relative overflow-hidden">
              {/* Efeito de brilho sutil */}
              <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10"></div>
              
              {/* Botão Minhas Demandas no canto direito */}
              {empresa_uid && (
                <div className="absolute top-24 right-4 z-20">
                  <a 
                    href={`/minhas-demandas/empresa/${empresa_uid}`}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-white/20 hover:bg-white/30 transition-colors whitespace-nowrap border border-white/20"
                  >
                    Minhas Demandas
                  </a>
                </div>
              )}
              
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-start justify-start text-left">
                  <div className="flex items-center space-x-6">
                    {empresa?.logo_url && (
                      <div className="flex-shrink-0 bg-white/10 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-white/10 transform transition-all duration-300 hover:scale-105">
                        <img
                          className="h-14 w-auto max-w-[140px] object-contain"
                          src={empresa.logo_url}
                          alt={`Logo ${empresa.nome}`}
                        />
                      </div>
                    )}
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
                        {empresa.nome || 'Sistema de Demandas'}
                      </h1>
                      <p className="text-primary-100 mt-1 text-sm sm:text-base">
                        Registre ou consulte sua demanda
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <p className="text-gray-200 text-sm">
                          Atendimento Online
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Formulário de Registro</h2>
            <p className="text-gray-600 mb-4">
              Utilize este formulário para registrar sua demanda. Tem algum problema? Nos envie.
            </p>
            <div className="h-1 w-20 bg-gray-600 rounded-full mb-4"></div>

            {/* Dados do Requerente */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Dados do Requerente</h3>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
                {/* CPF */}
                <div className="col-span-full">
                  <label htmlFor="requerente_cpf" className="block text-sm font-medium text-gray-700">
                    CPF *
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
                    required
                    maxLength={14}
                    placeholder="000.000.000-00"
                    value={formData.requerente_cpf}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>

                {/* Nome Completo */}
                <div className="sm:col-span-6">
                  <label htmlFor="requerente_nome" className="block text-sm font-medium text-gray-700">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    id="requerente_nome"
                    name="requerente_nome"
                    required
                    value={formData.requerente_nome}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>

                <div className="col-span-full">
                  <label htmlFor="requerente_whatsapp" className="block text-sm font-medium text-gray-700">
                    WhatsApp *
                  </label>
                  <input
                    type="tel"
                    name="requerente_whatsapp"
                    id="requerente_whatsapp"
                    required
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    value={formData.requerente_whatsapp}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>

                <div className="col-span-full">
                  <label htmlFor="requerente_data_nascimento" className={`block text-sm font-medium ${dataNascimentoError ? 'text-red-600' : 'text-gray-700'}`}>
                    Data de Nascimento *
                  </label>
                  <input
                    type="text"
                    name="requerente_data_nascimento"
                    id="requerente_data_nascimento"
                    ref={dataNascimentoRef}
                    required
                    maxLength={10}
                    placeholder="dd/mm/aaaa"
                    value={formData.requerente_data_nascimento}
                    onChange={(e) => {
                      handleInputChange(e);
                      if (dataNascimentoError) setDataNascimentoError(''); // Limpa erro ao digitar
                    }}
                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                      dataNascimentoError 
                        ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300'
                    }`}
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

                <div className="col-span-full">
                  <label htmlFor="genero" className="block text-sm font-medium text-gray-700">
                    Gênero *
                  </label>
                  <select
                    id="genero"
                    name="genero"
                    required
                    value={formData.genero}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" style={{ WebkitAppearance: "none", MozAppearance: "none", appearance: "none", backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
                  >
                    <option value="">Selecione...</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                    <option value="outro">Outro</option>
                    <option value="prefiro_nao_informar">Prefiro não informar</option>
                  </select>
                </div>

              </div>
            </div>

            {/* Endereço */}
            <div className="border-b border-gray-200 pb-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Endereço do Problema</h3>
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
                <div className="sm:col-span-4">
                  <label htmlFor="cep" className="block text-sm font-medium text-gray-700">
                    CEP *
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      name="cep"
                      id="cep"
                      required
                      value={formData.cep}
                      onChange={handleInputChange}
                      onBlur={(e) => {
                        // Remove formatação para buscar o CEP
                        const cepLimpo = e.target.value.replace(/\D/g, '');
                        if (cepLimpo.length === 8) {
                          buscarEnderecoPorCep(cepLimpo);
                        }
                      }}
                      className={`flex-1 min-w-0 block w-full px-3 py-2 rounded-md border bg-white border-gray-300 shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                      maxLength={9}
                      placeholder="00000-000"
                    />
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="logradouro" className="block text-sm font-medium text-gray-700">
                    Logradouro *
                  </label>
                  <input
                    type="text"
                    name="logradouro"
                    id="logradouro"
                    required
                    value={formData.logradouro}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full px-3 py-2 rounded-md border bg-white border-gray-300 shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                    placeholder="Nome da rua"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="numero" className="block text-sm font-medium text-gray-700">
                    Nº *
                  </label>
                  <input
                    type="text"
                    name="numero"
                    id="numero"
                    value={formData.numero}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full border bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                  />
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="bairro" className="block text-sm font-medium text-gray-700">
                    Bairro *
                  </label>
                  <input
                    type="text"
                    name="bairro"
                    id="bairro"
                    required
                    value={formData.bairro}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full border bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                  />
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="referencia" className="block text-sm font-medium text-gray-700">
                    Referência
                  </label>
                  <input
                    type="text"
                    name="referencia"
                    id="referencia"
                    value={formData.referencia}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full border bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                    placeholder="Ex: Próximo ao mercado, em frente à praça, etc."
                  />
                </div>

                <div className="sm:col-span-8">
                  <label htmlFor="cidade" className="block text-sm font-medium text-gray-700">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    name="cidade"
                    id="cidade"
                    required
                    value={formData.cidade}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full border bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                  />
                </div>

                <div className="sm:col-span-4">
                  <label htmlFor="uf" className="block text-sm font-medium text-gray-700">
                    UF *
                  </label>
                  <input
                    type="text"
                    name="uf"
                    id="uf"
                    required
                    maxLength={2}
                    value={formData.uf}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full border bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm uppercase`}
                  />
                </div>

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

            {/* Detalhes da Demanda */}
            <div className="border-b border-gray-200 pb-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Detalhes da Demanda</h3>
              
              <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="tipo_de_demanda" className="block text-sm font-medium text-gray-700">
                    Tipo de Demanda *
                  </label>
                  <select
                    id="tipo_de_demanda"
                    name="tipo_de_demanda"
                    required
                    value={formData.tipo_de_demanda}
                    onChange={handleInputChange}
                    disabled={loadingTipos}
                    className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:opacity-70 disabled:cursor-not-allowed" style={{ WebkitAppearance: "none", MozAppearance: "none", appearance: "none", backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
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
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="nivel_de_urgencia" className="block text-sm font-medium text-gray-700">
                    Nível de Urgência *
                  </label>
                  <select
                    id="nivel_de_urgencia"
                    name="nivel_de_urgencia"
                    required
                    value={formData.nivel_de_urgencia}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" style={{ WebkitAppearance: "none", MozAppearance: "none", appearance: "none", backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
                  >
                    <option value="baixa">Baixa</option>
                    <option value="média">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="tem_indicado" className="block text-sm font-medium text-gray-700">
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
                    className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" style={{ WebkitAppearance: "none", MozAppearance: "none", appearance: "none", backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
                  >
                    <option value="não">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </div>

                {temIndicado === 'sim' && (
                  <div className="sm:col-span-6">
                    <label htmlFor="indicado_uid" className="block text-sm font-medium text-gray-700">
                      Selecione o indicado *
                    </label>
                    <select
                      id="indicado_uid"
                      name="indicado_uid"
                      required
                      value={formData.indicado_uid}
                      onChange={handleInputChange}
                      disabled={loadingIndicados}
                      className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:opacity-70 disabled:cursor-not-allowed" style={{ WebkitAppearance: "none", MozAppearance: "none", appearance: "none", backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
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
                  <label htmlFor="boletim_ocorrencia" className="block text-sm font-medium text-gray-700">
                    Denúncia com boletim de ocorrência? *
                  </label>
                  <select
                    id="boletim_ocorrencia"
                    name="boletim_ocorrencia"
                    value={formData.boletim_ocorrencia}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" style={{ WebkitAppearance: "none", MozAppearance: "none", appearance: "none", backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
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

                <div className="sm:col-span-6">
                  <label htmlFor="link_da_demanda" className="block text-sm font-medium text-gray-700">
                    Link da demanda nas redes sociais (opcional)
                  </label>
                  <input
                    type="url"
                    name="link_da_demanda"
                    id="link_da_demanda"
                    value={formData.link_da_demanda}
                    onChange={handleInputChange}
                    placeholder="https://exemplo.com"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="descricao_do_problema" className="block text-sm font-medium text-gray-700">
                    Descrição Detalhada *
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="descricao_do_problema"
                      name="descricao_do_problema"
                      rows={4}
                      required
                      value={formData.descricao_do_problema}
                      onChange={handleInputChange}
                      className="px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 block w-full sm:text-sm border border-gray-300 rounded-md transition-colors"
                      placeholder="Descreva detalhadamente a demanda..."
                      style={{ lineHeight: '1.5' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fotos do Problema */}
            <div className="border-b border-gray-200 pb-6 mt-6">
              <label className="block text-lg font-medium text-gray-900 mb-4">
                Fotos do Problema <span className="text-red-500">*</span>
                <span className="text-xs font-normal text-gray-500 ml-1">
                  (Mín. 1, Máx. 2 imagens)
                </span>
              </label>
              
              {previewUrls.length > 0 ? (
                <div>
                  {/* Pré-visualização das imagens */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                    {previewUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Pré-visualização ${index + 1}`}
                          className="h-24 w-full object-cover rounded-md border-2 border-green-300"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Botão para adicionar mais fotos (se ainda não atingiu o limite) */}
                  {files.length < 2 && (
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
                            htmlFor="file-upload-more"
                            className={`cursor-pointer bg-white border-2 border-primary-600 text-primary-600 px-4 py-2 rounded-md font-medium hover:bg-primary-50 ${isCompressing ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <span className="flex items-center gap-2">
                              {isCompressing ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Comprimindo...
                                </>
                              ) : (
                                'Adicionar mais fotos'
                              )}
                            </span>
                            <input
                              id="file-upload-more"
                              name="file-upload-more"
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="sr-only"
                              multiple
                              onChange={handleFileChange}
                              disabled={isCompressing}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF até 10MB</p>
                      </div>
                    </div>
                  )}
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
                        htmlFor="file-upload"
                        className={`cursor-pointer bg-white border-2 border-primary-600 text-primary-600 px-4 py-2 rounded-md font-medium hover:bg-primary-50 ${isCompressing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className="flex items-center gap-2">
                          {isCompressing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Comprimindo...
                            </>
                          ) : (
                            'Enviar fotos'
                          )}
                        </span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="sr-only"
                          multiple
                          onChange={handleFileChange}
                          disabled={isCompressing}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF até 10MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Termos de uso */}
            <div className="mt-6">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="aceite_termos"
                    name="aceite_termos"
                    type="checkbox"
                    required
                    checked={formData.aceite_termos}
                    onChange={handleInputChange}
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="aceite_termos" className="font-medium text-gray-700">
                    Eu concordo com os <a href="/termos-uso" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-500 underline">termos de uso e política de privacidade</a> *
                  </label>
                </div>
              </div>
            </div>

            {/* Barra de ações */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || isUploadingBoletim}
                  onClick={() => console.log('[DEBUG] Botão clicado - isLoading:', isLoading, 'isUploadingBoletim:', isUploadingBoletim)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
