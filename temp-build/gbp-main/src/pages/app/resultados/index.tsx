import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { User, FileText, Users, Calendar, Search, Loader2 } from 'lucide-react';
import { buscarResultados } from '../../../services/eleicoes';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { cn } from '../../../lib/utils';

interface Candidato {
  nr_votavel: string;
  nm_votavel: string;
  qt_votos: number;
  qt_votos_nominais: number;
  percentual: number;
  situacao: string;
  ds_cargo: string;
  nm_municipio: string;
  dt_eleicao: string;
}

interface Resultado {
  total_votos: number;
  total_aptos: number;
  total_comparecimento: number;
  total_abstencoes: number;
  candidatos: Candidato[];
}

export default function ResultadosPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedTab, setSelectedTab] = React.useState<'TODOS' | 'ELEITOS' | 'NÃO ELEITOS'>('TODOS');
  const [viewMode, setViewMode] = React.useState<'cards' | 'table'>('cards');

  // Buscar resultados
  const { data: resultados, error, isLoading, refetch } = useQuery<Resultado>({
    queryKey: ['resultados'],
    queryFn: async () => {
      try {
        console.log('[DEBUG] Iniciando busca na página...');
        const data = await buscarResultados();
        console.log('[DEBUG] Dados recebidos na página:', data);
        return data;
      } catch (error) {
        console.error('[ERROR] Erro ao buscar resultados:', error);
        showToast('Erro ao carregar resultados', 'error');
        throw error;
      }
    },
    enabled: !!session,
    staleTime: 1000 * 60 * 5, // 5 minutos
    cacheTime: 1000 * 60 * 30, // 30 minutos
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  // Efeito para recarregar dados quando a sessão mudar
  React.useEffect(() => {
    if (session) {
      console.log('[DEBUG] Sessão detectada, recarregando dados...');
      refetch();
    }
  }, [session, refetch]);

  // Filtrar candidatos
  const candidatosFiltrados = React.useMemo(() => {
    if (!resultados?.candidatos) {
      console.log('[DEBUG] Sem candidatos para filtrar');
      return [];
    }

    console.log('[DEBUG] Filtrando candidatos:', {
      total: resultados.candidatos.length,
      tab: selectedTab,
      searchTerm
    });

    return resultados.candidatos
      .filter(candidato => {
        if (selectedTab === 'ELEITOS') return candidato.situacao === 'ELEITO';
        if (selectedTab === 'NÃO ELEITOS') return candidato.situacao === 'NÃO ELEITO';
        return true;
      })
      .filter(candidato => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
          candidato.nm_votavel.toLowerCase().includes(searchLower) ||
          candidato.nr_votavel.includes(searchTerm)
        );
      });
  }, [resultados?.candidatos, selectedTab, searchTerm]);

  // Componente de estatísticas
  const StatsCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: any }) => (
    <Card className="bg-white">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Resultados das Eleições</h1>
        <div className="w-full md:w-auto flex items-center gap-2">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar candidato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full md:w-[250px]"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
          >
            {viewMode === 'cards' ? <FileText className="h-4 w-4" /> : <Users className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="bg-destructive/10 p-6">
          <p className="text-destructive">Erro ao carregar resultados. Tente novamente mais tarde.</p>
        </Card>
      ) : resultados ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatsCard
              title="Total de Votos"
              value={resultados.total_votos.toLocaleString()}
              icon={FileText}
            />
            <StatsCard
              title="Eleitores Aptos"
              value={resultados.total_aptos.toLocaleString()}
              icon={Users}
            />
            <StatsCard
              title="Comparecimento"
              value={resultados.total_comparecimento.toLocaleString()}
              icon={User}
            />
            <StatsCard
              title="Abstenções"
              value={resultados.total_abstencoes.toLocaleString()}
              icon={Calendar}
            />
          </div>

          <Tabs defaultValue="TODOS" className="w-full" onValueChange={(v) => setSelectedTab(v as any)}>
            <TabsList className="w-full md:w-auto">
              <TabsTrigger value="TODOS">Todos</TabsTrigger>
              <TabsTrigger value="ELEITOS">Eleitos</TabsTrigger>
              <TabsTrigger value="NÃO ELEITOS">Não Eleitos</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-6">
              {viewMode === 'cards' ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {candidatosFiltrados.map((candidato) => (
                    <Card key={candidato.nr_votavel} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {candidato.nm_votavel}
                          <span className="ml-2 text-sm text-muted-foreground">#{candidato.nr_votavel}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Votos:</span>
                            <span className="font-medium">{candidato.qt_votos.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Percentual:</span>
                            <span className="font-medium">{candidato.percentual.toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Situação:</span>
                            <span className={cn(
                              "font-medium",
                              candidato.situacao === 'ELEITO' ? 'text-green-600' : 'text-red-600'
                            )}>
                              {candidato.situacao}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead className="text-right">Votos</TableHead>
                        <TableHead className="text-right">Percentual</TableHead>
                        <TableHead className="text-right">Situação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidatosFiltrados.map((candidato) => (
                        <TableRow key={candidato.nr_votavel}>
                          <TableCell className="font-medium">{candidato.nr_votavel}</TableCell>
                          <TableCell>{candidato.nm_votavel}</TableCell>
                          <TableCell className="text-right">{candidato.qt_votos.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{candidato.percentual.toFixed(2)}%</TableCell>
                          <TableCell className={cn(
                            "text-right font-medium",
                            candidato.situacao === 'ELEITO' ? 'text-green-600' : 'text-red-600'
                          )}>
                            {candidato.situacao}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}
