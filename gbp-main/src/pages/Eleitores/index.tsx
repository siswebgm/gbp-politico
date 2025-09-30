import { useNavigate, Link } from 'react-router-dom';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { ExportarModal } from './components/ExportarModal';
import { FiltersModal } from './components/FiltersModal';
import { EleitoresTable } from './components/EleitoresTable';
import { useEleitores } from '../../hooks/useEleitores';
import { useCategories } from '../../hooks/useCategories';
import type { EleitorFilters } from '../../types/eleitor';
import type { Eleitor } from '../../types/eleitor';
import { eleitorService } from '../../services/eleitorService';
import { useAuth } from '../../providers/AuthProvider';
import { CargoEnum } from '../../services/auth';
import { useToast } from '../../hooks/useToast';
import { 
  Filter, 
  Search, 
  X, 
  Plus,
  UserPlus,
  AlertCircle,
  ArrowLeft,
  FileSpreadsheet,
} from 'lucide-react';
import { InicialDropdown } from './components/InicialDropdown';

interface ActiveFiltersProps {
  filters: EleitorFilters;
  onFilterChange: (newFilters: Partial<EleitorFilters>) => void;
}

const ActiveFilters: React.FC<ActiveFiltersProps> = ({ filters, onFilterChange }) => {
  const labels: { [key: string]: string } = {
    genero: 'Gênero',
    zona: 'Zona',
    secao: 'Seção',
    bairro: 'Bairro',
    categoria_uid: 'Categoria',
    logradouro: 'Logradouro',
    indicado: 'Indicado por',
    cep: 'CEP',
    responsavel: 'Responsável',
    cidade: 'Cidade',
    whatsapp: 'WhatsApp',
    cpf: 'CPF'
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {Object.entries(filters).map(([key, value]) => {
        if (!value) return null;

        const label = labels[key] || key;
        const displayValue = typeof value === 'number' ? value.toString() : value;

        return (
          <div
            key={key}
            className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
          >
            <span className="text-gray-700 dark:text-gray-300">
              {label}: {displayValue}
            </span>
            <button
              onClick={() => {
                onFilterChange({
                  ...filters,
                  [key]: undefined
                });
              }}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}

      {Object.values(filters).some(value => value) && (
        <button
          onClick={() => {
            onFilterChange({
              nome: '',
              genero: '',
              zona: undefined,
              secao: undefined,
              bairro: '',
              categoria_uid: undefined,
              logradouro: '',
              indicado: '',
              cep: '',
              responsavel: '',
              cidade: '',
              whatsapp: '',
              cpf: '',
              mes_nascimento: ''
            });
          }}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors hover:underline"
        >
          Limpar todos
        </button>
      )}
    </div>
  );
};





export function Eleitores() {
  const navigate = useNavigate();
  const company = useCompanyStore((state: { company: any }) => state.company);
  const { user } = useAuth();
  const isAdmin = user?.cargo === CargoEnum.ADMIN;
  const canExport = isAdmin || user?.nivel_acesso === 'admin';
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { showToast } = useToast();
  const [filters, setFilters] = useState<EleitorFilters>({
    periodo: '',
    nome: '',
    inicial: '',
    genero: '',
    zona: undefined,
    secao: undefined,
    bairro: '',
    categoria_uid: undefined,
    logradouro: '',
    indicado: '',
    cep: '',
    responsavel: '',
    cidade: '',
    whatsapp: '',
    cpf: '',
    mes_nascimento: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const [isExportarModalOpen, setIsExportarModalOpen] = useState(false);
  const [selectedEleitores, setSelectedEleitores] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<EleitorFilters['periodo']>('');

  const [searchTerm, setSearchTerm] = useState('');
  const { data: categorias } = useCategories();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { 
    eleitores, 
    isLoading: isLoadingEleitores, 
    error: eleitoresError,
    total: totalEleitores 
  } = useEleitores({ 
    filters,
    page: currentPage,
    pageSize 
  });

  const filteredEleitores = useMemo(() => {
    return eleitores || [];
  }, [eleitores]);

  // Handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleFilterChange = useCallback((newFilters: Partial<EleitorFilters>) => {
    setFilters(prev => {
      // Remove o tipo_categoria_uid dos filtros para não ser renderizado
      const { categoria_tipo_uid, ...rest } = { ...prev, ...newFilters };
      return rest;
    });
    setCurrentPage(1); // Volta para a primeira página ao filtrar
  }, []);

  const handleSelectAllPages = useCallback(async () => {
    if (!company?.uid) return;

    try {
      const allIds = await eleitorService.listAllIds(company.uid, filters);
      setSelectedEleitores(allIds);
      setSelectAll(true);
    } catch (error) {
      console.error('Erro ao buscar todos os eleitores:', error);
      showToast({ title: 'Erro ao selecionar todos os eleitores', type: 'error' });
    }
  }, [company?.uid, filters, showToast]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (!eleitores) return;

    if (checked) {
      setSelectedEleitores(eleitores.map(e => e.uid || ''));
      setSelectAll(true);
    } else {
      setSelectedEleitores([]);
      setSelectAll(false);
    }
  }, [eleitores]);

  const handleSelectEleitor = useCallback((uid: string) => {
    if (!uid) return;
    
    setSelectedEleitores(prev => {
      const isSelected = prev.includes(uid);
      if (isSelected) {
          setSelectAll(false);
        return prev.filter(selectedId => selectedId !== uid);
      } else {
        return [...prev, uid];
      }
    });
  }, []);

  const handleViewDetails = useCallback((eleitor: Eleitor) => {
    if (!eleitor?.uid) return;
    navigate(`/app/eleitores/${eleitor.uid}`);
  }, [navigate]);

  // Effects
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (eleitoresError) {
      setConnectionError('Erro ao carregar eleitores. Por favor, tente novamente.');
    } else {
      setConnectionError(null);
    }
  }, [eleitoresError]);

  // Render
  if (connectionError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Erro de conexão
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{connectionError}</p>
          <div className="mt-6">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 focus:border-primary-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Tentar novamente
            </button>
          </div>
        </div>
    </div>
    );
  }

  const renderFilterChips = () => {
    return Object.entries(filters).map(([key, value]) => {
      if (!value || key === 'categoria_tipo_uid') return null;

      let label = '';
      if (key === 'categoria_uid' && categorias) {
        const categoria = categorias.find(cat => cat.uid === value);
        label = `Categoria: ${categoria?.nome || 'Carregando...'}`;
      } else {
        const fieldName = {
          zona: 'Zona',
          secao: 'Seção',
          bairro: 'Bairro',
          cidade: 'Cidade',
          logradouro: 'Logradouro',
          indicado: 'Indicado por',
          responsavel: 'Responsável'
        }[key] || key;
        
        label = `${fieldName}: ${value}`;
      }

      return (
        <div
          key={key}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-full transition-colors hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-300 dark:border-primary-800"
        >
          <span className="flex items-center gap-1.5">
            {key === 'periodo' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            ) : key === 'inicial' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
              </svg>
            ) : null}
            {label}
          </span>
          <button
            onClick={() => handleFilterChange({ [key]: undefined })}
            className="p-0.5 hover:bg-primary-100 rounded-full dark:hover:bg-primary-800/50 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      );
    }).filter(Boolean);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="pb-6">
            <div className="mx-auto sm:px-0 md:px-0">
              {/* Filtros e Ações */}
              <div className="bg-white rounded-lg shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4">
                  {/* Título e Descrição */}
                  <div className="flex items-center gap-4">
                    {/* Botão Voltar */}
                    <Link
                      to="/app"
                      className="inline-flex items-center justify-center w-10 h-10 text-gray-700 hover:text-gray-900"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Link>

                    {/* Título e Subtítulo */}
                    <div>
                      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        Eleitores
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {totalEleitores}
                        </span>
                      </h1>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Gerenciar base de eleitores
                      </p>
                    </div>
                  </div>

                  {/* Grupo de Botões */}
                  <div className="hidden md:flex items-center gap-3">
                    {/* Botão Filtro */}
                    <button
                      onClick={() => setShowFilters(true)}
                      className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filtros
                      {Object.values(filters).some(value => value) && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          Ativos
                        </span>
                      )}
                    </button>

                    {/* Botão Exportar */}
                    <button
                      onClick={() => setIsExportarModalOpen(true)}
                      disabled={user?.nivel_acesso !== 'admin'}
                      className="inline-flex items-center gap-x-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={user?.nivel_acesso !== 'admin' ? "Apenas administradores podem exportar" : ""}
                    >
                      <FileSpreadsheet className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                      Exportar
                      {selectedEleitores.length > 0 && (
                        <span className="ml-1.5 rounded-full bg-primary-700 px-2 py-0.5 text-xs">
                          {selectedEleitores.length}
                        </span>
                      )}
                    </button>

                    {/* Botão Novo Eleitor */}
                    <button
                      onClick={() => navigate('/app/eleitores/novo')}
                      className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-transparent text-sm font-medium text-white bg-primary-600 shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Eleitor
                    </button>

                  </div>
                </div>
              </div>

              {/* Filtros Ativos */}
              {Object.values(filters).some(value => value) && (
                <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  {renderFilterChips()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="w-full h-full">
        <div className="mb-6 px-4">
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="search"
                className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                placeholder="Buscar eleitores..."
                value={searchTerm}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchTerm(value);
                  // Aguarda um pouco antes de fazer a busca para evitar muitas requisições
                  const timeoutId = setTimeout(() => {
                    setFilters(prev => ({ ...prev, nome: value }));
                    setCurrentPage(1); // Volta para a primeira página ao buscar
                  }, 300);
                  return () => clearTimeout(timeoutId);
                }}
              />
            </div>
            <div className="hidden md:block w-16">
              <InicialDropdown
                onSelect={(letra) => {
                  setFilters(prev => ({ ...prev, inicial: letra }));
                  setCurrentPage(1); // Volta para a primeira página ao mudar o filtro
                }}
                letraSelecionada={filters.inicial}
              />
            </div>

            {/* Dropdown de filtro por data */}
            <select
              value={periodFilter}
              onChange={(e) => {
                const newPeriod = e.target.value as EleitorFilters['periodo'];
                setFilters(prev => ({ ...prev, periodo: newPeriod }));
                setPeriodFilter(newPeriod);
                setCurrentPage(1); // Volta para a primeira página ao mudar o filtro
              }}
              className="w-24 px-2 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Período</option>
              <option value="all">Todos</option>
              <option value="today">Hoje</option>
              <option value="7days">7 dias</option>
              <option value="30days">30 dias</option>
              <option value="60days">60 dias</option>
              <option value="90days">90 dias</option>
            </select>

            {/* Botão de IA */}
            <button
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              onClick={() => navigate('/app/reconhecimento-facial')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                <path d="M15 5.5A3.5 3.5 0 0 1 18.5 9" />
                <path d="M8.5 2C6 2 4 4 4 6.5C4 9 6 11 8.5 11" />
                <path d="M13 2c2.5 0 4.5 2 4.5 4.5c0 2.5-2 4.5-4.5 4.5" />
                <path d="M12 16v-4" />
                <path d="M8 9H4" />
                <path d="M20 9h-4" />
                <path d="M8 14H4" />
                <path d="M20 14h-4" />
                <path d="M12 21v-2" />
                <path d="M17 19l-2-2" />
                <path d="M7 19l2-2" />
                <path d="M9 7c0 1.7-1.3 3-3 3" />
                <path d="M15 7c0 1.7 1.3 3 3 3" />
                <path d="M9 12v4" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 h-[calc(100%-6rem)]">
          <EleitoresTable
            eleitores={filteredEleitores}
            isLoading={isLoadingEleitores}
            selectedEleitores={selectedEleitores}
            selectAll={selectAll}
            onSelectAll={handleSelectAll}
            onSelectAllPages={handleSelectAllPages}
            onSelectEleitor={handleSelectEleitor}
            onRowClick={handleViewDetails}
            totalEleitores={totalEleitores}
            setSelectedEleitores={setSelectedEleitores}
            onPageChange={handlePageChange}
            currentPage={currentPage}
            totalPages={Math.ceil(totalEleitores / pageSize)}
            isPaginationDisabled={user?.nivel_acesso !== 'admin'}
          />

          <FiltersModal
            isOpen={showFilters}
            onClose={() => setShowFilters(false)}
            filters={filters}
            onFilterChange={handleFilterChange}
          />

          <ExportarModal
            isOpen={isExportarModalOpen}
            onClose={() => setIsExportarModalOpen(false)}
            selectedIds={selectedEleitores}
            filteredData={eleitores || []}
          />

          {/* Botão flutuante para novo atendimento (apenas mobile) */}
          <div className="fixed bottom-6 right-6 md:hidden">
            <button
              onClick={() => navigate('/app/eleitores/novo')}
              className="w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors duration-200"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>

          {/* Botão flutuante para mobile */}
          <div className="fixed bottom-6 right-6 flex flex-col items-end sm:hidden">
            {isMobileMenuOpen && (
              <div className="flex flex-col gap-3 mb-3 animate-slide-up">

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowFilters(true);
                  }}
                  className="h-10 pl-4 pr-5 bg-indigo-500 text-white rounded-full shadow-lg hover:bg-indigo-600 transition-all duration-200 flex items-center gap-2 group"
                >
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">Filtros</span>
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate('/app/eleitores/novo');
                  }}
                  className="h-10 pl-4 pr-5 bg-sky-500 text-white rounded-full shadow-lg hover:bg-sky-600 transition-all duration-200 flex items-center gap-2 group"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="text-sm font-medium">Novo Eleitor</span>
                </button>
                <button
                  onClick={() => setIsExportarModalOpen(true)}
                  className="h-10 pl-4 pr-5 bg-emerald-500 text-white rounded-full shadow-lg hover:bg-emerald-600 transition-all duration-200 flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={user?.nivel_acesso !== 'admin'}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>
                    Exportar
                  </span>
                </button>
              </div>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="h-14 w-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all duration-200 flex items-center justify-center"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Plus className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}