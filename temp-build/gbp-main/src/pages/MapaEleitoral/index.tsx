import { useEffect, useState, Suspense, lazy } from 'react';
import { Map, ArrowLeft } from 'lucide-react';
import { supabaseClient } from '../../lib/supabase';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useAuth } from '../../providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { hasRestrictedAccess } from '../../constants/accessLevels';

// Importando o mapa com lazy loading
const MapComponent = lazy(() => import('../../components/ElectoralMap/index'));

interface Voter {
  id: string;
  uid: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  bairro: string;
  cidade: string;
  estado: string;
  telefone: string;
  influencia: string;
  categoria: string;
  genero: string;
}

export function ElectoralMap() {
  const { user } = useAuth();
  const canAccess = hasRestrictedAccess(user?.nivel_acesso);
  const company = useCompanyStore(state => state.company);
  const navigate = useNavigate();

  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalEleitores, setTotalEleitores] = useState(0);
  const [totalComLocalizacao, setTotalComLocalizacao] = useState(0);
  const [bairrosUnicos, setBairrosUnicos] = useState(0);

  // Função memoizada para carregar os eleitores
  const loadVoters = async () => {
    if (!company?.uid) {
      setError('Empresa não selecionada');
      setLoading(false);
      return;
    }

    try {
      // Busca os eleitores diretamente do Supabase
      const { data: eleitores, error: supabaseError } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (supabaseError) {
        console.error('Erro ao buscar eleitores:', supabaseError);
        throw supabaseError;
      }

      if (!eleitores) {
        setVoters([]);
        setTotalEleitores(0);
        setTotalComLocalizacao(0);
        setBairrosUnicos(0);
        return;
      }

      // Mapeia os dados do eleitor para o formato esperado
      const votersWithLocation = eleitores
        .filter((voter: any) => {
          const lat = parseFloat(voter.latitude);
          const lng = parseFloat(voter.longitude);
          return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        })
        .map((voter: any) => {
          const addressParts = [
            voter.logradouro,
            voter.numero && `nº ${voter.numero}`,
            voter.bairro,
            voter.cidade,
            voter.estado
          ].filter(Boolean);

          const lat = parseFloat(voter.latitude);
          const lng = parseFloat(voter.longitude);

          let genero = voter.genero || voter.sexo || voter.gender || '';

          return {
            id: voter.id.toString(),
            uid: voter.uid,
            name: voter.nome || '',
            address: addressParts.join(', '),
            lat,
            lng,
            bairro: voter.bairro || '',
            cidade: voter.cidade || '',
            estado: voter.estado || '',
            telefone: voter.telefone || voter.whatsapp || '',
            influencia: voter.influencia || '',
            categoria: voter.categoria || '',
            genero
          };
        });

      // Calcula as estatísticas uma única vez
      const bairros = new Set(votersWithLocation.map(v => v.bairro).filter(Boolean));
      
      setVoters(votersWithLocation);
      setTotalEleitores(eleitores.length);
      setTotalComLocalizacao(votersWithLocation.length);
      setBairrosUnicos(bairros.size);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar eleitores');
      setVoters([]);
      setTotalEleitores(0);
      setTotalComLocalizacao(0);
      setBairrosUnicos(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) {
      navigate('/app');
      return;
    }
    
    loadVoters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess, company?.uid]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Section */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-start sm:items-center gap-3 h-auto sm:h-20 py-5">
            <button 
              onClick={() => navigate('/app')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors mt-1 sm:mt-0"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>

            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-1">
                Mapa de Eleitores
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
                Veja a distribuição dos seus eleitores no mapa.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-2 sm:px-4 pt-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-4">
          {/* Estatísticas Rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg text-center">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Eleitores</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalEleitores}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg text-center">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Com Localização</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{totalComLocalizacao}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg text-center">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Bairros</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{bairrosUnicos}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <Map className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-gray-500 dark:text-gray-400">
                  Carregando mapa...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <Map className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-500">
                  {error}
                </p>
              </div>
            </div>
          ) : voters.length === 0 ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Nenhum eleitor com localização cadastrada
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Cadastre eleitores com endereços completos para visualizá-los no mapa
                </p>
              </div>
            </div>
          ) : (
            <div className="h-[calc(100vh-6rem)] relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Map className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Carregando mapa...
                    </p>
                  </div>
                </div>
              }>
                <div className="absolute inset-0">
                  <MapComponent 
                    voters={voters} 
                  />
                </div>
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}