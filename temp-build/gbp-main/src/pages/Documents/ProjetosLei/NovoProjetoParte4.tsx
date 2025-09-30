import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, X, Upload, Tag as TagIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { useToast } from '../../../components/ui/use-toast';
import { projetosLeiService } from '../../../services/projetosLei';
import { useAuthStore } from '../../../store/useAuthStore';
import { useCompany } from '../../../providers/CompanyProvider';

interface File {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export default function NovoProjetoParte4() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useAuthStore((state) => state.user);
  const { company, isLoading, error } = useCompany();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState(() => {
    const savedData = localStorage.getItem('projetoLei_parte4');
    return savedData ? JSON.parse(savedData) : {
      tags: [] as string[],
      arquivos: [] as File[],
      tramitacao: [] as Array<{
        data: string;
        status: string;
        descricao: string;
      }>,
    };
  });
  const [newTag, setNewTag] = React.useState('');
  const [newTramitacao, setNewTramitacao] = React.useState({
    data: new Date().toISOString().split('T')[0],
    status: '',
    descricao: '',
  });

  const dadosAnteriores = React.useMemo(() => {
    const parte1 = JSON.parse(localStorage.getItem('projetoLei_parte1') || '{}');
    const parte2 = JSON.parse(localStorage.getItem('projetoLei_parte2') || '{}');
    const parte3 = JSON.parse(localStorage.getItem('projetoLei_parte3') || '{}');
    return { ...parte1, ...parte2, ...parte3 };
  }, []);

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    const formattedFiles = acceptedFiles.map(file => ({
      nome: file.name,
      tamanho: file.size,
      tipo: file.type,
      caminho: `/uploads/${file.name}` // Caminho temporário
    }));

    setFormData(prev => ({
      ...prev,
      arquivos: [...prev.arquivos, ...formattedFiles]
    }));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    }
  });

  // Verifica dados apenas uma vez ao montar o componente
  React.useEffect(() => {
    const verificarDados = async () => {
      const parte1 = localStorage.getItem('projetoLei_parte1');
      const parte2 = localStorage.getItem('projetoLei_parte2');
      const parte3 = localStorage.getItem('projetoLei_parte3');
      
      if (!parte1 || !parte2 || !parte3) {
        toast({
          title: "⚠️ Atenção",
          description: (
            <div className="flex flex-col gap-2">
              <p>Por favor, preencha todas as partes anteriores do formulário.</p>
              <p className="text-sm text-muted-foreground">
                Você será redirecionado para o início do cadastro.
              </p>
            </div>
          ),
          variant: "default",
          duration: 5000
        });
        navigate('/app/documentos/projetos-lei/novo', { replace: true });
        return;
      }

      try {
        // Verifica se os dados são JSON válidos
        JSON.parse(parte1);
        JSON.parse(parte2);
        JSON.parse(parte3);
      } catch (error) {
        toast({
          title: "⚠️ Erro nos Dados",
          description: (
            <div className="flex flex-col gap-2">
              <p>Dados inválidos no formulário.</p>
              <p className="text-sm text-muted-foreground">
                Por favor, comece o cadastro novamente.
              </p>
            </div>
          ),
          variant: "default",
          duration: 5000
        });
        // Limpa dados corrompidos
        localStorage.removeItem('projetoLei_parte1');
        localStorage.removeItem('projetoLei_parte2');
        localStorage.removeItem('projetoLei_parte3');
        localStorage.removeItem('projetoLei_parte4');
        navigate('/app/documentos/projetos-lei/novo', { replace: true });
      }
    };

    verificarDados();
  }, []); // Executa apenas uma vez ao montar

  // Redireciona se houver erro ao carregar a empresa
  React.useEffect(() => {
    if (!isLoading && (error || !company)) {
      toast({
        title: "⚠️ Atenção",
        description: (
          <div className="flex flex-col gap-2">
            <p>Selecione uma empresa antes de continuar.</p>
            <p className="text-sm text-muted-foreground">
              Você será redirecionado para a seleção de empresas.
            </p>
          </div>
        ),
        variant: "default",
        duration: 5000
      });
      navigate('/app/empresas', { replace: true });
      return;
    }
  }, [isLoading, error, company, navigate, toast]);

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      arquivos: prev.arquivos.filter((_, i) => i !== index)
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const addTramitacao = () => {
    if (newTramitacao.descricao && newTramitacao.status) {
      setFormData(prev => ({
        ...prev,
        tramitacao: [...prev.tramitacao, newTramitacao]
      }));
      setNewTramitacao({
        data: new Date().toISOString().split('T')[0],
        status: '',
        descricao: '',
      });
    }
  };

  const removeTramitacao = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tramitacao: prev.tramitacao.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Verifica se tem empresa selecionada
      if (!company?.uid) {
        toast({
          title: "⚠️ Atenção",
          description: (
            <div className="flex flex-col gap-2">
              <p>Selecione uma empresa antes de continuar.</p>
              <p className="text-sm text-muted-foreground">
                Você será redirecionado para a seleção de empresas.
              </p>
            </div>
          ),
          variant: "default",
          duration: 5000
        });
        navigate('/app/empresas', { replace: true });
        return;
      }

      // Verifica se tem usuário
      if (!user?.uid) {
        toast({
          title: "⚠️ Erro de Autenticação",
          description: (
            <div className="flex flex-col gap-2">
              <p>Usuário não encontrado.</p>
              <p className="text-sm text-muted-foreground">
                Por favor, recarregue a página e tente novamente.
              </p>
            </div>
          ),
          variant: "default",
          duration: 5000
        });
        return;
      }

      const dadosAnteriores = {
        ...JSON.parse(localStorage.getItem('projetoLei_parte1') || '{}'),
        ...JSON.parse(localStorage.getItem('projetoLei_parte2') || '{}'),
        ...JSON.parse(localStorage.getItem('projetoLei_parte3') || '{}'),
      };

      const projetoCompleto = {
        numero: dadosAnteriores.numero,
        ano: parseInt(dadosAnteriores.ano),
        titulo: dadosAnteriores.titulo,
        autor: user.nome || 'Usuário',
        coautores: dadosAnteriores.coautores || [],
        data_protocolo: dadosAnteriores.data_protocolo,
        status: 'em_andamento' as const,
        ementa: dadosAnteriores.ementa,
        justificativa: dadosAnteriores.justificativa,
        texto_lei: {
          objetivo: dadosAnteriores.texto_lei?.objetivo || '',
          artigos: dadosAnteriores.texto_lei?.artigos || [],
          disposicoesFinais: dadosAnteriores.texto_lei?.disposicoesFinais || ''
        },
        tags: formData.tags || [],
        arquivos: formData.arquivos.map(arquivo => ({
          nome: arquivo.name,
          tamanho: arquivo.size,
          tipo: arquivo.type,
          caminho: `/uploads/${arquivo.name}`
        })) || [],
        tramitacao: formData.tramitacao || [],
        empresa_uid: company.uid,
        responsavel: user.uid
      };

      await projetosLeiService.criar(projetoCompleto, user.uid);

      // Limpa os dados do localStorage
      localStorage.removeItem('projetoLei_parte1');
      localStorage.removeItem('projetoLei_parte2');
      localStorage.removeItem('projetoLei_parte3');
      localStorage.removeItem('projetoLei_parte4');

      toast({
        className: "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800",
        title: (
          <div className="flex items-center gap-2 text-green-800 dark:text-green-300">
            <span className="text-2xl">🎉</span>
            <span>Projeto criado com sucesso!</span>
          </div>
        ),
        description: (
          <p className="text-green-800 dark:text-green-300">
            O projeto de lei <span className="font-bold">{projetoCompleto.numero}/{projetoCompleto.ano}</span> foi criado.
          </p>
        ),
        variant: "default",
        duration: 5000,
      });

      navigate('/app/documentos/projetos-lei', { replace: true });
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      toast({
        className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800",
        title: (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-300">
            <span className="text-2xl">❌</span>
            <span>Erro ao criar projeto</span>
          </div>
        ),
        description: (
          <p className="text-red-600 dark:text-red-300">
            {error instanceof Error ? error.message : "Não foi possível criar o projeto de lei."}
          </p>
        ),
        variant: "default",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!company) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 py-2 px-2 md:py-6 md:px-4">
        <div className="flex flex-col space-y-4">
          {/* Header Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate('/app/documentos/projetos-lei/novo/parte-3')} 
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                aria-label="Voltar para a parte anterior"
              >
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-500 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  Novo Projeto de Lei
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Parte 4 de 4 - Anexos e Tramitação
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Adicione tags relacionadas ao projeto"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button 
                      type="button" 
                      onClick={addTag}
                      variant="outline"
                    >
                      Adicionar
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-red-500"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Anexos</Label>
                  <div 
                    {...getRootProps()} 
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                      ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="mx-auto w-12 h-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      Arraste arquivos aqui ou clique para selecionar
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Formatos aceitos: PDF, DOC, DOCX
                    </p>
                  </div>
                  
                  {formData.arquivos.length > 0 && (
                    <div className="space-y-2">
                      {formData.arquivos.map((file, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                        >
                          <span className="text-sm truncate">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-600"
                          >
                            Remover
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label>Tramitação</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Input
                        type="text"
                        id="data"
                        value={new Date(newTramitacao.data).toLocaleDateString('pt-BR')}
                        onChange={(e) => {
                          const [dia, mes, ano] = e.target.value.split('/');
                          const novaData = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
                          setNewTramitacao(prev => ({ ...prev, data: novaData }));
                        }}
                        placeholder="DD/MM/YYYY"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="text"
                        id="status"
                        value={newTramitacao.status}
                        onChange={(e) => setNewTramitacao(prev => ({ ...prev, status: e.target.value }))}
                        placeholder="Ex: Em análise"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="descricao" className="mb-2 block">Descrição</Label>
                      <Textarea
                        id="descricao"
                        value={newTramitacao.descricao}
                        onChange={(e) => setNewTramitacao(prev => ({ ...prev, descricao: e.target.value }))}
                        placeholder="Descreva o status atual da tramitação"
                        rows={4}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        type="button"
                        onClick={addTramitacao}
                        className="w-full"
                      >
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>

                {formData.tramitacao.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {formData.tramitacao.map((item, index) => (
                      <div 
                        key={index}
                        className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.status}</span>
                            <span className="text-sm text-gray-500">
                              {new Date(item.data).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{item.descricao}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTramitacao(index)}
                          className="ml-2 text-red-500 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/app/documentos/projetos-lei/novo/parte-3')}
                >
                  Voltar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Finalizando...' : 'Finalizar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
