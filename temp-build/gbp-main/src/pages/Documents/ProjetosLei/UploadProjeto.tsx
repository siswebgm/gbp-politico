import { useState, useRef } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Card } from "../../../components/ui/card";
import { Upload, ChevronLeft, FileText, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../../providers/CompanyProvider";
import { useAuth } from "../../../providers/AuthProvider";
import { supabaseClient } from "../../../lib/supabase";
import { useCustomToast } from "../../../hooks/useCustomToast";

interface ProjetoUpload {
  ano: string;
  numero: string;
  status: string;
  titulo: string;
  arquivos: File[];
}

interface CompanyData {
  id: string;
  nome: string;
  created_at: string;
  uid: string;
}

export default function UploadProjeto() {
  const companyContext = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showErrorToast, showSuccessToast } = useCustomToast();

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
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);


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

  const handleAreaClick = () => {
    fileInputRef.current?.click();
  };

  const formatarDataBrasileira = (data: Date): string => {
    return data.toLocaleDateString('pt-BR');
  };

  const sanitizeFileName = (fileName: string): string => {
    // Separar o nome do arquivo da extensão
    const lastDotIndex = fileName.lastIndexOf('.');
    const name = lastDotIndex !== -1 ? fileName.slice(0, lastDotIndex) : fileName;
    const extension = lastDotIndex !== -1 ? fileName.slice(lastDotIndex) : '';

    // Sanitizar apenas o nome do arquivo, mantendo a extensão intacta
    const sanitizedName = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]+/g, '_') // Substitui caracteres especiais por _
      .replace(/_+/g, '_') // Remove underscores múltiplos
      .replace(/^_|_$/g, ''); // Remove underscores no início e fim

    // Retornar o nome sanitizado com a extensão original
    return sanitizedName + extension;
  };

  const uploadArquivos = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    const totalFiles = files.length;
    let filesProcessed = 0;

    try {
      // Primeiro, buscar os dados da empresa para obter o bucket correto
      const { data: empresaData, error: storageError } = await supabaseClient
        .from('gbp_empresas')
        .select('storage')
        .eq('uid', company.uid)
        .single();

      if (storageError) {
        console.error('Erro ao buscar storage:', storageError);
        throw new Error('Erro ao buscar informações de armazenamento da empresa');
      }

      if (!empresaData?.storage) {
        throw new Error('Bucket de armazenamento não configurado para esta empresa');
      }

      const storageBucket = empresaData.storage.toLowerCase();
      console.log('Usando bucket:', storageBucket);

      for (const file of files) {
        const timestamp = new Date().getTime();
        const safeFileName = sanitizeFileName(file.name);
        const fileName = `${timestamp}_${safeFileName}`;
        const filePath = `projetos-lei/${fileName}`;

        console.log('Iniciando upload do arquivo:', { bucket: storageBucket, path: filePath });

        const { error: uploadError } = await supabaseClient.storage
          .from(storageBucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Erro no upload:', uploadError);
          throw new Error(`Erro ao fazer upload do arquivo ${file.name}: ${uploadError.message}`);
        }

        console.log('Upload concluído:', fileName);
        
        const { data: { publicUrl } } = supabaseClient.storage
          .from(storageBucket)
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);

        filesProcessed++;
        setUploadProgress((filesProcessed / totalFiles) * 100);
      }

      return uploadedUrls;
    } catch (error) {
      console.error('Erro durante o upload:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setUploadProgress(0);
    
    if (!projeto.ano) {
      showErrorToast("O ano é obrigatório");
      setIsLoading(false);
      return;
    }

    if (!projeto.titulo) {
      showErrorToast("O título é obrigatório");
      setIsLoading(false);
      return;
    }

    if (projeto.arquivos.length === 0) {
      showErrorToast("Selecione pelo menos um arquivo");
      setIsLoading(false);
      return;
    }

    try {
      const dataAtual = new Date();
      
      // Primeiro verifica se já existe um projeto com o mesmo número e ano
      if (projeto.numero) { // Só verifica se houver número informado
        const { data: projetoExistente, error: erroBusca } = await supabaseClient
          .from('gbp_projetos_lei')
          .select('numero, ano')
          .eq('numero', projeto.numero)
          .eq('ano', parseInt(projeto.ano))
          .eq('empresa_uid', company.uid)
          .maybeSingle();

        if (erroBusca) {
          console.error('Erro ao verificar projeto existente:', erroBusca);
          throw erroBusca;
        }

        if (projetoExistente) {
          throw new Error(`Já existe um projeto com o número ${projeto.numero} no ano de ${projeto.ano}.`);
        }
      }

      // Se chegou até aqui, pode fazer o upload dos arquivos
      console.log('Iniciando processo de upload...');
      const arquivosUrls = await uploadArquivos(projeto.arquivos);
      console.log('URLs dos arquivos:', arquivosUrls);
      
      console.log('Inserindo dados na tabela gbp_projetos_lei...');
      const { error } = await supabaseClient
        .from('gbp_projetos_lei')
        .insert({
          ano: parseInt(projeto.ano),
          numero: projeto.numero || null,
          status: projeto.status,
          titulo: projeto.titulo,
          arquivos: arquivosUrls,
          empresa_uid: company.uid,
          data_protocolo: dataAtual.toISOString().split('T')[0], // Formato YYYY-MM-DD para o PostgreSQL
          autor: company.nome,
          responsavel: user.uid // Adicionado o responsável como o usuário atual
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao inserir no banco:', error);
        throw error;
      }

      console.log('Projeto cadastrado com sucesso');

      showSuccessToast(
        `Projeto de lei cadastrado com sucesso! Data de protocolo: ${formatarDataBrasileira(dataAtual)}`
      );
      
      navigate("/app/documentos/projetos-lei");
    } catch (error) {
      console.error('Erro completo:', error);
      
      // Verifica se é um erro de conflito (número de projeto duplicado)
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        showErrorToast(
          `Já existe um projeto com o número ${projeto.numero} no ano de ${projeto.ano}. Por favor, utilize um número diferente.`
        );
      } else {
        const errorMessage = error instanceof Error 
          ? error.message 
          : "Erro ao cadastrar projeto de lei. Tente novamente.";
        showErrorToast(errorMessage);
      }
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const statusOptions = [
    { value: "aprovado", label: "Aprovado" },
    { value: "arquivado", label: "Arquivado" },
    { value: "em_andamento", label: "Em Andamento" },
    { value: "lei_em_vigor", label: "Lei em Vigor" },
    { value: "vetado", label: "Vetado" }
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="bg-gray-50/80 dark:bg-gray-900/50 p-4 sm:p-6 flex-1">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-row items-center gap-4 min-w-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/app/documentos/projetos-lei")}
              className="flex-shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-baseline gap-3">
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">Upload de Projeto de Lei</h1>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground truncate">
                Faça upload de um projeto de lei existente
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-8">
            <div className="space-y-6 sm:space-y-8">
              <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-3">
                  <Label htmlFor="ano" className="font-semibold">Ano <span className="text-red-500">*</span></Label>
                  <Select
                    value={projeto.ano}
                    onValueChange={(value) => handleChange("ano", value)}
                  >
                    <SelectTrigger id="ano" className="w-full">
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year} className="w-full">
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="numero" className="text-muted-foreground">Número <span className="text-xs">(opcional)</span></Label>
                  <Input
                    id="numero"
                    value={projeto.numero}
                    onChange={(e) => handleChange("numero", e.target.value)}
                    placeholder="Ex: 123/2025"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="titulo" className="font-semibold">Título <span className="text-red-500">*</span></Label>
                  <Input
                    id="titulo"
                    value={projeto.titulo}
                    onChange={(e) => handleChange("titulo", e.target.value)}
                    placeholder="Digite o título do projeto"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="status" className="font-semibold">Status <span className="text-red-500">*</span></Label>
                  <Select
                    value={projeto.status}
                    onValueChange={(value) => handleChange("status", value)}
                  >
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="w-full">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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

              {projeto.arquivos.length > 0 && (
                <div className="mt-4 space-y-2">
                  {projeto.arquivos.map((arquivo, index) => (
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

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-4">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Upload em progresso: {Math.round(uploadProgress)}%
                  </p>
                </div>
              )}
            </div>
          </Card>

          <div className="mt-8 flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/app/documentos/projetos-lei")}
            >
              Voltar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Enviando..." : "Enviar Projeto"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
