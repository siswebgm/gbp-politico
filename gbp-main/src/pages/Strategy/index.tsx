import { useState, useEffect } from 'react';
import { Map, Clock, MessageSquare, ArrowLeft, Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { StrategyService, StrategyMetrics, PriorityArea } from '../../services/strategyService';

export function Strategy() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<StrategyMetrics | null>(null);
  const [priorityAreas, setPriorityAreas] = useState<PriorityArea[]>([]);
  const [loading, setLoading] = useState(true);

  const handleExportExcel = () => {
    if (!metrics || priorityAreas.length === 0) {
      console.error("Não há dados para exportar.");
      return;
    }

    const wb = XLSX.utils.book_new();

    // 1. Worksheet for Indicadores Principais
    const ws_data_indicadores = [
      ["Indicador", "Item", "Quantidade"],
      ...metrics.topBairros.map(item => ["Top Bairros", item.bairro, item.quantidade]),
      ...metrics.topIndicados.map(item => ["Top Indicados", item.nome || item.indicado_uid, item.quantidade]),
      ...metrics.topCategorias.map(item => ["Top Categorias", item.nome, item.quantidade]),
      ...metrics.distribuicaoGenero.map(item => ["Distribuição de Gênero", item.genero, item.quantidade]),
    ];
    const ws_indicadores = XLSX.utils.aoa_to_sheet(ws_data_indicadores);
    XLSX.utils.book_append_sheet(wb, ws_indicadores, "Indicadores Principais");

    // 2. Worksheet for Áreas Prioritárias
    const ws_data_areas = [
      ["Nome da Área", "Eleitores", "Taxa de Engajamento (%)", "Potencial de Votos"],
      ...priorityAreas.map(area => [
        area.nome,
        area.eleitores,
        area.taxaEngajamento,
        area.potencialVotos
      ])
    ];
    const ws_areas = XLSX.utils.aoa_to_sheet(ws_data_areas);
    XLSX.utils.book_append_sheet(wb, ws_areas, "Áreas Prioritárias");

    // 3. Worksheet for Recomendações
    const ws_data_recomendacoes = [
        ["Tipo", "Recomendação"],
        ["Timing de Campanha", "Foco nas áreas com maior taxa de engajamento nos próximos 30 dias"],
        ["Cobertura Geográfica", "Priorizar visitas nas áreas com menor taxa de conversão"],
        ["Comunicação", "Utilizar WhatsApp para comunicação direta com eleitores altamente engajados"],
    ];
    const ws_recomendacoes = XLSX.utils.aoa_to_sheet(ws_data_recomendacoes);
    XLSX.utils.book_append_sheet(wb, ws_recomendacoes, "Recomendações");

    XLSX.writeFile(wb, "Estrategia_Politica.xlsx");
  };

  useEffect(() => {
    const fetchStrategyData = async () => {
      try {
        if (!user?.empresa_uid) {
          console.log('Sem empresa_uid');
          return;
        }

        const strategyService = StrategyService.getInstance();
        const [metricsData, areasData] = await Promise.all([
          strategyService.getStrategyMetrics(user.empresa_uid),
          strategyService.getPriorityAreas(user.empresa_uid)
        ]);

        console.log('Dados recebidos:', metricsData);
        setMetrics(metricsData);
        setPriorityAreas(areasData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStrategyData();
  }, [user?.empresa_uid]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 -ml-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white ml-4">Estratégia Política</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">

            <button
              onClick={handleExportExcel}
              disabled={!metrics || priorityAreas.length === 0 || loading}
              className="hidden sm:flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:bg-gray-400 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none dark:focus:ring-blue-800"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Análise estratégica e recomendações para campanha política
        </p>
      </div>

      {/* Indicadores Principais */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {metrics ? (
          <>
            {/* Top Bairros */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Top Bairros
              </h3>
              <ul className="space-y-2">
                {metrics.topBairros.map((bairro, index) => {
                  console.log('Bairro:', bairro);
                  return (
                    <li key={index} className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">{bairro.bairro}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{bairro.quantidade.toString()}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Top Indicados */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Top Indicados
              </h3>
              <ul className="space-y-2">
                {metrics.topIndicados.map((indicado, index) => (
                  <li key={index} className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">{indicado.nome || indicado.indicado_uid}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{indicado.quantidade.toString()}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Top Categorias */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Top Categorias
              </h3>
              <ul className="space-y-2">
                {metrics.topCategorias.map((categoria, index) => {
                  console.log('Categoria:', categoria);
                  return (
                    <li key={index} className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">{categoria.nome || categoria.categoria_uid}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{categoria.quantidade.toString()}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Distribuição de Gênero */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Distribuição de Gênero
              </h3>
              <ul className="space-y-2">
                {(() => {
                  const generosAgrupados = metrics.distribuicaoGenero.reduce((acc, genero) => {
                    const generoNome = genero.genero?.trim() || 'Não informado';
                    const existing = acc.find(g => g.genero === generoNome);
                    
                    if (existing) {
                      existing.quantidade += genero.quantidade;
                    } else {
                      acc.push({...genero, genero: generoNome});
                    }
                    
                    return acc;
                  }, [] as {genero: string, quantidade: number}[]);

                  // Encontra e remove os gêneros não informados para tratá-los separadamente
                  const naoInformados = generosAgrupados.filter(g => 
                    ['não informado', 'não informar', 'prefiro não informar'].includes(g.genero.toLowerCase())
                  );
                  
                  const outrosGeneros = generosAgrupados.filter(g => 
                    !['não informado', 'não informar', 'prefiro não informar'].includes(g.genero.toLowerCase())
                  );

                  // Soma as quantidades de todos os não informados
                  const totalNaoInformados = naoInformados.reduce((sum, g) => sum + g.quantidade, 0);

                  return (
                    <>
                      {/* Gêneros informados */}
                      {outrosGeneros.map((genero, index) => {
                        const emoji = {
                          'Masculino': '♂️',
                          'Feminino': '♀️',
                          'Outro': '⚥️'
                        }[genero.genero] || '❓';
                        
                        return (
                          <li key={`${genero.genero}-${index}`} className="flex justify-between items-center">
                            <span className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                              <span>{emoji}</span>
                              <span>{genero.genero}</span>
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">{genero.quantidade.toString()}</span>
                          </li>
                        );
                      })}
                      
                      {/* Linha única para não informados */}
                      {totalNaoInformados > 0 && (
                        <li className="flex justify-between items-center">
                          <span className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                            <span>❓</span>
                            <span>Não informado</span>
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">{totalNaoInformados}</span>
                        </li>
                      )}
                    </>
                  );
                })()}
              </ul>
            </div>

            {/* Confiabilidade do Voto */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Confiabilidade do Voto
              </h3>
              <ul className="space-y-2">
                {metrics.distribuicaoConfiabilidade.map((item) => (
                  <li key={item.confiabilidade_do_voto}>
                    <div
                      className="flex justify-between items-center p-2 -mx-2 rounded-md transition-colors duration-200"
                    >
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.confiabilidade_do_voto}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{item.quantidade}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Card de Ação - Análise de Dados Detalhada */}
            <div className="bg-indigo-50 dark:bg-indigo-900/50 rounded-lg shadow p-6 flex flex-col items-center justify-center text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Análise de Dados Detalhada
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Explore os dados completos no relatório de eleitores.
              </p>
              <button
                onClick={() => navigate('/app/eleitores/relatorio')}
                className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none dark:focus:ring-indigo-800"
              >
                <Search className="w-4 h-4 mr-2" />
                Ver mais detalhes
              </button>
            </div>

          </>
        ) : loading ? (
          <div className="col-span-3">
            <div className="animate-pulse">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-24"></div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Áreas Prioritárias */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Áreas Prioritárias
        </h3>
        {priorityAreas.length > 0 ? (
          <div className="space-y-4">
            {priorityAreas.map((area) => (
              <div
                key={area.nome}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
              >
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {area.nome}
                </h4>
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Eleitores: {area.eleitores.toString()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Taxa de Engajamento: {area.taxaEngajamento}%
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Potencial de Votos: {area.potencialVotos.toString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : loading ? (
          <div className="animate-pulse">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-24"></div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nenhuma área prioritária encontrada
          </p>
        )}
      </div>

      {/* Recomendações */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Recomendações Estratégicas
        </h3>
        {metrics ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Clock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Timing de Campanha
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Foco nas áreas com maior taxa de engajamento nos próximos 30 dias
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Map className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Cobertura Geográfica
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Priorizar visitas nas áreas com menor taxa de conversão
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <MessageSquare className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Comunicação
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Utilizar WhatsApp para comunicação direta com eleitores altamente engajados
                </p>
              </div>
            </div>
          </div>
        ) : (
          loading ? (
            <div className="animate-pulse">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-24"></div>
            </div>
          ) : null
        )}
      </div>


    </div>
  );
}
