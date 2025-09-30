import React, { useState, useRef, useEffect, Fragment, useCallback, FC } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, User, Phone, MapPin, Vote, Calendar, Mail, Edit, MessageCircle, 
  Pencil, Printer, Users, PlusSquare, Trash2, AlertTriangle, Tag, Save, X,
  ChevronDown, FileText, UserCircle, Calendar as CalendarIcon, Users2, UserRound
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCompanyStore } from '../../store/useCompanyStore';
import { supabaseClient } from '../../lib/supabase';
import { Menu, Transition, Dialog } from '@headlessui/react';
import { CheckCircle, Clock, Hourglass, XCircle } from 'lucide-react';
import { toast } from "../../components/ui/use-toast";
import { DocumentosAnexados } from './components/DocumentosAnexados';

interface Eleitor {
  uid: string;
  nome: string;
  cpf: string;
  nascimento: string;
  genero: string;
  nome_mae: string;
  whatsapp: string;
  telefone: string;
  titulo: string;
  zona: string;
  secao: string;
  cep: string;
  logradouro: string;
  cidade: string;
  bairro: string;
  numero: string;
  complemento: string;
  uf: string;
  empresa_uid: string;
  created_at: string;
  indicado_uid?: string;
  categoria_uid: string;
  usuario_uid: string;
  responsavel: string;
  ax_rg_cnh: string | null;
  ax_cpf: string | null;
  ax_cert_nascimento: string | null;
  ax_titulo: string | null;
  ax_comp_residencia: string | null;
  ax_foto_3x4: string | null;
  gbp_indicado?: Indicado;
  gbp_categorias: {
    uid: string;
    nome: string;
  } | null;
  numero_sus?: string;
  instagram?: string;
  numero_do_sus?: string;
  quantidade_adultos_residencia?: string | number;
  responsavel_pelo_eleitor?: string;
  confiabilidade_do_voto?: string;
  colegio_eleitoral?: string;
}

interface Indicado {
  uid: string;
  nome: string;
}

interface Atendimento {
  uid: string;
  eleitor_uid: string;
  empresa_uid: string;
  categoria_uid: string;
  descricao: string;
  data_atendimento: string;
  status: string;
  responsavel_uid: string;
  numero: number;
  created_at: string;
  gbp_categorias: {
    uid: string;
    nome: string;
  } | null;
  responsavel: {
    uid: string;
    nome: string;
  } | null;
  indicado: {
    uid: string;
    nome: string;
  } | null;
  observacoes: Array<{
    uid: string;
    observacao: string;
    created_at: string;
    responsavel: string;
    responsavel_nome?: string;
  }>;
}

type StatusType = 'Pendente' | 'Em Andamento' | 'Concluído' | 'Cancelado';

interface StatusConfig {
  label: string;
  color: string;
  icon: React.ReactNode;
}

const statusConfigs: Record<StatusType, StatusConfig> = {
  'Pendente': {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    icon: <Clock className="w-4 h-4" />
  },
  'Em Andamento': {
    label: 'Em Andamento',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: <Hourglass className="w-4 h-4" />
  },
  'Concluído': {
    label: 'Concluído',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    icon: <CheckCircle className="w-4 h-4" />
  },
  'Cancelado': {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: <XCircle className="w-4 h-4" />
  }
};

type QueryKey = ['eleitor', string] | ['atendimentos', string] | ['eleitores'];

interface ModalState {
  personalOpen: boolean;
  contactOpen: boolean;
  titleOpen: boolean;
  addressOpen: boolean;
  deleteOpen: boolean;
}

interface Categoria {
  uid: string;
  nome: string;
}

export const EleitorDetalhes: FC = () => {
  // 1. Hooks básicos
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const company = useCompanyStore((state) => state.company);
  const contentRef = useRef<HTMLDivElement>(null);

  // 2. Estados
  const [atendimentoToDelete, setAtendimentoToDelete] = useState<Atendimento | null>(null);
  const [modalState, setModalState] = useState<ModalState>({
    personalOpen: false,
    contactOpen: false,
    titleOpen: false,
    addressOpen: false,
    deleteOpen: false
  });
  const [editingAtendimento, setEditingAtendimento] = useState<Atendimento | null>(null);
  const [descricaoTemp, setDescricaoTemp] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    nascimento: '',
    genero: '',
    nome_mae: '',
    whatsapp: '',
    telefone: '',
    titulo: '',
    zona: '',
    secao: '',
    cep: '',
    logradouro: '',
    cidade: '',
    bairro: '',
    numero: '',
    complemento: '',
    uf: '',
    instagram: '',
    numero_do_sus: '',
    quantidade_adultos_residencia: '',
    responsavel_pelo_eleitor: '',
    confiabilidade_do_voto: '',
    colegio_eleitoral: ''
  });
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [expandedObservations, setExpandedObservations] = useState<{ [key: string]: boolean }>({});
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [indicados, setIndicados] = useState<Indicado[]>([]);
  const [editandoCategoria, setEditandoCategoria] = useState(false);
  const [editandoIndicado, setEditandoIndicado] = useState(false);
  const [editandoCamposAdicionais, setEditandoCamposAdicionais] = useState(false);
  const [oficios, setOficios] = useState<Array<{
    uid: string;
    titulo: string;
    descricao: string;
    data_solicitacao: string;
    descricao_do_problema: string | null;
    status_solicitacao: string | null;
    tipo_de_demanda: string | null;
    responsavel_nome: string | null;
    created_at: string;
  }>>([]);
  const [loadingOficios, setLoadingOficios] = useState(false);

  // 3. Extrair uid da URL
  const extractedUid = window.location.pathname.match(/\/eleitores\/([^/]+)/)?.[1];
  const effectiveUid = uid || extractedUid;

  // 4. Função para carregar ofícios do eleitor
  const carregarOficios = useCallback(async (eleitorUid: string) => {
    if (!eleitorUid) return;
    
    try {
      setLoadingOficios(true);
      const { data, error } = await supabaseClient
        .from('gbp_oficios')
        .select('*')
        .eq('eleitor_uid', eleitorUid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setOficios(data || []);
    } catch (error) {
      console.error('Erro ao carregar ofícios:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os ofícios deste eleitor.',
      });
    } finally {
      setLoadingOficios(false);
    }
  }, []);

  // 5. Query para buscar os dados do eleitor
  const { data: eleitor, isLoading, error } = useQuery({
    queryKey: ['eleitor', effectiveUid || '', company?.uid || ''] as const,
    queryFn: async () => {
      if (!effectiveUid || !company?.uid) {
        throw new Error('Parâmetros inválidos');
      }

      try {
        console.log('Buscando eleitor:', effectiveUid);
        const { data: eleitorData, error: eleitorError } = await supabaseClient
          .from('gbp_eleitores')
          .select(`
            *,
            gbp_indicado!indicado_uid (
              uid,
              nome
            ),
            gbp_categorias!categoria_uid (
              uid,
              nome
            ),
            numero_do_sus,
            instagram,
            responsavel_pelo_eleitor,
            confiabilidade_do_voto,
            quantidade_adultos_residencia,
            colegio_eleitoral
          `)
          .eq('uid', effectiveUid)
          .eq('empresa_uid', company.uid)
          .single();

        if (eleitorError) {
          console.error('Erro na query do eleitor:', eleitorError);
          throw eleitorError;
        }
        if (!eleitorData) {
          console.log('Nenhum eleitor encontrado');
          return null;
        }

        // Buscar dados do responsável
        if (eleitorData.usuario_uid) {
          const { data: responsavelData, error: responsavelError } = await supabaseClient
            .from('gbp_usuarios')
            .select('uid, nome')
            .eq('uid', eleitorData.usuario_uid)
            .single();

          if (responsavelError) {
            console.error('Erro ao buscar responsável:', responsavelError);
          } else if (responsavelData) {
            eleitorData.responsavel = responsavelData.nome;
          }
        }
        
        console.log('Eleitor encontrado:', eleitorData);
        return eleitorData as Eleitor;
      } catch (error) {
        console.error('Erro na query:', error);
        throw error;
      }
    },
    enabled: Boolean(effectiveUid && company?.uid)
  });

  // 6. Efeito para carregar ofícios quando o eleitor for carregado
  useEffect(() => {
    if (eleitor?.uid) {
      carregarOficios(eleitor.uid);
    }
  }, [eleitor?.uid, carregarOficios]);

  // Query para buscar os atendimentos
  const { data: atendimentosData, isLoading: loadingAtendimentos } = useQuery({
    queryKey: ['atendimentos', effectiveUid || '', company?.uid || ''] as const,
    queryFn: async () => {
      if (!effectiveUid || !company?.uid) {
        throw new Error('Parâmetros inválidos');
      }

      try {
        console.log('Buscando atendimentos do eleitor:', effectiveUid);
        const { data: atendimentosData, error: atendimentosError } = await supabaseClient
          .from('gbp_atendimentos')
          .select(`
            *,
            gbp_categorias!categoria_uid (
              uid,
              nome
            )
          `)
          .eq('eleitor_uid', effectiveUid)
          .eq('empresa_uid', company.uid)
          .order('created_at', { ascending: false });

        if (atendimentosError) {
          console.error('Erro ao buscar atendimentos:', atendimentosError);
          throw atendimentosError;
        }

        // Buscar dados dos responsáveis, indicados e observações
        const atendimentosCompletos = await Promise.all(atendimentosData.map(async (atendimento) => {
          const atendimentoCompleto = { ...atendimento };

          // Buscar responsável
          if (atendimento.responsavel_uid) {
            const { data: responsavelData, error: responsavelError } = await supabaseClient
              .from('gbp_usuarios')
              .select('uid, nome')
              .eq('uid', atendimento.responsavel_uid)
              .single();

            if (responsavelError) {
              console.error('Erro ao buscar responsável:', responsavelError);
            } else if (responsavelData) {
              atendimentoCompleto.responsavel = responsavelData;
            }
          }

          // Buscar indicado
          if (atendimento.indicado_uid) {
            const { data: indicadoData, error: indicadoError } = await supabaseClient
              .from('gbp_indicado')
              .select('uid, nome')
              .eq('uid', atendimento.indicado_uid)
              .single();

            if (indicadoError) {
              console.error('Erro ao buscar indicado:', indicadoError);
            } else if (indicadoData) {
              atendimentoCompleto.indicado = indicadoData;
            }
          }

          // Buscar observações
          const { data: observacoesData, error: observacoesError } = await supabaseClient
            .from('gbp_observacoes')
            .select(`
              uid,
              observacao,
              created_at,
              responsavel,
              gbp_usuarios!responsavel (
                uid,
                nome
              )
            `)
            .eq('atendimento_uid', atendimento.uid)
            .eq('empresa_uid', company.uid)
            .order('created_at', { ascending: true });

          if (observacoesError) {
            console.error('Erro ao buscar observações:', observacoesError);
            atendimentoCompleto.observacoes = [];
          } else {
            atendimentoCompleto.observacoes = observacoesData.map(obs => ({
              ...obs,
              responsavel_nome: obs.gbp_usuarios?.nome || 'Sistema'
            })) || [];
          }

          return atendimentoCompleto;
        }));

        console.log('Atendimentos encontrados:', atendimentosCompletos);
        return atendimentosCompletos || [];
      } catch (error) {
        console.error('Erro na query de atendimentos:', error);
        throw error;
      }
    },
    enabled: Boolean(effectiveUid && company?.uid)
  });

  // Atualizar o estado local quando os dados chegarem
  useEffect(() => {
    if (atendimentosData) {
      setAtendimentos(atendimentosData);
    }
  }, [atendimentosData]);

  // Buscar categorias disponíveis
  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_categorias')
        .select('*')
        .eq('empresa_uid', company?.uid)
        .order('nome');

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      toast({
        title: "Erro ao carregar categorias",
        description: "Não foi possível carregar as categorias disponíveis.",
        variant: "destructive",
      });
    }
  };

  // Buscar indicados disponíveis
  const fetchIndicados = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_indicado')
        .select('uid, nome')
        .eq('empresa_uid', company?.uid)
        .order('nome');

      if (error) throw error;
      setIndicados(data || []);
    } catch (error) {
      console.error('Erro ao buscar indicados:', error);
      toast({
        title: "Erro ao carregar indicados",
        description: "Não foi possível carregar a lista de indicados.",
        variant: "destructive",
      });
    }
  };

  // Carregar categorias quando o componente montar
  useEffect(() => {
    fetchCategorias();
  }, [company?.uid]);

  // Carregar indicados quando iniciar edição
  useEffect(() => {
    if (editandoIndicado) {
      fetchIndicados();
    }
  }, [editandoIndicado, company?.uid]);

  // Atualizar formData quando o modal for aberto
  useEffect(() => {
    if (modalState.personalOpen && eleitor) {
      setFormData(prev => ({
        ...prev,
        nome: eleitor.nome || '',
        cpf: eleitor.cpf || '',
        nascimento: eleitor.nascimento ? eleitor.nascimento.split('T')[0].split('-').reverse().join('-') : '',
        genero: eleitor.genero || '',
        nome_mae: eleitor.nome_mae || '',
        whatsapp: eleitor.whatsapp || '',
        telefone: eleitor.telefone || '',
        titulo: eleitor.titulo || '',
        zona: eleitor.zona || '',
        secao: eleitor.secao || '',
        cep: eleitor.cep || '',
        logradouro: eleitor.logradouro || '',
        cidade: eleitor.cidade || '',
        bairro: eleitor.bairro || '',
        numero: eleitor.numero || '',
        complemento: eleitor.complemento || '',
        uf: eleitor.uf || ''
      }));
    }
  }, [modalState.personalOpen, eleitor]);

  // Atualizar dados de contato quando o modal de contato for aberto
  useEffect(() => {
    if (modalState.contactOpen && eleitor) {
      setFormData(prev => ({
        ...prev,
        whatsapp: eleitor.whatsapp || '',
        telefone: eleitor.telefone || '',
        instagram: eleitor.instagram || '',
        numero_do_sus: eleitor.numero_do_sus || '',
        quantidade_adultos_residencia: eleitor.quantidade_adultos_residencia || '',
        responsavel_pelo_eleitor: eleitor.responsavel_pelo_eleitor || '',
        confiabilidade_do_voto: eleitor.confiabilidade_do_voto || '',
        colegio_eleitoral: eleitor.colegio_eleitoral || ''
      }));
    }
  }, [modalState.contactOpen, eleitor]);

  // Função para atualizar a categoria do eleitor
  const atualizarCategoria = async (categoriaUid: string) => {
    try {
      const { error } = await supabaseClient
        .from('gbp_eleitores')
        .update({ categoria_uid: categoriaUid })
        .eq('uid', effectiveUid);

      if (error) throw error;

      // Atualizar cache do React Query
      queryClient.invalidateQueries(['eleitor', effectiveUid]);
      
      toast({
        title: "Categoria atualizada",
        description: "A categoria do eleitor foi atualizada com sucesso.",
        variant: "success"
      });

      setEditandoCategoria(false);
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      toast({
        title: "Erro ao atualizar categoria",
        description: "Não foi possível atualizar a categoria do eleitor.",
        variant: "destructive",
      });
    }
  };

  // Função para atualizar o indicado do eleitor
  const atualizarIndicado = async (indicadoUid: string) => {
    try {
      const { error } = await supabaseClient
        .from('gbp_eleitores')
        .update({ indicado_uid: indicadoUid })
        .eq('uid', effectiveUid);

      if (error) throw error;

      // Atualizar cache do React Query
      queryClient.invalidateQueries(['eleitor', effectiveUid]);
      
      toast({
        title: "Indicado atualizado",
        description: "O indicado do eleitor foi atualizado com sucesso.",
        variant: "success"
      });

      setEditandoIndicado(false);
    } catch (error) {
      console.error('Erro ao atualizar indicado:', error);
      toast({
        title: "Erro ao atualizar indicado",
        description: "Não foi possível atualizar o indicado do eleitor.",
        variant: "destructive",
      });
    }
  };

  // Função para atualizar campos adicionais
  const atualizarCamposAdicionais = async (dados: { 
    numero_sus?: string;
    instagram?: string;
    responsavel?: string;
  }) => {
    try {
      const { error } = await supabaseClient
        .from('gbp_eleitores')
        .update(dados)
        .eq('uid', effectiveUid);

      if (error) throw error;

      queryClient.invalidateQueries(['eleitor', effectiveUid]);
      
      toast({
        title: "Campos atualizados",
        description: "Os campos adicionais foram atualizados com sucesso.",
        variant: "success"
      });
      
      setEditandoCamposAdicionais(false);
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os campos adicionais.",
        variant: "destructive"
      });
    }
  };

  // Função auxiliar para formatar a data
  const formatarData = (data: string) => {
    if (!data) return '';
    // Adiciona 'T00:00:00' para garantir que a data seja interpretada no fuso horário local
    const [year, month, day] = data.split('-');
    return format(new Date(Number(year), Number(month) - 1, Number(day)), 'dd-MM-yyyy', { locale: ptBR });
  };

  // Função para validar e formatar a data digitada
  const formatarDataInput = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara DD-MM-YYYY
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 4)}-${numbers.slice(4, 8)}`;
  };

  // Função para converter data para formato ISO
  const converterParaFormatoISO = useCallback((data: string) => {
    if (!data) return null;
    const [dia, mes, ano] = data.split(/[-/]/);
    if (!dia || !mes || !ano) return null;
    
    const dataISO = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    console.log('Data convertida:', { original: data, convertida: dataISO });
    return dataISO;
  }, []);

  // 5. Effects
  useEffect(() => {
    console.log('Parâmetros da rota:', {
      uid,
      pathname: window.location.pathname,
      paramString: window.location.pathname.split('/').pop(),
      routeMatch: window.location.pathname.match(/\/eleitores\/([^/]+)/)?.[1]
    });
  }, [uid]);

  useEffect(() => {
    if (!eleitor) return;
    setFormData(prev => ({
      ...prev,
      nome: eleitor?.nome || '',
      cpf: eleitor?.cpf || '',
      nascimento: eleitor?.nascimento || '',
      genero: eleitor?.genero || '',
      nome_mae: eleitor?.nome_mae || '',
      whatsapp: eleitor?.whatsapp || '',
      telefone: eleitor?.telefone || '',
      titulo: eleitor?.titulo || '',
      zona: eleitor?.zona || '',
      secao: eleitor?.secao || '',
      cep: eleitor?.cep || '',
      logradouro: eleitor?.logradouro || '',
      cidade: eleitor?.cidade || '',
      bairro: eleitor?.bairro || '',
      numero: eleitor?.numero || '',
      complemento: eleitor?.complemento || '',
      uf: eleitor?.uf || '',
      // Campos de contato
      instagram: eleitor?.instagram || '',
      numero_do_sus: eleitor?.numero_do_sus || '',
      quantidade_adultos_residencia: eleitor?.quantidade_adultos_residencia || '',
      responsavel_pelo_eleitor: eleitor?.responsavel_pelo_eleitor || '',
      confiabilidade_do_voto: eleitor?.confiabilidade_do_voto || '',
      colegio_eleitoral: eleitor?.colegio_eleitoral || ''
    }));
  }, [eleitor]);

  // 6. Handlers
  const handleBack = () => navigate('/app/eleitores');
  const toggleModal = (modalKey: keyof ModalState) => {
    setModalState(prev => ({ ...prev, [modalKey]: !prev[modalKey] }));
  };

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'nascimento') {
      const apenasNumeros = value.replace(/\D/g, '');
      let dataFormatada = '';
      
      if (apenasNumeros.length === 0) {
        dataFormatada = ''; // Permite valor vazio
      } else if (apenasNumeros.length <= 2) {
        dataFormatada = apenasNumeros;
      } else if (apenasNumeros.length <= 4) {
        dataFormatada = `${apenasNumeros.slice(0, 2)}-${apenasNumeros.slice(2)}`;
      } else {
        const dia = apenasNumeros.slice(0, 2);
        const mes = apenasNumeros.slice(2, 4);
        const ano = apenasNumeros.slice(4, 8);
        dataFormatada = `${dia}-${mes}-${ano}`;
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: dataFormatada
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleStatusChange = useCallback(async (atendimentoUid: string, newStatus: string) => {
    try {
      await supabaseClient
        .from('gbp_atendimentos')
        .update({ status: newStatus })
        .eq('uid', atendimentoUid);
      
      // Atualiza a lista de atendimentos
      const updatedAtendimentos = atendimentos.map(atendimento => 
        atendimento.uid === atendimentoUid 
          ? { ...atendimento, status: newStatus }
          : atendimento
      );
      setAtendimentos(updatedAtendimentos);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  }, [atendimentos]);

  const handleSaveChanges = useCallback(async () => {
    if (!eleitor?.uid || !company?.uid) {
      toast({
        variant: "warning",
        description: "Dados inválidos"
      });
      return;
    }
    
    try {
      const dadosAtualizados = {
        ...formData,
        nascimento: formData.nascimento ? converterParaFormatoISO(formData.nascimento) : null
      };

      console.log('Dados a serem enviados:', dadosAtualizados);

      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .update(dadosAtualizados)
        .eq('uid', eleitor.uid)
        .select();

      if (error) {
        console.error('Erro detalhado:', error);
        throw error;
      }

      console.log('Resposta do servidor:', data);
      
      toggleModal('personalOpen');
      queryClient.invalidateQueries(['eleitor', effectiveUid]);
      
      toast({
        description: "Alterações salvas ✓",
        variant: "success"
      });
    } catch (error) {
      console.error('Erro completo:', error);
      toast({
        variant: "destructive",
        description: error.message || "Erro ao salvar alterações. Verifique os dados e tente novamente."
      });
    }
  }, [eleitor?.uid, formData, company?.uid, toggleModal, effectiveUid]);

  const handleSaveContact = useCallback(async () => {
    if (!eleitor?.uid || !company?.uid) {
      toast({
        variant: "warning",
        description: "Dados inválidos"
      });
      return;
    }
    
    try {
      const { error } = await supabaseClient
        .from('gbp_eleitores')
        .update({
          whatsapp: formData.whatsapp,
          telefone: formData.telefone,
          instagram: formData.instagram || null,
          numero_do_sus: formData.numero_do_sus || null,
          quantidade_adultos_residencia: formData.quantidade_adultos_residencia || null,
          responsavel_pelo_eleitor: formData.responsavel_pelo_eleitor || null,
          confiabilidade_do_voto: formData.confiabilidade_do_voto || null,
          colegio_eleitoral: formData.colegio_eleitoral || null,
          empresa_uid: company.uid
        })
        .eq('uid', eleitor.uid);

      if (error) throw error;
      
      toggleModal('contactOpen');
      await queryClient.invalidateQueries({ queryKey: ['eleitor', effectiveUid] });
      
      toast({
        description: "Contato atualizado com sucesso ✓",
        variant: "success"
      });
    } catch (error: any) {
      console.error('Erro ao salvar contato:', error);
      toast({
        variant: "warning",
        description: "Erro ao salvar: " + (error.message || 'Tente novamente')
      });
    }
  }, [eleitor?.uid, formData.whatsapp, formData.telefone, company?.uid, toggleModal, effectiveUid]);

  const handleCepBlur = useCallback(async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          logradouro: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          uf: data.uf
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  }, []);

  const closeDeleteModal = useCallback(() => {
    setModalState(prev => ({ ...prev, deleteOpen: false }));
    setAtendimentoToDelete(null);
  }, []);

  const handleDeleteAtendimento = async () => {
    if (!atendimentoToDelete) return;

    try {
      const { error } = await supabaseClient
        .from('gbp_atendimentos')
        .delete()
        .eq('uid', atendimentoToDelete.uid);

      if (error) throw error;

      // Atualizar lista de atendimentos localmente
      setAtendimentos(prev => prev.filter(a => a.uid !== atendimentoToDelete.uid));
      toggleModal('deleteOpen');
      toast({
        description: "Atendimento excluído",
        variant: "success"
      });
    } catch (error) {
      console.error('Erro ao excluir atendimento:', error);
      toast({
        variant: "destructive",
        description: "Erro ao excluir"
      });
    }
  };

  const handleDeleteObservation = async (atendimentoUid: string, observationUid: string) => {
    try {
      if (!company?.uid) {
        throw new Error('Empresa não encontrada');
      }

      const { error } = await supabaseClient
        .from('gbp_observacoes')
        .delete()
        .match({ 
          uid: observationUid,
          empresa_uid: company.uid 
        });

      if (error) {
        console.error('Erro detalhado:', error);
        throw error;
      }

      // Atualizar a lista de atendimentos localmente
      setAtendimentos(prev => prev.map(atendimento => {
        if (atendimento.uid === atendimentoUid) {
          return {
            ...atendimento,
            observacoes: atendimento.observacoes.filter(obs => obs.uid !== observationUid)
          };
        }
        return atendimento;
      }));

      toast({
        description: "Observação excluída",
        variant: "success"
      });
    } catch (error) {
      console.error('Erro ao excluir observação:', error);
      toast({
        variant: "destructive",
        description: "Erro ao excluir"
      });
    }
  };

  const handleSaveAddress = useCallback(async () => {
    if (!eleitor?.uid || !company?.uid) {
      toast({
        variant: "warning",
        description: "Dados inválidos"
      });
      return;
    }
    
    try {
      const { error } = await supabaseClient
        .from('gbp_eleitores')
        .update({
          cep: formData.cep,
          logradouro: formData.logradouro,
          cidade: formData.cidade,
          bairro: formData.bairro,
          numero: formData.numero,
          complemento: formData.complemento,
          uf: formData.uf,
          empresa_uid: company.uid
        })
        .eq('uid', eleitor.uid);

      if (error) throw error;
      
      toggleModal('addressOpen');
      queryClient.invalidateQueries(['eleitor', effectiveUid]);
      
      toast({
        description: "Endereço atualizado ✓",
        variant: "success"
      });
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
      toast({
        variant: "destructive",
        description: "Erro ao salvar"
      });
    }
  }, [eleitor?.uid, formData, company?.uid, toggleModal, effectiveUid]);

  const handleSaveTitle = useCallback(async () => {
    if (!eleitor?.uid || !company?.uid) {
      toast({
        variant: "warning",
        description: "Dados inválidos"
      });
      return;
    }
    
    try {
      const { error } = await supabaseClient
        .from('gbp_eleitores')
        .update({
          titulo: formData.titulo,
          zona: formData.zona,
          secao: formData.secao,
          empresa_uid: company.uid
        })
        .eq('uid', eleitor.uid);

      if (error) throw error;
      
      toggleModal('titleOpen');
      queryClient.invalidateQueries(['eleitor', effectiveUid]);
      
      toast({
        description: "Título atualizado ✓",
        variant: "success"
      });
    } catch (error) {
      console.error('Erro ao salvar título:', error);
      toast({
        variant: "destructive",
        description: "Erro ao salvar"
      });
    }
  }, [eleitor?.uid, formData.titulo, formData.zona, formData.secao, company?.uid, toggleModal, effectiveUid]);

  const handleEditDescricao = (atendimento: Atendimento) => {
    setEditingAtendimento(atendimento);
    setDescricaoTemp(atendimento.descricao || '');
  };

  const handleSaveDescricao = async () => {
    if (!editingAtendimento) return;
    
    try {
      await supabaseClient
        .from('gbp_atendimentos')
        .update({ descricao: descricaoTemp })
        .eq('uid', editingAtendimento.uid);
      
      // Atualiza o atendimento na lista
      const updatedAtendimentos = atendimentos.map(a => 
        a.uid === editingAtendimento.uid 
          ? { ...a, descricao: descricaoTemp }
          : a
      );
      setAtendimentos(updatedAtendimentos);
      
      setEditingAtendimento(null);
      toast({
        title: 'Sucesso',
        description: 'Descrição atualizada com sucesso',
        variant: 'default'
      });
    } catch (error) {
      console.error('Erro ao atualizar descrição:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar descrição',
        variant: 'destructive'
      });
    }
  };

  // 7. Renderização condicional
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Erro ao carregar dados do eleitor</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Tente novamente mais tarde</p>
          <button
            onClick={() => navigate('/app/eleitores')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  if (!eleitor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Eleitor não encontrado</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">O eleitor solicitado não foi encontrado</p>
          <button
            onClick={() => navigate('/app/eleitores')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  // 8. Renderização principal
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-8">
      <div className="w-full p-2 sm:p-4 lg:p-6">
        {/* Componente de impressão */}
        <div className="print-content" style={{ display: 'none' }}>
          <div style={{ padding: '10px', fontFamily: 'Arial, sans-serif', width: '100%', margin: '0 auto' }}>
            {/* Cabeçalho */}
            <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '1px solid #000', paddingBottom: '5px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{eleitor?.nome || 'Eleitor não encontrado'}</h1>
            </div>
          </div>
        </div>

        <div className="print-container w-full">
          <div className="content w-full">
            {/* Header com nome e data de cadastro */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 w-full">
              <div className="w-full mx-auto px-4 py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => navigate('/app/eleitores')}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                      title="Voltar para lista de eleitores"
                      aria-label="Voltar para lista de eleitores"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                        {eleitor?.nome || 'Carregando...'}
                      </h1>
                      <div className="flex flex-col md:flex-row md:items-center gap-2 mt-1">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Cadastrado em {eleitor?.created_at ? format(new Date(eleitor.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '-'}
                        </span>
                        <span className="hidden md:inline text-gray-300 dark:text-gray-600">•</span>
                        <span className="hidden md:inline text-sm text-gray-500 dark:text-gray-400">
                          por {eleitor?.responsavel || 'Nenhum'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Botões de Ação - Visíveis apenas em desktop */}
                  <div className="hidden md:flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    {eleitor && (
                      <button
                        onClick={() => navigate(`/app/atendimentos/novo?eleitor=${effectiveUid}`)}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                      >
                        <PlusSquare className="w-5 h-5 mr-2" />
                        Novo Atendimento
                      </button>
                    )}
                    <button
                      onClick={handlePrint}
                      className="hidden md:inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Imprimir
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div ref={contentRef} className="w-full mx-auto px-4 mt-6">
              {/* Grid Principal - Ajustado para usar todo o espaço */}
              <div className="grid grid-cols-1 gap-8 w-full">
                {/* Cards de Status - Ajustado para 4 colunas em telas grandes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                  {/* Card - Categoria */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-grow">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Categoria</p>
                        {editandoCategoria ? (
                          <div className="mt-2 flex items-center gap-2">
                            <select
                              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-1.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              value={eleitor?.categoria_uid || ''}
                              onChange={(e) => atualizarCategoria(e.target.value)}
                            >
                              <option value="">Selecione uma categoria</option>
                              {categorias.map((categoria) => (
                                <option key={categoria.uid} value={categoria.uid}>
                                  {categoria.nome}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => setEditandoCategoria(false)}
                              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <div className="mt-1 flex items-center gap-2">
                            <p className="text-xl font-semibold text-gray-900 dark:text-white">
                              {eleitor?.gbp_categorias?.nome || 'Sem categoria'}
                            </p>
                            <button
                              onClick={() => setEditandoCategoria(true)}
                              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>

                  {/* Card - Atendimentos */}
                  <div 
                    onClick={() => {
                      navigate('/app/atendimentos', { 
                        state: { 
                          searchTerm: eleitor.uid,
                          autoSearch: true 
                        }
                      });
                    }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Atendimentos</p>
                        <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white animate-pulse">
                          {atendimentos?.length || 0}
                        </p>
                      </div>
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/50 rounded-lg animate-pulse">
                        <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>

                  {/* Card - Indicação */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Indicado por</p>
                        {editandoIndicado ? (
                          <div className="mt-2 flex items-center gap-2">
                            <select
                              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-1.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              value={eleitor?.indicado_uid || ''}
                              onChange={(e) => atualizarIndicado(e.target.value)}
                            >
                              <option value="">Selecione um indicado</option>
                              {Array.isArray(indicados) && indicados.map((ind) => (
                                <option key={ind.uid} value={ind.uid}>
                                  {ind.nome}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => setEditandoIndicado(false)}
                              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <div className="mt-1 flex items-center gap-2">
                            <p className="text-xl font-semibold text-gray-900 dark:text-white">
                              {eleitor?.gbp_indicado?.nome ?? 'Sem indicado'}
                            </p>
                            <button
                              onClick={() => setEditandoIndicado(true)}
                              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-purple-50 dark:bg-purple-900/50 rounded-lg">
                        <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </div>

                  {/* Card - Responsável */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Responsável</p>
                        <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                          {eleitor.responsavel || 'Nenhum'}
                        </p>
                      </div>
                      <div className="p-2 bg-yellow-50 dark:bg-yellow-900/50 rounded-lg">
                        <User className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Informações Pessoais */}
                <div className="space-y-8 w-full">
                  {/* Dados Pessoais */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-full">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Dados Pessoais</h2>
                        </div>
                        <button
                          onClick={() => toggleModal('personalOpen')}
                          className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Editar dados pessoais"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    {/* Reduzindo padding em mobile */}
                    <div className="p-3 sm:p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Nome Completo</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.nome}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">CPF</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.cpf || '-'}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Nascimento</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">
                              {formatarData(eleitor.nascimento)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Gênero</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.genero || '-'}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Nome da Mãe</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.nome_mae || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contato */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-full">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-1.5 bg-green-50 dark:bg-green-900/50 rounded-lg">
                            <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Contato</h2>
                        </div>
                        <button
                          onClick={() => toggleModal('contactOpen')}
                          className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Editar contato"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {/* Reduzindo padding em mobile */}
                    <div className="p-3 sm:p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">WhatsApp</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.whatsapp || '-'}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Telefone</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.telefone || '-'}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Instagram</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.instagram || '-'}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Número do SUS</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.numero_do_sus || '-'}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Qtd. Adultos na Residência</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.quantidade_adultos_residencia || '-'}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Responsável pelo Eleitor</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.responsavel_pelo_eleitor || '-'}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Confiabilidade do Voto</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.confiabilidade_do_voto || '-'}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Colégio Eleitoral</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.colegio_eleitoral || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Título de Eleitor */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-full">
                    <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Título de Eleitor
                          </h2>
                        </div>
                        <button
                          onClick={() => toggleModal('titleOpen')}
                          className="ml-2 p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                          title="Editar título de eleitor"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Reduzindo padding em mobile */}
                    <div className="p-3 sm:p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-x-4 md:gap-y-1">
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Título de Eleitor</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.titulo}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Zona</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.zona}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Seção</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.secao}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-full">
                    <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg">
                            <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Endereço
                          </h2>
                        </div>
                        <button
                          onClick={() => toggleModal('addressOpen')}
                          className="ml-2 p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                          title="Editar endereço"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Reduzindo padding em mobile */}
                    <div className="p-3 sm:p-6">
                      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        <div className="col-span-2 md:col-span-2 lg:col-span-3">
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Logradouro</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.logradouro}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Número</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.numero}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Complemento</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.complemento}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Bairro</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.bairro}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">CEP</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.cep}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">Cidade</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.cidade}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 text-left">UF</label>
                          <div className="mt-1">
                            <span className="text-base text-gray-900 dark:text-white">{eleitor.uf}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DocumentosAnexados
                    ax_rg_cnh={eleitor?.ax_rg_cnh}
                    ax_cpf={eleitor?.ax_cpf}
                    ax_cert_nascimento={eleitor?.ax_cert_nascimento}
                    ax_titulo={eleitor?.ax_titulo}
                    ax_comp_residencia={eleitor?.ax_comp_residencia}
                    ax_foto_3x4={eleitor?.ax_foto_3x4}
                  />

                </div>

                {/* Histórico Completo de Atendimentos */}
                <div className="space-y-8">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-full">
                    <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg">
                          <MessageCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Histórico de Atendimentos</h2>
                      </div>
                    </div>

                    {loadingAtendimentos ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
                      </div>
                    ) : atendimentos.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900">
                          <MessageCircle className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum atendimento</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Comece registrando o primeiro atendimento para este eleitor.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden">
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                          {atendimentos.map((atendimento) => (
                            <li key={atendimento.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <div className="px-4 md:px-6 py-4">
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0 hidden md:block">
                                    <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                      <Tag className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-3">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                              #{atendimento.numero}
                                            </span>
                                            <Menu as="div" className="relative inline-block text-left">
                                              <Menu.Button 
                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfigs[atendimento.status as StatusType]?.color} transition-colors duration-150 ease-in-out hover:opacity-80`}
                                              >
                                                {statusConfigs[atendimento.status as StatusType]?.icon}
                                                <span className="ml-1.5">{atendimento.status}</span>
                                              </Menu.Button>
                                              <Menu.Items className="absolute left-0 z-10 mt-2 w-40 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                <div className="py-1">
                                                  {Object.entries(statusConfigs).map(([status, config]) => (
                                                    <Menu.Item key={status}>
                                                      {({ active }) => (
                                                        <button
                                                          onClick={() => handleStatusChange(atendimento.uid, status)}
                                                          className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''} ${status === atendimento.status ? 'bg-blue-50 dark:bg-blue-900' : ''} w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 flex items-center space-x-2`}
                                                        >
                                                          {config.icon}
                                                          <span>{status}</span>
                                                        </button>
                                                      )}
                                                    </Menu.Item>
                                                  ))}
                                                </div>
                                              </Menu.Items>
                                            </Menu>
                                          </div>
                                          <button
                                            onClick={() => {
                                              setAtendimentoToDelete(atendimento);
                                              toggleModal('deleteOpen');
                                            }}
                                            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                            title="Excluir atendimento"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-x-4 md:gap-y-1 mt-2">
                                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                                            <span className="truncate">
                                              {format(new Date(atendimento.data_atendimento), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                            </span>
                                          </div>
                                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <Tag className="flex-shrink-0 mr-1.5 h-4 w-4" />
                                            <span className="truncate">Categoria: {atendimento.gbp_categorias?.nome}</span>
                                          </div>
                                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <Users className="flex-shrink-0 mr-1.5 h-4 w-4" />
                                            <span className="truncate">Indicado: {atendimento.indicado || 'Nenhum'}</span>
                                          </div>
                                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <User className="flex-shrink-0 mr-1.5 h-4 w-4" />
                                            <span className="truncate">Resp.: {atendimento.responsavel || 'Nenhum'}</span>
                                          </div>
                                        </div>
                                        {/* Descrição do Atendimento */}
                                        <div className="mt-3">
                                          <div className="flex items-start space-x-2">
                                            <MessageCircle className="flex-shrink-0 w-4 h-4 mt-0.5 text-gray-400" />
                                            <div className="flex-1">
                                              <span className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                                                Descrição
                                              </span>
                                              <div className="mt-1 group relative">
                                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap pr-8">
                                                  {atendimento.descricao || 'Sem descrição'}
                                                </p>
                                                <button
                                                  onClick={() => handleEditDescricao(atendimento)}
                                                  className="absolute top-0 right-0 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                                                  title="Editar descrição"
                                                >
                                                  <Pencil className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        {/* Observações do Atendimento */}
                                        <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                                          <div className="flex items-start space-x-2">
                                            <FileText className="flex-shrink-0 w-4 h-4 mt-0.5 text-gray-400" />
                                            <div className="flex-1">
                                              <button
                                                onClick={() => setExpandedObservations(prev => ({
                                                  ...prev,
                                                  [atendimento.uid]: !prev[atendimento.uid]
                                                }))}
                                                className="w-full flex items-center justify-between p-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg group"
                                              >
                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                  Observações ({atendimento.observacoes?.length || 0})
                                                </span>
                                                <div className="flex items-center space-x-2">
                                                  <div className={`p-1 rounded-full bg-gray-100 dark:bg-gray-700 transform transition-transform ${
                                                    expandedObservations[atendimento.uid] ? 'rotate-180' : ''
                                                  }`}>
                                                    <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                                  </div>
                                                </div>
                                              </button>
                                              {expandedObservations[atendimento.uid] && atendimento.observacoes && atendimento.observacoes.length > 0 ? (
                                                <div className="mt-2 space-y-3">
                                                  {atendimento.observacoes.map((obs) => (
                                                    <div key={obs.uid} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                                      <div className="flex items-start space-x-3">
                                                        <div className="flex-shrink-0">
                                                          <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                                                            <UserCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                                          </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                          <div className="flex items-center justify-between mb-1">
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                              {obs.responsavel_nome}
                                                            </span>
                                                            <div className="flex items-center space-x-2">
                                                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                {format(new Date(obs.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                                                              </span>
                                                              <button
                                                                onClick={() => handleDeleteObservation(atendimento.uid, obs.uid)}
                                                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                                title="Excluir observação"
                                                              >
                                                                <Trash2 className="w-4 h-4" />
                                                              </button>
                                                            </div>
                                                          </div>
                                                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                            {obs.observacao}
                                                          </p>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : !expandedObservations[atendimento.uid] && atendimento.observacoes?.length > 0 ? (
                                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                  Clique para ver as observações
                                                </p>
                                              ) : (
                                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                  Nenhuma observação registrada
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Seção de Ofícios */}
                <div className="space-y-8">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-full">
                    <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg">
                            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Ofícios</h3>
                        </div>
                        
                        <button
                          onClick={() => {
                            if (eleitor) {
                              const params = new URLSearchParams({
                                cpf: eleitor.cpf || '',
                                cep: eleitor.cep || '',
                                logradouro: eleitor.logradouro || '',
                                numero: eleitor.numero || '',
                                bairro: eleitor.bairro || '',
                                cidade: eleitor.cidade || '',
                                uf: eleitor.uf || '',
                                eleitor_uid: eleitor.uid || ''
                              });
                              navigate(`/app/documentos/oficios/novo?${params.toString()}`);
                            }
                          }}
                          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          <PlusSquare className="mr-2 h-4 w-4" />
                          Novo Ofício
                        </button>
                      </div>
                    </div>

                    {loadingOficios ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
                      </div>
                    ) : oficios.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900">
                          <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum ofício encontrado</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Este eleitor ainda não possui ofícios registrados.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden">
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                          {oficios.map((oficio) => (
                            <li key={oficio.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <div className="px-4 md:px-6 py-4">
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0 hidden md:block">
                                    <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                      <FileText className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-3">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                              {oficio.numero_oficio || 'Sem número'}
                                            </span>
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                              oficio.status === 'Concluído' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                              oficio.status === 'Em Andamento' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                            }`}>
                                              {oficio.status || 'Pendente'}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                          <p className="whitespace-pre-line">{oficio.descricao || 'Sem descrição'}</p>
                                        </div>
                                        
                                        {oficio.descricao_do_problema && (
                                          <div className="mt-2">
                                            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição do Problema:</h4>
                                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                                              <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">
                                                {oficio.descricao_do_problema}
                                              </p>
                                            </div>
                                          </div>
                                        )}
                                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
                                          <div className="flex items-center">
                                            <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                                            <span>
                                              {oficio.data_solicitacao ? 
                                                new Date(oficio.data_solicitacao).toLocaleDateString('pt-BR') : 
                                                'Data não informada'}
                                            </span>
                                          </div>
                                          {oficio.responsavel_nome && (
                                            <div className="flex items-center">
                                              <UserCircle className="flex-shrink-0 mr-1.5 h-4 w-4" />
                                              <span>{oficio.responsavel_nome}</span>
                                            </div>
                                          )}
                                          {oficio.tipo_de_demanda && (
                                            <div className="flex items-center">
                                              <Tag className="flex-shrink-0 mr-1.5 h-4 w-4" />
                                              <span>{oficio.tipo_de_demanda}</span>
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Campos adicionais */}
                                        <div className="mt-3 space-y-2 text-xs">
                                          {oficio.url_oficio_protocolado && (
                                            <div className="flex items-start">
                                              <span className="font-medium text-gray-700 dark:text-gray-300 w-32 flex-shrink-0">Ofício:</span>
                                              <a 
                                                href={oficio.url_oficio_protocolado} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                                              >
                                                {oficio.url_oficio_protocolado}
                                              </a>
                                            </div>
                                          )}
                                          
                                          {oficio.fotos_do_problema && (
                                            <div className="flex flex-col">
                                              <span className="font-medium text-gray-700 dark:text-gray-300 mb-1">Fotos:</span>
                                              <div className="flex flex-wrap gap-2">
                                                {Array.isArray(oficio.fotos_do_problema) ? (
                                                  oficio.fotos_do_problema.map((foto, index) => (
                                                    <a 
                                                      key={index} 
                                                      href={foto} 
                                                      target="_blank" 
                                                      rel="noopener noreferrer"
                                                      className="inline-block"
                                                    >
                                                      <img 
                                                        src={foto} 
                                                        alt={`Foto do problema ${index + 1}`}
                                                        className="h-16 w-16 object-cover rounded border border-gray-200 dark:border-gray-600"
                                                      />
                                                    </a>
                                                  ))
                                                ) : (
                                                  <a 
                                                    href={oficio.fotos_do_problema} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-block"
                                                  >
                                                    <img 
                                                      src={oficio.fotos_do_problema} 
                                                      alt="Foto do problema"
                                                      className="h-16 w-16 object-cover rounded border border-gray-200 dark:border-gray-600"
                                                    />
                                                  </a>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botão flutuante de novo atendimento (apenas mobile) */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <button
          onClick={() => navigate(`/app/atendimentos/novo?eleitor=${effectiveUid}`)}
          className="w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors duration-200"
          aria-label="Novo Atendimento"
        >
          <PlusSquare className="h-6 w-6" />
        </button>
      </div>

      {/* Modal de edição de dados pessoais */}
      <Transition appear show={modalState.personalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => toggleModal('personalOpen')}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-xl transition-all">
                  {/* Header */}
                  <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold text-gray-900 dark:text-white flex items-center"
                    >
                      <UserCircle className="w-6 h-6 mr-2.5 text-blue-500 flex-shrink-0" />
                      <span>Editar Dados Pessoais</span>
                    </Dialog.Title>
                    <button
                      onClick={() => toggleModal('personalOpen')}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                      <span className="sr-only">Fechar</span>
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-5">
                    <form className="flex flex-col space-y-4">
                      {/* Nome Completo */}
                      <div className="flex flex-col">
                        <label htmlFor="nome" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                          Nome Completo
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UserCircle className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="nome"
                            name="nome"
                            value={formData.nome}
                            onChange={handleInputChange}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Digite o nome completo"
                          />
                        </div>
                      </div>

                      {/* CPF e Nascimento */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label htmlFor="cpf" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                            CPF
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FileText className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="cpf"
                              name="cpf"
                              value={formData.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                              onChange={(e) => {
                                const valor = e.target.value.replace(/\D/g, '');
                                handleInputChange({
                                  target: {
                                    name: 'cpf',
                                    value: valor
                                  }
                                });
                              }}
                              className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                              placeholder="Digite o CPF"
                              maxLength={14}
                            />
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <label htmlFor="nascimento" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                            Nascimento
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <CalendarIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              inputMode="numeric"
                              id="nascimento"
                              name="nascimento"
                              placeholder="DD-MM-AAAA"
                              maxLength={10}
                              value={formData.nascimento}
                              onChange={(e) => {
                                const valor = e.target.value;
                                const apenasNumeros = valor.replace(/\D/g, '');
                                
                                let dataFormatada = '';
                                
                                if (apenasNumeros.length <= 2) {
                                  dataFormatada = apenasNumeros;
                                } else if (apenasNumeros.length <= 4) {
                                  dataFormatada = `${apenasNumeros.slice(0, 2)}-${apenasNumeros.slice(2)}`;
                                } else {
                                  const dia = apenasNumeros.slice(0, 2);
                                  const mes = apenasNumeros.slice(2, 4);
                                  const ano = apenasNumeros.slice(4, 8);
                                  dataFormatada = `${dia}-${mes}-${ano}`;
                                }
                                
                                handleInputChange({
                                  target: {
                                    name: 'nascimento',
                                    value: dataFormatada
                                  }
                                });
                              }}
                              className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Gênero e Nome da Mãe */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label htmlFor="genero" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                            Gênero
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Users2 className="h-5 w-5 text-gray-400" />
                            </div>
                            <select
                              id="genero"
                              name="genero"
                              value={formData.genero}
                              onChange={handleInputChange}
                              className="block w-full pl-10 pr-10 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out appearance-none"
                            >
                              <option value="">Selecione o gênero</option>
                              <option value="Masculino">Masculino</option>
                              <option value="Feminino">Feminino</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <label htmlFor="nome_mae" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                            Nome da Mãe
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <UserRound className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="nome_mae"
                              name="nome_mae"
                              value={formData.nome_mae}
                              onChange={handleInputChange}
                              className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                              placeholder="Digite o nome da mãe"
                            />
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 gap-3">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-200"
                      onClick={() => toggleModal('personalOpen')}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-200"
                      onClick={handleSaveChanges}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Salvar alterações
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal de edição de contato */}
      <Transition appear show={modalState.contactOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => toggleModal('contactOpen')}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-xl transition-all">
                  {/* Header */}
                  <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold text-gray-900 dark:text-white flex items-center"
                    >
                      <Phone className="h-6 w-6 mr-2" />
                      Editar Contato
                    </Dialog.Title>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      onClick={() => toggleModal('contactOpen')}
                    >
                      <span className="sr-only">Fechar</span>
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-5">
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* WhatsApp */}
                      <div className="flex flex-col">
                        <label htmlFor="whatsapp" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                          WhatsApp
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MessageCircle className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="whatsapp"
                            name="whatsapp"
                            value={formData.whatsapp}
                            onChange={handleInputChange}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Digite o WhatsApp"
                          />
                        </div>
                      </div>

                      {/* Telefone */}
                      <div className="flex flex-col">
                        <label htmlFor="telefone" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                          Telefone
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Phone className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="telefone"
                            name="telefone"
                            value={formData.telefone}
                            onChange={handleInputChange}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Digite o telefone"
                          />
                        </div>
                      </div>

                      {/* Instagram */}
                      <div className="flex flex-col">
                        <label htmlFor="instagram" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                          Instagram
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.415-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.415-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.749 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            id="instagram"
                            name="instagram"
                            value={formData.instagram || ''}
                            onChange={handleInputChange}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="@usuario"
                          />
                        </div>
                      </div>

                      {/* Número do SUS */}
                      <div className="flex flex-col">
                        <label htmlFor="numero_do_sus" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                          Número do SUS
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            id="numero_do_sus"
                            name="numero_do_sus"
                            value={formData.numero_do_sus || ''}
                            onChange={handleInputChange}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="000 0000 0000 0000"
                          />
                        </div>
                      </div>

                      {/* Quantidade de Adultos na Residência */}
                      <div className="flex flex-col">
                        <label htmlFor="quantidade_adultos_residencia" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                          Qtd. Adultos na Residência
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Users className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="number"
                            id="quantidade_adultos_residencia"
                            name="quantidade_adultos_residencia"
                            value={formData.quantidade_adultos_residencia || ''}
                            onChange={handleInputChange}
                            min="0"
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {/* Responsável pelo Eleitor */}
                      <div className="flex flex-col">
                        <label htmlFor="responsavel_pelo_eleitor" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                          Responsável pelo Eleitor
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="responsavel_pelo_eleitor"
                            name="responsavel_pelo_eleitor"
                            value={formData.responsavel_pelo_eleitor || ''}
                            onChange={handleInputChange}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Nome do responsável"
                          />
                        </div>
                      </div>

                      {/* Confiabilidade do Voto */}
                      <div className="flex flex-col">
                        <label htmlFor="confiabilidade_do_voto" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                          Confiabilidade do Voto
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <select
                            id="confiabilidade_do_voto"
                            name="confiabilidade_do_voto"
                            value={formData.confiabilidade_do_voto || ''}
                            onChange={handleInputChange}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                          >
                            <option value="">Selecione uma opção</option>
                            <option value="Frio">Frio</option>
                            <option value="Indeciso">Indeciso</option>
                            <option value="Morno">Morno</option>
                            <option value="Quente">Quente</option>
                            <option value="Convicto">Convicto</option>
                            <option value="Fiel">Fiel</option>
                            <option value="Multiplicador">Multiplicador</option>
                          </select>
                        </div>
                      </div>

                      {/* Colégio Eleitoral */}
                      <div className="flex flex-col">
                        <label htmlFor="colegio_eleitoral" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                          Colégio Eleitoral
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            id="colegio_eleitoral"
                            name="colegio_eleitoral"
                            value={formData.colegio_eleitoral || ''}
                            onChange={handleInputChange}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Nome do colégio eleitoral"
                          />
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-row-reverse gap-3">
                      <button
                        type="button"
                        className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-150 ease-in-out"
                        onClick={handleSaveContact}
                      >
                        Salvar alterações
                      </button>
                      <button
                        type="button"
                        className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-150 ease-in-out"
                        onClick={() => toggleModal('contactOpen')}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal de edição de título de eleitor */}
      <Transition appear show={modalState.titleOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => toggleModal('titleOpen')}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-xl transition-all">
                  {/* Header */}
                  <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold text-gray-900 dark:text-white flex items-center"
                    >
                      <Vote className="h-6 w-6 mr-2" />
                      Editar Título de Eleitor
                    </Dialog.Title>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      onClick={() => toggleModal('titleOpen')}
                    >
                      <span className="sr-only">Fechar</span>
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-5">
                    <form className="flex flex-col space-y-4">
                      {/* Título de Eleitor */}
                      <div className="flex flex-col">
                        <label htmlFor="titulo" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                          Título de Eleitor
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Vote className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="titulo"
                            name="titulo"
                            value={formData.titulo}
                            onChange={handleInputChange}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Digite o título de eleitor"
                          />
                        </div>
                      </div>

                      {/* Zona e Seção */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label htmlFor="zona" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                            Zona
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <MapPin className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="zona"
                              name="zona"
                              value={formData.zona}
                              onChange={handleInputChange}
                              className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                              placeholder="Digite a zona"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <label htmlFor="secao" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                            Seção
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <MapPin className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="secao"
                              name="secao"
                              value={formData.secao}
                              onChange={handleInputChange}
                              className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                              placeholder="Digite a seção"
                            />
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-row-reverse gap-3">
                      <button
                        type="button"
                        className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-150 ease-in-out"
                        onClick={handleSaveTitle}
                      >
                        Salvar alterações
                      </button>
                      <button
                        type="button"
                        className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-150 ease-in-out"
                        onClick={() => toggleModal('titleOpen')}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal de edição de endereço */}
      <Transition appear show={modalState.addressOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => toggleModal('addressOpen')}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-xl transition-all">
                  {/* Header */}
                  <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold text-gray-900 dark:text-white flex items-center"
                    >
                      <MapPin className="h-6 w-6 mr-2" />
                      Editar Endereço
                    </Dialog.Title>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      onClick={() => toggleModal('addressOpen')}
                    >
                      <span className="sr-only">Fechar</span>
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-5">
                    <form className="flex flex-col space-y-4">
                      {/* CEP */}
                      <div className="flex flex-col">
                        <label htmlFor="cep" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                          CEP
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="cep"
                            name="cep"
                            value={formData.cep}
                            onChange={handleInputChange}
                            onBlur={handleCepBlur}
                            maxLength={9}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Digite o CEP"
                          />
                        </div>
                      </div>

                      {/* Logradouro */}
                      <div className="flex flex-col">
                        <label htmlFor="logradouro" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                          Logradouro
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="logradouro"
                            name="logradouro"
                            value={formData.logradouro}
                            onChange={handleInputChange}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Digite o logradouro"
                          />
                        </div>
                      </div>

                      {/* Número e Complemento */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label htmlFor="numero" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                            Número
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <MapPin className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="numero"
                              name="numero"
                              value={formData.numero}
                              onChange={handleInputChange}
                              className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                              placeholder="Digite o número"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <label htmlFor="complemento" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                            Complemento
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <MapPin className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="complemento"
                              name="complemento"
                              value={formData.complemento}
                              onChange={handleInputChange}
                              className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                              placeholder="Digite o complemento"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bairro */}
                      <div className="flex flex-col">
                        <label htmlFor="bairro" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                          Bairro
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="bairro"
                            name="bairro"
                            value={formData.bairro}
                            onChange={handleInputChange}
                            className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                            placeholder="Digite o bairro"
                          />
                        </div>
                      </div>

                      {/* Cidade e UF */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label htmlFor="cidade" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                            Cidade
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <MapPin className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="cidade"
                              name="cidade"
                              value={formData.cidade}
                              onChange={handleInputChange}
                              className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                              placeholder="Digite a cidade"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <label htmlFor="uf" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left block">
                            UF
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <MapPin className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="uf"
                              name="uf"
                              value={formData.uf}
                              onChange={handleInputChange}
                              maxLength={2}
                              className="block w-full pl-10 pr-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                              placeholder="UF"
                            />
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-row-reverse gap-3">
                      <button
                        type="button"
                        className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-150 ease-in-out"
                        onClick={handleSaveAddress}
                      >
                        Salvar alterações
                      </button>
                      <button
                        type="button"
                        className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-150 ease-in-out"
                        onClick={() => toggleModal('addressOpen')}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal de Confirmação de Exclusão */}
      <Transition appear show={modalState.deleteOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => toggleModal('deleteOpen')}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left align-middle shadow-xl transition-all">
                  <div className="relative">
                    {/* Cabeçalho */}
                    <div className="px-6 pt-6">
                      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full">
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      
                      <Dialog.Title className="mt-4 text-lg font-semibold text-gray-900 dark:text-white text-center">
                        Excluir Atendimento
                      </Dialog.Title>
                    </div>

                    {/* Detalhes do Atendimento */}
                    <div className="px-6 mt-4">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Tag className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Categoria
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {atendimentoToDelete?.gbp_categorias?.nome}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Data
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {atendimentoToDelete?.data_atendimento && format(new Date(atendimentoToDelete.data_atendimento), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Status
                            </span>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfigs[atendimentoToDelete?.status as StatusType]?.color} transition-colors duration-150 ease-in-out`}>
                            {statusConfigs[atendimentoToDelete?.status as StatusType]?.icon}
                            <span className="ml-1">{atendimentoToDelete?.status}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mensagem de Confirmação */}
                    <div className="px-6 py-4 mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        Tem certeza que deseja excluir este atendimento?
                        <br />
                        <span className="font-medium">Esta ação não pode ser desfeita.</span>
                      </p>
                    </div>

                    {/* Botões */}
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 flex justify-end space-x-3">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-200"
                        onClick={() => toggleModal('deleteOpen')}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-colors duration-200"
                        onClick={handleDeleteAtendimento}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal de edição de descrição */}
      <Transition appear show={!!editingAtendimento} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setEditingAtendimento(null)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left align-middle shadow-xl transition-all">
                  <div className="relative">
                    {/* Cabeçalho */}
                    <div className="px-6 pt-6">
                      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-900/20 rounded-full">
                        <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      
                      <Dialog.Title className="mt-4 text-lg font-semibold text-gray-900 dark:text-white text-center">
                        Editar Descrição
                      </Dialog.Title>
                    </div>

                    {/* Descrição */}
                    <div className="px-6 mt-4">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <MessageCircle className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Descrição
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <textarea
                            value={descricaoTemp}
                            onChange={(e) => setDescricaoTemp(e.target.value)}
                            className="block w-full p-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:border-transparent transition duration-150 ease-in-out"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Botões */}
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 flex justify-end space-x-3">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-200"
                        onClick={() => setEditingAtendimento(null)}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-200"
                        onClick={handleSaveDescricao}
                      >
                        Salvar alterações
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};
