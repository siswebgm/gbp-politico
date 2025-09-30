import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  Users, 
  MapPin, 
  BarChart2, 
  Smartphone, 
  CheckCircle, 
  XCircle,
  PieChart,
  Calendar,
  Download
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Pie, 
  Cell
} from 'recharts';
import { pesquisaStatsService } from '../../services/pesquisaStatsService';
import { useAuth } from '../../providers/AuthProvider';
import { ParticipanteFiltros } from '../../types/pesquisaStats';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface ParticipantesStatsProps {
  empresaUid: string;
  pesquisaUid?: string;
  compact?: boolean;
}

export function ParticipantesStats({ empresaUid, pesquisaUid, compact = false }: ParticipantesStatsProps) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('geral');
  const { user } = useAuth();

  useEffect(() => {
    const loadStats = async () => {
      try {
        console.log('[ParticipantesStats] Iniciando carregamento de estatísticas');
        console.log('[ParticipantesStats] Parâmetros:', { empresaUid, pesquisaUid });
        
        setLoading(true);
        const filtros: ParticipanteFiltros = {};
        if (pesquisaUid) {
          filtros.pesquisa_uid = pesquisaUid;
        }
        
        console.log('[ParticipantesStats] Chamando pesquisaStatsService.getStats com:', { empresaUid, filtros });
        const data = await pesquisaStatsService.getStats(empresaUid, filtros);
        
        console.log('[ParticipantesStats] Dados recebidos do serviço:', data);
        
        if (data && data.comparacaoEleitores) {
          console.log('[ParticipantesStats] Dados de comparação com eleitores:', data.comparacaoEleitores);
        } else {
          console.warn('[ParticipantesStats] Dados de comparação com eleitores não encontrados');
        }
        
        setStats(data);
      } catch (err) {
        console.error('[ParticipantesStats] Erro ao carregar estatísticas:', err);
        setError('Não foi possível carregar as estatísticas. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    if (empresaUid) {
      loadStats();
    }
  }, [empresaUid, pesquisaUid]);

  const handleExportCSV = () => {
    // Implementar exportação para CSV
    console.log('Exportar para CSV');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Erro: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const { 
    totalParticipantes = 0, 
    porCidade = [], 
    porBairro = [], 
    comparacaoEleitores = {
      taxaCorrespondencia: 0,
      correspondencias: 0,
      semCorrespondencia: 0,
      totalParticipantes: 0,
      totalEleitores: 0
    },
    porPesquisa = [],
    porData = []
  } = stats || {};
  
  // Função segura para formatar números
  const formatNumber = (value: any) => {
    const num = Number(value);
    return isNaN(num) ? '0' : num.toLocaleString('pt-BR');
  };

  const topCidades = [...porCidade].sort((a, b) => b.total - a.total).slice(0, 5);
  const topBairros = [...porBairro].sort((a, b) => b.total - a.total).slice(0, 5);

  // Se for a versão compacta, mostra apenas a taxa de correspondência
  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-500">Comparando com base de eleitores...</span>
          </div>
        ) : error ? (
          <div className="text-sm text-red-500">
            Erro ao carregar comparação
          </div>
        ) : (
          <>
            <span 
              className="text-2xl font-bold" 
              style={{ 
                color: comparacaoEleitores.taxaCorrespondencia > 50 ? '#10B981' : '#F59E0B',
                transition: 'color 0.3s ease-in-out'
              }}
              title={`${comparacaoEleitores.taxaCorrespondencia}% dos participantes foram encontrados na base de eleitores`}
            >
              {comparacaoEleitores.taxaCorrespondencia}%
            </span>
            <span className="text-sm text-gray-500">
              ({formatNumber(comparacaoEleitores?.correspondencias)} de {formatNumber(comparacaoEleitores?.totalParticipantes)} participantes)
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Estatísticas de Participantes</h2>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Exportar Dados
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="localizacao">Localização</TabsTrigger>
          <TabsTrigger value="comparacao">Comparação com Eleitores</TabsTrigger>
          <TabsTrigger value="pesquisas">Por Pesquisa</TabsTrigger>
          <TabsTrigger value="temporal">Análise Temporal</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Participantes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(totalParticipantes)}</div>
                <p className="text-xs text-muted-foreground">Total de participantes únicos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cidades Atendidas</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{porCidade.length}</div>
                <p className="text-xs text-muted-foreground">Cidades diferentes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Correspondência</CardTitle>
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(comparacaoEleitores?.taxaCorrespondencia)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(comparacaoEleitores?.correspondencias)} de {formatNumber(comparacaoEleitores?.totalParticipantes)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dispositivos</CardTitle>
                <Smartphone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">Dados de dispositivo disponíveis</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="localizacao" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Cidades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topCidades}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="cidade" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#8884d8" name="Participantes" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Bairros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topBairros.map((item, index) => (
                    <div key={`${item.cidade}-${item.bairro}`} className="flex items-center">
                      <div className="w-2/5 truncate">
                        <Badge variant="outline" className="text-xs font-normal">
                          {item.cidade}
                        </Badge>
                        <p className="text-sm font-medium truncate">{item.bairro}</p>
                      </div>
                      <div className="flex-1 px-4">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{ 
                              width: `${(item.total / topBairros[0].total) * 100}%` 
                            }} 
                          />
                        </div>
                      </div>
                      <div className="w-12 text-right text-sm font-medium">
                        {item.total}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparacao" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparação com Base de Eleitores</CardTitle>
              <p className="text-sm text-muted-foreground">
                Análise de correspondência entre participantes da pesquisa e a base de eleitores
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {comparacaoEleitores.taxaCorrespondencia}%
                  </div>
                  <p className="text-sm text-muted-foreground">Taxa de Correspondência</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {formatNumber(comparacaoEleitores?.correspondencias)}
                  </div>
                  <p className="text-sm text-muted-foreground">Correspondências Encontradas</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-600">
                    {formatNumber(comparacaoEleitores?.semCorrespondencia)}
                  </div>
                  <p className="text-sm text-muted-foreground">Sem Correspondência</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {formatNumber(comparacaoEleitores?.totalEleitores)}
                  </div>
                  <p className="text-sm text-muted-foreground">Total na Base de Eleitores</p>
                </div>
              </div>

              <div className="mt-8 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Correspondências', value: comparacaoEleitores.correspondencias },
                        { name: 'Sem Correspondência', value: comparacaoEleitores.semCorrespondencia },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => 
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      <Cell fill="#00C49F" />
                      <Cell fill="#FF8042" />
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [
                        formatNumber(value),
                        name
                      ]} 
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pesquisas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Participação por Pesquisa</CardTitle>
              <p className="text-sm text-muted-foreground">
                Distribuição de participantes por pesquisa realizada
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={porPesquisa}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="pesquisa_nome" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [value, 'Participantes']}
                    />
                    <Legend />
                    <Bar dataKey="total" fill="#8884d8" name="Participantes" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="temporal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Participantes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Crescimento do número de participantes ao longo do tempo
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={porData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [value, 'Participantes']}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="total" fill="#8884d8" name="Novos Participantes" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
