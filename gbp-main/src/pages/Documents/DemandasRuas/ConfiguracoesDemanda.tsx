import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Copy,
  FileText,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Share2,
  Trash2,
  Upload,
  X,
  Settings,
  Link as LinkIcon,
  Palette,
  Tag,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Download,
  Printer,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { empresaService } from '@/services/empresaService';
import { demandaTipoService } from '@/services/demandaTipoService';
import { CAMPOS_DEMANDA, SECOES_CAMPOS, mergeCamposConfig, getCamposConfigPadrao, mergeCabecalhoConfig, getCabecalhoConfigPadrao, type CamposConfigDemanda, type CabecalhoConfig } from '@/config/demandaCampos';
import QRCode from 'qrcode.react';
import { useCompanyStore } from '@/store/useCompanyStore';
import { Checkbox } from '@/components/ui/checkbox';
import { supabaseClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export function ConfiguracoesDemanda() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { company } = useCompanyStore();
  
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linkDisponivel, setLinkDisponivel] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [tiposDemanda, setTiposDemanda] = useState<string[]>([]);
  const [novoValorTipo, setNovoValorTipo] = useState('');
  const [carregandoTipos, setCarregandoTipos] = useState(true);
  const [camposConfig, setCamposConfig] = useState<CamposConfigDemanda>(getCamposConfigPadrao());
  const [salvandoCampos, setSalvandoCampos] = useState(false);

  // Estados para personalização do cabeçalho
  const [cabecalhoConfig, setCabecalhoConfig] = useState<CabecalhoConfig>(getCabecalhoConfigPadrao());
  const [salvandoCabecalho, setSalvandoCabecalho] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Estados para mensagens de feedback
  const [feedbackRegistrada, setFeedbackRegistrada] = useState('');
  const [feedbackProtocolada, setFeedbackProtocolada] = useState('');
  const [salvandoMensagens, setSalvandoMensagens] = useState(false);
  const [campoAtivo, setCampoAtivo] = useState<'registrada' | 'protocolada'>('registrada');

  // Estados para edição de tipo
  const [editandoTipo, setEditandoTipo] = useState<{ valorAtual: string; novoValor: string } | null>(null);

  // Estados para paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 8;

  // Refs para os textareas
  const textareaRegistradaRef = useRef<HTMLTextAreaElement>(null);
  const textareaProtocoladaRef = useRef<HTMLTextAreaElement>(null);
  
  // URL para compartilhamento
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${baseUrl}/demanda/${company?.uid || ''}`;
  
  // Função para carregar os tipos de demanda
  const carregarTiposDemanda = async () => {
    console.log('Iniciando carregarTiposDemanda');
    if (!company?.uid) {
      console.log('UID da empresa não encontrado');
      return;
    }
    
    setCarregandoTipos(true);
    try {
      console.log('Buscando tipos de demanda para a empresa:', company.uid);
      const tipos = await demandaTipoService.getTiposDemandaFormatados(company.uid);
      console.log('Tipos de demanda encontrados:', tipos);
      setTiposDemanda(tipos);
    } catch (error) {
      console.error('Erro ao carregar tipos de demanda:', error);
      if (toast) {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os tipos de demanda',
          variant: 'destructive',
        });
      }
    } finally {
      setCarregandoTipos(false);
    }
  };

  // Carrega os dados iniciais
  useEffect(() => {
    async function loadData() {
      if (!company?.uid) return;

      setLoading(true);

      try {
        // Carrega a visibilidade do link
        const empresa = await empresaService.getEmpresa(company.uid);
        if (empresa) {
          setLinkDisponivel(empresa.link_demanda_disponivel || false);
          setFeedbackRegistrada(empresa.feedback_demanda_registrada || '');
          setFeedbackProtocolada(empresa.feedback_demanda_protocolada || '');
        }

        // Carrega os tipos de demanda
        await carregarTiposDemanda();

        // Carrega a configuração de campos do formulário público
        const configSalva = await demandaTipoService.getCamposConfig(company.uid);
        setCamposConfig(mergeCamposConfig(configSalva));

        // Carrega a configuração do cabeçalho
        const cabecalhoSalvo = await demandaTipoService.getCabecalhoConfig(company.uid);
        setCabecalhoConfig(mergeCabecalhoConfig(cabecalhoSalvo));
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        if (toast) {
          toast({
            title: 'Erro',
            description: 'Não foi possível carregar as configurações',
            variant: 'destructive',
          });
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [company?.uid, toast]);

  // Função para formatar texto com a primeira letra maiúscula, exceto para artigos e preposições
  const formatarTexto = (texto: string): string => {
    if (!texto) return '';
    
    // Lista de palavras que devem permanecer em minúsculo
    const palavrasMinusculas = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'por', 'para'];
    
    return texto
      .toLowerCase()
      .split(' ')
      .map((palavra, index) => {
        // Mantém a primeira palavra sempre com inicial maiúscula
        if (index === 0) {
          return palavra.charAt(0).toUpperCase() + palavra.slice(1);
        }
        // Mantém palavras da lista em minúsculo
        if (palavrasMinusculas.includes(palavra)) {
          return palavra;
        }
        // Converte primeira letra para maiúscula nas demais palavras
        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
      })
      .join(' ');
  };

  // Ordena os tipos de demanda em ordem alfabética (case-insensitive)
  const tiposOrdenados = useMemo(() => {
    return [...tiposDemanda].sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );
  }, [tiposDemanda]);

  // Calcula itens da página atual
  const itensPaginaAtual = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return tiposOrdenados.slice(inicio, fim);
  }, [tiposOrdenados, paginaAtual]);

  // Calcula total de páginas
  const totalPaginas = Math.ceil(tiposOrdenados.length / itensPorPagina);

  // Funções para gerenciar tipos de demanda
  const adicionarTipo = async () => {
    if (!company?.uid) {
      console.error('UID da empresa não encontrado');
      return;
    }

    if (!novoValorTipo.trim()) {
      if (toast) {
        toast({
          title: 'Atenção',
          description: 'Informe o tipo de demanda',
          variant: 'warning',
        });
      }
      return;
    }
    
    try {
      setCarregandoTipos(true);
      
      // Formata o valor antes de verificar duplicatas
      const novoTipoFormatado = formatarTexto(novoValorTipo.trim());
      
      // Verifica se já existe um tipo igual (case insensitive)
      const tipoJaExiste = tiposDemanda.some(
        tipo => tipo.toLowerCase() === novoTipoFormatado.toLowerCase()
      );
      
      if (tipoJaExiste) {
        if (toast) {
          toast({
            title: 'Atenção',
            description: 'Este tipo de demanda já está cadastrado',
            variant: 'warning',
          });
        }
        return;
      }
      
      // Adiciona o novo tipo à lista
      const novosTipos = [...tiposDemanda, novoTipoFormatado];
      
      // Atualiza no banco de dados
      await demandaTipoService.atualizarTiposDemanda(company.uid, novosTipos);
      
      // Atualiza o estado local
      setTiposDemanda(novosTipos);
      setNovoValorTipo(''); // Limpa o campo de entrada
      
      if (toast) {
        toast({
          title: 'Sucesso',
          description: 'Tipo de demanda adicionado com sucesso!',
          variant: 'success',
        });
      }
      
      // Foca no campo de entrada para adicionar outro item
      const inputElement = document.getElementById('novo-tipo') as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
      }
    } catch (error) {
      console.error('Erro ao adicionar tipo de demanda:', error);
      if (toast) {
        toast({
          title: 'Erro',
          description: 'Não foi possível adicionar o tipo de demanda',
          variant: 'destructive',
        });
      }
    } finally {
      setCarregandoTipos(false);
    }
  };

  const removerTipo = async (tipo: string) => {
    if (!company?.uid) return;

    try {
      setCarregandoTipos(true);

      // Cria uma nova lista sem o item a ser removido
      const novosTipos = tiposDemanda.filter(t => t !== tipo);

      // Atualiza no banco de dados
      await demandaTipoService.atualizarTiposDemanda(company.uid, novosTipos);

      // Atualiza o estado local
      setTiposDemanda(novosTipos);

      if (toast) {
        toast({
          title: 'Sucesso',
          description: 'Tipo de demanda removido com sucesso!',
          variant: 'success',
        });
      }
    } catch (error) {
      console.error('Erro ao remover tipo de demanda:', error);
      if (toast) {
        toast({
          title: 'Erro',
          description: 'Não foi possível remover o tipo de demanda',
          variant: 'destructive',
        });
      }
    } finally {
      setCarregandoTipos(false);
    }
  };

  const editarTipo = async (valorAtual: string, novoValor: string) => {
    if (!company?.uid) return;

    if (!novoValor.trim()) {
      if (toast) {
        toast({
          title: 'Atenção',
          description: 'Informe o novo nome do tipo',
          variant: 'warning',
        });
      }
      return;
    }

    try {
      setCarregandoTipos(true);

      // Formata o valor
      const novoTipoFormatado = formatarTexto(novoValor.trim());

      // Verifica se já existe um tipo igual (exceto o próprio)
      const tipoJaExiste = tiposDemanda.some(
        (tipo) => tipo !== valorAtual && tipo.toLowerCase() === novoTipoFormatado.toLowerCase()
      );

      if (tipoJaExiste) {
        if (toast) {
          toast({
            title: 'Atenção',
            description: 'Este tipo de demanda já está cadastrado',
            variant: 'warning',
          });
        }
        return;
      }

      // Atualiza o tipo na lista
      const novosTipos = tiposDemanda.map(tipo =>
        tipo === valorAtual ? novoTipoFormatado : tipo
      );

      // Atualiza no banco de dados
      await demandaTipoService.atualizarTiposDemanda(company.uid, novosTipos);

      // Atualiza o estado local
      setTiposDemanda(novosTipos);
      setEditandoTipo(null);

      if (toast) {
        toast({
          title: 'Sucesso',
          description: 'Tipo de demanda atualizado com sucesso!',
          variant: 'success',
        });
      }
    } catch (error) {
      console.error('Erro ao editar tipo de demanda:', error);
      if (toast) {
        toast({
          title: 'Erro',
          description: 'Não foi possível editar o tipo de demanda',
          variant: 'destructive',
        });
      }
    } finally {
      setCarregandoTipos(false);
    }
  };

  // Salva a configuração de visibilidade dos campos do formulário público
  const salvarCamposConfig = async () => {
    if (!company?.uid) return;

    setSalvandoCampos(true);
    try {
      await demandaTipoService.atualizarCamposConfig(company.uid, camposConfig);
      if (toast) {
        toast({
          title: 'Sucesso',
          description: 'Configuração dos campos salva com sucesso!',
          variant: 'success',
        });
      }
    } catch (error) {
      console.error('Erro ao salvar configuração de campos:', error);
      if (toast) {
        toast({
          title: 'Erro',
          description: 'Não foi possível salvar a configuração dos campos',
          variant: 'destructive',
        });
      }
    } finally {
      setSalvandoCampos(false);
    }
  };

  // Salva a configuração do cabeçalho
  const salvarCabecalhoConfig = async () => {
    if (!company?.uid) return;

    setSalvandoCabecalho(true);
    try {
      await demandaTipoService.atualizarCabecalhoConfig(company.uid, cabecalhoConfig);
      if (toast) {
        toast({
          title: 'Sucesso',
          description: 'Configuração do cabeçalho salva com sucesso!',
          variant: 'success',
        });
      }
    } catch (error) {
      console.error('Erro ao salvar configuração do cabeçalho:', error);
      if (toast) {
        toast({
          title: 'Erro',
          description: 'Não foi possível salvar a configuração do cabeçalho',
          variant: 'destructive',
        });
      }
    } finally {
      setSalvandoCabecalho(false);
    }
  };

  // Salva as mensagens de feedback
  const salvarMensagensFeedback = async () => {
    if (!company?.uid) return;

    setSalvandoMensagens(true);
    try {
      await empresaService.atualizarMensagensFeedback(
        company.uid,
        feedbackRegistrada,
        feedbackProtocolada
      );
      if (toast) {
        toast({
          title: 'Sucesso',
          description: 'Mensagens de feedback salvas com sucesso!',
          variant: 'success',
        });
      }
    } catch (error) {
      console.error('Erro ao salvar mensagens de feedback:', error);
      if (toast) {
        toast({
          title: 'Erro',
          description: 'Não foi possível salvar as mensagens de feedback',
          variant: 'destructive',
        });
      }
    } finally {
      setSalvandoMensagens(false);
    }
  };

  // Função para inserir tag no campo ativo
  const inserirTag = (tag: string) => {
    const textareaRef = campoAtivo === 'registrada' ? textareaRegistradaRef : textareaProtocoladaRef;
    const textarea = textareaRef.current;

    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + tag + text.substring(end);

    if (campoAtivo === 'registrada') {
      setFeedbackRegistrada(newText);
    } else {
      setFeedbackProtocolada(newText);
    }

    // Mantém o foco e move o cursor após a tag
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  // Função para upload do logo
  const handleLogoUpload = async (file: File) => {
    if (!company?.uid) {
      toast({
        title: 'Erro',
        description: 'Empresa não identificada',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploadingLogo(true);

      // Primeiro, busca o storage da empresa
      const { data: empresaData, error: empresaError } = await supabaseClient
        .from('gbp_empresas')
        .select('storage')
        .eq('uid', company.uid)
        .single();

      if (empresaError) {
        console.error('Erro ao buscar storage da empresa:', empresaError);
        toast({
          title: 'Erro',
          description: 'Erro ao buscar informações da empresa',
          variant: 'destructive',
        });
        return;
      }

      if (!empresaData?.storage) {
        toast({
          title: 'Erro',
          description: 'Storage da empresa não configurado',
          variant: 'destructive',
        });
        return;
      }

      // Gera um nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${empresaData.storage}/demandas-logos/${fileName}`;

      // Faz o upload para o bucket específico da empresa
      const { error: uploadError } = await supabaseClient.storage
        .from(empresaData.storage)
        .upload(`demandas-logos/${fileName}`, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Erro ao fazer upload:', uploadError);
        toast({
          title: 'Erro',
          description: 'Erro ao fazer upload do logo',
          variant: 'destructive',
        });
        return;
      }

      // Gera a URL pública
      const { data: publicUrl } = supabaseClient.storage
        .from(empresaData.storage)
        .getPublicUrl(`demandas-logos/${fileName}`);

      if (!publicUrl?.publicUrl) {
        toast({
          title: 'Erro',
          description: 'Erro ao gerar URL pública do arquivo',
          variant: 'destructive',
        });
        return;
      }

      // Atualiza o logoUrl
      setCabecalhoConfig(prev => ({ ...prev, logoUrl: publicUrl.publicUrl }));
      toast({
        title: 'Sucesso',
        description: 'Logo atualizado com sucesso!',
        variant: 'success',
      });
      
    } catch (error) {
      console.error('Erro ao processar upload:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao processar upload do logo',
        variant: 'destructive',
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  // Atualiza a visibilidade do link
  const toggleLinkDisponivel = async (checked: boolean) => {
    if (!company?.uid) return;
    
    setUpdating(true);
    try {
      // Atualiza a visibilidade do link de demanda
      const sucesso = await empresaService.atualizarVisibilidadeLinkDemanda(company.uid, checked);
      
      if (sucesso) {
        // Atualiza o estado local
        setLinkDisponivel(checked);
        
        // Mostra mensagem de sucesso
        if (toast) {
          toast({
            title: 'Sucesso',
            description: checked 
              ? 'Link de demanda ativado com sucesso!' 
              : 'Link de demanda desativado com sucesso!',
            variant: 'success',
          });
        }
      } else {
        throw new Error('Falha ao atualizar a visibilidade do link');
      }
    } catch (error) {
      console.error('Erro ao atualizar visibilidade do link:', error);
      if (toast) {
        toast({
          title: 'Erro',
          description: 'Não foi possível atualizar a visibilidade do link',
          variant: 'destructive',
        });
      }
    } finally {
      setUpdating(false);
    }
  };

  // Função para copiar para a área de transferência
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      
      // Reseta o estado de copiado após 2 segundos
      setTimeout(() => {
        setCopied(false);
      }, 2000);
      
      // Mostra mensagem de sucesso
      if (toast) {
        toast({
          title: 'Link copiado',
          description: 'O link foi copiado para a área de transferência!',
          variant: 'success',
        });
      }
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      if (toast) {
        toast({
          title: 'Erro',
          description: 'Não foi possível copiar o link. Tente novamente.',
          variant: 'destructive',
        });
      }
    }
  };

  // Função para compartilhar usando a Web Share API
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Compartilhar demanda',
          text: 'Confira esta demanda:',
          url: shareUrl,
        });
      } catch (error) {
        // O usuário cancelou o compartilhamento ou ocorreu um erro
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Erro ao compartilhar:', error);
          if (toast) {
            toast({
              title: 'Erro',
              description: 'Não foi possível compartilhar o link',
              variant: 'destructive',
            });
          }
        }
      }
    } else {
      // Fallback para copiar o link se a Web Share API não for suportada
      // Fallback para navegadores sem suporte à Web Share API
      copyToClipboard();
    }
  };

  // Função para download do QR Code
  const downloadQRCode = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) {
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o QR Code para download',
        variant: 'destructive',
      });
      return;
    }

    const link = document.createElement('a');
    link.download = `qrcode-demanda-${company?.uid}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    toast({
      title: 'Sucesso',
      description: 'QR Code baixado com sucesso!',
      variant: 'success',
    });
  };

  // Função para imprimir o QR Code
  const printQRCode = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) {
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o QR Code para impressão',
        variant: 'destructive',
      });
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Erro',
        description: 'Não foi possível abrir a janela de impressão',
        variant: 'destructive',
      });
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code de Acesso</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }
            img {
              max-width: 300px;
              margin: 20px 0;
            }
            p {
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <h1>QR Code de Acesso</h1>
          <img src="${dataUrl}" alt="QR Code" />
          <p>Escaneie para acessar o formulário de demandas</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full p-3 sm:p-4 md:p-6 min-h-screen bg-white/50 dark:bg-background/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-card rounded-lg shadow-sm p-3 sm:p-4 md:p-6">
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Configurações de Demanda</h1>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Coluna 1: Tipos de Demanda */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-blue-500" />
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Tipos de Demanda</h2>
                  <p className="text-xs text-muted-foreground">
                    Adicione os tipos de demanda que serão exibidos no formulário
                  </p>
                </div>
                {tiposOrdenados.length > 0 && (
                  <span className="ml-auto text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {tiposOrdenados.length} {tiposOrdenados.length === 1 ? 'tipo' : 'tipos'}
                  </span>
                )}
              </div>
              
              {/* Formulário sempre visível */}
              <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-muted/10 rounded-md border">
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <Label htmlFor="novo-tipo" className="block text-sm font-medium mb-1">
                      Nova Demanda
                    </Label>
                    <Input
                      id="novo-tipo"
                      value={novoValorTipo}
                      onChange={(e) => setNovoValorTipo(e.target.value)}
                      placeholder="Ex: Capinação, Esgoto, Saúde..."
                      className="w-full h-9 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && adicionarTipo()}
                      disabled={editandoTipo !== null}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNovoValorTipo('');
                    }}
                    className="h-9 w-full sm:w-auto"
                    disabled={editandoTipo !== null}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={adicionarTipo}
                    className="h-9 w-full sm:w-auto"
                    disabled={!novoValorTipo.trim() || editandoTipo !== null}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg overflow-hidden bg-card/50 h-[250px] sm:h-[300px] md:h-[400px] flex flex-col">
              {/* Corpo da lista */}
              <div className="flex-1 overflow-y-auto p-2">
                {carregandoTipos ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : tiposOrdenados.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                    <Tag className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Nenhum tipo cadastrado</p>
                    <p className="text-xs mt-1">Adicione tipos acima para começar</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {tiposOrdenados
                        .slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina)
                        .map((tipo, index) => {
                          const globalIndex = (paginaAtual - 1) * itensPorPagina + index;
                          return (
                            <div
                              key={globalIndex}
                              className="group relative p-3 bg-white dark:bg-gray-800 rounded-lg border hover:border-blue-300 hover:shadow-sm transition-all"
                            >
                        {editandoTipo?.index === index ? (
                          <div className="space-y-2">
                            <Input
                              value={editandoTipo.valor}
                              onChange={(e) => setEditandoTipo({ index, valor: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') editarTipo(index, editandoTipo.valor);
                                if (e.key === 'Escape') setEditandoTipo(null);
                              }}
                              className="h-8 text-sm"
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => editarTipo(index, editandoTipo.valor)}
                                className="h-7 text-xs flex-1"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditandoTipo(null)}
                                className="h-7 w-7 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-medium flex-1">{tipo}</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => setEditandoTipo({ index, valor: tipo })}
                                    className="text-sm"
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => removerTipo(tipo)}
                                    className="text-sm text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </>
                        )}
                      </div>
                        )
                      })}
                  </div>
                </>)}
              </div>
            </div>
          </div>
          
          {/* Coluna 2: Configurações de Compartilhamento */}
          <div className="space-y-4 sm:space-y-6">

            {/* Visibilidade do link */}
            <div className="p-3 sm:p-4 bg-muted/10 rounded-lg border space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-green-500" />
                <div className="flex-1">
                  <h3 className="font-medium text-sm">Link Público</h3>
                  <p className="text-xs text-muted-foreground">
                    {linkDisponivel
                      ? 'Qualquer pessoa com o link pode acessar as demandas.'
                      : 'Apenas usuários autenticados podem acessar as demandas.'}
                  </p>
                </div>
                <div>
                  <Switch
                    id="link-visibility"
                    checked={linkDisponivel}
                    onCheckedChange={toggleLinkDisponivel}
                    disabled={updating}
                    className={`${updating ? 'opacity-50' : ''}`}
                  />
                </div>
              </div>

              {/* QR Code */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-purple-500" />
                  <Label className="text-sm font-medium">QR Code de Acesso</Label>
                </div>
                <div className="p-3 bg-card rounded-lg border w-full max-w-[200px] mx-auto">
                  <div className="aspect-square w-full max-w-[180px] mx-auto mb-3">
                    <QRCode
                      value={shareUrl}
                      size={180}
                      level="H"
                      includeMargin={true}
                      className="w-full h-auto"
                      style={{ width: '100%', height: 'auto' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadQRCode}
                      className="flex-1 h-8 text-xs"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Baixar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={printQRCode}
                      className="flex-1 h-8 text-xs"
                    >
                      <Printer className="h-3 w-3 mr-1" />
                      Imprimir
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* URL para compartilhamento */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Link para compartilhamento</Label>
                <div className="flex gap-2">
                  <div className="flex-1 p-2.5 text-xs overflow-hidden bg-muted/30 rounded-md font-mono flex items-center">
                    <span className="truncate">{shareUrl}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyToClipboard}
                    className="shrink-0 h-9 px-3"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              
              {/* Botão de compartilhar */}
              <div className="pt-2">
                <Button 
                  onClick={handleShare}
                  className="w-full"
                  variant="secondary"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartilhar via...
                </Button>
              </div>
            </div>
            
            
          </div>
        </div>

        {/* Campos do Formulário Público */}
        <div className="mt-6 pt-6 border-t">
          <div className="mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-500" />
            <div>
              <h2 className="text-base sm:text-lg font-semibold">Campos do Formulário Público</h2>
              <p className="text-xs text-muted-foreground">
                Defina os campos do formulário público. Desativados não serão exibidos/exigidos.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {(['requerente', 'endereco', 'demanda', 'anexos'] as const).map((secao) => (
              <div key={secao} className="border rounded-lg p-3 sm:p-4 bg-card/50">
                <h3 className="text-sm font-semibold mb-3">{SECOES_CAMPOS[secao]}</h3>
                <div className="space-y-2 sm:space-y-3">
                  {CAMPOS_DEMANDA.filter((c) => c.secao === secao).map((campo) => {
                    const config = camposConfig[campo.id] || { visivel: true, obrigatorio: true };
                    return (
                      <div key={campo.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-2 flex-1">
                          <Label htmlFor={`campo-${campo.id}`} className="text-sm font-normal cursor-pointer">
                            {campo.label}
                            {config.obrigatorio && (
                              <span className="ml-1 text-red-500">*</span>
                            )}
                          </Label>
                        </div>
                        <div className="flex items-center gap-4 sm:gap-6 self-end sm:self-auto">
                          <div className="flex items-center gap-3">
                            <Switch
                              id={`campo-${campo.id}`}
                              checked={config.visivel}
                              onCheckedChange={(checked) =>
                                setCamposConfig((prev) => ({
                                  ...prev,
                                  [campo.id]: { ...config, visivel: checked, obrigatorio: !checked ? false : config.obrigatorio }
                                }))
                              }
                              className="h-4 w-7"
                            />
                            <span className="text-xs text-muted-foreground hidden sm:inline">Visível</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`obrigatorio-${campo.id}`}
                              checked={config.obrigatorio}
                              disabled={!config.visivel}
                              onCheckedChange={(checked) =>
                                setCamposConfig((prev) => ({
                                  ...prev,
                                  [campo.id]: { ...config, obrigatorio: checked as boolean, visivel: checked ? true : config.visivel }
                                }))
                              }
                              className="h-4 w-4"
                            />
                            <Label htmlFor={`obrigatorio-${campo.id}`} className="text-xs text-muted-foreground cursor-pointer">
                              Obrigatório
                            </Label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCamposConfig(getCamposConfigPadrao())}
              disabled={salvandoCampos}
              className="w-full sm:w-auto"
            >
              Restaurar padrão (todos visíveis)
            </Button>
            <Button onClick={salvarCamposConfig} disabled={salvandoCampos} size="sm" className="w-full sm:w-auto">
              {salvandoCampos ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar campos do formulário'
              )}
            </Button>
          </div>
        </div>

        {/* Mensagens de Feedback Automático */}
        <div className="mt-6 pt-6 border-t">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base sm:text-lg font-semibold">Mensagens de Feedback Automático</h2>
              <p className="text-xs text-muted-foreground">
                Configure as mensagens enviadas automaticamente via WhatsApp quando uma demanda é registrada ou protocolada.
              </p>
            </div>
          </div>

          {/* Tags Disponíveis */}
          <div className="mb-4 p-2 sm:p-3 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Tags Disponíveis:</span>
              <span className="text-xs text-muted-foreground">(clique para inserir)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { tag: '{saudacao}', desc: 'Saudação personalizada' },
                { tag: '{nome}', desc: 'Nome do solicitante' },
                { tag: '{protocolo}', desc: 'Número do protocolo' },
                { tag: '{cliente}', desc: 'Nome da empresa/órgão' },
                { tag: '{tipo}', desc: 'Tipo da demanda' },
                { tag: '{endereco}', desc: 'Endereço da demanda' },
                { tag: '{data}', desc: 'Data de registro' }
              ].map(({ tag, desc }) => (
                <Button
                  key={tag}
                  variant="outline"
                  size="sm"
                  onClick={() => inserirTag(tag)}
                  className="h-7 text-xs font-mono bg-blue-300 text-white border-blue-300 hover:bg-blue-400 hover:border-blue-400"
                  title={desc}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Mensagem de Demanda Registrada */}
            <div className={`space-y-3 p-3 rounded-lg border transition-colors ${campoAtivo === 'registrada' ? 'bg-blue-50 border-blue-300 dark:bg-blue-950 dark:border-blue-700' : 'bg-card/50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="feedback-registrada" className="text-sm font-medium">
                    Mensagem ao Registrar Demanda
                  </Label>
                  {feedbackRegistrada ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Enviada automaticamente quando uma nova demanda é recebida pelo sistema.
              </p>
              <Textarea
                id="feedback-registrada"
                ref={textareaRegistradaRef}
                value={feedbackRegistrada}
                onChange={(e) => setFeedbackRegistrada(e.target.value)}
                onFocus={() => setCampoAtivo('registrada')}
                placeholder="Digite a mensagem de confirmação de registro... Ex: {saudacao} {nome}, sua demanda foi registrada com sucesso!"
                className="min-h-[120px] text-sm resize-y"
                rows={5}
              />
            </div>

            {/* Mensagem de Demanda Protocolada */}
            <div className={`space-y-3 p-3 rounded-lg border transition-colors ${campoAtivo === 'protocolada' ? 'bg-blue-50 border-blue-300 dark:bg-blue-950 dark:border-blue-700' : 'bg-card/50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="feedback-protocolada" className="text-sm font-medium">
                    Mensagem ao Protocolar Demanda
                  </Label>
                  {feedbackProtocolada ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Enviada automaticamente quando a demanda é atualizada para o status "Protocolado".
              </p>
              <Textarea
                id="feedback-protocolada"
                ref={textareaProtocoladaRef}
                value={feedbackProtocolada}
                onChange={(e) => setFeedbackProtocolada(e.target.value)}
                onFocus={() => setCampoAtivo('protocolada')}
                placeholder="Digite a mensagem de confirmação de protocolo... Ex: {saudacao} {nome}, sua demanda {protocolo} foi protocolada!"
                className="min-h-[120px] text-sm resize-y"
                rows={5}
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button
              onClick={salvarMensagensFeedback}
              disabled={salvandoMensagens}
              size="sm"
              className="w-full sm:w-auto"
            >
              {salvandoMensagens ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Salvar mensagens de feedback
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Personalização Visual do Formulário Público */}
        <div className="mt-6 pt-6 border-t">
          <div className="mb-4 flex items-center gap-2">
            <Palette className="h-5 w-5 text-orange-500" />
            <div>
              <h2 className="text-base sm:text-lg font-semibold">Personalização Visual</h2>
              <p className="text-xs text-muted-foreground">
                Personalize o visual do formulário público para sua empresa.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Preview do Cabeçalho */}
            <div className="border rounded-lg p-4 bg-card/50">
              <h3 className="text-sm font-semibold mb-3">Preview do Cabeçalho</h3>
              <div 
                className="rounded-lg p-4 text-center"
                style={{ 
                  backgroundColor: cabecalhoConfig.corCabecalho,
                  color: cabecalhoConfig.corTexto
                }}
              >
                {cabecalhoConfig.logoUrl && (
                  <img 
                    src={cabecalhoConfig.logoUrl} 
                    alt="Logo" 
                    className="h-16 mx-auto mb-2 object-contain"
                  />
                )}
                {cabecalhoConfig.subtitulo && (
                  <p style={{ color: cabecalhoConfig.corSubtitulo }} className="text-sm sm:text-base mb-1 opacity-80">
                    {cabecalhoConfig.subtitulo}
                  </p>
                )}
                <h2 className="text-xl font-bold" style={{ color: cabecalhoConfig.corTitulo }}>{cabecalhoConfig.titulo}</h2>
                {cabecalhoConfig.descricao && (
                  <p className="text-sm mt-1" style={{ color: cabecalhoConfig.corDescricao }}>{cabecalhoConfig.descricao}</p>
                )}
              </div>
              
              {/* Preview do Botão */}
              <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: cabecalhoConfig.corFundo }}>
                <button
                  className="w-full py-2 px-4 rounded font-medium"
                  style={{ 
                    backgroundColor: cabecalhoConfig.corBotao,
                    color: cabecalhoConfig.corBotaoTexto
                  }}
                >
                  Enviar Demanda
                </button>
              </div>
            </div>

            {/* Configurações do Cabeçalho */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="subtitulo" className="text-sm font-medium">Subtítulo (texto pequeno acima do título)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="subtitulo"
                      value={cabecalhoConfig.subtitulo}
                      onChange={(e) => setCabecalhoConfig(prev => ({ ...prev, subtitulo: e.target.value }))}
                      placeholder="Ex: Secretaria de Obras"
                      className="flex-1"
                    />
                    <input
                      type="color"
                      id="corSubtitulo"
                      value={cabecalhoConfig.corSubtitulo}
                      onChange={(e) => setCabecalhoConfig(prev => ({ ...prev, corSubtitulo: e.target.value }))}
                      className="h-10 w-10 rounded cursor-pointer border-0 shrink-0"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="titulo" className="text-sm font-medium">Título do Formulário</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="titulo"
                      value={cabecalhoConfig.titulo}
                      onChange={(e) => setCabecalhoConfig(prev => ({ ...prev, titulo: e.target.value }))}
                      placeholder="Formulário de Demanda"
                      className="flex-1"
                    />
                    <input
                      type="color"
                      id="corTitulo"
                      value={cabecalhoConfig.corTitulo}
                      onChange={(e) => setCabecalhoConfig(prev => ({ ...prev, corTitulo: e.target.value }))}
                      className="h-10 w-10 rounded cursor-pointer border-0 shrink-0"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="descricao" className="text-sm font-medium">Descrição (texto abaixo do título)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="descricao"
                      value={cabecalhoConfig.descricao}
                      onChange={(e) => setCabecalhoConfig(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Registre ou consulte sua demanda"
                      className="flex-1"
                    />
                    <input
                      type="color"
                      id="corDescricao"
                      value={cabecalhoConfig.corDescricao}
                      onChange={(e) => setCabecalhoConfig(prev => ({ ...prev, corDescricao: e.target.value }))}
                      className="h-10 w-10 rounded cursor-pointer border-0 shrink-0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="corCabecalho" className="text-sm font-medium">Cor do Cabeçalho</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        id="corCabecalho"
                        value={cabecalhoConfig.corCabecalho}
                        onChange={(e) => setCabecalhoConfig(prev => ({ ...prev, corCabecalho: e.target.value }))}
                        className="h-10 w-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={cabecalhoConfig.corCabecalho}
                        onChange={(e) => setCabecalhoConfig(prev => ({ ...prev, corCabecalho: e.target.value }))}
                        className="flex-1 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="corTexto" className="text-sm font-medium">Cor do Texto</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        id="corTexto"
                        value={cabecalhoConfig.corTexto}
                        onChange={(e) => setCabecalhoConfig(prev => ({ ...prev, corTexto: e.target.value }))}
                        className="h-10 w-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={cabecalhoConfig.corTexto}
                        onChange={(e) => setCabecalhoConfig(prev => ({ ...prev, corTexto: e.target.value }))}
                        className="flex-1 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="corFundo" className="text-sm font-medium">Cor de Fundo</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        id="corFundo"
                        value={cabecalhoConfig.corFundo}
                        onChange={(e) => setCabecalhoConfig(prev => ({ ...prev, corFundo: e.target.value }))}
                        className="h-10 w-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={cabecalhoConfig.corFundo}
                        onChange={(e) => setCabecalhoConfig(prev => ({ ...prev, corFundo: e.target.value }))}
                        className="flex-1 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="corBotao" className="text-sm font-medium">Cor do Botão</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        id="corBotao"
                        value={cabecalhoConfig.corBotao}
                        onChange={(e) => setCabecalhoConfig(prev => ({ ...prev, corBotao: e.target.value }))}
                        className="h-10 w-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={cabecalhoConfig.corBotao}
                        onChange={(e) => setCabecalhoConfig(prev => ({ ...prev, corBotao: e.target.value }))}
                        className="flex-1 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="corBotaoTexto" className="text-sm font-medium">Cor do Texto do Botão</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      id="corBotaoTexto"
                      value={cabecalhoConfig.corBotaoTexto}
                      onChange={(e) => setCabecalhoConfig(prev => ({ ...prev, corBotaoTexto: e.target.value }))}
                      className="h-10 w-10 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={cabecalhoConfig.corBotaoTexto}
                      onChange={(e) => setCabecalhoConfig(prev => ({ ...prev, corBotaoTexto: e.target.value }))}
                      className="flex-1 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Logo da Empresa</Label>
                  <div className="mt-2">
                    {cabecalhoConfig.logoUrl ? (
                      <div className="relative inline-block">
                        <img 
                          src={cabecalhoConfig.logoUrl} 
                          alt="Logo atual" 
                          className="h-16 object-contain rounded border"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => setCabecalhoConfig(prev => ({ ...prev, logoUrl: null }))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoUpload(file);
                          }}
                          disabled={uploadingLogo}
                          className="flex-1"
                        />
                        {uploadingLogo && <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Button 
                onClick={salvarCabecalhoConfig} 
                disabled={salvandoCabecalho || uploadingLogo}
                className="w-full"
              >
                {salvandoCabecalho ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Personalização'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfiguracoesDemanda;
