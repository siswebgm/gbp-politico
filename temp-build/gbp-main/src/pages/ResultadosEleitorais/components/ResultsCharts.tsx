import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ResultsChartsProps {
  data: Array<{
    nr_zona: string;
    nr_secao: string;
    nm_local_votacao: string;
    nr_votavel: string;
    nm_votavel: string;
    qt_votos: number;
    qt_aptos: number;
  }>;
  totalResults: number; // Total de resultados da consulta
}

const COLORS = ['#2563eb', '#10b981'];

const formatNumber = (value: number) => {
  if (isNaN(value) || value === null || value === undefined) return 0;
  return new Intl.NumberFormat('pt-BR').format(value);
};

export const ResultsCharts: React.FC<ResultsChartsProps> = ({ data, totalResults }) => {
  const {
    votosPorLocal,
    proporcaoData,
    totalVotos,
    totalAptos,
    localMaisVotado,
    secaoMaisVotada,
  } = useMemo(() => {
    // Agrupa votos por local
    const localVotesMap = data.reduce((acc, curr) => {
      const local = curr.nm_local_votacao || 'Sem local';
      if (!acc[local]) {
        acc[local] = { 
          votos: 0, 
          aptos: Number(curr.qt_aptos) || 0,
          zona: curr.nr_zona, 
          secao: curr.nr_secao 
        };
      }
      const votos = Number(curr.qt_votos) || 0;
      acc[local].votos += votos;
      if (votos > 0) {
        acc[local].aptos = Number(curr.qt_aptos) || 0;
      }
      return acc;
    }, {} as Record<string, { votos: number; aptos: number; zona: string; secao: string }>);

    // Agrupa votos por seção
    const secaoVotesMap = data.reduce((acc, curr) => {
      const key = `${curr.nr_zona}-${curr.nr_secao}`;
      if (!acc[key]) {
        acc[key] = { 
          votos: 0, 
          aptos: Number(curr.qt_aptos) || 0,
          local: curr.nm_local_votacao 
        };
      }
      const votos = Number(curr.qt_votos) || 0;
      acc[key].votos += votos;
      if (votos > 0) {
        acc[key].aptos = Number(curr.qt_aptos) || 0;
      }
      return acc;
    }, {} as Record<string, { votos: number; aptos: number; local: string }>);

    // Encontra o local com mais votos
    const localMaisVotado = Object.entries(localVotesMap)
      .map(([local, dados]) => ({
        local,
        votos: dados.votos,
        aptos: dados.aptos
      }))
      .sort((a, b) => b.votos - a.votos)[0];

    // Encontra a seção com mais votos
    const secaoMaisVotada = Object.entries(secaoVotesMap)
      .map(([key, dados]) => ({
        secao: key,
        votos: dados.votos,
        aptos: dados.aptos,
        local: dados.local
      }))
      .sort((a, b) => b.votos - a.votos)[0];

    // Calcula totais
    const totalVotos = Object.values(localVotesMap).reduce((acc, curr) => acc + curr.votos, 0);
    const totalAptos = Object.values(localVotesMap)
      .filter(local => local.votos > 0)
      .reduce((acc, curr) => acc + curr.aptos, 0);

    // Converte o mapa em array para o gráfico de barras
    const votosPorLocal = Object.entries(localVotesMap)
      .map(([local, dados]) => ({
        local: local.length > 30 ? `${local.substring(0, 30)}...` : local,
        votos: dados.votos,
        aptos: dados.aptos,
        zona: dados.zona,
        secao: dados.secao,
      }))
      .filter(local => local.votos > 0)
      .sort((a, b) => b.votos - a.votos);

    return {
      votosPorLocal,
      proporcaoData: [
        { name: 'Votos do Candidato', value: totalVotos },
        { name: 'Outros Votos', value: Math.max(0, totalAptos - totalVotos) }
      ],
      totalVotos,
      totalAptos,
      localMaisVotado,
      secaoMaisVotada,
    };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
        <p className="font-medium text-gray-800 mb-2">{label}</p>
        {payload.map((pld: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: pld.color }}>
            {pld.name}: {formatNumber(pld.value)}
          </p>
        ))}
      </div>
    );
  };

  if (!data || data.length === 0 || votosPorLocal.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 p-4">
        Nenhum dado disponível para exibição
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Votos</h4>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(totalVotos)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Eleitores Aptos</h4>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(totalAptos)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Local com Mais Votos</h4>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{localMaisVotado?.local}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatNumber(localMaisVotado?.votos || 0)} votos
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Seção com Mais Votos</h4>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {secaoMaisVotada ? (
              <>
                Zona {secaoMaisVotada.secao.split('-')[0]} - Seção {secaoMaisVotada.secao.split('-')[1]}
              </>
            ) : (
              'Não disponível'
            )}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatNumber(secaoMaisVotada?.votos || 0)} votos
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico de Barras */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Distribuição de Votos por Local
          </h3>
          <div style={{ width: '100%', height: 400, minHeight: '400px' }}>
            <ResponsiveContainer>
              <BarChart
                data={votosPorLocal}
                margin={{
                  top: 20,
                  right: 30,
                  left: 40,
                  bottom: 100,
                }}
                barGap={0}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="local"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  stroke="#666"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke="#666"
                  tickFormatter={formatNumber}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar
                  dataKey="votos"
                  name="Votos"
                  fill={COLORS[0]}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="aptos"
                  name="Eleitores Aptos"
                  fill={COLORS[1]}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Pizza */}
        {proporcaoData[0].value > 0 && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Proporção de Votos
            </h3>
            <div style={{ width: '100%', height: 400, minHeight: '400px' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={proporcaoData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => 
                      `${name}: ${formatNumber(value)} (${(percent * 100).toFixed(1)}%)`
                    }
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {proporcaoData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
