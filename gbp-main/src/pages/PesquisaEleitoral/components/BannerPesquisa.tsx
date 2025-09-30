import { CalendarIcon } from 'lucide-react';

interface BannerPesquisaProps {
  titulo: string;
  tipoPesquisa: string;
  dataInicio: Date | string | null;
  dataFim: Date | string | null;
}

export function BannerPesquisa({ titulo, tipoPesquisa, dataInicio, dataFim }: BannerPesquisaProps) {
  // Função para formatar a data para exibição
  const formatarData = (data: Date | string | null): string => {
    if (!data) return 'Não definido';
    
    const dataObj = typeof data === 'string' ? new Date(data) : data;
    return dataObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Função para obter o nome do tipo de pesquisa
  const getTipoPesquisaNome = (tipo: string): string => {
    const tipos: Record<string, string> = {
      'eleitoral': 'Eleitoral',
      'satisfacao': 'Satisfação',
      'opiniao': 'Opinião Pública',
      'outro': 'Outro'
    };
    return tipos[tipo] || tipo;
  };

  // Verifica se a pesquisa está ativa
  const isAtiva = !dataFim || new Date(dataFim) >= new Date();
  
  // Calcula a porcentagem de conclusão
  const calcularProgresso = () => {
    if (!dataInicio || !dataFim) return 0;
    
    const inicio = new Date(dataInicio).getTime();
    const fim = new Date(dataFim).getTime();
    const agora = new Date().getTime();
    
    if (agora >= fim) return 100;
    if (agora <= inicio) return 0;
    
    return Math.round(((agora - inicio) / (fim - inicio)) * 100);
  };

  const progresso = calcularProgresso();
  const tipoPesquisaNome = getTipoPesquisaNome(tipoPesquisa);
  const descricaoTipo = 
    tipoPesquisa === 'eleitoral' ? 'Avaliação de candidatos' :
    tipoPesquisa === 'satisfacao' ? 'Pesquisa de satisfação' :
    tipoPesquisa === 'opiniao' ? 'Pesquisa de opinião pública' :
    'Outro tipo de pesquisa';

  return (
    <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-lg shadow-sm mb-6 overflow-hidden border border-blue-100 dark:border-blue-900/50">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {titulo || 'Nova Pesquisa'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {tipoPesquisaNome} • {isAtiva ? 'Em andamento' : 'Encerrada'}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
              tipoPesquisa === 'eleitoral' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' :
              tipoPesquisa === 'satisfacao' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' :
              tipoPesquisa === 'opiniao' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200' :
              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}>
              {tipoPesquisaNome}
            </span>
            
            <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center ${
              isAtiva 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' 
                : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
            }`}>
              <span className={`h-2 w-2 rounded-full ${isAtiva ? 'bg-green-500' : 'bg-red-500'} mr-2`}></span>
              {isAtiva ? 'Ativa' : 'Encerrada'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/80 dark:bg-gray-800/80 p-4 rounded-lg shadow-sm border border-blue-50 dark:border-blue-900/30">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1" />
              Período
            </h3>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Início</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatarData(dataInicio)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Término</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {dataFim ? formatarData(dataFim) : 'Não definido'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 dark:bg-gray-800/80 p-4 rounded-lg shadow-sm border border-blue-50 dark:border-blue-900/30">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Tipo de Pesquisa
            </h3>
            <p className="text-sm text-gray-900 dark:text-white">
              {tipoPesquisaNome}
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {descricaoTipo}
            </p>
          </div>
          
          <div className="bg-white/80 dark:bg-gray-800/80 p-4 rounded-lg shadow-sm border border-blue-50 dark:border-blue-900/30">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Status Atual
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  isAtiva ? 'bg-green-500' : 'bg-red-500'
                } mr-2`}></span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {isAtiva ? 'Pesquisa Ativa' : 'Pesquisa Encerrada'}
                </span>
              </div>
              {dataFim && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {isAtiva 
                    ? `Encerra em ${formatarData(dataFim)}`
                    : `Encerrou em ${formatarData(dataFim)}`}
                </span>
              )}
            </div>
            
            {isAtiva && dataInicio && dataFim && progresso > 0 && progresso < 100 && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full" 
                    style={{ width: `${progresso}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                  {progresso}% concluído
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
