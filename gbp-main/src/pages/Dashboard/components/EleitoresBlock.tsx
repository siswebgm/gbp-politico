import React from 'react';
import { Users, TrendingUp, MapPin, UserCheck } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { useEleitores } from '../../../hooks/useEleitores';
import { format, startOfDay, startOfWeek, startOfMonth, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, description, trend }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 relative overflow-hidden">
    <div className="flex items-center">
      <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 bg-opacity-50">
        <Icon className="h-6 w-6 text-blue-600 dark:text-blue-100" />
      </div>
      <div className="ml-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </h3>
        <div className="flex items-baseline">
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {value}
          </p>
          {trend && (
            <span className={`ml-2 text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '+' : '-'}{trend.value}%
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {description}
        </p>
      </div>
    </div>
    {trend && (
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${trend.isPositive ? 'bg-green-500' : 'bg-red-500'}`} />
    )}
  </div>
);

export function EleitoresBlock() {
  const { eleitores = [], isLoading } = useEleitores({});

  const stats = React.useMemo(() => {
    const today = startOfDay(new Date());
    const weekStart = startOfWeek(today, { locale: ptBR });
    const monthStart = startOfMonth(today);

    const thisMonth = eleitores.filter(eleitor => 
      isAfter(new Date(eleitor.created_at), monthStart)
    ).length;

    // Contagem de bairros únicos
    const bairrosUnicos = new Set(eleitores.map(e => e.bairro)).size;

    // Dados para o gráfico de bairros
    const bairrosCount = eleitores.reduce((acc, eleitor) => {
      const bairro = eleitor.bairro || 'Não informado';
      acc[bairro] = (acc[bairro] || 0) + 1;
      return acc;
    }, {});

    const bairrosData = Object.entries(bairrosCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => Number(b.value) - Number(a.value))
      .slice(0, 5);

    // Dados para o gráfico de gênero
    const generoCount = eleitores.reduce((acc, eleitor) => {
      const genero = eleitor.genero || 'Não informado';
      acc[genero] = (acc[genero] || 0) + 1;
      return acc;
    }, {});

    const generoData = Object.entries(generoCount)
      .map(([name, value]) => ({ name, value }));

    // Dados para o gráfico de faixa etária
    const faixaEtariaData = [
      { name: '18-24', value: 0 },
      { name: '25-34', value: 0 },
      { name: '35-44', value: 0 },
      { name: '45-59', value: 0 },
      { name: '60+', value: 0 },
    ];

    eleitores.forEach(eleitor => {
      const idade = new Date().getFullYear() - new Date(eleitor.data_nascimento).getFullYear();
      if (idade >= 18 && idade <= 24) faixaEtariaData[0].value++;
      else if (idade <= 34) faixaEtariaData[1].value++;
      else if (idade <= 44) faixaEtariaData[2].value++;
      else if (idade <= 59) faixaEtariaData[3].value++;
      else faixaEtariaData[4].value++;
    });

    return {
      total: eleitores.length,
      novos: thisMonth,
      bairros: bairrosUnicos,
      bairrosData,
      generoData,
      faixaEtariaData,
    };
  }, [eleitores]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-80 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Eleitores
        </h2>
        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          Ver todos
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total de Eleitores"
          value={stats.total.toLocaleString()}
          icon={Users}
          description="Base total de eleitores"
          trend={{
            value: 12,
            isPositive: true
          }}
        />
        <StatsCard
          title="Novos Eleitores"
          value={stats.novos.toLocaleString()}
          icon={UserCheck}
          description="Cadastrados este mês"
          trend={{
            value: 8,
            isPositive: true
          }}
        />
        <StatsCard
          title="Bairros Alcançados"
          value={stats.bairros}
          icon={MapPin}
          description="Bairros com eleitores"
        />
        <StatsCard
          title="Taxa de Conversão"
          value="68%"
          icon={TrendingUp}
          description="Média de conversão"
          trend={{
            value: 5,
            isPositive: true
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Top 5 Bairros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Top 5 Bairros
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.bairrosData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#0088FE" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Distribuição por Gênero */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Distribuição por Gênero
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.generoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {stats.generoData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Faixa Etária */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Distribuição por Faixa Etária
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.faixaEtariaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                  {stats.faixaEtariaData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
