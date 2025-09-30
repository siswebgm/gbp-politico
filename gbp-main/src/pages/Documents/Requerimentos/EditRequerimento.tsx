import { useState, useEffect, useRef } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Card } from "../../../components/ui/card";
import { Textarea } from "../../../components/ui/textarea";
import { ChevronLeft, Upload, FileText, X } from "lucide-react";
import { useToast } from "../../../components/ui/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../providers/AuthProvider";
import { useCompany } from "../../../providers/CompanyProvider";
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

export default function EditRequerimento() {
  const { uid } = useParams<{ uid: string }>();
  const { user } = useAuth();
  const { company } = useCompany();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [newArquivos, setNewArquivos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!uid) {
      toast({ title: 'Erro', description: 'UID do requerimento não fornecido.', variant: 'error' });
      navigate('/app/documentos/requerimentos');
      return;
    }

    const fetchRequerimento = async () => {
      try {
        const data = await requerimentosService.buscarPorId(uid);
        if (data) {
          // Ensure date is in YYYY-MM-DD format for the input
          if (data.data_emissao) {
            data.data_emissao = new Date(data.data_emissao).toISOString().split('T')[0];
          }
          setFormData(data);
        } else {
          toast({ title: 'Erro', description: 'Requerimento não encontrado.', variant: 'error' });
          navigate('/app/documentos/requerimentos');
        }
      } catch (error) {
        console.error('Erro ao buscar requerimento:', error);
        toast({ title: 'Erro ao buscar dados', description: (error as Error).message, variant: 'error' });
      } finally {
        setIsFetching(false);
      }
    };

    fetchRequerimento();
  }, [uid, navigate, toast]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;
    setNewArquivos((prev) => [...prev, ...Array.from(files)]);
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

  const handleRemoveNewArquivo = (arquivoIndex: number) => {
    setNewArquivos((prev) => prev.filter((_, i) => i !== arquivoIndex));
  };

  const handleAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !company?.uid || !company?.storage || !uid || !formData) {
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
      if (newArquivos.length > 0 && user?.company_uid) {
        uploadedFiles = await requerimentosService.uploadArquivos(
          newArquivos, 
          company.uid, 
          company.storage
        );
      }

      const finalArquivos = [...(formData.arquivos || []), ...uploadedFiles];

      await requerimentosService.atualizar(uid, {
        ...formData,
        arquivos: finalArquivos,
        updated_by: user.uid,
      }, user.uid);

      toast({ title: 'Sucesso!', description: 'Requerimento atualizado com sucesso.', variant: 'success' });
      navigate('/app/documentos/requerimentos');
    } catch (error) {
      console.error('Erro ao atualizar requerimento:', error);
      toast({ title: 'Erro ao atualizar', description: (error as Error).message, variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  if (!formData) {
    return null; // or a not found component
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 p-4 sm:p-6">
        <form onSubmit={handleSubmit}>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-6 flex items-center gap-4">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Editar Requerimento</h1>
          </div>

          <Card className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input id="titulo" value={formData.titulo} onChange={(e) => handleChange('titulo', e.target.value)} placeholder="Título do requerimento" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" value={formData.numero} onChange={(e) => handleChange('numero', e.target.value)} placeholder="Número do requerimento" required />
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
                    <Input id="tipo" value={formData.tipo || ''} onChange={(e) => handleChange('tipo', e.target.value)} placeholder="Tipo de requerimento" />
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
              <Textarea id="descricao" value={formData.descricao || ''} onChange={(e) => handleChange('descricao', e.target.value)} placeholder="Descrição detalhada do requerimento" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="solicitacao_especifica">Solicitação Específica</Label>
              <Textarea id="solicitacao_especifica" value={formData.solicitacao_especifica || ''} onChange={(e) => handleChange('solicitacao_especifica', e.target.value)} placeholder="Detalhes específicos da solicitação" />
            </div>

            <div className="mt-8">
              <Label>Arquivos</Label>
              
              {/* Arquivos existentes */}
              {formData.arquivos && formData.arquivos.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-600">Arquivos existentes:</p>
                  {formData.arquivos.map((arquivo: { nome: string; url: string }, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
                      <a href={arquivo.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm truncate max-w-[200px] sm:max-w-[300px]">{arquivo.nome}</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Área de upload para novos arquivos */}
              <div
                className={`mt-4 p-4 sm:p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDragging ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"
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
                    Arraste e solte novos arquivos aqui ou clique para selecionar
                  </p>
                </div>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFileChange(e.target.files)} />
              </div>

              {/* Novos arquivos a serem enviados */}
              {newArquivos.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-600">Novos arquivos:</p>
                  {newArquivos.map((arquivo, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm truncate max-w-[200px] sm:max-w-[300px]">{arquivo.name}</span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveNewArquivo(index)}>
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
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
