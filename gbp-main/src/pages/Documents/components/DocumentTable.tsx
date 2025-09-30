import React from 'react';
import { FileText, Download, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabaseClient } from '../../../lib/supabase';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { toast } from 'react-toastify';

interface Document {
  id: number;
  titulo: string;
  tipo_de_documento: string;
  descricao: string | null;
  prioridade: string | null;
  data_de_vencimento: string | null;
  responsavel: string | null;
  tags: string | null;
  status: string | null;
  anexo: string | null;
  observacoes: string | null;
  empresa_id: number;
  created_at: string;
  numero_do_documento: string | null;
  'autor (es)': string | null;
  data_de_apresentação: string | null;
  prazo_de_resposta: string | null;
  remetente: string | null;
  thumbnail?: string;
}

interface DocumentTableProps {
  filters: {
    type: string;
    status: string;
    dateRange: string;
    author: string;
  };
}

export function DocumentTable({ filters }: DocumentTableProps) {
  const company = useCompanyStore((state) => state.company);
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');

  React.useEffect(() => {
    let isMounted = true;

    async function fetchDocuments() {
      if (!company?.id) {
        console.log('No company selected');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching documents for company:', company.id);
        
        // Construir a query base
        let query = supabaseClient
          .from('gbp_documentos')
          .select('*')
          .eq('empresa_id', company.id);

        // Log da query inicial
        console.log('Initial query with company filter:', query);

        // Aplicar filtros adicionais
        if (filters.type) {
          query = query.eq('tipo_de_documento', filters.type);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.author) {
          query = query.eq('autor (es)', filters.author);
        }

        // Log da query final
        console.log('Final query with all filters:', query);

        // Executar a query
        const { data, error: supabaseError } = await query;

        // Log do resultado
        console.log('Query result:', { data, error: supabaseError });

        if (supabaseError) {
          throw supabaseError;
        }

        if (isMounted && data) {
          const processedDocs = data.map(doc => ({
            ...doc,
            thumbnail: doc.anexo || 'https://via.placeholder.com/150x200.png'
          }));
          console.log('Processed documents:', processedDocs);
          setDocuments(processedDocs);
        }
      } catch (err) {
        console.error('Error fetching documents:', err);
        if (isMounted) {
          setError(err as Error);
          toast.error('Erro ao carregar documentos');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    setIsLoading(true);
    fetchDocuments();

    return () => {
      isMounted = false;
    };
  }, [company?.id, filters]);

  const handleView = (doc: Document) => {
    if (doc.anexo) {
      window.open(doc.anexo, '_blank');
    } else {
      toast.info('Este documento não possui anexo');
    }
  };

  const handleDownload = (doc: Document) => {
    if (doc.anexo) {
      window.open(doc.anexo, '_blank');
    } else {
      toast.info('Este documento não possui anexo para download');
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) {
      return;
    }

    try {
      const { error: deleteError } = await supabaseClient
        .from('gbp_documentos')
        .delete()
        .eq('id', doc.id)
        .eq('empresa_id', company?.id);

      if (deleteError) throw deleteError;
      
      setDocuments(docs => docs.filter(d => d.id !== doc.id));
      toast.success('Documento excluído com sucesso!');
    } catch (err) {
      console.error('Error deleting document:', err);
      toast.error('Erro ao excluir documento');
    }
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Erro ao carregar documentos: {error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!documents.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">Nenhum documento encontrado</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          ID da empresa atual: {company?.id}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* View para Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Documento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Autor
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FileText className="flex-shrink-0 h-5 w-5 text-gray-400" />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {doc.titulo}
                      </div>
                      {doc.descricao && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {doc.descricao}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {doc.tipo_de_documento}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {doc.status || 'Pendente'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(doc.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {doc['autor (es)']}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleView(doc)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Visualizar"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                      title="Download"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Excluir"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View para Mobile */}
      <div className="md:hidden">
        {/* Toggle de visualização */}
        <div className="flex justify-end px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-sm font-medium rounded-l-lg ${
                viewMode === 'grid'
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded-r-lg ${
                viewMode === 'list'
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              Lista
            </button>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 gap-4 p-4 pb-20">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                {/* Thumbnail do PDF */}
                <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-700">
                  {doc.thumbnail ? (
                    <img
                      src={doc.thumbnail}
                      alt={doc.titulo}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-20 transition-opacity opacity-0 hover:opacity-100">
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent">
                      <p className="text-white text-sm truncate">{doc.titulo}</p>
                    </div>
                  </div>
                </div>

                {/* Informações e Ações */}
                <div className="p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {format(new Date(doc.created_at), 'dd/MM/yyyy')}
                    </span>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {doc.status || 'Pendente'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => handleView(doc)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-700 rounded-full"
                      title="Visualizar"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-2 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-gray-700 rounded-full"
                      title="Download"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-700 rounded-full"
                      title="Excluir"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="divide-y divide-gray-200 dark:divide-gray-700 pb-20">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 bg-white dark:bg-gray-800">
                <div className="flex items-center space-x-3">
                  {doc.thumbnail ? (
                    <img
                      src={doc.thumbnail}
                      alt={doc.titulo}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
                      <FileText className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {doc.titulo}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(doc.created_at), 'dd/MM/yyyy')}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {doc.status || 'Pendente'}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleView(doc)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-700 rounded-full"
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-1.5 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-gray-700 rounded-full"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-700 rounded-full"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}