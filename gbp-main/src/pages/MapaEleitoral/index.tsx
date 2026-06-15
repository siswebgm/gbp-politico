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
  cep: string;
  telefone: string;
  influencia: string;
  categoria: string;
  genero: string;
  confiabilidade_do_voto?: string;
  indicado_uid?: string;
}

interface DemandaMapItem {
  uid: string;
  tipo_de_demanda: string;
  descricao_do_problema: string;
  nivel_de_urgencia: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  lat: number;
  lng: number;
  status: string;
  criado_em: string;
}

export function ElectoralMap() {
  const { user } = useAuth();
  const canAccess = hasRestrictedAccess(user?.nivel_acesso);
  const company = useCompanyStore(state => state.company);
  const navigate = useNavigate();

  const [voters, setVoters] = useState<Voter[]>([]);
  const [demandas, setDemandas] = useState<DemandaMapItem[]>([]);
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
          const genero = voter.genero || voter.sexo || voter.gender || '';

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
            cep: voter.cep || '',
            telefone: voter.telefone || voter.whatsapp || '',
            influencia: voter.influencia || '',
            categoria: voter.categoria || '',
            categoria_uid: voter.categoria_uid || '',
            genero,
            confiabilidade_do_voto: voter.confiabilidade_do_voto || '',
            indicado_uid: voter.indicado_uid || '',
            cpf: voter.cpf || '',
            nascimento: voter.nascimento || '',
            nome_mae: voter.nome_mae || '',
            whatsapp: voter.whatsapp || '',
            instagram: voter.instagram || '',
            numero_do_sus: voter.numero_do_sus || '',
            numero: voter.numero || '',
            complemento: voter.complemento || '',
            uf: voter.uf || '',
            logradouro: voter.logradouro || '',
            status: voter.status || '',
            responsavel: voter.responsavel || '',
            responsavel_pelo_eleitor: voter.responsavel_pelo_eleitor || '',
            titulo: voter.titulo || '',
            regiao_bairro: voter.regiao_bairro || '',
            quantidade_adultos_residencia: voter.quantidade_adultos_residencia || '',
            atendimento: voter.atendimento || '',
            data_atendimento: voter.data_atendimento || '',
            responsavel_atendimento: voter.responsavel_atendimento || '',
            colegio_eleitoral: voter.colegio_eleitoral || ''
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

  // Função para geocodificar endereço via Nominatim com Circuit Breaker de 429 (Rate Limit)
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    // Se Nominatim estiver bloqueado nesta sessão por excesso de requisições, aborta imediatamente
    if ((window as any).gbp_nominatim_blocked) {
      return null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': 'pt-BR',
            'User-Agent': 'GBP-Politico-ElectoralMap-App'
          },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      if (response.status === 429) {
        console.warn('[Nominatim] Recebido status 429. Ativando circuit-breaker para poupar requisições nesta sessão.');
        (window as any).gbp_nominatim_blocked = true;
        return null;
      }

      if (!response.ok) return null;
      const data = await response.json();
      if (data && data[0]) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    } catch (err) {
      console.error('Erro ao geocodificar:', err);
      // Se der erro de CORS/Failed to fetch devido ao rate limiting, também ativa o circuit-breaker
      if (err instanceof TypeError || String(err).includes('fetch') || String(err).includes('CORS')) {
        console.warn('[Nominatim] Erro de rede ou CORS. Ativando circuit-breaker.');
        (window as any).gbp_nominatim_blocked = true;
      }
    }
    return null;
  };

  // Carregar demandas da empresa e geocodificar endereços com cache no localStorage e rate limit de 1.2s
  const loadDemandas = async () => {
    if (!company?.uid) return;
    try {
      const { data, error: supabaseError } = await supabaseClient
        .from('gbp_demandas_ruas')
        .select('uid, tipo_de_demanda, descricao_do_problema, nivel_de_urgencia, logradouro, numero, bairro, cidade, uf, cep, status, criado_em, latitude, longitude')
        .eq('empresa_uid', company.uid)
        .eq('excluido', false)
        .order('criado_em', { ascending: false });

      if (supabaseError) {
        console.error('Erro ao buscar demandas:', supabaseError);
        return;
      }

      if (!data || data.length === 0) {
        setDemandas([]);
        return;
      }

      // Recupera ou inicializa o cache persistente no localStorage
      let persistentCache: Record<string, { lat: number; lng: number } | null> = {};
      try {
        const stored = localStorage.getItem('gbp_demandas_geocode_cache');
        if (stored) {
          persistentCache = JSON.parse(stored);
        }
      } catch (e) {
        console.error('Erro ao ler cache do localStorage:', e);
      }

      const demandasGeocodificadas: DemandaMapItem[] = [];

      for (const d of data) {
        const addressParts = [d.logradouro, d.numero, d.bairro, d.cidade, d.uf].filter(Boolean);
        const fullAddress = addressParts.join(', ');
        const cacheKey = fullAddress.toLowerCase().trim();

        let coords: { lat: number; lng: number } | null = null;
        const latVal = parseFloat(d.latitude || '');
        const lngVal = parseFloat(d.longitude || '');
        const hasDbCoords = !isNaN(latVal) && !isNaN(lngVal) && latVal !== 0 && lngVal !== 0;
        if (hasDbCoords) {
          coords = { lat: latVal, lng: lngVal };
        } else if (cacheKey in persistentCache) {
          coords = persistentCache[cacheKey];
        } else {
          // Rate-limiting de 1200ms para evitar 429 da API Nominatim
          await new Promise(resolve => setTimeout(resolve, 1200));
          coords = await geocodeAddress(fullAddress + ', Brasil');
          persistentCache[cacheKey] = coords;
          try {
            localStorage.setItem('gbp_demandas_geocode_cache', JSON.stringify(persistentCache));
          } catch (e) {
            console.error('Erro ao salvar cache no localStorage:', e);
          }
        }

        if (coords) {
          demandasGeocodificadas.push({
            uid: d.uid,
            tipo_de_demanda: d.tipo_de_demanda || '',
            descricao_do_problema: d.descricao_do_problema || '',
            nivel_de_urgencia: d.nivel_de_urgencia || '',
            logradouro: d.logradouro || '',
            numero: d.numero || '',
            bairro: d.bairro || '',
            cidade: d.cidade || '',
            uf: d.uf || '',
            cep: d.cep || '',
            lat: coords.lat,
            lng: coords.lng,
            status: d.status || '',
            criado_em: d.criado_em || ''
          });
        }
      }

      setDemandas(demandasGeocodificadas);
    } catch (err) {
      console.error('Erro ao carregar demandas:', err);
      setDemandas([]);
    }
  };

  useEffect(() => {
    if (!canAccess) {
      navigate('/app');
      return;
    }
    
    const loadAll = async () => {
      setLoading(true);
      await loadVoters();
      setLoading(false);
      // Carrega as demandas de forma assíncrona em segundo plano sem bloquear a inicialização do mapa
      loadDemandas();
    };
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess, company?.uid]);

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
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
                Distribuição geográfica dos eleitores.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-2 sm:px-4 pt-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg mb-4">
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
                    demandas={demandas}
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