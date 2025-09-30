import React from 'react';
import { Phone, Clock, Calendar, UserCheck } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { format, startOfWeek, eachDayOfInterval, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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
      <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 bg-opacity-50">
        <Icon className="h-6 w-6 text-purple-600 dark:text-purple-100" />
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

export function AtendimentosBlock() {
  // Simulando dados de atendimentos
  const data = React.useMemo(() => {
    const today = new Date();
    const last7Days = eachDayOfInterval({
      start: subDays(today, 6),
      end: today,
    });

    const weeklyData = last7Days.map(day => ({
      date: format(day, 'dd/MM', { locale: ptBR }),
      atendimentos: Math.floor(Math.random() * 30),
      agendados: Math.floor(Math.random() * 20),
    }));

    const tiposAtendimento = [
      { name: 'Documentação', value: 35 },
      { name: 'Informações', value: 25 },
      { name: 'Solicitações', value: 20 },
      { name: 'Outros', value: 20 },
    ];

    const horariosPico = [
      { time: '08:00', atendimentos: 15 },
      { time: '09:00', atendimentos: 25 },
      { time: '10:00', atendimentos: 35 },
      { time: '11:00', atendimentos: 30 },
      { time: '12:00', atendimentos: 20 },
      { time: '13:00', atendimentos: 25 },
      { time: '14:00', atendimentos: 35 },
      { time: '15:00', atendimentos: 40 },
      { time: '16:00', atendimentos: 30 },
      { time: '17:00', atendimentos: 20 },
    ];

    return {
      weeklyData,
      tiposAtendimento,
      horariosPico,
      hoje: Math.floor(Math.random() * 30),
      mediaEspera: '18 min',
      satisfacao: '96%',
      total: weeklyData.reduce((acc, curr) => acc + curr.atendimentos, 0),
    };
  }, []);

  return (
    <div className="space-y-6 bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Atendimentos
        </h2>
        <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
          Ver todos
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Atendimentos Hoje"
          value={data.hoje}
          icon={Phone}
          description="Total de atendimentos do dia"
          trend={{
            value: 15,
            isPositive: true
          }}
        />
        <StatsCard
          title="Tempo Médio"
          value={data.mediaEspera}
          icon={Clock}
          description="Tempo médio de espera"
          trend={{
            value: 12,
            isPositive: false
          }}
        />
        <StatsCard
          title="Total Semanal"
          value={data.total}
          icon={Calendar}
          description="Atendimentos nos últimos 7 dias"
          trend={{
            value: 8,
            isPositive: true
          }}
        />
        <StatsCard
          title="Satisfação"
          value={data.satisfacao}
          icon={UserCheck}
          description="Índice de satisfação"
          trend={{
            value: 2,
            isPositive: true
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Atendimentos por Dia */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Atendimentos por Dia
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="atendimentos"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                  name="Realizados"
                />
                <Area
                  type="monotone"
                  dataKey="agendados"
                  stackId="2"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  name="Agendados"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Tipos de Atendimento */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Tipos de Atendimento
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.tiposAtendimento}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {data.tiposAtendimento.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Horários de Pico */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Horários de Pico
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.horariosPico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="atendimentos"
                  stroke="#8884d8"
                  fill="#8884d8"
                  name="Atendimentos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
