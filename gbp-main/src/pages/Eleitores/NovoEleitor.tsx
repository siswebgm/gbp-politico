import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import InputMask from 'react-input-mask';
import { supabaseClient } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useCategories } from '../../hooks/useCategories';
import { useIndicados } from '../../hooks/useIndicados';
import { useCep } from '../../hooks/useCep';
import { useCPF } from '../../hooks/useCPF';
import { useToast } from "../../components/ui/use-toast";
import { NovaCategoriaModal } from './components/NovaCategoriaModal';
import { NovoIndicadoModal } from './components/NovoIndicadoModal';
import { NestedCategoryDropdown } from '../../components/NestedCategoryDropdown';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Indicado {
  uid: string;
  id: number;
  nome: string;
}

interface NovoEleitorForm {
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

const defaultValues: NovoEleitorForm = {
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

export const NovoEleitor: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const [companySettings, setCompanySettings] = useState<{ campos_adicionais: boolean }>({ campos_adicionais: false });
  const { data: categorias, isLoading: isLoadingCategorias } = useCategories();
  const { data: indicados, isLoading: isLoadingIndicados } = useIndicados();
  const { fetchAddress, isLoading: isLoadingCep } = useCep();
  const { fetchCPFData, isLoading: isLoadingCPF, error: cpfError } = useCPF();
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

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset, trigger } = useForm<NovoEleitorForm>({
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
  const [showDadosEleitorais, setShowDadosEleitorais] = useState(false);

  const categoriaUid = watch('categoria_uid');
  
  // Efeito para sincronizar a categoria do atendimento com a categoria do eleitor
  useEffect(() => {
    if (primeiroAtendimento) {
      setCategoriaAtendimento(categoriaUid);
    }
  }, [primeiroAtendimento, categoriaUid]);
  const cpfValue = watch('cpf');
  const [lastCheckedCPF, setLastCheckedCPF] = useState<string>('');
  const [atendimentoErrors, setAtendimentoErrors] = useState({
    categoria: '',
    descricao: '',
    status: ''
  });

  // Estado global para os estilos dos placeholders e selects
  const globalStyles = {
    input: {
      '::placeholder': {
        color: 'rgba(0, 0, 0, 0.3)',
        opacity: 1,
      },
      color: 'rgba(0, 0, 0, 0.87)',
    },
    select: {
      color: 'rgba(0, 0, 0, 0.87)',
      '& option:first-of-type': {
        color: 'rgba(0, 0, 0, 0.3)',
      },
      '& option': {
        color: 'rgba(0, 0, 0, 0.87)',
      }
    }
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

  const onSubmit = async (data: NovoEleitorForm) => {
    try {
      // Validar campos de atendimento se o checkbox estiver marcado
      if (!validateAtendimentoFields()) {
        return;
      }

      setIsLoading(true);

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
            navigate(`/app/eleitores/${existingCPF.uid}`);
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
      const formattedData = {
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
          description: `Erro ao cadastrar eleitor: ${eleitorError.message}`,
          variant: "danger",
          duration: 2000,
        });
        return;
      }

      // Criar atendimento se for primeiro atendimento
      if (primeiroAtendimento) {
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
        const proximoNumero = ultimoNumero + 1;

        console.log('Último número encontrado:', ultimoNumero);
        console.log('Próximo número a ser usado:', proximoNumero);

        // Buscar o nome do indicado selecionado no formulário
        let nomeIndicado = null;
        const indicadoUid = formattedData.indicado_uid;
        if (indicadoUid) {
          const indicadoSelecionado = indicados?.find(ind => ind.uid === indicadoUid);
          if (indicadoSelecionado) {
            nomeIndicado = indicadoSelecionado.nome;
          }
        }

        console.log('Endereço do formulário:', currentValues.endereco);
        console.log('Logradouro formatado:', formattedData.logradouro);

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
          bairro: formattedData.bairro || null,
          cidade: formattedData.cidade || null,
          logradouro: currentValues.endereco || null, // Pegando diretamente do formulário
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

        // Log do objeto completo
        console.log('Dados do atendimento:', atendimentoData);

        const { error: atendimentoError } = await supabaseClient
          .from('gbp_atendimentos')
          .insert([atendimentoData]);

        if (atendimentoError) {
          console.error('Erro ao criar atendimento:', atendimentoError);
          console.error('Dados do atendimento:', atendimentoData);
          toast({
            title: "Erro",
            description: `Erro ao criar atendimento: ${atendimentoError.message}`,
            variant: "destructive",
          });
        }
      }

      // Sucesso
      toast({
        title: "✨ Tudo certo!",
        description: "Eleitor cadastrado com sucesso! Redirecionando...",
        className: "bg-green-50 border-green-200 text-green-800",
        duration: 3000,
      });
      resetForm();
      navigate('/app/eleitores');
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
    navigate('/app/eleitores');
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
                  Novo Eleitor
                </h1>
              </div>
            </div>
          </div>
        </header>

        {/* Formulário */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-6 pb-20 sm:pb-6 sm:px-6 lg:px-8">
          {/* Dados Pessoais */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                <span className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg px-3 py-1">
                  Dados Pessoais
                </span>
              </h2>
              <div className="space-y-6">
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
                    Nome <span className="text-red-500">*</span>
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
                          <option value="">Selecione um indicado...</option>
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

                    {/* Responsável pelo Eleitor */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                        Responsável pelo Eleitor
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
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 mb-8 flex flex-row justify-end gap-3 px-4 sm:px-0">
            <button
              type="button"
              onClick={() => navigate('/app/eleitores')}
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
      </div>
    </>
  );
}
