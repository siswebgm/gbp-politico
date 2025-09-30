import { useState, useRef, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Card } from "../../../components/ui/card";
import { Textarea } from "../../../components/ui/textarea";
import { ChevronLeft, Upload, FileText, X } from "lucide-react";
import { useToast } from "../../../components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../../providers/CompanyProvider";
import { useAuth } from "../../../providers/AuthProvider";
import { requerimentosService } from "../../../services/requerimentos";

const statusOptions = [
  { value: 'protocolado', label: 'Protocolado' },
  { value: 'em_analise', label: 'Em Análise' },
  { value: 'deferido', label: 'Deferido' },
  { value: 'indeferido', label: 'Indeferido' },
  { value: 'arquivado', label: 'Arquivado' },
];

const prioridadeOptions = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
];

export default function UploadRequerimento() {
  const { company } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    numero: '',
    titulo: '',
    solicitante: user?.user_metadata?.full_name || '', // Preenche com o nome do usuário logado
    descricao: '',
    tipo: '',
    data_emissao: new Date().toISOString().split('T')[0], // Data atual
    solicitacao_especifica: '',
    prioridade: 'media',
    status: 'protocolado',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Busca o próximo número disponível quando o componente é montado
  useEffect(() => {
    const buscarProximoNumero = async () => {
      if (company?.uid) {
        try {
          const proximoNumero = await requerimentosService.buscarProximoNumero(company.uid);
          setFormData(prev => ({
            ...prev,
            numero: proximoNumero
          }));
        } catch (error) {
          console.error('Erro ao buscar próximo número:', error);
          toast({
            title: 'Erro',
            description: 'Não foi possível obter o próximo número de protocolo. Tente novamente.',
            variant: 'destructive',
          });
        }
      }
    };

    buscarProximoNumero();
  }, [company?.uid, toast]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;
    setArquivos((prev) => [...prev, ...Array.from(files)]);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  const handleRemoveArquivo = (arquivoIndex: number) => {
    setArquivos((prev) => prev.filter((_, i) => i !== arquivoIndex));
  };

  const handleAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !company?.uid || !company?.storage) {
      toast({ title: 'Erro de autenticação', description: 'Dados da empresa não encontrados. Verifique seu login.', variant: 'error' });
      return;
    }

    if (!formData.titulo || !formData.numero || !formData.solicitante) {
      toast({ title: 'Campos obrigatórios', description: 'Por favor, preencha Título, Número e Solicitante.', variant: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      let uploadedFiles: { nome: string; url: string }[] = [];
      if (arquivos.length > 0) {
        uploadedFiles = await requerimentosService.uploadArquivos(
          arquivos,
          company.uid,
          company.storage
        );
      }

      await requerimentosService.criar({
        ...formData,
        empresa_uid: company.uid,
        assinatura: null, 
        protocolo: null,
        created_by: user.uid,
        updated_by: user.uid,
        arquivos: uploadedFiles,
      }, user.uid);

      toast({ title: 'Sucesso!', description: 'Requerimento criado com sucesso.', variant: 'success' });
      navigate('/app/documentos/requerimentos');
    } catch (error) {
      console.error('Erro ao criar requerimento:', error);
      toast({ title: 'Erro ao criar requerimento', description: (error as Error).message, variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white/50 dark:bg-white/50">
        <div>
          <div className="flex-1 p-4 sm:p-6">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-4 mb-6 bg-white/50 dark:bg-white/50 p-4 rounded-lg shadow-sm">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/app/documentos/requerimentos')}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl font-bold">Novo Requerimento</h1>
          </div>

          <Card className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input id="titulo" value={formData.titulo} onChange={(e) => handleChange('titulo', e.target.value)} placeholder="Título do requerimento" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="Digite o número"
                  required
                  className="bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="solicitante">Solicitante</Label>
                <Input id="solicitante" value={formData.solicitante} onChange={(e) => handleChange('solicitante', e.target.value)} placeholder="Nome do solicitante" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_emissao">Data de Emissão</Label>
                <Input id="data_emissao" type="date" value={formData.data_emissao} onChange={(e) => handleChange('data_emissao', e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo</Label>
                    <Input id="tipo" value={formData.tipo} onChange={(e) => handleChange('tipo', e.target.value)} placeholder="Tipo de requerimento" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="prioridade">Prioridade</Label>
                    <Select value={formData.prioridade} onValueChange={(value) => handleChange('prioridade', value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {prioridadeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" value={formData.descricao} onChange={(e) => handleChange('descricao', e.target.value)} placeholder="Descrição detalhada do requerimento" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="solicitacao_especifica">Solicitação Específica</Label>
              <Textarea id="solicitacao_especifica" value={formData.solicitacao_especifica} onChange={(e) => handleChange('solicitacao_especifica', e.target.value)} placeholder="Detalhes específicos da solicitação" />
            </div>

            <div className="mt-8">
              <Label>Arquivos</Label>
              <div
                className={`mt-2 p-4 sm:p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-gray-300 hover:border-primary"
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={handleAreaClick}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <p className="text-xs sm:text-sm text-gray-600 text-center">
                    Arraste e solte arquivos aqui ou clique para selecionar
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files)}
                />
              </div>

              {arquivos.length > 0 && (
                <div className="mt-4 space-y-2">
                  {arquivos.map((arquivo, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm truncate max-w-[200px] sm:max-w-[300px]">{arquivo.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveArquivo(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <div className="mt-8 flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/app/documentos/requerimentos')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar Requerimento'}
            </Button>
          </div>
        </form>
          </div>
        </div>
      </div>
    </div>
  );
}
