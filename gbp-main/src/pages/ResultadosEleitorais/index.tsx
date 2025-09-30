import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Download
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { supabaseClient } from '../../lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';

// Tipos de dados mantidos para a estrutura da tabela e análise
interface ResultadoEleicao {
  UID: string;
  NM_VOTAVEL: string;
  NR_VOTAVEL: string;
  NM_MUNICIPIO: string;
  SG_UF: string;
  QT_VOTOS: number;
  DS_CARGO_PERGUNTA: string;
  SG_PARTIDO: string;
}

interface FiltrosState {
  anoUid: string | null;
  ufUid: string | null;
  cargoUid: string | null;
  tableName: string | null;
  municipio: string | null;
}

interface DemografiaEleitores { 
  distribuicaoGenero: Array<{ name: string; value: number }>;
  distribuicaoIdade: Array<{ name: string; value: number }>;
  principaisBairros: Array<{ name: string; value: number }>;
}

interface AnaliseCandidate {
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
}

// Data types from Supabase RPC calls
interface Ano { uid: string; ano: number; }
interface Uf { uid: string; uf: string; }
interface Cargo { uid: string; nome_cargo: string; nome_tabela: string; }
interface Municipio { municipio: string; }

const ITEMS_PER_PAGE = 20;

export default function ResultadosEleitoraisPage() {
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filtros, setFiltros] = useState<FiltrosState>({ anoUid: null, ufUid: null, cargoUid: null, tableName: null, municipio: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [ordenacao, setOrdenacao] = useState<{ campo: keyof ResultadoEleicao; ordem: 'asc' | 'desc' }>({ campo: 'NM_VOTAVEL', ordem: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);

  // 1. Busca os anos de eleição disponíveis
  const { data: anos, isLoading: isLoadingAnos } = useQuery<Ano[], Error>({
    queryKey: ['anosEleicao'],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc('get_anos_eleicao');
      if (error) {
        showToast({ title: 'Erro ao buscar anos de eleição', description: error.message, type: 'error' });
        return [];
      }
      return data || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
  });

  // 2. Busca as UFs com base no ano selecionado
  const { data: ufs, isLoading: isLoadingUfs } = useQuery<Uf[], Error>({
    queryKey: ['ufsPorAno', filtros.anoUid],
    queryFn: async () => {
      if (!filtros.anoUid) return [];
      const { data, error } = await supabaseClient.rpc('get_ufs_por_ano', { p_ano_uid: filtros.anoUid });
      if (error) {
        showToast({ title: 'Erro ao buscar UFs', description: error.message, type: 'error' });
        return [];
      }
      return data || [];
    },
    enabled: !!filtros.anoUid,
  });

  // 3. Busca os cargos com base na UF selecionada
  const { data: cargos, isLoading: isLoadingCargos } = useQuery<Cargo[], Error>({
    queryKey: ['cargosPorUf', filtros.ufUid],
    queryFn: async () => {
      if (!filtros.ufUid) {
        console.log('Nenhuma UF selecionada para buscar cargos');
        return [];
      }
      
      console.log('Buscando cargos para a UF:', filtros.ufUid);
      
      try {
        const { data, error } = await supabaseClient
          .rpc('get_cargos_por_uf', { 
            p_uf_uid: filtros.ufUid 
          });
          
        if (error) {
          console.error('Erro ao buscar cargos:', error);
          showToast({ 
            title: 'Erro ao buscar cargos', 
            description: error.message || 'Erro desconhecido ao buscar cargos', 
            type: 'error' 
          });
          return [];
        }
        
        console.log('Cargos encontrados:', data);
        return data || [];
      } catch (err) {
        console.error('Exceção ao buscar cargos:', err);
        showToast({ 
          title: 'Erro', 
          description: 'Ocorreu um erro inesperado ao buscar os cargos', 
          type: 'error' 
        });
        return [];
      }
    },
    enabled: !!filtros.ufUid,
    onError: (error) => {
      console.error('Erro na query de cargos:', error);
    }
  });

  // 4. Busca os municípios com base na tabela selecionada
  const { data: municipios, isLoading: isLoadingMunicipios } = useQuery<Municipio[], Error>({
    queryKey: ['municipiosPorTabela', filtros.tableName],
    queryFn: async () => {
      if (!filtros.tableName) return [];
      const { data, error } = await supabaseClient.rpc('get_municipios_por_tabela', { p_table_name: filtros.tableName });
      if (error) {
        showToast({ title: 'Erro ao buscar municípios', description: error.message, type: 'error' });
        return [];
      }
      return data || [];
    },
    enabled: !!filtros.tableName,
  });

  // 5. Busca resultados da eleição baseado na tabela selecionada
  const { data: resultados, isLoading: isLoadingResultados } = useQuery<ResultadoEleicao[], Error>({
    queryKey: ['resultadosEleitorais', filtros.tableName, filtros.municipio, searchTerm, filtros.cargoUid],
    queryFn: async () => {
      if (!filtros.tableName) return [];
      
      let query = supabaseClient.from(filtros.tableName).select('*');
      
      // Filtra por município apenas se um for selecionado e não for 'todos'
      if (filtros.municipio && filtros.municipio !== 'todos') {
        query = query.eq('NM_MUNICIPIO', filtros.municipio);
      }

      // Filtra por cargo se um cargo estiver selecionado
      const cargoSelecionado = cargos?.find(c => c.uid === filtros.cargoUid);
      if (cargoSelecionado) {
        query = query.eq('DS_CARGO_PERGUNTA', cargoSelecionado.nome_cargo);
      }

      // Busca por termo se houver
      if (searchTerm) {
        query = query.or(`NM_VOTAVEL.ilike.%${searchTerm}%,NR_VOTAVEL.eq.${searchTerm}`);
      }

      // Adiciona ordenação por nome do candidato (A-Z)
      const { data, error } = await query.order('NM_VOTAVEL', { ascending: true });

      if (error) {
        showToast({ title: 'Erro ao buscar resultados', description: error.message, type: 'error' });
        throw new Error('Erro ao buscar resultados');
      }
      return data || [];
    },
    enabled: !!filtros.tableName, // Habilita a busca assim que a tabela for definida
  });

  const anosDisponiveis = useMemo(() => {
    if (!anos) return [];
    return anos.map((ano: Ano) => ({ value: ano.uid, label: String(ano.ano) }));
  }, [anos]);

  const ufsDisponiveis = useMemo(() => {
    if (!ufs) return [];
    return ufs.map((uf: Uf) => ({ value: uf.uid, label: uf.uf }));
  }, [ufs]);

  const cargosDisponiveis = useMemo(() => {
    if (!cargos) return [];
    return cargos.map((cargo: Cargo) => ({ value: cargo.uid, label: cargo.nome_cargo }));
  }, [cargos]);

  const municipiosDisponiveis = useMemo(() => {
    if (!municipios) return [];
    const listaMunicipios = municipios.map((m: Municipio) => ({ value: m.municipio, label: m.municipio }));
    // Adiciona a opção 'Todos' no início da lista com um valor especial
    return [{ value: 'todos', label: 'Todos os Municípios' }, ...listaMunicipios];
  }, [municipios]);

  const handleFiltroChange = (filtro: keyof FiltrosState, valor: string) => {
    setFiltros(prev => {
      const newState = { ...prev, [filtro]: valor };

      if (filtro === 'anoUid') {
        newState.ufUid = null;
        newState.cargoUid = null;
        newState.tableName = null;
        newState.municipio = null;
      } else if (filtro === 'ufUid') {
        newState.cargoUid = null;
        newState.tableName = null;
        newState.municipio = null;
      } else if (filtro === 'cargoUid') {
        const cargoSelecionado = cargos?.find(c => c.uid === valor);
        newState.tableName = cargoSelecionado?.nome_tabela || null;
        newState.municipio = null;
        // Remove o cache dos resultados para forçar o refetch
        queryClient.removeQueries({ queryKey: ['resultadosEleitorais'] });
      }
      return newState;
    });
    setCurrentPage(1);

  };

  const limparFiltros = () => {
    setFiltros({ anoUid: null, ufUid: null, cargoUid: null, tableName: null, municipio: null });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleOrdenacao = (campo: keyof ResultadoEleicao) => {
    setOrdenacao(prev => ({ campo, ordem: prev.campo === campo && prev.ordem === 'desc' ? 'asc' : 'desc' }));
  };

  const aggregatedResults = useMemo(() => {
    if (!resultados) return [];

    const candidateMap = new Map<string, ResultadoEleicao>();

    resultados.forEach(r => {
      const existing = candidateMap.get(r.NR_VOTAVEL);
      if (existing) {
        existing.QT_VOTOS += r.QT_VOTOS;
      } else {
        candidateMap.set(r.NR_VOTAVEL, { ...r });
      }
    });

    return Array.from(candidateMap.values());
  }, [resultados]);

  const sortedResults = useMemo(() => {
    if (!aggregatedResults) return [];
    
    // Primeiro ordena por nome do candidato (A-Z)
    const sortedByName = [...aggregatedResults].sort((a, b) => {
      return a.NM_VOTAVEL.localeCompare(b.NM_VOTAVEL);
    });

    // Depois aplica a ordenação adicional se for diferente do nome
    if (ordenacao.campo !== 'NM_VOTAVEL') {
      return sortedByName.sort((a, b) => {
        const aValue = a[ordenacao.campo];
        const bValue = b[ordenacao.campo];
        if (aValue < bValue) return ordenacao.ordem === 'asc' ? -1 : 1;
        if (aValue > bValue) return ordenacao.ordem === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return sortedByName;
  }, [aggregatedResults, ordenacao]);

  const paginatedResults = useMemo(() => {
    return sortedResults.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [sortedResults, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(sortedResults.length / ITEMS_PER_PAGE);
  }, [sortedResults]);



  if (!isAdmin) return null;

  return (
    <div className="p-2 sm:p-3 lg:p-4 bg-gray-50 min-h-screen">
      <Card className="p-4 mb-6 shadow-sm bg-white">
        <header className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Resultados Eleitorais</h1>
            <p className="text-sm text-gray-500">Consulte e analise os dados das eleições.</p>
          </div>
        </header>
      </Card>

      <Card className="p-3 sm:p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-3 sm:gap-4">
          {/* Filtros Dropdown */}
          <div className="col-span-1 sm:flex-1 sm:min-w-[80px] sm:max-w-[120px]">
            <label className='text-xs sm:text-sm font-medium block mb-1'>Ano</label>
            <Select onValueChange={(v: string) => handleFiltroChange('anoUid', v)} value={filtros.anoUid || ''}>
              <SelectTrigger className="h-9 sm:h-10 w-full text-xs sm:text-sm">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent className="min-w-[100px] max-h-[300px] overflow-y-auto">
                {isLoadingAnos ? (
                  <SelectItem value="loading" disabled>Carregando...</SelectItem>
                ) : (
                  anosDisponiveis.map((ano) => (
                    <SelectItem key={ano.value} value={ano.value} className="text-xs sm:text-sm">
                      {ano.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="col-span-1 sm:flex-1 sm:min-w-[60px] sm:max-w-[80px]">
            <label className='text-xs sm:text-sm font-medium block mb-1'>UF</label>
            <Select onValueChange={(v: string) => handleFiltroChange('ufUid', v)} value={filtros.ufUid || ''} disabled={!filtros.anoUid || isLoadingUfs}>
              <SelectTrigger className="h-9 sm:h-10 w-full text-xs sm:text-sm">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent className="min-w-[80px] max-h-[300px] overflow-y-auto">
                {isLoadingUfs ? (
                  <SelectItem value="loading" disabled>Carregando...</SelectItem>
                ) : (
                  ufsDisponiveis.map((uf) => (
                    <SelectItem key={uf.value} value={uf.value} className="text-xs sm:text-sm">
                      {uf.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="col-span-2 sm:flex-1 sm:min-w-[120px] sm:max-w-[200px] mt-2 sm:mt-0">
            <label className='text-xs sm:text-sm font-medium block mb-1'>Cargo</label>
            <Select onValueChange={(v: string) => handleFiltroChange('cargoUid', v)} value={filtros.cargoUid || ''} disabled={!filtros.ufUid || isLoadingCargos}>
              <SelectTrigger className="h-9 sm:h-10 w-full text-xs sm:text-sm">
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent className="min-w-[180px]">
                {isLoadingCargos ? (
                  <SelectItem value="loading" disabled>Carregando...</SelectItem>
                ) : (
                  cargosDisponiveis.map((cargo) => (
                    <SelectItem key={cargo.value} value={cargo.value} className="text-xs sm:text-sm">
                      {cargo.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="col-span-2 sm:flex-1 sm:min-w-[160px] sm:max-w-[300px] mt-2 sm:mt-0">
            <label className='text-xs sm:text-sm font-medium block mb-1'>Município</label>
            <Select onValueChange={(v: string) => handleFiltroChange('municipio', v)} value={filtros.municipio || ''} disabled={!filtros.tableName || isLoadingMunicipios}>
              <SelectTrigger className="h-9 sm:h-10 w-full text-xs sm:text-sm">
                <SelectValue placeholder="Município" />
              </SelectTrigger>
              <SelectContent className="min-w-[200px] sm:min-w-[300px] max-h-[300px] overflow-y-auto">
                {isLoadingMunicipios ? (
                  <SelectItem value="loading" disabled>Carregando...</SelectItem>
                ) : (
                  municipiosDisponiveis.map((municipio) => (
                    <SelectItem key={municipio.value} value={municipio.value} className="text-xs sm:text-sm">
                      {municipio.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="col-span-2 sm:flex-1 sm:min-w-[200px] sm:max-w-[500px] mt-2 sm:mt-0">
            <label className='text-xs sm:text-sm font-medium block mb-1'>Buscar</label>
            <div className="flex gap-2">
              <Input 
                placeholder="Candidato ou Número"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 sm:h-10 w-full text-xs sm:text-sm flex-1"
              />
              <Button 
                onClick={limparFiltros} 
                variant="outline" 
                size="icon"
                className="h-9 sm:h-10 w-10 flex-shrink-0" 
                title="Limpar Filtros"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleOrdenacao('NM_VOTAVEL')}>Candidato <ArrowUpDown className="inline-block ml-1 h-4 w-4" /></th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleOrdenacao('NR_VOTAVEL')}>Número <ArrowUpDown className="inline-block ml-1 h-4 w-4" /></th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partido</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Município/UF</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoadingResultados ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-500">Carregando resultados...</td></tr>
              ) : !filtros.tableName ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-500">Selecione Ano, UF e Cargo para ver os resultados.</td></tr>
              ) : paginatedResults.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-500">Nenhum resultado encontrado para os filtros selecionados.</td></tr>
              ) : (
                paginatedResults.map((r: ResultadoEleicao) => (
                  <tr 
                    key={r.NR_VOTAVEL} 
                    className="hover:bg-blue-50/50 transition-colors duration-150" 
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a 
                        href={`/app/resultados-eleitorais/detalhe/${filtros.tableName}/${r.NR_VOTAVEL}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-gray-800 hover:underline"
                      >
                        {r.NM_VOTAVEL}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.NR_VOTAVEL}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.SG_PARTIDO}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.DS_CARGO_PERGUNTA}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.NM_MUNICIPIO} - {r.SG_UF}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 flex items-center justify-between border-t">
            <span className="text-sm text-gray-600">Página {currentPage} de {totalPages}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronsRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
