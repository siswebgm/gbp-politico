import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabaseClient } from '../../../lib/supabase';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { ChevronLeft, Settings, FileText, Search, Upload, X, AlertCircle, UserCircle, ArrowLeft } from 'lucide-react';
import { saveAs } from 'file-saver';
import TemplateConfig from './components/TemplateConfig';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { useAuth } from '../../../../hooks/useAuth';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface FormData {
  cpf: string;
  tipoDemanda: string;
  urgencia: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  descricao: string;
  dataVistoria?: string;
  fotos: File[];
  referencia: string;
  indicado: string | null;
}

interface Anexo {
  file: File;
  previewUrl: string;
}

interface DemandType {
  categoria: string;
  itens: string[];
}

const NIVEIS_URGENCIA = [
  { value: 'baixa', label: 'Baixa', cor: 'bg-green-100 text-green-800' },
  { value: 'media', label: 'Média', cor: 'bg-yellow-100 text-yellow-800' },
  { value: 'alta', label: 'Alta', cor: 'bg-red-100 text-red-800' },
];

export default function NovoOficio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, company } = useCompanyStore();
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      dataVistoria: `${new Date().getDate().toString().padStart(2, '0')}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${new Date().getFullYear()}`,
    }
  });
  const [isLoadingNumber, setIsLoadingNumber] = useState(true);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [indicados, setIndicados] = useState<any[]>([]);
  const [selectedIndicado, setSelectedIndicado] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSearchingCpf, setIsSearchingCpf] = useState(false);
  const [eleitor, setEleitor] = useState<any>(null);
  const [showTemplateConfig, setShowTemplateConfig] = useState(false);
  const [template, setTemplate] = useState<string | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCadastroModal, setShowCadastroModal] = useState(false);
  const [cpfNaoEncontrado, setCpfNaoEncontrado] = useState<string | null>(null);
  const [isLoadingEleitor, setIsLoadingEleitor] = useState(false);

  const cpf = watch('cpf');

  // Efeito para preencher os campos a partir dos parâmetros da URL
  useEffect(() => {
    const preencherDadosDaUrl = async () => {
      const cpfParam = searchParams.get('cpf');
      const cepParam = searchParams.get('cep');
      const logradouroParam = searchParams.get('logradouro');
      const numeroParam = searchParams.get('numero');
      const bairroParam = searchParams.get('bairro');
      const cidadeParam = searchParams.get('cidade');
      const ufParam = searchParams.get('uf');
      const eleitorUid = searchParams.get('eleitor_uid');

      if (cpfParam) {
        const cpfFormatado = formatCPF(cpfParam);
        setValue('cpf', cpfFormatado);
        
        // Se tiver o UID do eleitor, busca os dados completos
        if (eleitorUid) {
          try {
            setIsLoadingEleitor(true);
            const { data: eleitor, error } = await supabaseClient
              .from('gbp_eleitores')
              .select('*')
              .eq('uid', eleitorUid)
              .single();

            if (eleitor && !error) {
              setEleitor(eleitor);
              setValue('cpf', eleitor.cpf || cpfFormatado);
              setValue('cep', eleitor.cep || cepParam || '');
              setValue('logradouro', eleitor.logradouro || logradouroParam || '');
              setValue('numero', eleitor.numero || numeroParam || '');
              setValue('bairro', eleitor.bairro || bairroParam || '');
              setValue('cidade', eleitor.cidade || cidadeParam || '');
              setValue('estado', eleitor.uf || ufParam || '');
            } else {
              // Se não encontrar pelo UID, preenche com os parâmetros individuais
              setValue('cep', cepParam || '');
              setValue('logradouro', logradouroParam || '');
              setValue('numero', numeroParam || '');
              setValue('bairro', bairroParam || '');
              setValue('cidade', cidadeParam || '');
              setValue('estado', ufParam || '');
            }
          } catch (error) {
            console.error('Erro ao buscar dados do eleitor:', error);
          } finally {
            setIsLoadingEleitor(false);
          }
        } else {
          // Se não tiver UID, preenche apenas com os parâmetros fornecidos
          setValue('cep', cepParam || '');
          setValue('logradouro', logradouroParam || '');
          setValue('numero', numeroParam || '');
          setValue('bairro', bairroParam || '');
          setValue('cidade', cidadeParam || '');
          setValue('estado', ufParam || '');
        }
      }
    };

    preencherDadosDaUrl();
  }, [searchParams, setValue]);

  // Função para formatar CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/g, '$1.$2.$3-$4');
  };

  // Função para lidar com mudança no CPF
  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      const formattedValue = formatCPF(value);
      setValue('cpf', formattedValue);
    }
  };

  // Função para limpar o CPF e informações do requerente
  const handleClearCPF = () => {
    setValue('cpf', '');
    setEleitor(null);
  };

  // Função para buscar eleitor por CPF
  const buscarEleitor = async (cpf: string) => {
    if (!cpf || cpf.length !== 11) return;
    
    setIsSearchingCpf(true);
    try {
      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('uid, nome, whatsapp, cpf')
        .eq('cpf', cpf)
        .eq('empresa_uid', company?.uid)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Não encontrou resultados
          setCpfNaoEncontrado(cpf);
          setShowCadastroModal(true);
        } else {
          throw error;
        }
      } else if (data) {
        setEleitor(data);
      }
    } catch (error) {
      console.error('Erro ao buscar eleitor:', error);
      setUploadError('Erro ao buscar eleitor');
    } finally {
      setIsSearchingCpf(false);
    }
  };

  // Observa mudanças no CPF
  useEffect(() => {
    const cpf = watch('cpf');
    if (!cpf) {
      setEleitor(null);
      return;
    }
    
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length === 11) {
      buscarEleitor(cpfLimpo);
    }
  }, [watch('cpf')]);

  // Função para comprimir imagem
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1080;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Falha ao comprimir imagem'));
              }
            },
            'image/jpeg',
            0.7
          );
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Função para lidar com upload de fotos
  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;

    // Verifica se já atingiu o limite de 2 fotos
    if (anexos.length >= 2) {
      setUploadError('Máximo de 2 fotos permitido');
      return;
    }

    // Calcula quantas fotos ainda podem ser adicionadas
    const remainingSlots = 2 - anexos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    setUploadError('');
    setIsDragging(false);

    try {
      for (const file of filesToProcess) {
        if (!file.type.startsWith('image/')) {
          throw new Error('Por favor, envie apenas arquivos de imagem');
        }

        // Comprimir imagem
        const compressedFile = await compressImage(file);

        const newAnexo = {
          file: compressedFile,
          previewUrl: URL.createObjectURL(compressedFile),
        };

        setAnexos(prev => [...prev, newAnexo]);
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      setUploadError(error instanceof Error ? error.message : 'Erro ao fazer upload das fotos');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let files: FileList | null = null;
    
    if ('dataTransfer' in event) {
      event.preventDefault();
      files = event.dataTransfer.files;
      setIsDragging(false);
    } else {
      files = event.target.files;
    }

    handleFileUpload(files);
  };

  const removeAnexo = (index: number) => {
    setAnexos(prev => {
      const newAnexos = [...prev];
      if (newAnexos[index].previewUrl) {
        URL.revokeObjectURL(newAnexos[index].previewUrl!);
      }
      newAnexos.splice(index, 1);
      return newAnexos;
    });
  };

  useEffect(() => {
    // Limpar URLs de prévia quando o componente for desmontado
    return () => {
      anexos.forEach(anexo => {
        if (anexo.previewUrl) {
          URL.revokeObjectURL(anexo.previewUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!company?.uid) return;

      setIsLoadingTemplate(true);
      
      try {
        // Buscar o template configurado
        const { data: empresaData, error: empresaError } = await supabaseClient
          .from('gbp_empresas')
          .select('template_oficio_url')
          .eq('uid', company.uid)
          .single();

        if (empresaError) throw empresaError;

        console.log('Template URL da empresa:', empresaData?.template_oficio_url);

        if (empresaData?.template_oficio_url) {
          setTemplate(empresaData.template_oficio_url);
          setShowTemplateConfig(false);
        } else {
          setTemplate(null);
          setShowTemplateConfig(true);
        }
      } catch (error) {
        console.error('Erro ao buscar template:', error);
        setTemplate(null);
      } finally {
        setIsLoadingTemplate(false);
      }
    };

    fetchTemplate();
  }, [company?.uid]);

  const handleTemplateDownload = async () => {
    try {
      if (!template) {
        setUploadError('Template não configurado');
        return;
      }

      console.log('Tentando baixar template:', template);

      const { data: fileData, error: downloadError } = await supabaseClient.storage
        .from('gbp_oficios')  // Alterado para o mesmo bucket usado no upload
        .download(template);

      if (downloadError) {
        console.error('Erro ao baixar template:', downloadError);
        setUploadError('Erro ao baixar template do documento');
        return;
      }

      if (!fileData) {
        setUploadError('Arquivo de template não encontrado');
        return;
      }

      // Criar um objeto Blob com o arquivo
      const blob = new Blob([fileData], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      // Salvar o arquivo
      saveAs(blob, `template-oficio.docx`);
    } catch (error) {
      console.error('Erro ao baixar template:', error);
      setUploadError('Erro ao baixar template');
    }
  };

  const handleTemplateUpload = async (file: File) => {
    try {
      if (!company?.uid) {
        throw new Error('Empresa não identificada');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `templates/template-${Date.now()}.${fileExt}`;

      console.log('Tentando fazer upload para:', fileName);

      const { error: uploadError } = await supabaseClient.storage
        .from('gbp_oficios')  // Alterado para o mesmo bucket usado no upload de anexos
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Atualizar a URL do template na empresa
      const { error: updateError } = await supabaseClient
        .from('gbp_empresas')
        .update({ template_oficio_url: fileName })
        .eq('uid', company.uid);

      if (updateError) throw updateError;

      setTemplate(fileName);
      setShowTemplateConfig(false);
    } catch (error) {
      console.error('Erro ao fazer upload do template:', error);
      setUploadError('Erro ao fazer upload do template');
    }
  };

  // Estado para loading do CEP
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  // Função para formatar CEP
  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d{3})/g, '$1-$2');
  };

  // Função para lidar com mudança no CEP
  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 8) {
      const formattedValue = formatCEP(value);
      setValue('cep', formattedValue);

      // Buscar endereço quando CEP estiver completo
      if (value.length === 8) {
        buscarCep(value);
      }
    }
  };

  // Função para buscar CEP
  const buscarCep = async (cep: string) => {
    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setValue('logradouro', data.logradouro);
        setValue('bairro', data.bairro);
        setValue('cidade', data.localidade);
        setValue('estado', data.uf);
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setIsLoadingCep(false);
    }
  };

  // Função para buscar o próximo número de ofício
  const fetchNextNumber = async () => {
    try {
      // Buscar o último número de ofício do ano atual
      const year = new Date().getFullYear();
      const { data, error } = await supabaseClient
        .from('gbp_oficios')
        .select('numero_oficio')
        .eq('empresa_uid', company?.uid)
        .like('numero_oficio', `%/${year}`)
        .order('numero_oficio', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastNumber = parseInt(data[0].numero_oficio.split('/')[0]);
        nextNumber = lastNumber + 1;
      }

      const formattedNumber = `${nextNumber.toString().padStart(3, '0')}/${year}`;
      setValue('numeroOficio', formattedNumber);
      
    } catch (error) {
      console.error('Erro ao buscar próximo número:', error);
      toast.error('Erro ao gerar número do ofício');
    }
  };

  useEffect(() => {
    // Buscar indicados ao montar o componente
    const fetchIndicados = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('gbp_indicado')
          .select('uid, nome, cidade, bairro')
          .eq('empresa_uid', company?.uid)
          .order('nome');

        if (error) throw error;
        setIndicados(data || []);
      } catch (error) {
        console.error('Erro ao buscar indicados:', error);
        toast.error('Erro ao carregar lista de indicados');
      }
    };

    fetchIndicados();
    fetchNextNumber();
  }, [company?.uid]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setUploadError('');

    try {
      // Verificar se temos o usuário atual
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Usuário atual:', user);
      console.log('Iniciando submissão da solicitação:', { ...data, anexos });

      // 1. Upload das fotos para o storage
      const fotoUrls: string[] = [];
      if (anexos.length > 0) {
        console.log('Buscando storage da empresa...');
        const { data: empresaData, error: storageError } = await supabaseClient
          .from('gbp_empresas')
          .select('storage')
          .eq('uid', company?.uid)
          .single();

        if (storageError) {
          console.error('Erro ao buscar storage:', storageError);
          throw storageError;
        }

        console.log('Storage encontrado:', empresaData?.storage);
        const storageBucket = empresaData?.storage || 'oficios';

        for (const anexo of anexos) {
          console.log('Processando anexo:', anexo.file.name);
          const fileExt = anexo.file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `solicitacoes/${company?.uid}/${fileName}`;

          console.log('Fazendo upload para:', { storageBucket, filePath });
          const { error: uploadError } = await supabaseClient
            .storage
            .from(storageBucket)
            .upload(filePath, anexo.file);

          if (uploadError) {
            console.error('Erro no upload:', uploadError);
            throw uploadError;
          }

          const { data: { publicUrl } } = supabaseClient
            .storage
            .from(storageBucket)
            .getPublicUrl(filePath);

          console.log('URL pública gerada:', publicUrl);
          fotoUrls.push(publicUrl);
        }
      }

      // 2. Salvar a solicitação
      const solicitacaoData = {
        numero_oficio: data.numeroOficio || `001/${new Date().getFullYear()}`,
        data_solicitacao: new Date().toISOString().split('T')[0],
        descricao_do_problema: data.descricao,
        logradouro: data.logradouro,
        nivel_de_urgencia: data.urgencia || 'pendente',
        fotos_do_problema: fotoUrls,
        empresa_uid: company?.uid,
        eleitor_uid: eleitor?.uid || null,
        documento: null,
        tag: data.tipoDemanda?.split('::')[0] || null,
        bairro: data.bairro,
        cidade: data.cidade,
        uf: data.estado,
        referencia: data.referencia,
        numero: data.numero,
        contato: eleitor?.whatsapp || null,
        cep: data.cep,
        requerente_cpf: data.cpf ? data.cpf.replace(/\D/g, '') : null,
        requerente_nome: eleitor?.nome || null,
        requerente_whatsapp: eleitor?.whatsapp || null,
        status_solicitacao: 'pendente',
        tipo_de_demanda: data.tipoDemanda,
        responsavel_uid: user.uid, // UID do usuário atual
        responsavel_nome: user.nome, // Nome do usuário atual
        indicado_uid: data.indicado || null
      };

      console.log('Dados da solicitação a serem salvos:', solicitacaoData);

      const { data: insertedData, error: insertError } = await supabaseClient
        .from('gbp_oficios')
        .insert([solicitacaoData])
        .select('uid, numero_oficio')
        .single();

      if (insertError) {
        console.error('Erro ao inserir solicitação:', insertError);
        throw new Error(insertError.message);
      }

      console.log('Solicitação salva com sucesso:', insertedData);

      // 3. Limpar o formulário e mostrar mensagem de sucesso
      reset({
        numeroOficio: '',
        cpf: '',
        tipoDemanda: '',
        urgencia: '',
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        descricao: '',
        referencia: '',
        dataVistoria: `${new Date().getDate().toString().padStart(2, '0')}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${new Date().getFullYear()}`
      });
      setAnexos([]);
      setEleitor(null);

      // Toast de sucesso com delay para garantir que seja exibido após a limpeza do form
      setTimeout(() => {
        toast.success(
          <div className="flex flex-col">
            <span className="font-medium">Solicitação registrada com sucesso!</span>
            <span className="text-sm mt-1">
              Número da solicitação: {insertedData.numero_oficio}
            </span>
            {eleitor && (
              <span className="text-sm">
                Requerente: {eleitor.nome}
              </span>
            )}
          </div>,
          {
            position: "top-right",
            autoClose: 6000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            className: 'bg-white dark:bg-gray-800',
          }
        );
      }, 100);

      // 4. Buscar próximo número de ofício
      fetchNextNumber();

      // 5. Redirecionar para a lista de ofícios
      navigate('/app/documentos/oficios');

    } catch (error) {
      console.error('Erro detalhado ao salvar solicitação:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Toast de erro com delay
      setTimeout(() => {
        toast.error(
          <div className="flex flex-col">
            <span className="font-medium">Não foi possível registrar a solicitação</span>
            <span className="text-sm mt-1">
              {errorMessage === 'Usuário não autenticado'
                ? 'Por favor, faça login novamente para continuar'
                : 'Verifique os dados e tente novamente'}
            </span>
          </div>,
          {
            position: "top-right",
            autoClose: 6000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            className: 'bg-white dark:bg-gray-800',
          }
        );
      }, 100);
      
      setUploadError(`Erro ao salvar solicitação: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [demandTypes, setDemandTypes] = useState<DemandType[]>([]);
  const [isLoadingDemandTypes, setIsLoadingDemandTypes] = useState(true);

  useEffect(() => {
    async function loadDemandTypes() {
      if (company?.uid) {
        try {
          const { data, error } = await supabaseClient
            .from('gbp_demanda_tipo')
            .select('*')
            .eq('empresa_uid', company.uid);

          if (error) {
            console.error('Erro ao carregar tipos de demanda:', error);
            setDemandTypes([]);
            return;
          }

          if (data && data.length > 0) {
            // Usamos o primeiro registro encontrado para a empresa
            const tipos = data[0].nome_tipo || [];
            const categoriasMap = new Map<string, string[]>();
            
            tipos.forEach((item: string) => {
              if (!item) return;
              const [categoria, ...resto] = item.split('::');
              if (!categoria) return;
              
              if (!categoriasMap.has(categoria)) {
                categoriasMap.set(categoria, []);
              }
              
              if (resto.length > 0) {
                const itemCompleto = resto.join('::');
                if (itemCompleto) {
                  categoriasMap.get(categoria)?.push(itemCompleto);
                }
              }
            });

            const categoriasArray = Array.from(categoriasMap).map(([categoria, itens]) => ({
              categoria,
              itens: Array.from(new Set(itens)) // Remove duplicatas
            }));

            setDemandTypes(categoriasArray);
          } else {
            setDemandTypes([]);
          }
        } catch (e) {
          console.error('Erro ao processar tipos de demanda:', e);
          setDemandTypes([]);
        } finally {
          setIsLoadingDemandTypes(false);
        }
      } else {
        setIsLoadingDemandTypes(false);
      }
    }
    loadDemandTypes();
  }, [company?.uid]);

  if (isLoadingTemplate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 py-2 md:py-6 px-2 md:px-4">
          <div className="flex flex-col space-y-2 md:space-y-4 max-w-[1600px] mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Modelo de Ofício não Configurado
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Para criar ofícios, primeiro é necessário configurar o modelo do documento.
                </p>
                <button
                  onClick={() => setShowTemplateConfig(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Configurar Modelo
                </button>
              </div>
            </div>
          </div>
        </div>

        {showTemplateConfig && (
          <TemplateConfig
            onClose={() => setShowTemplateConfig(false)}
            onSuccess={() => {
              setShowTemplateConfig(false);
              const fetchTemplate = async () => {
                if (!company?.uid) return;
                const { data } = await supabaseClient
                  .from('gbp_empresas')
                  .select('template_oficio_url')
                  .eq('uid', company.uid)
                  .single();
                setTemplate(data?.template_oficio_url || null);
              };
              fetchTemplate();
            }}
          />
        )}
      </div>
    );
  }

  // Função para formatar data
  const formatDate = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{2})(\d{4})/g, '$1/$2/$3');
  };

  // Função para lidar com mudança na data
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 8) {
      const formattedValue = formatDate(value);
      setValue('dataVistoria', formattedValue);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <ToastContainer
        position="top-right"
        autoClose={6000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div className="w-full bg-white dark:bg-gray-800 shadow-sm">
        <div className="p-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/app/documentos/oficios')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              title="Voltar"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Nova Solicitação</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Registre uma nova demanda da comunidade
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="py-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            {/* Tipo de Demanda e Urgência */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Demanda
                </label>
                <select
                  {...register('tipoDemanda', { required: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 [&_optgroup]:font-bold [&_optgroup]:text-primary-600 dark:[&_optgroup]:text-primary-400 [&_option]:pl-4 [&_option]:py-2 [&_option]:border-b [&_option]:border-gray-100 dark:[&_option]:border-gray-600 [&_option]:text-gray-700 dark:[&_option]:text-gray-300"
                >
                  <option value="" className="text-gray-500">Selecione uma demanda</option>
                  {demandTypes?.map((categoria) => [
                    <optgroup key={categoria.categoria} label={categoria.categoria} className="bg-gray-50 dark:bg-gray-800">
                      {categoria.itens.map((item) => (
                        <option 
                          key={`${categoria.categoria}::${item}`} 
                          value={`${categoria.categoria}::${item}`}
                          className="bg-white dark:bg-gray-700"
                        >
                          • {item}
                        </option>
                      ))}
                    </optgroup>
                  ])}
                </select>
                {errors.tipoDemanda && (
                  <span className="text-sm text-red-500">Tipo de demanda é obrigatório</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nível de Urgência
                </label>
                <select
                  {...register('urgencia', { required: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700"
                >
                  <option value="">Selecione a urgência</option>
                  {NIVEIS_URGENCIA.map(nivel => (
                    <option key={nivel.value} value={nivel.value}>
                      {nivel.label}
                    </option>
                  ))}
                </select>
                {errors.urgencia && (
                  <span className="text-sm text-red-500">Campo obrigatório</span>
                )}
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Localização da Demanda
              </h3>
              
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CEP
                </label>
                <div className="relative">
                  <input
                    type="text"
                    {...register('cep', { required: true })}
                    onChange={handleCEPChange}
                    maxLength={9}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="00000-000"
                  />
                  {isLoadingCep && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                    </div>
                  )}
                </div>
                {errors.cep && (
                  <span className="text-sm text-red-500">CEP é obrigatório</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Referência
                </label>
                <input
                  type="text"
                  {...register('referencia')}
                  placeholder="Ex: Próximo ao mercado, Em frente à escola..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    {...register('logradouro', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.logradouro && (
                    <span className="text-sm text-red-500">Logradouro é obrigatório</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    {...register('numero', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.numero && (
                    <span className="text-sm text-red-500">Número é obrigatório</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    {...register('bairro', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.bairro && (
                    <span className="text-sm text-red-500">Bairro é obrigatório</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    {...register('cidade', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.cidade && (
                    <span className="text-sm text-red-500">Cidade é obrigatória</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estado
                  </label>
                  <input
                    type="text"
                    {...register('estado', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.estado && (
                    <span className="text-sm text-red-500">Estado é obrigatório</span>
                  )}
                </div>
              </div>
            </div>

            {/* Requerente */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Dados do Requerente
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CPF do Requerente <span className="text-gray-500 text-sm">(opcional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      {...register('cpf')}
                      onChange={(e) => {
                        if (!e.target.value) {
                          setEleitor(null);
                        }
                        handleCPFChange(e);
                      }}
                      maxLength={14}
                      className="w-full px-3 py-2 pl-3 pr-16 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      placeholder="000.000.000-00"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                      {watch('cpf') && (
                        <button
                          type="button"
                          onClick={handleClearCPF}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                          title="Limpar CPF"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      )}
                      {isSearchingCpf && (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                      )}
                    </div>
                  </div>
                  {errors.cpf && (
                    <span className="text-sm text-red-500">CPF inválido</span>
                  )}
                  {eleitor && (
                    <div className="mt-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <UserCircle className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                        <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Informações do Requerente
                        </h4>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
                          <span className="font-medium mr-2">Nome:</span>
                          <button
                            type="button"
                            onClick={() => navigate(`/app/eleitores/${eleitor.uid}`)}
                            className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 hover:underline focus:outline-none"
                          >
                            {eleitor.nome}
                          </button>
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
                          <span className="font-medium mr-2">WhatsApp:</span>
                          <span className="text-blue-600 dark:text-blue-300">
                            {eleitor.whatsapp}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Indicado
                    </label>
                    <select
                      {...register('indicado')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700"
                    >
                      <option value="">Selecione um indicado</option>
                      {indicados.map(indicado => (
                        <option key={indicado.uid} value={indicado.uid}>
                          {indicado.nome} - {indicado.bairro}, {indicado.cidade}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Descrição e Data */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição do Problema
                </label>
                <textarea
                  {...register('descricao', { required: true })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Descreva detalhadamente o problema..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data para Vistoria
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    {...register('dataVistoria', { required: true })}
                    onChange={handleDateChange}
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="dd/mm/aaaa"
                  />
                </div>
                {errors.dataVistoria && (
                  <span className="text-sm text-red-500">Data da vistoria é obrigatória</span>
                )}
              </div>
            </div>

            {/* Fotos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fotos do Problema (opcional)
              </label>
              
              {/* Lista de fotos */}
              {anexos.length > 0 && (
                <div className="mb-4 space-y-2">
                  {anexos.map((anexo, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center">
                        <img src={anexo.previewUrl} alt={anexo.file.name} className="h-10 w-10 object-cover rounded" />
                        <span className="ml-2 text-sm text-gray-700">{anexo.file.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAnexo(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Área de upload */}
              <label
                htmlFor="file-upload"
                className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md relative cursor-pointer hover:border-primary-500 transition-colors"
              >
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 015.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex flex-col items-center text-sm text-gray-600">
                    <span className="font-medium text-primary-600 hover:text-primary-500">Enviar fotos</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    <p className="mt-2">ou arraste e solte as imagens aqui</p>
                  </div>
                  <p className="text-xs text-gray-500">Máximo 2 fotos - Use a câmera ou selecione da galeria</p>
                </div>
              </label>

              {uploadError && (
                <p className="mt-2 text-sm text-red-600">{uploadError}</p>
              )}
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/app/documentos/oficios')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Cadastro */}
      {showCadastroModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Requerente não encontrado
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              O CPF informado não foi encontrado na base de dados. Deseja cadastrar um novo requerente?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCadastroModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCadastroModal(false);
                  navigate('/app/eleitores/novo', { state: { cpf: cpfNaoEncontrado } });
                }}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                Cadastrar Requerente
              </button>
            </div>
          </div>
        </div>
      )}

      {showTemplateConfig && (
        <TemplateConfig
          onClose={() => setShowTemplateConfig(false)}
          onSuccess={() => {
            setShowTemplateConfig(false);
            const fetchTemplate = async () => {
              if (!company?.uid) return;
              const { data } = await supabaseClient
                .from('gbp_empresas')
                .select('template_oficio_url')
                .eq('uid', company.uid)
                .single();
              setTemplate(data?.template_oficio_url || null);
            };
            fetchTemplate();
          }}
        />
      )}
    </div>
  );
}
