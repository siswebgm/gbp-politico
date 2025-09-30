import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface BirthdayPerson {
  uid: string;
  eleitor_nome: string;
  eleitor_whatsapp: string;
  mensagem_entregue: string;
  date_part: string;
}

interface BirthdayStatsProps {
  aniversariantes: BirthdayPerson[];
}

export function BirthdayStats({ aniversariantes }: BirthdayStatsProps) {
  // Calcular estatísticas de mensagens
  const stats = aniversariantes.reduce((acc, curr) => {
    const status = curr.mensagem_entregue === 'sim' ? 'Enviadas' : 
                  curr.mensagem_entregue === 'não' ? 'Não Enviadas' : 'Pendentes';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(stats).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = {
    'Enviadas': '#4ade80',
    'Não Enviadas': '#f87171',
    'Pendentes': '#94a3b8'
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mt-4">
      <h3 className="text-lg font-medium mb-4">Status das Mensagens</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.name as keyof typeof COLORS]} 
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
