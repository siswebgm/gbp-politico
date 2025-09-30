import { useState, FormEvent, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabaseClient as supabase } from '../../../lib/supabase';
import { getEmpresa } from '../../../services/empresa';
import { createDemandaRua, uploadDemandaFiles, uploadBoletimOcorrencia, DemandaRuaInput } from '../../../services/demandasRua';
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
  requerente_nome: string;
  requerente_cpf: string;
  requerente_whatsapp: string;
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
};

export function NovaDemanda() {
  const { empresa_uid } = useParams<{ empresa_uid: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEmpresa, setIsLoadingEmpresa] = useState(true);
  const [isUploadingBoletim, setIsUploadingBoletim] = useState(false);
  const [isConsultingCpf, setIsConsultingCpf] = useState(false);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [boletimFile, setBoletimFile] = useState<File | null>(null);
  // Removido setErrors não utilizado
  const [temEnderecoRequerente, setTemEnderecoRequerente] = useState(false);
  
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

        // Atualiza o estado da empresa mesmo se o link estiver desativado
        setEmpresa(empresaData);

        // Verifica se o link de demanda está disponível
        if (empresaData.link_demanda_disponivel !== true) {
          setIsLoadingEmpresa(false);
          return;
        }
        
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

  const [formData, setFormData] = useState<FormData>({
    tipo_de_demanda: '',
    descricao_do_problema: '',
    nivel_de_urgencia: 'média',
    requerente_nome: '',
    requerente_cpf: '',
    requerente_whatsapp: '',
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
  });
  
  // Estado para controlar se o endereço da demanda é o mesmo do requerente
  const [usarEnderecoRequerente, setUsarEnderecoRequerente] = useState<boolean>(true);

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
        
        setFormData(prev => ({
          ...prev,
          requerente_nome: requerente.nome || '',
          requerente_whatsapp: requerente.whatsapp || '',
          genero: requerente.genero || '',
          cep: requerente.cep || '',
          logradouro: requerente.logradouro || '',
          numero: requerente.numero || '',
          bairro: requerente.bairro || '',
          cidade: requerente.cidade || '',
          uf: requerente.uf || '',
          referencia: requerente.referencia || ''
        }));
        
        // Se tiver CEP, busca o endereço
        if (requerente.cep) {
          buscarEndereco(requerente.cep);
        }
        
        // Marca para usar o endereço do requerente por padrão se tiver endereço válido
        setUsarEnderecoRequerente(temEnderecoValido);
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
    const { name, value } = e.target;
    
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
    } else if (name === 'cep') {
      formattedValue = formatCEP(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles = Array.from(e.target.files);
    const totalFiles = files.length + newFiles.length;
    
    if (totalFiles > 2) {
      toast.warning('Máximo de 2 imagens permitidas');
      e.target.value = ''; // Limpa o input
      return;
    }
    
    // Verifica se os arquivos são imagens
    const validFiles = newFiles.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length === 0) {
      toast.warning('Por favor, selecione apenas arquivos de imagem');
      e.target.value = ''; // Limpa o input
      return;
    }
    
    // Limita ao máximo de 2 imagens
    const filesToAdd = validFiles.slice(0, 2 - files.length);
    
    setFiles(prev => [...prev, ...filesToAdd]);
    
    // Criar URLs de visualização
    const urls = filesToAdd.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...urls]);
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
    if (!empresa_uid) {
      toast.error('Empresa não identificada');
      return;
    }

    if (!formData.aceite_termos) {
      toast.error('Você precisa aceitar os termos de uso para continuar');
      return;
    }

    // Validar se o boletim foi anexado quando necessário
    if (formData.boletim_ocorrencia === 'sim' && !boletimFile) {
      toast.error('Por favor, anexe o boletim de ocorrência');
      return;
    }

    // Validar se pelo menos uma foto foi anexada
    if (files.length === 0) {
      toast.error('Por favor, anexe pelo menos uma foto do problema');
      return;
    }

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
        const dadosRequerente = {
          nome: formData.requerente_nome,
          cpf: formData.requerente_cpf.replace(/\D/g, ''),
          whatsapp: formData.requerente_whatsapp,
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
        
        // Dados do endereço (obrigatórios)
        logradouro: endereco.logradouro || 'Não informado',
        bairro: endereco.bairro || 'Não informado',
        cidade: endereco.cidade || 'Não informado',
        uf: endereco.uf || 'PE',
        cep: endereco.cep || '00000-000',
        numero: endereco.numero || '',
        referencia: endereco.referencia || '',
        
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

  // Verifica se o link de demanda está disponível
  if (empresa.link_demanda_disponivel === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Estamos com problemas técnicos</h2>
          <p className="text-gray-600 mb-6">Nossa equipe já foi notificada e está trabalhando para resolver o mais rápido possível. Pedimos desculpas pelo transtorno.</p>
          <a
            href="https://www.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Voltar para a página inicial
          </a>
        </div>
      </div>
    );
  }

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
                  <label htmlFor="genero" className="block text-sm font-medium text-gray-700">
                    Gênero *
                  </label>
                  <select
                    id="genero"
                    name="genero"
                    required
                    value={formData.genero}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Endereço do Problema</h3>
                {temEnderecoRequerente && (
                  <div className="flex items-center">
                    <input
                      id="usarEnderecoRequerente"
                      name="usarEnderecoRequerente"
                      type="checkbox"
                      checked={usarEnderecoRequerente}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setUsarEnderecoRequerente(isChecked);
                        
                        // Se estiver desmarcando o checkbox, limpa os campos de endereço
                        if (!isChecked) {
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
                      Usar mesmo endereço do requerente
                    </label>
                  </div>
                )}
              </div>
              <div className={`grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6 ${usarEnderecoRequerente ? 'opacity-50' : ''}`}>
                <div className="sm:col-span-2">
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
                      disabled={usarEnderecoRequerente}
                      className={`flex-1 min-w-0 block w-full px-3 py-2 rounded-md border ${usarEnderecoRequerente ? 'bg-gray-100' : 'bg-white'} border-gray-300 shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                      maxLength={9}
                      placeholder="00000-000"
                    />
                  </div>
                </div>

                <div className="sm:col-span-4">
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
                    disabled={usarEnderecoRequerente}
                    className={`mt-1 block w-full border ${usarEnderecoRequerente ? 'bg-gray-100' : 'bg-white'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 sm:col-span-6">
                  <div className="col-span-1">
                    <label htmlFor="numero" className="block text-sm font-medium text-gray-700">
                      Nº *
                    </label>
                    <input
                      type="text"
                      name="numero"
                      id="numero"
                      value={formData.numero}
                      onChange={handleInputChange}
                      disabled={usarEnderecoRequerente}
                      className={`mt-1 block w-full border ${usarEnderecoRequerente ? 'bg-gray-100' : 'bg-white'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                    />
                  </div>

                  <div className="col-span-2">
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
                      disabled={usarEnderecoRequerente}
                      className={`mt-1 block w-full border ${usarEnderecoRequerente ? 'bg-gray-100' : 'bg-white'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 sm:col-span-6">
                  <div className="col-span-2">
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
                      disabled={usarEnderecoRequerente}
                      className={`mt-1 block w-full border ${usarEnderecoRequerente ? 'bg-gray-100' : 'bg-white'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                    />
                  </div>

                  <div className="col-span-1">
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
                      disabled={usarEnderecoRequerente}
                      className={`mt-1 block w-full border ${usarEnderecoRequerente ? 'bg-gray-100' : 'bg-white'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm uppercase`}
                    />
                  </div>
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
                    disabled={usarEnderecoRequerente}
                    className={`mt-1 block w-full border ${usarEnderecoRequerente ? 'bg-gray-100' : 'bg-white'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                    placeholder="Ex: Próximo ao mercado, em frente à praça, etc."
                  />
                </div>
              </div>
            </div>

            {/* Detalhes da Demanda */}
            <div className="border-b border-gray-200 pb-6">
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
                    className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:opacity-70 disabled:cursor-not-allowed"
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
                    className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="média">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="boletim_ocorrencia" className="block text-sm font-medium text-gray-700">
                    Denúncia com boletim de ocorrência? *
                  </label>
                  <select
                    id="boletim_ocorrencia"
                    name="boletim_ocorrencia"
                    required
                    value={formData.boletim_ocorrencia}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
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
                          <div className="space-y-1 text-center">
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
                            <div className="flex text-sm text-gray-600">
                              <label
                                htmlFor="boletim_arquivo"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
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
                              <p className="pl-1">ou arraste e solte</p>
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

                <div className="sm:col-span-6">
                  <label className="block text-sm font-medium text-gray-700">
                    Fotos do Problema <span className="text-red-500">*</span>
                    <span className="text-xs font-normal text-gray-500 ml-1">
                      (Mín. 1, Máx. 2 imagens)
                    </span>
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                        >
                          <span>Enviar arquivos</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            multiple
                            accept="image/*"
                            onChange={handleFileChange}
                          />
                        </label>
                        <p className="pl-1">ou arraste e solte</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF até 10MB</p>
                    </div>
                  </div>

                  {/* Pré-visualização das imagens */}
                  {previewUrls.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {previewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Pré-visualização ${index + 1}`}
                            className="h-24 w-full object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Termos de uso */}
            <div className="mt-6 pt-4 border-t border-gray-200">
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
                    Eu concordo com os <a href="/termos-de-uso" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-500">termos de uso</a> e política de privacidade *
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
