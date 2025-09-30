import { useEffect, useState } from 'react';
import { supabaseClient } from '../../lib/supabase';
import { Card } from '../../components/Card';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useCategories } from '../../hooks/useCategories';
import { Input } from '../../components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Label } from '../../components/ui/label';
import { ChevronDown, ChevronRight, FileText, Filter, Calendar, MapPin, AlertTriangle, Download, FileSpreadsheet, Send } from 'lucide-react';
import { utils as XLSXUtils, write as XLSXWrite } from 'xlsx';

interface RelatorioDisparo {
  uid: string;
  created_at: string;
  cidade: string;
  bairro: string;
  uf: string;
  logradouro: string;
  categoria: string;
  empresa_uid: string;
  genero: string;
  perdida: string;
  whatsapp: string;
  enviada: string;
  eleitor_nome: string;
}

interface Filters {
  dia: string;
  mes: string;
  ano: string;
  status: string | null;
  cidade: string;
}

interface RelatorioGroup {
  data: string;
  relatorios: RelatorioDisparo[];
  total: number;
  perdidas: number;
  bemSucedidas: number;
  expanded: boolean;
}

export function RelatorioDisparo() {
  const [relatoriosAgrupados, setRelatoriosAgrupados] = useState<RelatorioGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<{[key: string]: boolean}>({});
  const [allData, setAllData] = useState<RelatorioDisparo[]>([]);
  const itemsPerPage = 50;
  const company = useCompanyStore((state) => state.company);
  const { data: categorias } = useCategories();
  const [filters, setFilters] = useState<Filters>({
    dia: '',
    mes: '',
    ano: '',
    status: null,
    cidade: '',
  });

  const fetchRelatorios = async () => {
    if (!company) return;

    try {
      setLoading(true);
      let query = supabaseClient
        .from('gbp_relatorio_disparo')
        .select('*', { count: 'exact' })
        .eq('empresa_uid', company.uid);

      // Construir a data se houver pelo menos ano
      if (filters.ano) {
        const mes = filters.mes || '01';
        const dia = filters.dia || '01';
        const data = `${filters.ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        query = query.eq('created_at::date', data);
      }

      if (filters.status !== null && filters.status !== 'all') {
        query = query.eq('perdida', filters.status);
      }
      if (filters.cidade) {
        query = query.ilike('cidade', `%${filters.cidade}%`);
      }

      // Paginação
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Agrupar por data
      const grupos = data?.reduce<Record<string, RelatorioGroup>>((acc, relatorio) => {
        const data = format(new Date(relatorio.created_at), 'dd/MM/yyyy');
        
        if (!acc[data]) {
          acc[data] = {
            data,
            relatorios: [],
            total: 0,
            perdidas: 0,
            bemSucedidas: 0,
            expanded: expandedGroups[data] || false
          };
        }
        
        acc[data].relatorios.push(relatorio);
        acc[data].total++;
        if (relatorio.perdida === 'SIM') {
          acc[data].perdidas++;
        } else {
          acc[data].bemSucedidas++;
        }
        
        return acc;
      }, {});

      // Converter para array e ordenar por data
      const gruposArray = Object.values(grupos || {}).sort((a, b) => {
        return new Date(b.data.split('/').reverse().join('-')).getTime() - 
               new Date(a.data.split('/').reverse().join('-')).getTime();
      });

      setRelatoriosAgrupados(gruposArray);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    if (!company) return;
    
    try {
      let query = supabaseClient
        .from('gbp_relatorio_disparo')
        .select('*')
        .eq('empresa_uid', company.uid);

      if (filters.ano) {
        const mes = filters.mes || '01';
        const dia = filters.dia || '01';
        const data = `${filters.ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        query = query.eq('created_at::date', data);
      }

      if (filters.status !== null && filters.status !== 'all') {
        query = query.eq('perdida', filters.status);
      }
      if (filters.cidade) {
        query = query.ilike('cidade', `%${filters.cidade}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setAllData(data || []);
    } catch (error) {
      console.error('Erro ao buscar dados para exportação:', error);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Data',
      'Nome do Eleitor',
      'Categoria',
      'Cidade',
      'Status'
    ];

    const csvData = allData.map(item => [
      format(new Date(item.created_at), 'dd/MM/yyyy'),
      item.eleitor_nome,
      categorias?.find(cat => cat.uid === item.categoria)?.nome || 'N/A',
      item.cidade,
      item.perdida === 'SIM' ? 'Perdida' : 'Não Perdida'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_disparos_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = (grupo: RelatorioGroup) => {
    const headers = [
      'Data',
      'Nome do Eleitor',
      'Categoria',
      'Cidade',
      'Status'
    ];

    const data = grupo.relatorios.map(item => [
      format(new Date(item.created_at), 'dd/MM/yyyy'),
      item.eleitor_nome,
      categorias?.find(cat => cat.uid === item.categoria)?.nome || 'N/A',
      item.cidade,
      item.perdida === 'SIM' ? 'Perdida' : 'Não Perdida'
    ]);

    const ws = XLSXUtils.aoa_to_sheet([headers, ...data]);
    const wb = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(wb, ws, 'Relatório');

    // Gerar o arquivo Excel
    const excelBuffer = XLSXWrite(wb, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Download do arquivo
    const fileName = `relatorio_disparos_${grupo.data.split('/').join('-')}.xlsx`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleExpand = (data: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [data]: !prev[data]
    }));
  };

  useEffect(() => {
    fetchRelatorios();
    fetchAllData();
  }, [company, page, filters]);

  const handleFilterChange = (name: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
    setExpandedGroups({}); // Resetar estados de expansão ao filtrar
  };

  const getCategoriaName = (categoriaId: string) => {
    return categorias?.find(cat => cat.uid === categoriaId)?.nome || 'N/A';
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (loading && !relatoriosAgrupados.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Relatórios de Disparo</h1>
                <p className="mt-1 text-sm text-gray-500">Gerencie e acompanhe os disparos realizados</p>
              </div>
            </div>
            <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Total de disparos:</span>
                <span className="text-lg font-semibold text-blue-600">{totalCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Seção de Filtros */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Filter className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-medium text-gray-900">Filtros</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Filtro de Data */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>Data</span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="text"
                    placeholder="Dia"
                    value={filters.dia}
                    onChange={(e) => {
                      const value = e.target.value;
                      if ((!value || /^\d{0,2}$/.test(value)) && (!value || parseInt(value) <= 31)) {
                        handleFilterChange('dia', value);
                      }
                    }}
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                  <Input
                    type="text"
                    placeholder="Mês"
                    value={filters.mes}
                    onChange={(e) => {
                      const value = e.target.value;
                      if ((!value || /^\d{0,2}$/.test(value)) && (!value || parseInt(value) <= 12)) {
                        handleFilterChange('mes', value);
                      }
                    }}
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                  <Input
                    type="text"
                    placeholder="Ano"
                    value={filters.ano}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value || /^\d{0,4}$/.test(value)) {
                        handleFilterChange('ano', value);
                      }
                    }}
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <AlertTriangle className="h-4 w-4 text-gray-400" />
                  <span>Status</span>
                </Label>
                <Select 
                  onValueChange={(value) => handleFilterChange('status', value)} 
                  value={filters.status || undefined}
                >
                  <SelectTrigger className="w-full focus:ring-2 focus:ring-blue-500">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="SIM">Perdida</SelectItem>
                    <SelectItem value="NÃO">Não Perdida</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cidade */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>Cidade</span>
                </Label>
                <Input
                  type="text"
                  value={filters.cidade}
                  onChange={(e) => handleFilterChange('cidade', e.target.value)}
                  placeholder="Digite o nome da cidade..."
                  className="w-full focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Paginação Superior */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <span>Mostrando página</span>
            <span className="font-medium">{page}</span>
            <span>de</span>
            <span className="font-medium">{totalPages}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="hover:bg-gray-50"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="hover:bg-gray-50"
            >
              Próxima
            </Button>
          </div>
        </div>

        {/* Lista de Relatórios */}
        <div className="space-y-4">
          {relatoriosAgrupados.map((grupo, index) => (
            <div key={grupo.data} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div 
                className="p-4 cursor-pointer transition-colors hover:bg-gray-50"
                onClick={() => toggleExpand(grupo.data)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <ChevronRight
                      className={`h-5 w-5 text-gray-400 transition-transform ${
                        expandedGroups[grupo.data] ? 'transform rotate-90' : ''
                      }`}
                    />
                    <h3 className="text-sm font-medium text-gray-900">
                      {format(new Date(grupo.data.split('/').reverse().join('-')), 'dd \'de\' MMMM, yyyy', { locale: ptBR })}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Total:</span>
                      <span className="text-sm font-medium">{grupo.total}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Send className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          {grupo.bemSucedidas}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium text-red-600">
                          {grupo.perdidas}
                        </span>
                      </div>
                    </div>
                    <FileSpreadsheet 
                      className="h-4 w-4 text-green-600 cursor-pointer hover:text-green-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportToExcel(grupo);
                      }}
                    />
                  </div>
                </div>

                {expandedGroups[grupo.data] && (
                  <div className="border-t border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Eleitor</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WhatsApp</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Envio</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {grupo.relatorios.map((relatorio) => (
                          <tr key={relatorio.uid} className={`hover:bg-gray-50 ${relatorio.perdida === 'SIM' ? 'bg-red-50' : 'bg-green-50'}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{relatorio.eleitor_nome}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{relatorio.whatsapp}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {relatorio.perdida === 'SIM' ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-red-700 bg-red-100">
                                  <AlertTriangle className="w-4 h-4 mr-1" />
                                  Perdida
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-green-700 bg-green-100">
                                  <Send className="w-4 h-4 mr-1" />
                                  Não Perdida
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Paginação Inferior */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <span>Mostrando página</span>
            <span className="font-medium">{page}</span>
            <span>de</span>
            <span className="font-medium">{totalPages}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="hover:bg-gray-50"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="hover:bg-gray-50"
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
