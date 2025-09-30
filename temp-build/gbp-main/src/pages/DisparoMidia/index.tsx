import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Filter, Image, Video, Mic, FileText, Users, X, MessageSquare, Upload, Smartphone, Play, List, ListOrdered, Code, Building2, User, Info, Loader2, AlertTriangle, Tags, MapPin, Paperclip, CheckCircle } from 'lucide-react';
import { Card } from '../../components/Card';
import { useToast } from '../../hooks/useToast';
import { supabaseClient } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useCompanyStore } from '../../store/useCompanyStore';
import { Loading } from '../../components/Loading';
import { useCategoryTypes } from '../../hooks/useCategoryTypes';
import { useFileUpload } from './hooks/useFileUpload';
import { useCategories } from '../../hooks/useCategories';
import { Button } from '../../components/ui/button';
import { WhatsAppPreview } from './components/WhatsAppPreview';
import { Select } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { useFilterOptions } from './hooks/useFilterOptions';
import {
  Select as NewSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import { Switch } from '../../components/ui/switch';

interface FilterOption {
  id: string;
  label: string;
  value: string;
  type: 'categoria' | 'cidade' | 'bairro' | 'genero';
}

interface MediaFile {
  file: File;
  type: 'image' | 'video' | 'audio' | 'pdf';
  previewUrl: string;
}

export function DisparoMidia() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const company = useCompanyStore(state => state.company);
  const toast = useToast();
  const { uploadFile } = useFileUpload();
  const [loading, setLoading] = useState(false);

  // Status do WhatsApp
  const statusWpp = company?.status_wpp || 'close';
  const statusWppMessage = statusWpp === 'close' 
    ? 'WhatsApp está desconectado'
    : 'WhatsApp está conectado';
  const statusWppColor = statusWpp === 'close' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';

  // Carregar dados do usuário
  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user: supabaseUser } } = await supabaseClient.auth.getUser();
        console.log('Debug - Supabase User:', supabaseUser);
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
      }
    }
    loadUserData();
  }, []);

  // Estados
  const [message, setMessage] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [includeSaudacao, setIncludeSaudacao] = useState(true);
  const [useNomeDisparo, setUseNomeDisparo] = useState(true);
  const [eleitoresCount, setEleitoresCount] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Manter nome_disparo sincronizado com includeSaudacao
  useEffect(() => {
    setUseNomeDisparo(includeSaudacao);
  }, [includeSaudacao]);

  // Estados para filtros
  const [selectedCategoryType, setSelectedCategoryType] = useState<string>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [selectedCities, setSelectedCities] = useState<string[]>(['all']);
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>(['all']);
  const [selectedGender, setSelectedGender] = useState<string>('all');

  // Usar os hooks de categorias e tipos
  const { data: categoryTypes, isLoading: isLoadingCategoryTypes } = useCategoryTypes();
  const { data: categories, isLoading: isLoadingCategories } = useCategories(selectedCategoryType === 'all' ? undefined : selectedCategoryType);

  // Formatar categorias para o select
  const formattedCategories = categories?.map(cat => ({
    value: cat.uid,
    label: cat.nome
  })) || [];

  // Buscar opções de filtro
  const { cities, neighborhoods, isLoading: isLoadingFilters } = useFilterOptions();

  // Função para contar eleitores
  const countEleitores = async () => {
    if (!company?.uid) return;
    
    try {
      setLoadingCount(true);
      
      let query = supabaseClient
        .from('gbp_eleitores')
        .select('uid', { count: 'exact', head: true })
        .eq('empresa_uid', company.uid);

      // Aplicar filtros de categoria
      if (selectedCategories.length > 0 && selectedCategories[0] !== 'all') {
        if (selectedCategories.length === 1) {
          query = query.eq('categoria_uid', selectedCategories[0]);
        } else {
          query = query.in('categoria_uid', selectedCategories);
        }
      }

      // Aplicar filtros de cidade
      if (selectedCities.length > 0 && selectedCities[0] !== 'all') {
        query = query.in('cidade', selectedCities);
      }

      // Aplicar filtros de bairro
      if (selectedNeighborhoods.length > 0 && selectedNeighborhoods[0] !== 'all') {
        query = query.in('bairro', selectedNeighborhoods);
      }

      // Aplicar filtro de gênero
      if (selectedGender !== 'all') {
        query = query.eq('genero', selectedGender);
      }

      console.log('Query URL:', query.url); // Debug da URL

      const { count, error } = await query;

      if (error) {
        console.error('Erro na query:', error);
        throw error;
      }
      
      setEleitoresCount(count || 0);
    } catch (error) {
      console.error('Erro ao contar eleitores:', error);
      setEleitoresCount(0);
    } finally {
      setLoadingCount(false);
    }
  };

  // Atualizar contagem quando os filtros mudarem
  useEffect(() => {
    countEleitores();
  }, [selectedCategories, selectedCities, selectedNeighborhoods, selectedGender, company?.uid]);

  // Handlers para múltipla seleção
  const handleCategoryChange = (value: string) => {
    if (!value) {
      return;
    }

    setSelectedCategories(prev => {
      // Se selecionou "all"
      if (value === 'all') {
        return ['all'];
      }
      
      // Se já tinha "all" selecionado, remove e adiciona o novo valor
      if (prev.includes('all')) {
        return [value];
      }

      // Se já estava selecionado, remove
      if (prev.includes(value)) {
        const newSelection = prev.filter(item => item !== value);
        // Se ficou vazio, seleciona "all"
        return newSelection.length === 0 ? ['all'] : newSelection;
      }

      // Adiciona à seleção
      return [...prev, value];
    });
  };

  const handleCityChange = (value: string) => {
    let newValues: string[];
    
    if (value === 'all') {
      newValues = ['all'];
    } else if (selectedCities.includes('all')) {
      newValues = [value];
    } else {
      newValues = selectedCities.includes(value)
        ? selectedCities.filter(v => v !== value)
        : [...selectedCities, value];
      
      if (newValues.length === 0) {
        newValues = ['all'];
      }
    }
    
    setSelectedCities(newValues);
  };

  const handleNeighborhoodChange = (value: string) => {
    let newValues: string[];
    
    if (value === 'all') {
      newValues = ['all'];
    } else if (selectedNeighborhoods.includes('all')) {
      newValues = [value];
    } else {
      newValues = selectedNeighborhoods.includes(value)
        ? selectedNeighborhoods.filter(v => v !== value)
        : [...selectedNeighborhoods, value];
      
      if (newValues.length === 0) {
        newValues = ['all'];
      }
    }
    
    setSelectedNeighborhoods(newValues);
  };

  const handleGenderChange = (value: string) => {
    setSelectedGender(value);
  };

  // Limpar todos os filtros
  const handleClearFilters = () => {
    setSelectedCategories(['all']);
    setSelectedCities(['all']);
    setSelectedNeighborhoods(['all']);
    setSelectedGender('all');
  };

  // Preparar dados para inserção
  const prepareDisparo = () => {
    // Converter IDs das categorias para nomes
    const categoriasNomes = selectedCategories.map(catId => {
      const categoria = categories?.find(c => c.uid === catId);
      return categoria?.nome || '';
    }).filter(nome => nome !== '');

    return {
      empresa_uid: company?.uid,
      empresa_nome: company?.nome,
      usuario_nome: user?.nome,
      mensagem: message,
      upload: [],  // Será preenchido após upload
      categoria: categoriasNomes,
      cidade: selectedCities[0] === 'all' ? [] : selectedCities,
      bairro: selectedNeighborhoods[0] === 'all' ? [] : selectedNeighborhoods,
      qtde: selectedCategories.length > 0 || selectedCities.length > 0 || selectedNeighborhoods.length > 0 ? 1 : null,
      token: company?.token,
      instancia: company?.instancia,
      porta: company?.porta,
      nome_disparo: useNomeDisparo,
      saudacao: includeSaudacao,
      created_at: new Date().toISOString()
    };
  };

  // Função para formatar URL substituindo o último underscore por ponto
  const formatUrl = (url: string) => {
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'mp4', 'mp3', 'wav', 'pdf'];
    
    for (const ext of extensions) {
      if (url.toLowerCase().endsWith(`_${ext}`)) {
        return url.slice(0, -(ext.length + 1)) + '.' + ext;
      }
    }
    
    return url;
  };

  const handleSendMessage = async () => {
    if (!message) {
      toast.showToast({
        type: 'error',
        title: 'Erro',
        description: 'Digite uma mensagem antes de enviar'
      });
      return;
    }

    try {
      setSending(true);

      // Preparar dados do disparo
      const disparo = {
        empresa_uid: company?.uid,
        empresa_nome: company?.nome,
        usuario_nome: user?.nome,
        mensagem: message,
        upload: [],  // Será preenchido após upload
        categoria: selectedCategories[0] === 'all' ? [] : selectedCategories,
        cidade: selectedCities[0] === 'all' ? [] : selectedCities,
        bairro: selectedNeighborhoods[0] === 'all' ? [] : selectedNeighborhoods,
        genero: selectedGender === 'all' ? null : selectedGender,
        qtde: selectedCategories.length > 0 || selectedCities.length > 0 || selectedNeighborhoods.length > 0 || selectedGender !== 'all' ? 1 : null,
        token: company?.token,
        instancia: company?.instancia,
        porta: company?.porta,
        nome_disparo: includeSaudacao,
        saudacao: includeSaudacao,
        created_at: new Date().toISOString()
      };

      // Fazer upload dos arquivos
      if (mediaFiles.length > 0) {
        const uploadPromises = mediaFiles.map(async (file) => {
          try {
            const url = await uploadFile(file.file);
            // Formata a URL substituindo o último underscore por ponto
            return formatUrl(url);
          } catch (error) {
            console.error('Erro ao fazer upload do arquivo:', error);
            throw new Error(`Erro ao fazer upload do arquivo ${file.file.name}`);
          }
        });

        const uploadedUrls = await Promise.all(uploadPromises);
        disparo.upload = uploadedUrls;
      }

      // Enviar para o backend
      const { error } = await supabaseClient
        .from('gbp_disparo')
        .insert(disparo);

      if (error) throw error;

      // Mostrar modal de sucesso
      setShowSuccessDialog(true);

      // Limpar formulário
      setMessage('');
      setMediaFiles([]);
      setSelectedCategories(['all']);
      setSelectedCities(['all']);
      setSelectedNeighborhoods(['all']);
      setSelectedGender('all');
      
      // Limpar inputs de arquivo
      ['imageInput', 'videoInput', 'audioInput', 'pdfInput'].forEach(inputId => {
        const input = document.getElementById(inputId) as HTMLInputElement;
        if (input) {
          input.value = '';
        }
      });

      setShowConfirmDialog(false);

    } catch (error: any) {
      console.error('Erro ao enviar disparo:', error);
      toast.showToast({
        type: 'error',
        title: 'Erro',
        description: error.message || 'Erro ao enviar disparo. Tente novamente.'
      });
    } finally {
      setSending(false);
    }
  };

  // Handlers para mensagens
  const handleSendClick = () => {
    if (!message) {
      toast.showToast({
        type: 'error',
        title: 'Erro',
        description: 'Digite uma mensagem antes de enviar'
      });
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleSendTest = async () => {
    try {
      setSendingTest(true);
      
      const payload = {
        message,
        mediaFiles,
        includeSaudacao,
        nome_disparo: includeSaudacao,
        empresa: {
          id: company?.uid,
          nome: company?.nome,
        },
        user: {
          id: user?.id,
          nome: user?.nome,
          email: user?.email,
          contato: user?.contato,
          whatsapp: user?.whatsapp
        },
        filters: {
          categoria: selectedCategories,
          cidade: selectedCities,
          bairro: selectedNeighborhoods,
          genero: selectedGender
        }
      };

      const response = await fetch('https://edtn8n.guardia.work/webhook-test/7b53f029-6bae-4660-ad1c-74666e8ec4e6', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar teste');
      }

      toast.success('Teste enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar teste:', error);
      toast.error('Erro ao enviar teste. Tente novamente.');
    } finally {
      setSendingTest(false);
    }
  };

  // Handlers para upload de arquivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: MediaFile['type']) => {
    const files = e.target.files;
    if (!files) return;

    try {
      const newFiles = Array.from(files).map((file) => ({
        file,
        type,
        previewUrl: type === 'image' || type === 'video' ? URL.createObjectURL(file) : ''
      }));

      setMediaFiles(prev => [...prev, ...newFiles]);
    } catch (error) {
      console.error('Erro ao adicionar arquivos:', error);
      toast.showToast({
        type: 'error',
        title: 'Erro',
        description: 'Erro ao adicionar arquivos'
      });
    }
  };

  const handleRemoveFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Renderiza os filtros selecionados
  const renderSelectedFilters = () => {
    const filterGroups: { [key: string]: string } = {
      categoria: 'Categoria',
      cidade: 'Cidade',
      bairro: 'Bairro',
      genero: 'Gênero'
    };

    return selectedCategories.map((filter) => (
      <div
        key={filter}
        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-full text-sm"
      >
        <span className="font-medium">{filterGroups['categoria']}:</span>
        {filter}
        <button
          onClick={() => handleCategoryChange(filter)}
          className="hover:text-blue-600 dark:hover:text-blue-300"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    ));
  };

  // Verificar acesso
  const canAccess = user?.nivel_acesso === 'admin' || user?.nivel_acesso === 'gerente';

  // Redirecionar se não tiver acesso
  useEffect(() => {
    if (!canAccess) {
      toast.showToast({
        type: 'error',
        title: 'Acesso Negado',
        description: 'Você não tem permissão para acessar esta página'
      });
      navigate('/app');
    }
  }, [canAccess, navigate]);

  // Se não tiver acesso, não renderiza nada
  if (!canAccess) {
    return null;
  }

  return (
    <div className="bg-white/50 dark:bg-white/50">
      <div className="container mx-auto space-y-4 p-3 md:p-4">
      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 20px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.7);
        }
      `}</style>
      <div className="mt-0 mb-2 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Disparo de Mídia</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          <span className="hidden sm:inline">Envie mensagens e mídias para seus contatos de forma eficiente e organizada.</span>
          <span className="sm:hidden">Envie mensagens e mídias para contatos.</span>
        </p>
      </div>

      {/* Status WhatsApp */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="flex items-center">
          <div 
            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${statusWppColor} w-full justify-center cursor-pointer ${statusWppMessage === 'WhatsApp está desconectado' ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : ''}`} 
            onClick={() => {
              if (statusWppMessage === 'WhatsApp está desconectado') {
                navigate('/app/whatsapp');
              }
            }}
          >
            <span className="font-bold">{statusWppMessage}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Grupo Mensagem */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-500" />
                    <h2 className="font-medium">Mensagem</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="saudacao"
                      checked={includeSaudacao}
                      onCheckedChange={setIncludeSaudacao}
                    />
                    <Label htmlFor="saudacao" className="text-sm text-gray-600 dark:text-gray-300">
                      Incluir saudação
                    </Label>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="min-h-[120px]"
                  ref={textareaRef}
                />
                {includeSaudacao && (
                  <div className="mt-2 text-sm text-gray-500">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 mt-0.5" />
                      <span>
                        Saudação inicial: <span className="text-gray-700 dark:text-gray-300">Olá, Fulano. Tudo bem?</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Grupo Filtros */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-purple-500" />
                    <h2 className="font-medium">Filtros</h2>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {loadingCount ? (
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="hidden sm:inline">Calculando...</span>
                      </div>
                    ) : (
                      <div className="text-sm text-blue-600 font-medium whitespace-nowrap">
                        {eleitoresCount} {eleitoresCount === 1 ? 'eleitor' : 'eleitores'}
                      </div>
                    )}
                    {(selectedCategories.length > 0 || selectedCities.length > 0 || selectedNeighborhoods.length > 0 || selectedGender !== 'all') && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-xs text-gray-500 hover:text-purple-500 flex items-center gap-1 p-0 h-auto"
                        onClick={handleClearFilters}
                      >
                        <X className="h-3 w-3" />
                        <span className="hidden sm:inline">Limpar filtros</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-gray-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                  {/* Tipo de Categoria */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
                      <span>Tipo de Categoria</span>
                    </Label>
                    <NewSelect 
                      value={selectedCategoryType} 
                      onValueChange={(value) => {
                        setSelectedCategoryType(value);
                      }}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <SelectValue placeholder="Selecione um tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 max-h-[200px] overflow-y-auto">
                        <SelectItem value="all" className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                          Todos os tipos
                        </SelectItem>
                        {categoryTypes?.map((type) => (
                          <SelectItem 
                            key={type.uid} 
                            value={type.uid}
                            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            {type.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </NewSelect>
                  </div>

                  {/* Categoria */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
                      <span>Categoria</span>
                      {selectedCategories.length > 0 && selectedCategories[0] !== 'all' && (
                        <span className="text-xs text-purple-600">{selectedCategories.length} selecionado(s)</span>
                      )}
                    </Label>
                    <NewSelect 
                      value={selectedCategories[0] || ''} 
                      onValueChange={handleCategoryChange}
                      disabled={isLoadingCategories}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 max-h-[200px] overflow-y-auto">
                        <SelectItem value="all" className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                          Todas as categorias
                        </SelectItem>
                        {formattedCategories.map((category) => (
                          <SelectItem 
                            key={category.value} 
                            value={category.value}
                            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </NewSelect>
                  </div>

                  {/* Cidade */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
                      <span>Cidade</span>
                      {selectedCities[0] !== 'all' && (
                        <span className="text-xs text-blue-600">{selectedCities.length} selecionado(s)</span>
                      )}
                    </Label>
                    <NewSelect 
                      value={selectedCities[0]} 
                      onValueChange={handleCityChange}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <SelectValue placeholder="Todas as cidades" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 max-h-[200px] overflow-y-auto">
                        <SelectItem value="all" className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                          Todas as cidades
                        </SelectItem>
                        {cities.map((city) => (
                          <SelectItem 
                            key={city.value} 
                            value={city.value}
                            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            {city.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </NewSelect>
                  </div>

                  {/* Bairro */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
                      <span>Bairro</span>
                      {selectedNeighborhoods[0] !== 'all' && (
                        <span className="text-xs text-green-600">{selectedNeighborhoods.length} selecionado(s)</span>
                      )}
                    </Label>
                    <NewSelect 
                      value={selectedNeighborhoods[0]} 
                      onValueChange={handleNeighborhoodChange}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <SelectValue placeholder="Todos os bairros" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 max-h-[200px] overflow-y-auto">
                        <SelectItem value="all" className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                          Todos os bairros
                        </SelectItem>
                        {neighborhoods.map((neighborhood) => (
                          <SelectItem 
                            key={neighborhood.value} 
                            value={neighborhood.value}
                            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            {neighborhood.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </NewSelect>
                  </div>

                  {/* Gênero */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Gênero
                    </Label>
                    <NewSelect 
                      value={selectedGender} 
                      onValueChange={handleGenderChange}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <SelectValue placeholder="Todos os gêneros" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800">
                        <SelectItem value="all" className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                          Todos os gêneros
                        </SelectItem>
                        <SelectItem value="Masculino" className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                          Masculino
                        </SelectItem>
                        <SelectItem value="Feminino" className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                          Feminino
                        </SelectItem>
                      </SelectContent>
                    </NewSelect>
                  </div>
                </div>

                {/* Tags dos filtros selecionados */}
                {(selectedCategories.length > 0 || selectedCities.length > 0 || selectedNeighborhoods.length > 0 || selectedGender !== 'all') && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedCategories.map(categoryId => {
                      const category = formattedCategories.find(c => c.value === categoryId);
                      return category && (
                        <span key={categoryId} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-md border border-purple-200">
                          {category.label}
                          <X 
                            className="h-3 w-3 cursor-pointer hover:text-purple-900" 
                            onClick={() => handleCategoryChange(categoryId)}
                          />
                        </span>
                      );
                    })}
                    
                    {selectedCities.map(cityId => {
                      const city = cities.find(c => c.value === cityId);
                      return city && (
                        <span key={cityId} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                          {city.label}
                          <X 
                            className="h-3 w-3 cursor-pointer hover:text-blue-900" 
                            onClick={() => handleCityChange(cityId)}
                          />
                        </span>
                      );
                    })}

                    {selectedNeighborhoods.map(neighborhoodId => {
                      const neighborhood = neighborhoods.find(n => n.value === neighborhoodId);
                      return neighborhood && (
                        <span key={neighborhoodId} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-md border border-green-200">
                          {neighborhood.label}
                          <X 
                            className="h-3 w-3 cursor-pointer hover:text-green-900" 
                            onClick={() => handleNeighborhoodChange(neighborhoodId)}
                          />
                        </span>
                      );
                    })}

                    {selectedGender !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-pink-50 text-pink-700 rounded-md border border-pink-200">
                        {selectedGender}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-pink-900" 
                          onClick={() => setSelectedGender('all')}
                        />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Grupo Arquivos */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-green-500" />
                    <h2 className="font-medium">Arquivos</h2>
                  </div>
                  <span className="text-xs text-gray-500">Arraste ou clique aqui</span>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Imagens */}
                  <div 
                    className="relative group cursor-pointer rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-colors p-4"
                    onClick={() => document.getElementById('imageInput')?.click()}
                  >
                    <input
                      type="file"
                      id="imageInput"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileChange(e, 'image')}
                    />
                    <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 group-hover:text-green-500 transition-colors">
                      <Image className="h-8 w-8" />
                      <span className="text-sm font-medium">Imagens</span>
                      <span className="text-xs">{mediaFiles.filter(f => f.type === 'image').length} arquivos</span>
                    </div>
                  </div>

                  {/* Vídeos */}
                  <div 
                    className="relative group cursor-pointer rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-colors p-4"
                    onClick={() => document.getElementById('videoInput')?.click()}
                  >
                    <input
                      type="file"
                      id="videoInput"
                      className="hidden"
                      accept="video/*"
                      multiple
                      onChange={(e) => handleFileChange(e, 'video')}
                    />
                    <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 group-hover:text-green-500 transition-colors">
                      <Video className="h-8 w-8" />
                      <span className="text-sm font-medium">Vídeos</span>
                      <span className="text-xs">{mediaFiles.filter(f => f.type === 'video').length} arquivos</span>
                    </div>
                  </div>

                  {/* Áudios */}
                  <div 
                    className="relative group cursor-pointer rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-colors p-4"
                    onClick={() => document.getElementById('audioInput')?.click()}
                  >
                    <input
                      type="file"
                      id="audioInput"
                      className="hidden"
                      accept="audio/*"
                      multiple
                      onChange={(e) => handleFileChange(e, 'audio')}
                    />
                    <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 group-hover:text-green-500 transition-colors">
                      <Mic className="h-8 w-8" />
                      <span className="text-sm font-medium">Áudios</span>
                      <span className="text-xs">{mediaFiles.filter(f => f.type === 'audio').length} arquivos</span>
                    </div>
                  </div>

                  {/* PDFs */}
                  <div 
                    className="relative group cursor-pointer rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-colors p-4"
                    onClick={() => document.getElementById('pdfInput')?.click()}
                  >
                    <input
                      type="file"
                      id="pdfInput"
                      className="hidden"
                      accept=".pdf"
                      multiple
                      onChange={(e) => handleFileChange(e, 'pdf')}
                    />
                    <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 group-hover:text-green-500 transition-colors">
                      <FileText className="h-8 w-8" />
                      <span className="text-sm font-medium">PDFs</span>
                      <span className="text-xs">{mediaFiles.filter(f => f.type === 'pdf').length} arquivos</span>
                    </div>
                  </div>
                </div>

                {/* Lista de Arquivos */}
                {mediaFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                      {mediaFiles.map((file, index) => (
                        <div
                          key={index}
                          className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-red-500 dark:hover:border-red-500 transition-colors"
                        >
                          {/* Preview do Arquivo */}
                          <div className="w-full h-20">
                            {file.type === 'image' && (
                              <img
                                src={file.previewUrl}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            )}
                            {file.type === 'video' && (
                              <div className="w-full h-full">
                                <video
                                  src={file.previewUrl}
                                  className="w-full h-full object-cover"
                                  controls
                                />
                              </div>
                            )}
                            {file.type === 'audio' && (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-1">
                                <button
                                  onClick={() => {
                                    const audio = new Audio(file.previewUrl);
                                    audio.play();
                                  }}
                                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                                  title="Reproduzir áudio"
                                >
                                  <Play className="h-8 w-8 text-gray-400" />
                                </button>
                              </div>
                            )}
                            {file.type === 'pdf' && (
                              <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                                <FileText className="h-8 w-8 text-gray-400" />
                              </div>
                            )}

                            {/* Botão Remover */}
                            <div 
                              className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center"
                            >
                              <button
                                onClick={() => handleRemoveFile(index)}
                                className="p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                title="Clique para remover"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total de Arquivos */}
                    <div className="text-xs text-gray-500">
                      {mediaFiles.length} arquivo{mediaFiles.length !== 1 ? 's' : ''} 
                      <span className="text-gray-400"> (passe o mouse sobre o arquivo para remover)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Botões de ação */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={handleSendTest}
                disabled={!message || sendingTest}
              >
                {sendingTest ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando teste...
                  </>
                ) : (
                  'Enviar teste'
                )}
              </Button>
              <Button
                onClick={handleSendClick}
                disabled={loading || !message}
                className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Mensagem
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="w-[360px] flex-shrink-0">
          <Card>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-blue-500" />
                  <h2 className="font-medium">Preview</h2>
                </div>
              </div>
            </div>
            <div className="p-4">
              <WhatsAppPreview
                message={message}
                files={mediaFiles}
                includeSaudacao={includeSaudacao}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Modal de Confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="w-full max-w-3xl bg-white dark:bg-gray-800 p-6 sm:p-8 max-h-[90vh] overflow-hidden flex flex-col">
          <AlertDialogHeader className="space-y-4">
            <div className="flex items-center justify-center space-x-2 text-primary">
              <Send className="h-8 w-8 text-blue-500" />
              <AlertDialogTitle className="text-xl sm:text-2xl font-bold">
                Confirmação de Disparo
              </AlertDialogTitle>
            </div>
            
            <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 sm:p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <p className="text-sm sm:text-base">
                    Você está prestes a enviar uma mensagem para os contatos que correspondem aos
                    critérios selecionados. Por favor, revise os detalhes abaixo antes de confirmar.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 mt-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {/* Filtros Aplicados */}
            <div>
              <h3 className="flex items-center gap-2 font-medium mb-2">
                <Filter className="h-4 w-4 text-purple-500" />
                Configurações da Mensagem
              </h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <span>Incluir saudação: <strong>{includeSaudacao ? 'Sim' : 'Não'}</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Tags className="h-4 w-4 text-green-600" />
                  <span>Nome do disparo: <strong>{useNomeDisparo ? 'TRUE' : 'FALSE'}</strong></span>
                </li>
              </ul>
            </div>

            {/* Filtros Aplicados */}
            <div>
              <h3 className="flex items-center gap-2 font-medium mb-2">
                <Filter className="h-4 w-4 text-purple-500" />
                Filtros Aplicados
              </h3>
              {isLoadingFilters ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando filtros...
                </div>
              ) : (
                <ul className="space-y-2">
                  {selectedCategories.length > 0 && selectedCategories[0] !== 'all' && (
                    <li className="flex items-center gap-2">
                      <Tags className="h-4 w-4 text-purple-600" />
                      <span>Categorias: <strong>{selectedCategories.length} selecionada(s)</strong></span>
                    </li>
                  )}
                  {selectedCities.length > 0 && selectedCities[0] !== 'all' && (
                    <li className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span>Cidades: <strong>{selectedCities.length} selecionada(s)</strong></span>
                    </li>
                  )}
                  {selectedNeighborhoods.length > 0 && selectedNeighborhoods[0] !== 'all' && (
                    <li className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span>Bairros: <strong>{selectedNeighborhoods.length} selecionado(s)</strong></span>
                    </li>
                  )}
                  {selectedGender !== 'all' && (
                    <li className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-600" />
                      <span>Gênero: <strong>{selectedGender}</strong></span>
                    </li>
                  )}
                  {loadingCount ? (
                    <li className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Calculando total de eleitores...
                    </li>
                  ) : (
                    <li className="flex items-center gap-2 text-blue-600">
                      <Users className="h-4 w-4" />
                      <strong>{eleitoresCount} eleitor{eleitoresCount !== 1 ? 'es' : ''} selecionado{eleitoresCount !== 1 ? 's' : ''}</strong>
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* Arquivos Anexados */}
            <div>
              <h3 className="flex items-center gap-2 font-medium mb-3">
                <Paperclip className="h-4 w-4 text-blue-500" />
                Arquivos Anexados
              </h3>
              {mediaFiles.length > 0 ? (
                <div className="space-y-3">
                  {mediaFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {file.type === 'image' && (
                          <div className="w-8 h-8 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <Image className="h-4 w-4 text-blue-500" />
                          </div>
                        )}
                        {file.type === 'video' && (
                          <div className="w-8 h-8 flex items-center justify-center bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <Video className="h-4 w-4 text-purple-500" />
                          </div>
                        )}
                        {file.type === 'audio' && (
                          <div className="w-8 h-8 flex items-center justify-center bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <Mic className="h-4 w-4 text-orange-500" />
                          </div>
                        )}
                        {file.type === 'pdf' && (
                          <div className="w-8 h-8 flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <FileText className="h-4 w-4 text-red-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {file.type === 'image' && 'Imagem do WhatsApp de '}
                          {file.type === 'video' && 'Vídeo do WhatsApp de '}
                          {file.type === 'audio' && 'Áudio do WhatsApp de '}
                          {file.type === 'pdf' && ''}
                          {file.file.name}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-xs text-gray-500">
                        ({(file.file.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Nenhum arquivo anexado
                </div>
              )}
            </div>

            {/* Conteúdo da Mensagem */}
            <div>
              <h3 className="flex items-center gap-2 font-medium mb-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                Conteúdo da Mensagem
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm overflow-y-auto max-h-[200px] custom-scrollbar">
                {message}
              </div>
            </div>
          </div>

          <AlertDialogFooter className="sm:space-x-2 mt-4 flex-shrink-0">
            <AlertDialogCancel
              disabled={sending}
              className="w-full sm:w-auto bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={sending}
              className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2"
              onClick={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Confirmar e Enviar</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Sucesso */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="bg-white dark:bg-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Disparo Enviado com Sucesso!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-green-500 mt-0.5" />
                  <p>
                    Tudo certo com seu disparo! Você pode continuar suas atividades normais dentro do sistema 
                    e enviar mais mensagens se desejar.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogAction
              className="bg-green-500 hover:bg-green-600 text-white w-full"
              onClick={() => setShowSuccessDialog(false)}
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
