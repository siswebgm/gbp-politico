import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { projetosLeiService, ProjetoLei } from '../../../services/projetosLei';
import { Hash, Tag, FileBox, FileText } from 'lucide-react';
import { useCompanyStore } from '../../../store/useCompanyStore';

export default function VisualizarProjeto() {
  const { id } = useParams();
  const [projeto, setProjeto] = useState<ProjetoLei | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const company = useCompanyStore((state) => state.company);

  useEffect(() => {
    async function fetchProjeto() {
      try {
        if (!id) {
          setError('ID do projeto não encontrado');
          return;
        }

        if (!company) {
          setError('Empresa não encontrada');
          return;
        }

        const data = await projetosLeiService.buscarPorId(id);
        
        if (!data) {
          setError('Projeto não encontrado');
          return;
        }

        // Verifica se o projeto pertence à empresa do usuário
        if (data.empresa_uid !== company.uid) {
          setError('Você não tem permissão para visualizar este projeto');
          return;
        }

        setProjeto(data);
      } catch (err) {
        console.error('Erro ao buscar projeto:', err);
        setError('Erro ao carregar o projeto');
      } finally {
        setLoading(false);
      }
    }

    fetchProjeto();

    // Removes a classe overflow-hidden do body ao montar
    document.body.classList.remove('overflow-hidden');
    
    // Limpa ao desmontar
    return () => {
      document.body.classList.add('overflow-hidden');
    };
  }, [id, company]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-red-600 text-lg font-semibold mb-4">{error}</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  if (!projeto) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-600 text-lg font-semibold mb-4">Projeto não encontrado</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-100 text-green-800 ring-green-600/20';
      case 'arquivado':
        return 'bg-gray-100 text-gray-800 ring-gray-600/20';
      case 'em_andamento':
        return 'bg-blue-100 text-blue-800 ring-blue-600/20';
      case 'lei_em_vigor':
        return 'bg-purple-100 text-purple-800 ring-purple-600/20';
      case 'vetado':
        return 'bg-red-100 text-red-800 ring-red-600/20';
      default:
        return 'bg-gray-100 text-gray-800 ring-gray-600/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'Aprovado';
      case 'arquivado':
        return 'Arquivado';
      case 'em_andamento':
        return 'Em Andamento';
      case 'lei_em_vigor':
        return 'Lei em Vigor';
      case 'vetado':
        return 'Vetado';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col h-screen md:h-auto">
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        {/* Card Principal */}
        <div className="bg-white flex-1 flex flex-col md:rounded-xl md:shadow-sm md:my-8">
          {/* Cabeçalho com Informações Principais */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-4 mb-3">
                  {projeto.numero && (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Hash className="w-4 h-4" />
                      <span className="font-medium">Projeto de Lei Nº {projeto.numero}/{projeto.ano}</span>
                    </div>
                  )}
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ring-1 ring-inset ${getStatusColor(projeto.status)}`}>
                    <Tag className="w-4 h-4 mr-1" />
                    {getStatusLabel(projeto.status)}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{projeto.titulo || projeto.ementa}</h1>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="p-6">
            {/* Arquivos */}
            {projeto.arquivos && projeto.arquivos.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-gray-900 font-medium">
                  <FileBox className="w-5 h-5" />
                  <h2>Arquivos do Projeto</h2>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {projeto.arquivos.map((url, index) => {
                    const fileName = url.split('/').pop()?.split('_').slice(1).join('_') || 'arquivo';
                    const fileExtension = fileName.split('.').pop()?.toLowerCase();
                    
                    return (
                      <div key={index} className="rounded-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-700">{fileName}</span>
                          </div>
                        </div>
                        <div className="p-4">
                          {/* Em dispositivos móveis, sempre mostra como link */}
                          <div className="md:hidden flex items-center justify-center py-2">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Abrir Arquivo
                            </a>
                          </div>
                          
                          {/* Em desktop, mantém a visualização atual */}
                          <div className="hidden md:block">
                            {fileExtension === 'pdf' ? (
                              <div className="aspect-[16/9] relative">
                                <iframe
                                  src={url}
                                  className="absolute inset-0 w-full h-full border-0 rounded"
                                  title={fileName}
                                />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center py-8">
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  Baixar Arquivo
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
