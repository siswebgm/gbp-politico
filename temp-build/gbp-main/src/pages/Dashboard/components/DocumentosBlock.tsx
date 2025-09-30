import React from 'react';
import { FileText, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
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
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
const STATUS_COLORS = {
  pendente: '#FFA500',
  processando: '#0088FE',
  concluido: '#00C49F',
  rejeitado: '#FF4842',
};

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
      <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 bg-opacity-50">
        <Icon className="h-6 w-6 text-green-600 dark:text-green-100" />
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

export function DocumentosBlock() {
  // Simulando dados de documentos
  const data = React.useMemo(() => {
    const today = new Date();
    const last30Days = eachDayOfInterval({
      start: subDays(today, 29),
      end: today,
    });

    const dailyData = last30Days.map(day => ({
      date: format(day, 'dd/MM', { locale: ptBR }),
      concluidos: Math.floor(Math.random() * 15),
      pendentes: Math.floor(Math.random() * 8),
    }));

    const tiposDocumento = [
      { name: 'RG', value: 30 },
      { name: 'CPF', value: 25 },
      { name: 'Título de Eleitor', value: 20 },
      { name: 'Outros', value: 25 },
    ];

    const statusData = [
      { status: 'Pendente', quantidade: 15, color: STATUS_COLORS.pendente },
      { status: 'Em Processo', quantidade: 25, color: STATUS_COLORS.processando },
      { status: 'Concluído', quantidade: 45, color: STATUS_COLORS.concluido },
      { status: 'Rejeitado', quantidade: 5, color: STATUS_COLORS.rejeitado },
    ];

    return {
      dailyData,
      tiposDocumento,
      statusData,
      pendentes: 15,
      emProcesso: 25,
      concluidos: 45,
      taxaConclusao: '85%',
    };
  }, []);

  return (
    <div className="space-y-6 bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Documentos
        </h2>
        <button className="text-green-600 hover:text-green-700 text-sm font-medium">
          Ver todos
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Documentos Pendentes"
          value={data.pendentes}
          icon={AlertCircle}
          description="Aguardando processamento"
          trend={{
            value: 5,
            isPositive: false
          }}
        />
        <StatsCard
          title="Em Processo"
          value={data.emProcesso}
          icon={FileText}
          description="Em análise"
          trend={{
            value: 12,
            isPositive: true
          }}
        />
        <StatsCard
          title="Concluídos"
          value={data.concluidos}
          icon={CheckCircle}
          description="Finalizados este mês"
          trend={{
            value: 18,
            isPositive: true
          }}
        />
        <StatsCard
          title="Taxa de Conclusão"
          value={data.taxaConclusao}
          icon={TrendingUp}
          description="Média de conclusão"
          trend={{
            value: 8,
            isPositive: true
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Evolução Diária */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Evolução Diária
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="concluidos"
                  name="Concluídos"
                  stroke="#00C49F"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="pendentes"
                  name="Pendentes"
                  stroke="#FFA500"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Tipos de Documento */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Tipos de Documento
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.tiposDocumento}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {data.tiposDocumento.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Status dos Documentos
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantidade" name="Quantidade">
                  {data.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
