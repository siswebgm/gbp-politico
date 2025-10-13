import { useState, useRef, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Card } from "../../../components/ui/card";
import { Upload, ChevronLeft, FileText, X, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useCompany } from "../../../providers/CompanyProvider";
import { useAuth } from "../../../providers/AuthProvider";
import { supabaseClient } from "../../../lib/supabase";
import { useCustomToast } from "../../../hooks/useCustomToast";
import { projetosLeiService } from "../../../services/projetosLei";

interface ProjetoUpload {
  ano: string;
  numero: string;
  status: string;
  titulo: string;
  arquivos: File[];
  arquivosExistentes: string[];
}

interface CompanyData {
  id: string;
  nome: string;
  created_at: string;
  uid: string;
  storage: string;
}

export default function EditarProjeto() {
  const { uid } = useParams<{ uid: string }>();
  const companyContext = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showErrorToast, showSuccessToast } = useCustomToast();

  const [isLoadingProjeto, setIsLoadingProjeto] = useState(true);

  // Redireciona se não houver empresa selecionada
  if (!companyContext.company) {
    navigate('/select-company');
    return null;
  }

  // Redireciona se não houver usuário logado
  if (!user) {
    navigate('/login');
    return null;
  }

  const company = companyContext.company as CompanyData;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => (currentYear - i).toString());

  const [projeto, setProjeto] = useState<ProjetoUpload>({
    ano: currentYear.toString(),
    numero: "",
    status: "em_andamento",
    titulo: "",
    arquivos: [],
    arquivosExistentes: [],
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar dados do projeto
  useEffect(() => {
    const carregarProjeto = async () => {
      if (!uid) return;

      try {
        setIsLoadingProjeto(true);
        const data = await projetosLeiService.buscarPorId(uid);
        
        if (data) {
          setProjeto({
            ano: data.ano.toString(),
            numero: data.numero,
            status: data.status,
            titulo: data.titulo,
            arquivos: [],
            arquivosExistentes: Array.isArray(data.arquivos) ? data.arquivos : [],
          });
        } else {
          showErrorToast("Projeto não encontrado");
          navigate('/app/documentos/projetos-lei');
        }
      } catch (error) {
        console.error('Erro ao carregar projeto:', error);
        showErrorToast("Erro ao carregar projeto");
        navigate('/app/documentos/projetos-lei');
      } finally {
        setIsLoadingProjeto(false);
      }
    };

    carregarProjeto();
  }, [uid]);

  const handleChange = (field: keyof ProjetoUpload, value: string) => {
    setProjeto({ ...projeto, [field]: value });
  };

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;
    setProjeto({ 
      ...projeto, 
      arquivos: [...projeto.arquivos, ...Array.from(files)]
    });
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
    setProjeto({
      ...projeto,
      arquivos: projeto.arquivos.filter((_, i) => i !== arquivoIndex)
    });
  };

  const handleRemoveArquivoExistente = (arquivoUrl: string) => {
    setProjeto({
      ...projeto,
      arquivosExistentes: projeto.arquivosExistentes.filter(url => url !== arquivoUrl)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projeto.numero || !projeto.titulo) {
      showErrorToast("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (!uid) {
      showErrorToast("ID do projeto não encontrado.");
      return;
    }

    try {
      setIsLoading(true);
      setUploadProgress(10);

      let arquivosUrls = [...projeto.arquivosExistentes];

      // Upload dos novos arquivos
      if (projeto.arquivos.length > 0) {
        const totalArquivos = projeto.arquivos.length;

        for (let i = 0; i < totalArquivos; i++) {
          const arquivo = projeto.arquivos[i];
          const fileName = `${Date.now()}-${arquivo.name}`;
          const filePath = `projetos-lei/${company.uid}/${projeto.ano}/${projeto.numero}/${fileName}`;

          const { error: uploadError } = await supabaseClient.storage
            .from(company.storage)
            .upload(filePath, arquivo);

          if (uploadError) {
            throw uploadError;
          }

          const { data: urlData } = supabaseClient.storage
            .from(company.storage)
            .getPublicUrl(filePath);

          arquivosUrls.push(urlData.publicUrl);

          const progressPercentage = 10 + ((i + 1) / totalArquivos) * 60;
          setUploadProgress(progressPercentage);
        }
      } else {
        setUploadProgress(70);
      }

      // Atualizar projeto no banco de dados
      const projetoAtualizado = {
        numero: projeto.numero,
        ano: parseInt(projeto.ano),
        titulo: projeto.titulo,
        status: projeto.status as 'em_andamento' | 'aprovado' | 'arquivado',
        arquivos: JSON.stringify(arquivosUrls),
      };

      setUploadProgress(80);

      await projetosLeiService.atualizar(uid, projetoAtualizado, user.uid);

      setUploadProgress(100);

      showSuccessToast("Projeto atualizado com sucesso!");
      
      setTimeout(() => {
        navigate('/app/documentos/projetos-lei');
      }, 1500);

    } catch (error: any) {
      console.error('Erro ao atualizar projeto:', error);
      showErrorToast(error.message || "Erro ao atualizar projeto. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  if (isLoadingProjeto) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-gray-600 dark:text-gray-400">Carregando projeto...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="w-full p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/app/documentos/projetos-lei')} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  Editar Projeto de Lei
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Atualize as informações básicas do projeto
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Ano */}
                  <div className="space-y-2">
                    <Label htmlFor="ano">Ano *</Label>
                    <Select
                      value={projeto.ano}
                      onValueChange={(value) => handleChange("ano", value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="ano">
                        <SelectValue placeholder="Selecione o ano" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Número */}
                  <div className="space-y-2">
                    <Label htmlFor="numero">Número *</Label>
                    <Input
                      id="numero"
                      type="text"
                      value={projeto.numero}
                      onChange={(e) => handleChange("numero", e.target.value)}
                      placeholder="Ex: 001"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                {/* Título */}
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    type="text"
                    value={projeto.titulo}
                    onChange={(e) => handleChange("titulo", e.target.value)}
                    placeholder="Digite o título do projeto"
                    disabled={isLoading}
                    required
                  />
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={projeto.status}
                    onValueChange={(value) => handleChange("status", value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="arquivado">Arquivado</SelectItem>
                      <SelectItem value="lei_em_vigor">Lei em Vigor</SelectItem>
                      <SelectItem value="vetado">Vetado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Arquivos Existentes */}
            {projeto.arquivosExistentes.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Arquivos Atuais</h3>
                <div className="space-y-2">
                  {projeto.arquivosExistentes.map((url, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {url.split('/').pop()}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveArquivoExistente(url)}
                        disabled={isLoading}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Upload de Arquivos */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Adicionar Novos Arquivos</h3>
              <div
                onDragEnter={handleDragEnter}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isLoading && fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors
                  ${isDragging 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' 
                    : 'border-gray-300 dark:border-gray-700 hover:border-blue-400'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Arraste arquivos aqui ou clique para selecionar
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  PDF, DOCX, TXT, etc.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileChange(e.target.files)}
                  className="hidden"
                  disabled={isLoading}
                />
              </div>

              {/* Lista de Arquivos Novos */}
              {projeto.arquivos.length > 0 && (
                <div className="mt-4 space-y-2">
                  {projeto.arquivos.map((arquivo, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {arquivo.name}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          ({(arquivo.size / 1024).toFixed(2)} KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveArquivo(index)}
                        disabled={isLoading}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Progress Bar */}
            {isLoading && (
              <Card className="p-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Atualizando projeto...
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {uploadProgress.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Botões */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/app/documentos/projetos-lei')}
                disabled={isLoading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !projeto.numero || !projeto.titulo}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  'Atualizar Projeto'
                )}
              </Button>
            </div>
          </form>
        </div>
    </div>
  );
}
