import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Share2, Loader2, Plus, X, ChevronDown, Pencil } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode.react";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { empresaService } from "@/services/empresaService";
import { demandaTipoService } from "@/services/demandaTipoService";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CompartilharDemandaModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaUid: string;
}

interface TipoDemanda {
  id: string;
  nome: string;
  nivel: number;
  paiId: string | null;
}

export function CompartilharDemandaModal({ isOpen, onClose, empresaUid }: CompartilharDemandaModalProps) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linkDisponivel, setLinkDisponivel] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [tiposDemanda, setTiposDemanda] = useState<string[]>([]);
  const [novoTipo, setNovoTipo] = useState('');
  const [editandoTipo, setEditandoTipo] = useState<number | null>(null);
  const [novoValorTipo, setNovoValorTipo] = useState('');
  const [mostrarFormularioTipo, setMostrarFormularioTipo] = useState(false);
  const [carregandoTipos, setCarregandoTipos] = useState(true);
  const { toast } = useToast();
  const inputNovoTipoRef = useRef<HTMLInputElement>(null);

  // URL para compartilhamento
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${baseUrl}/demanda/${empresaUid}`;
  
  // Carrega os dados iniciais
  useEffect(() => {
    async function loadData() {
      if (!empresaUid) return;
      
      setLoading(true);
      setCarregandoTipos(true);
      
      try {
        // Carrega a visibilidade do link
        const empresa = await empresaService.getEmpresa(empresaUid);
        if (empresa) {
          setLinkDisponivel(empresa.link_demanda_disponivel || false);
        }
        
        // Carrega os tipos de demanda
        const tipos = await demandaTipoService.getTiposDemandaFormatados(empresaUid);
        setTiposDemanda(tipos);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as configurações.",
          variant: "destructive",
          className: "bg-red-500 text-white",
        });
      } finally {
        setLoading(false);
        setCarregandoTipos(false);
      }
    }

    if (isOpen) {
      loadData();
    }
  }, [empresaUid, isOpen, toast]);

  // Funções para gerenciar tipos de demanda
  const adicionarTipo = async () => {
    if (!novoTipo.trim()) return;
    
    try {
      const novosTipos = [...tiposDemanda, novoTipo.trim()];
      await demandaTipoService.atualizarTiposDemanda(empresaUid, novosTipos);
      setTiposDemanda(novosTipos);
      setNovoTipo('');
      setMostrarFormularioTipo(false);
      
      toast({
        title: "Sucesso",
        description: "Tipo de demanda adicionado com sucesso!",
        className: "bg-green-500 text-white",
      });
    } catch (error) {
      console.error('Erro ao adicionar tipo de demanda:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o tipo de demanda.",
        variant: "destructive",
      });
    }
  };

  const removerTipo = async (index: number) => {
    try {
      const novosTipos = [...tiposDemanda];
      novosTipos.splice(index, 1);
      await demandaTipoService.atualizarTiposDemanda(empresaUid, novosTipos);
      setTiposDemanda(novosTipos);
      
      toast({
        title: "Sucesso",
        description: "Tipo de demanda removido com sucesso!",
        className: "bg-green-500 text-white",
      });
    } catch (error) {
      console.error('Erro ao remover tipo de demanda:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o tipo de demanda.",
        variant: "destructive",
      });
    }
  };

  const iniciarEdicaoTipo = (index: number) => {
    setEditandoTipo(index);
    setNovoValorTipo(tiposDemanda[index]);
  };

  const salvarEdicaoTipo = async (index: number) => {
    if (!novoValorTipo.trim()) return;
    
    try {
      const novosTipos = [...tiposDemanda];
      novosTipos[index] = novoValorTipo.trim();
      await demandaTipoService.atualizarTiposDemanda(empresaUid, novosTipos);
      setTiposDemanda(novosTipos);
      setEditandoTipo(null);
      
      toast({
        title: "Sucesso",
        description: "Tipo de demanda atualizado com sucesso!",
        className: "bg-green-500 text-white",
      });
    } catch (error) {
      console.error('Erro ao atualizar tipo de demanda:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o tipo de demanda.",
        variant: "destructive",
      });
    }
  };

  const cancelarEdicaoTipo = () => {
    setEditandoTipo(null);
    setNovoValorTipo('');
  };

  // Atualiza a visibilidade do link
  const toggleLinkDisponivel = async (checked: boolean) => {
    setUpdating(true);
    try {
      const success = await empresaService.atualizarVisibilidadeLinkDemanda(empresaUid, checked);
      if (success) {
        setLinkDisponivel(checked);
        toast({
          title: "Sucesso",
          description: checked 
            ? "Link de demanda ativado com sucesso!" 
            : "Link de demanda desativado com sucesso.",
          className: "bg-green-500 text-white",
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar visibilidade do link:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a visibilidade do link de demanda.",
        variant: "destructive",
        className: "bg-red-500 text-white",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Função para copiar a URL para a área de transferência
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "URL copiada!",
        description: "O link foi copiado para a área de transferência.",
        className: "bg-green-500 text-white",
      });
      
      // Resetar o estado após 3 segundos
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Erro ao copiar URL:', err);
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para compartilhar usando a Web Share API
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Compartilhar Demanda',
          text: 'Acesse esta demanda para visualizar mais detalhes',
          url: shareUrl,
        });
      } catch (err) {
        console.error('Erro ao compartilhar:', err);
        if (err.name !== 'AbortError') {
          toast({
            title: "Erro",
            description: "Não foi possível compartilhar a demanda. Tente copiar o link manualmente.",
            variant: "destructive",
          });
        }
      }
    } else {
      // Fallback para navegadores sem suporte à Web Share API
      copyToClipboard();
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md p-6 mx-auto my-4 sm:my-8">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Função para renderizar os tipos de demanda em uma estrutura hierárquica
  const renderTiposDemanda = () => {
    const tiposPorNivel: Record<number, string[]> = {};
    
    // Organiza os tipos por nível
    tiposDemanda.forEach(tipo => {
      const nivel = (tipo.match(/::/g) || []).length;
      if (!tiposPorNivel[nivel]) {
        tiposPorNivel[nivel] = [];
      }
      if (!tiposPorNivel[nivel].includes(tipo)) {
        tiposPorNivel[nivel].push(tipo);
      }
    });

    return (
      <div className="space-y-2">
        {Object.entries(tiposPorNivel).map(([nivel, tipos]) => (
          <div key={`nivel-${nivel}`} className="space-y-2">
            {tipos.map((tipo, index) => {
              const tipoIndex = tiposDemanda.findIndex(t => t === tipo);
              const isEditing = editandoTipo === tipoIndex;
              
              return (
                <div 
                  key={`${nivel}-${index}`} 
                  className={`flex items-center gap-2 p-2 rounded-md ${parseInt(nivel) > 0 ? 'ml-6' : ''}`}
                >
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={novoValorTipo}
                        onChange={(e) => setNovoValorTipo(e.target.value)}
                        className="flex-1 h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') salvarEdicaoTipo(tipoIndex);
                          if (e.key === 'Escape') cancelarEdicaoTipo();
                        }}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => salvarEdicaoTipo(tipoIndex)}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={cancelarEdicaoTipo}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 text-sm">
                        {tipo.split('::').pop()}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => iniciarEdicaoTipo(tipoIndex)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-red-500 hover:text-red-600"
                        onClick={() => removerTipo(tipoIndex)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl p-4 sm:p-6 mx-auto my-4 sm:my-6 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-1">
          <DialogTitle className="text-base sm:text-lg">Configurações de Demanda</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 flex-1 overflow-hidden">
          {/* Coluna 1: Tipos de Demanda */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Tipos de Demanda</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setMostrarFormularioTipo(true);
                  setTimeout(() => inputNovoTipoRef.current?.focus(), 100);
                }}
                className="h-8 text-xs"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Adicionar Tipo
              </Button>
            </div>
            
            {mostrarFormularioTipo && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                <Input
                  ref={inputNovoTipoRef}
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value)}
                  placeholder="Ex: Infraestrutura::Tapa-buraco"
                  className="flex-1 h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') adicionarTipo();
                    if (e.key === 'Escape') setMostrarFormularioTipo(false);
                  }}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={adicionarTipo}
                  className="h-8"
                  disabled={!novoTipo.trim()}
                >
                  Adicionar
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => {
                    setMostrarFormularioTipo(false);
                    setNovoTipo('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div className="border rounded-md p-3 bg-white dark:bg-gray-800 h-[300px] overflow-y-auto">
              {carregandoTipos ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : tiposDemanda.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  Nenhum tipo de demanda cadastrado. Clique em "Adicionar Tipo" para começar.
                </div>
              ) : (
                renderTiposDemanda()
              )}
            </div>
            
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Dicas:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Use <span className="font-mono">::</span> para criar hierarquias (ex: Infraestrutura::Tapa-buraco)</li>
                <li>Clique no ícone de lápis para editar</li>
                <li>Clique no X para remover</li>
              </ul>
            </div>
          </div>
          
          {/* Coluna 2: Compartilhamento */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Compartilhamento</h3>
            
            {/* Toggle de visibilidade do link */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="link-visibility" className="text-sm font-medium">
                  Link de demanda {linkDisponivel ? 'público' : 'desativado'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {linkDisponivel 
                    ? 'Qualquer pessoa com o link pode acessar as demandas.'
                    : 'Apenas usuários autenticados podem acessar as demandas.'}
                </p>
              </div>
              <div className="ml-4">
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
              <div className="p-3 bg-white rounded-lg border w-full max-w-[180px] mx-auto">
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
                <div className="flex-1 p-2 text-xs overflow-x-auto break-all bg-gray-50 dark:bg-gray-800 rounded-md">
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
            <Button 
              onClick={handleShare}
              className="w-full mt-2"
              variant="secondary"
            >
              <Share2 className="mr-2 h-3.5 w-3.5" />
              Compartilhar via...
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col items-center space-y-3 sm:space-y-4 px-1 py-1">
          {/* Toggle de visibilidade do link */}
          <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg w-full">
            <div className="space-y-0.5">
              <Label htmlFor="link-visibility" className="text-sm font-medium">
                Link de demanda {linkDisponivel ? 'público' : 'desativado'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {linkDisponivel 
                  ? 'Qualquer pessoa com o link pode acessar as demandas.'
                  : 'Apenas usuários autenticados podem acessar as demandas.'}
              </p>
            </div>
            <div className="ml-4">
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
          <div className="p-2 bg-white rounded-lg border w-full max-w-[180px]">
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
          
          {/* URL para compartilhamento */}
          <div className="w-full px-1 sm:px-2">
            <p className="text-sm sm:text-base font-medium mb-2 text-center sm:text-left">Link para compartilhamento:</p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 p-2 text-xs sm:text-sm overflow-x-auto break-all">
                {shareUrl}
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={copyToClipboard}
                className="shrink-0 w-full sm:w-auto hover:bg-transparent"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="ml-2 sm:hidden">{copied ? 'Copiado!' : 'Copiar'}</span>
              </Button>
            </div>
          </div>
          
          {/* Botão de compartilhar */}
          <Button 
            onClick={handleShare}
            className="w-full mt-1 h-9 text-sm"
          >
            <Share2 className="mr-2 h-3.5 w-3.5" />
            Compartilhar via...
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
