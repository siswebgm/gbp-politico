
import { Card } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { BarChart2, TrendingUp, Users, MapPin, PieChart as PieIcon, Home, Map, X } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface DemografiaEleitores {
  distribuicaoGenero: Array<{ name: string; value: number }>;
  distribuicaoIdade: Array<{ name: string; value: number }>;
  principaisBairros: Array<{ name: string; value: number }>;
}

interface AnaliseVotacaoProps {
  candidato: {
    nr_votavel: string;
    nm_votavel: string;
    total_votos: number;
    percentual_total: number;
    total_locais: number;
    maior_votacao: {
      local: string;
      votos: number;
      percentual: number;
    };
    distribuicao_zonas: Array<{
      zona: string;
      votos: number;
      percentual: number;
    }>;
    demografia: DemografiaEleitores | null;
  } | null;
  isLoading: boolean;
  onClose: () => void;
}

const COLORS = ['#2e4f9c', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

export function AnaliseVotacao({ candidato, isLoading, onClose }: AnaliseVotacaoProps) {
  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          <div className="h-64 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!candidato) {
    return null;
  }

  return (
        <div className="p-6 bg-gray-50 rounded-lg relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
        <X className="w-6 h-6" />
      </button>
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {candidato.nr_votavel} - {candidato.nm_votavel}
        </h2>
        <p className="text-sm text-gray-500">Análise detalhada da votação</p>
      </header>

      <Tabs defaultValue="resumo" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-200 rounded-md">
          <TabsTrigger value="resumo">Resumo Geral</TabsTrigger>
          <TabsTrigger value="demografia">Análise Demográfica</TabsTrigger>
          <TabsTrigger value="geografica">Distribuição Geográfica</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg"><Users className="w-6 h-6 text-blue-600" /></div>
                <div>
                  <p className="text-sm text-gray-600">Total de Votos</p>
                  <p className="text-2xl font-bold text-gray-800">{candidato.total_votos.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg"><TrendingUp className="w-6 h-6 text-green-600" /></div>
                <div>
                  <p className="text-sm text-gray-600">Percentual Total</p>
                  <p className="text-2xl font-bold text-gray-800">{candidato.percentual_total.toFixed(2)}%</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg"><MapPin className="w-6 h-6 text-purple-600" /></div>
                <div>
                  <p className="text-sm text-gray-600">Locais de Votação</p>
                  <p className="text-2xl font-bold text-gray-800">{candidato.total_locais.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg"><BarChart2 className="w-6 h-6 text-yellow-600" /></div>
                <div>
                  <p className="text-sm text-gray-600">Maior Votação em um Local</p>
                  <p className="text-xl font-bold text-gray-800">{candidato.maior_votacao.votos.toLocaleString('pt-BR')} votos</p>
                  <p className="text-xs text-gray-500 truncate">{candidato.maior_votacao.local}</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demografia" className="mt-6">
          {candidato.demografia ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-4">
                <h5 className="font-semibold mb-4 flex items-center"><PieIcon className="w-5 h-5 mr-2 text-blue-600" />Distribuição por Gênero</h5>
                <div style={{ width: '100%', height: 250 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={candidato.demografia.distribuicaoGenero} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {candidato.demografia.distribuicaoGenero.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="p-4">
                <h5 className="font-semibold mb-4 flex items-center"><BarChart2 className="w-5 h-5 mr-2 text-blue-600" />Distribuição por Faixa Etária</h5>
                <div style={{ width: '100%', height: 250 }}>
                  <ResponsiveContainer>
                    <BarChart data={candidato.demografia.distribuicaoIdade} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: 'transparent'}} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-10">Dados demográficos não disponíveis.</p>
          )}
        </TabsContent>

        <TabsContent value="geografica" className="mt-6">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-4">
                <h5 className="font-semibold mb-4 flex items-center"><Map className="w-5 h-5 mr-2 text-blue-600" />Distribuição por Zonas</h5>
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                  {candidato.distribuicao_zonas.map((zona) => (
                    <div key={zona.zona}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Zona {zona.zona}</span>
                        <span className="font-medium">{zona.votos.toLocaleString('pt-BR')} votos ({zona.percentual.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${zona.percentual}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-4">
                <h5 className="font-semibold mb-4 flex items-center"><Home className="w-5 h-5 mr-2 text-blue-600" />Principais Bairros</h5>
                {candidato.demografia && candidato.demografia.principaisBairros.length > 0 ? (
                    <ul className="space-y-2 text-sm text-gray-700 max-h-80 overflow-y-auto pr-2">
                        {candidato.demografia.principaisBairros.map(bairro => (
                            <li key={bairro.name} className="flex justify-between items-center bg-gray-100 p-2 rounded-md">
                                <span>{bairro.name}</span>
                                <span className="font-bold text-gray-800">{bairro.value.toLocaleString('pt-BR')}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-gray-500 py-10">Nenhum dado de bairro disponível.</p>
                )}
              </Card>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
