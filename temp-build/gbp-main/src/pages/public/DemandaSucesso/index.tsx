import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Loader2, Search } from 'lucide-react';
import { getDemandaRua } from '../../../services/demandasRua';

export function DemandaSucesso() {
  const { id } = useParams<{ id: string }>();
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [empresaUid, setEmpresaUid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDemanda = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const demanda = await getDemandaRua(id);
        
        if (demanda) {
          // Formata o número do protocolo com zeros à esquerda (6 dígitos)
          const protocoloFormatado = String(demanda.numero_protocolo || '').padStart(6, '0');
          setProtocolo(protocoloFormatado);
          setEmpresaUid(demanda.empresa_uid || null);
        } else {
          setError('Demanda não encontrada');
        }
      } catch (err) {
        console.error('Erro ao buscar dados da demanda:', err);
        setError('Erro ao carregar os dados da demanda');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDemanda();
  }, [id]);
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Cabeçalho com ícone */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30">
              <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-white">
              Demanda Registrada<br />
              <span className="mt-1 inline-block">com Sucesso!</span>
            </h1>
          </div>
          
          {/* Conteúdo */}
          <div className="p-6 sm:p-8">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-10 w-10 animate-spin text-green-600" />
              </div>
            ) : error ? (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Cartão do Protocolo */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <div className="text-center">
                    <p className="text-sm sm:text-base text-gray-600 mb-1">Número do Protocolo</p>
                    <div className="mt-2 bg-white rounded-lg p-3 border-2 border-dashed border-gray-300">
                      <p className="text-2xl sm:text-3xl font-bold text-gray-900 font-mono">
                        {protocolo || 'N/A'}
                      </p>
                    </div>
                    <p className="mt-3 text-xs sm:text-sm text-gray-500">
                      Anote ou tire um print deste número para acompanhamento
                    </p>
                  </div>
                </div>
                
                {/* Ações */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 text-center">
                    O que você gostaria de fazer agora?
                  </h3>
                  
                  <div className="space-y-3">
                    <Link
                      to={empresaUid ? `/minhas-demandas/empresa/${empresaUid}` : '/minhas-demandas'}
                      className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <Search className="h-5 w-5 mr-2" />
                      <span>Ver demandas</span>
                    </Link>
                    
                    <a
                      href="https://www.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center px-4 py-3 border border-gray-300 bg-white text-gray-700 rounded-lg font-medium shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors"
                    >
                      Sair sem consultar
                    </a>
                  </div>
                </div>
                
                {/* Informações adicionais */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-xs text-center text-gray-500">
                    Em caso de dúvidas, entre em contato com nosso suporte
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
