import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Check, 
  Copy,
  FileText, 
  Loader2, 
  Pencil, 
  Plus, 
  Share2, 
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { empresaService } from '@/services/empresaService';
import { demandaTipoService } from '@/services/demandaTipoService';
import QRCode from 'qrcode.react';
import { useCompanyStore } from '@/store/useCompanyStore';

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
        }
        
        // Carrega os tipos de demanda
        await carregarTiposDemanda();
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

  const removerTipo = async (index: number) => {
    if (!company?.uid) return;
    
    try {
      setCarregandoTipos(true);
      
      // Cria uma nova lista sem o item a ser removido
      const novosTipos = [...tiposDemanda];
      novosTipos.splice(index, 1);
      
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-6 min-h-screen bg-white/50 dark:bg-background/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-card rounded-lg shadow-sm p-4 md:p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold">Configurações de Demanda</h1>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Coluna 1: Tipos de Demanda */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div>
                <h2 className="text-lg font-semibold">Tipos de Demanda</h2>
                <p className="text-xs text-muted-foreground">
                  Adicione os tipos de demanda que serão exibidos no formulário
                </p>
              </div>
              
              {/* Formulário sempre visível */}
              <div className="space-y-4 p-4 bg-muted/10 rounded-md border">
                <div className="space-y-3">
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
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setNovoValorTipo('');
                    }}
                    className="h-9"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={adicionarTipo}
                    className="h-9"
                    disabled={!novoValorTipo.trim()}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg overflow-hidden bg-card/50 h-[300px] sm:h-[400px] flex flex-col">
              {/* Cabeçalho da lista */}
              <div className="bg-muted/30 px-4 py-2 border-b flex items-center">
                <span className="text-xs font-medium text-muted-foreground">TIPO DE DEMANDA</span>
                <span className="ml-auto text-xs font-medium text-muted-foreground pr-8">AÇÕES</span>
              </div>
              
              {/* Corpo da lista */}
              <div className="flex-1 overflow-y-auto">
                {carregandoTipos ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : tiposOrdenados.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                    <FileText className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Nenhum tipo de demanda cadastrado</p>
                    <p className="text-xs mt-1">Adicione um tipo acima para começar</p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {tiposOrdenados.map((tipo, index) => (
                      <li key={index} className="group hover:bg-muted/30 transition-colors">
                        <div className="px-4 py-3 flex items-center">
                          <span className="text-sm">{tipo}</span>
                          <div className="ml-auto flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => removerTipo(index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          
          {/* Coluna 2: Configurações de Compartilhamento */}
          <div className="space-y-6">
            
            {/* Visibilidade do link */}
            <div className="p-4 bg-muted/10 rounded-lg border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-medium text-sm">Link Público</h3>
                  <p className="text-xs text-muted-foreground">
                    {linkDisponivel
                      ? 'Qualquer pessoa com o link pode acessar as demandas.'
                      : 'Apenas usuários autenticados podem acessar as demandas.'}
                  </p>
                </div>
                <div className="sm:ml-4 mt-2 sm:mt-0">
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
                <Label className="text-sm font-medium">QR Code de Acesso</Label>
                <div className="p-3 bg-card rounded-lg border w-full max-w-[180px] mx-auto">
                  <div className="aspect-square w-full max-w-[160px] mx-auto">
                    <QRCode 
                      value={shareUrl}
                      size={160}
                      level="H"
                      includeMargin={true}
                      className="w-full h-auto"
                      style={{ width: '100%', height: 'auto' }}
                    />
                  </div>
                </div>
              </div>
              
              {/* URL para compartilhamento */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Link para compartilhamento</Label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 p-2 text-xs overflow-x-auto break-all bg-muted/30 rounded-md font-mono">
                    {shareUrl}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={copyToClipboard}
                    className="shrink-0 w-full sm:w-auto"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                    {copied ? 'Copiado!' : 'Copiar'}
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
      </div>
    </div>
  );
}

export default ConfiguracoesDemanda;
