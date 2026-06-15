import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import 'leaflet.heat';
import { Search, Maximize2, Minimize2, X, MapPin, Phone, User, Building2, Building, LandPlot, BarChart2, Users, Camera, MoreVertical, Download } from 'lucide-react';
import debounce from 'lodash/debounce';
import { supabaseClient } from '../../lib/supabase';
import { useCompanyStore } from '../../store/useCompanyStore';

// Ícone padrão para o mapa
const DefaultIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Voter {
  id: string;
  uid: string;
  name: string;
  address: string;
  telefone: string;
  categoria: string;
  categoria_uid?: string;
  influencia: string;
  lat: number;
  lng: number;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  genero?: string;
  indicado_uid?: string;
  atendimento?: string;
  data_atendimento?: string;
  responsavel_atendimento?: string;
  colegio_eleitoral?: string;
  zona?: string | number;
  secao?: string | number;
  // Campos expandidos da tabela gbp_eleitores
  cpf?: string;
  nascimento?: string;
  nome_mae?: string;
  whatsapp?: string;
  instagram?: string;
  numero_do_sus?: string;
  numero?: string;
  complemento?: string;
  uf?: string;
  logradouro?: string;
  status?: string;
  confiabilidade_do_voto?: string;
  responsavel?: string;
  responsavel_pelo_eleitor?: string;
  titulo?: string;
  regiao_bairro?: string;
  quantidade_adultos_residencia?: string;
  created_at?: string;
  // Atendimentos relacionados
  atendimentos?: Array<{
    uid: string;
    descricao: string;
    data_atendimento: string;
    status: string;
    responsavel: string;
    tipo_de_atendimento: string;
  }>;
}

interface VoterMarker {
  uid: string; // UID é obrigatório
  name: string;
  lat: number;
  lng: number;
  address?: string;
  telefone?: string;
  cidade?: string;
  cep?: string;
  genero?: string;
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

interface MapComponentProps {
  voters: Voter[];
  demandas?: DemandaMapItem[];
}

// Função para normalizar texto para busca
const normalizeText = (text: string = '') => 
  text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

// Função para verificar se um texto contém outro
const textContains = (text: string = '', search: string = '') => 
  normalizeText(text).includes(normalizeText(search));

// Algoritmo de Convex Hull (Andrew's Monotone Chain) para calcular limites de polígonos
function getConvexHull(points: Array<[number, number]>): Array<[number, number]> {
  if (points.length <= 1) return points;
  
  const sorted = [...points].sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
  
  const lower: Array<[number, number]> = [];
  for (const p of sorted) {
    while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  
  const upper: Array<[number, number]> = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function crossProduct(o: [number, number], a: [number, number], b: [number, number]): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

interface MapStats {
  totalEleitores: number;
  bairros: {
    total: number;
    maisPopuloso: {
      nome: string;
      quantidade: number;
      percentual: number;
    };
  };
  cidades: {
    total: number;
    maisPopulosa: {
      nome: string;
      quantidade: number;
      percentual: number;
    };
  };
}

// Cache global para limites geográficos dos municípios para evitar múltiplas requisições ao Nominatim
const cityGeoJsonCache = new Map<string, any>();

const STATUS_LABELS: Record<string, string> = {
  recebido: 'Recebido',
  feito_oficio: 'Feito Ofício',
  protocolado: 'Protocolado',
  aguardando: 'Aguardando',
  concluido: 'Concluído',
  cancelado: 'Cancelado'
};

// Helper centralizado para buscar limites municipais com cache e normalização
async function fetchCityBoundary(cityName: string): Promise<any | null> {
  const cacheKey = cityName.trim().toLowerCase();
  if (cityGeoJsonCache.has(cacheKey)) {
    return cityGeoJsonCache.get(cacheKey);
  }

  // Correções rápidas para grafias alternativas ou erros conhecidos
  let queryName = cityName.trim();
  if (queryName.toLowerCase() === 'paullsta') {
    queryName = 'Paulista';
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryName + ', Pernambuco, Brasil')}&format=json&polygon_geojson=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GBP-Politico-ElectoralMap-App-Cached'
        }
      }
    );

    if (response.status === 429) {
      console.warn('Nominatim limitou a taxa de requisições. Usando fallback de tempo.');
      return null;
    }

    const data = await response.json();
    let matched = data.find((item: any) =>
      item.geojson &&
      (item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon')
    );

    if (matched) {
      cityGeoJsonCache.set(cacheKey, matched.geojson);
      return matched.geojson;
    }

    // Fallback geral no Brasil
    const responseGeneral = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryName + ', Brasil')}&format=json&polygon_geojson=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GBP-Politico-ElectoralMap-App-Cached'
        }
      }
    );
    const dataGeneral = await responseGeneral.json();
    matched = dataGeneral.find((item: any) =>
      item.geojson &&
      (item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon')
    );

    if (matched) {
      cityGeoJsonCache.set(cacheKey, matched.geojson);
      return matched.geojson;
    }
  } catch (err) {
    console.error('Erro na requisição ao Nominatim para ' + queryName + ':', err);
  }

  return null;
}

export default function MapComponent({ voters, demandas = [] }: MapComponentProps) {
  const company = useCompanyStore(state => state.company);
  const mapRef = useRef<L.Map | null>(null);
  const categoryFilterRef = useRef<HTMLDivElement>(null);
  const markerClusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [markerClusterGroup, setMarkerClusterGroup] = useState<L.MarkerClusterGroup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const updateTimeout = useRef<NodeJS.Timeout>();
  const [visibleVoters, setVisibleVoters] = useState<Voter[]>([]);
  const lastCenter = useRef<L.LatLng | null>(null);
  const lastZoom = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [isStatsVisible, setIsStatsVisible] = useState(false);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Array<{uid: string, nome: string, cor: string, tipo_uid: string | null, tipo_nome?: string}>>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedBairros, setSelectedBairros] = useState<Set<string>>(new Set());
  const [selectedCidades, setSelectedCidades] = useState<Set<string>>(new Set());
  const [selectedCityView, setSelectedCityView] = useState<string>('');
  const [mapVisualization, setMapVisualization] = useState<'markers' | 'heatmap' | 'circles'>('markers');
  const [showFilterSummary, setShowFilterSummary] = useState(true);
  // Inicia aberto apenas em desktop (largura >= 640px)
  const [showCategoryFilter, setShowCategoryFilter] = useState(window.innerWidth >= 640);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [showRadius, setShowRadius] = useState(true);
  const [radiusSize, setRadiusSize] = useState(500); // Raio em metros
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const userLocationCircleRef = useRef<L.Circle | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const heatmapLayerRef = useRef<any>(null);
  const circlesLayerRef = useRef<L.LayerGroup | null>(null);
  const cityPolygonRef = useRef<L.Polygon | null>(null);
  const selectedAreasLayerRef = useRef<L.LayerGroup | null>(null);
  const [disableClustering, setDisableClustering] = useState(false);
  
  // Estados para as Novas Camadas
  const [activeLayers, setActiveLayers] = useState<Set<string>>(
    new Set(['eleitores'])
  );
  const [indicados, setIndicados] = useState<Array<{uid: string, nome: string}>>([]);
  const [selectedIndicados, setSelectedIndicados] = useState<Set<string>>(new Set());
  const [selectedAtendimentos, setSelectedAtendimentos] = useState<Set<string>>(new Set());
  const [selectedGeneros, setSelectedGeneros] = useState<Set<string>>(new Set());
  const [selectedConfiabilidade, setSelectedConfiabilidade] = useState<Set<string>>(new Set());
  const [selectedTiposDemanda, setSelectedTiposDemanda] = useState<Set<string>>(new Set());
  const [selectedCidadesDemanda, setSelectedCidadesDemanda] = useState<Set<string>>(new Set());
  const [selectedBairrosDemanda, setSelectedBairrosDemanda] = useState<Set<string>>(new Set());
  const [selectedStatusDemanda, setSelectedStatusDemanda] = useState<Set<string>>(new Set());
  const [cityGeoJson, setCityGeoJson] = useState<{ cityName: string, geojson: any } | null>(null);
  const [voterViewMode, setVoterViewMode] = useState<'pinos' | 'densidade'>('pinos');
  const [mapStats, setMapStats] = useState<MapStats>({
    totalEleitores: 0,
    bairros: { total: 0, maisPopuloso: { nome: '', quantidade: 0, percentual: 0 } },
    cidades: { total: 0, maisPopulosa: { nome: '', quantidade: 0, percentual: 0 } }
  });

  // Referência para os layers
  const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: ' OpenStreetMap contributors',
    maxZoom: 22, // Limitando o zoom máximo para evitar tela branca
    maxNativeZoom: 19 // Zoom máximo nativo do OpenStreetMap
  });
  
  const satelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    attribution: ' Esri',
    maxZoom: 22,
    maxNativeZoom: 21
  });

  // Constantes para otimização
  const MARKER_LIMIT = 300; // Limite máximo de marcadores visíveis
  const LOAD_DELAY = 300; // Delay para atualizar marcadores
  const MIN_ZOOM_LEVEL = 12; // Zoom mínimo para mostrar marcadores individuais

  // Função para calcular distância do centro
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Função para filtrar e ordenar eleitores por proximidade
  const getVisibleVoters = useCallback((center: L.LatLng, zoom: number) => {
    if (!mapRef.current || zoom < MIN_ZOOM_LEVEL) {
      return [];
    }

    const filtered = voters
      .filter(voter => voter.lat && voter.lng)
      .map(voter => ({
        ...voter,
        distance: calculateDistance(
          center.lat,
          center.lng,
          voter.lat,
          voter.lng
        )
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, MARKER_LIMIT);

    return filtered;
  }, [voters]);

  // Função para calcular o centro e zoom ideal para todos os pontos
  const calculateBounds = useCallback((voters: Voter[]) => {
    if (!voters.length) return null;

    const validVoters = voters.filter(voter => voter.lat && voter.lng);
    if (!validVoters.length) return null;

    const bounds = L.latLngBounds(
      validVoters.map(voter => [voter.lat, voter.lng])
    );

    return bounds;
  }, []);

  // Computar contagem de pessoas por cidade
  const countByCidade = useMemo(() => {
    const counts: Record<string, number> = {};
    voters.forEach(v => {
      const cidade = v.cidade?.trim();
      if (cidade) {
        const lower = cidade.toLowerCase();
        counts[lower] = (counts[lower] || 0) + 1;
      }
    });
    return counts;
  }, [voters]);

  // Computar contagem de pessoas por bairro
  const countByBairro = useMemo(() => {
    const counts: Record<string, number> = {};
    voters.forEach(v => {
      const bairro = v.bairro?.trim();
      if (bairro) counts[bairro] = (counts[bairro] || 0) + 1;
    });
    return counts;
  }, [voters]);

  // Computar contagem de pessoas por tipo de atendimento
  const countByAtendimento = useMemo(() => {
    const counts: Record<string, number> = {};
    voters.forEach(v => {
      const atend = v.atendimento?.trim();
      if (atend) counts[atend] = (counts[atend] || 0) + 1;
    });
    return counts;
  }, [voters]);

  // Computar contagem de pessoas por indicado
  const countByIndicado = useMemo(() => {
    const counts: Record<string, number> = {};
    voters.forEach(v => {
      const ind = v.indicado_uid;
      if (ind) counts[ind] = (counts[ind] || 0) + 1;
    });
    return counts;
  }, [voters]);

  // Computar valores únicos e contagens de gênero
  const uniqueGeneros = useMemo(() => {
    const set = new Set<string>();
    voters.forEach(v => {
      const g = v.genero?.trim();
      if (g) set.add(g);
    });
    return Array.from(set).sort();
  }, [voters]);

  const countByGenero = useMemo(() => {
    const counts: Record<string, number> = {};
    voters.forEach(v => {
      const g = v.genero?.trim();
      if (g) counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }, [voters]);

  // Computar valores únicos e contagens de confiabilidade do voto
  const uniqueConfiabilidade = useMemo(() => {
    const set = new Set<string>();
    voters.forEach(v => {
      const c = v.confiabilidade_do_voto?.trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [voters]);

  const countByConfiabilidade = useMemo(() => {
    const counts: Record<string, number> = {};
    voters.forEach(v => {
      const c = v.confiabilidade_do_voto?.trim();
      if (c) counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [voters]);

  // Computar totais gerais para as camadas do painel flutuante
  const layerStats = useMemo(() => {
    let pessoas = voters.length;
    let solicitacoes = demandas && demandas.length > 0 ? demandas.length : 0;
    let acoes = 0;
    let eventos = 0;
    let indicadosCount = 0;
    let votacao = 0;

    voters.forEach(v => {
      if (!(demandas && demandas.length > 0) && v.atendimento && v.atendimento.trim()) solicitacoes++;
      if (v.categoria_uid) acoes++;
      if (v.cidade || v.bairro) eventos++;
      if (v.indicado_uid) indicadosCount++;
      if (v.colegio_eleitoral || v.zona || v.secao) votacao++;
    });

    return { pessoas, solicitacoes, acoes, eventos, indicadosCount, votacao };
  }, [voters, demandas]);

  // Ordenar indicados por quantidade decrescente de indicações
  const sortedIndicados = useMemo(() => {
    return [...indicados].sort((a, b) => {
      const countA = countByIndicado[a.uid] || 0;
      const countB = countByIndicado[b.uid] || 0;
      if (countA !== countB) return countB - countA;
      return a.nome.localeCompare(b.nome);
    });
  }, [indicados, countByIndicado]);

  // Extrair bairros e cidades únicos dos eleitores
  const uniqueBairros = useMemo(() => {
    const bairrosSet = new Set<string>();
    voters.forEach(voter => {
      if (voter.bairro) bairrosSet.add(voter.bairro);
    });
    return Array.from(bairrosSet).sort((a, b) => {
      const countA = countByBairro[a] || 0;
      const countB = countByBairro[b] || 0;
      if (countA !== countB) return countB - countA;
      return a.localeCompare(b);
    });
  }, [voters, countByBairro]);

  const uniqueCidades = useMemo(() => {
    const normMap = new Map<string, string>(); // lowercase -> original
    voters.forEach(voter => {
      if (voter.cidade && voter.cidade.trim()) {
        const trimmed = voter.cidade.trim();
        const lower = trimmed.toLowerCase();
        if (!normMap.has(lower)) {
          normMap.set(lower, trimmed);
        }
      }
    });
    return Array.from(normMap.values()).sort((a, b) => {
      const countA = countByCidade[a.toLowerCase()] || 0;
      const countB = countByCidade[b.toLowerCase()] || 0;
      if (countA !== countB) return countB - countA;
      return a.localeCompare(b);
    });
  }, [voters, countByCidade]);

  // Mapear bairros por cidade
  const bairrosPorCidade = useMemo(() => {
    const map = new Map<string, Set<string>>();
    voters.forEach(voter => {
      if (voter.cidade && voter.bairro) {
        if (!map.has(voter.cidade)) {
          map.set(voter.cidade, new Set());
        }
        map.get(voter.cidade)!.add(voter.bairro);
      }
    });
    return map;
  }, [voters]);

  // Filtrar bairros exibidos baseado na cidade selecionada e ordenar de forma decrescente
  const bairrosExibidos = useMemo(() => {
    if (selectedCidades.size === 0) {
      return uniqueBairros;
    }
    
    // Se cidades selecionadas, mostrar apenas bairros dessas cidades
    const bairrosDasCidadesSelecionadas = new Set<string>();
    selectedCidades.forEach(cidade => {
      const bairros = bairrosPorCidade.get(cidade);
      if (bairros) {
        bairros.forEach(bairro => bairrosDasCidadesSelecionadas.add(bairro));
      }
    });
    
    return Array.from(bairrosDasCidadesSelecionadas).sort((a, b) => {
      const countA = countByBairro[a] || 0;
      const countB = countByBairro[b] || 0;
      if (countA !== countB) return countB - countA;
      return a.localeCompare(b);
    });
  }, [selectedCidades, bairrosPorCidade, uniqueBairros, countByBairro]);

  // Obter localização do usuário
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Erro ao obter localização:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }
  }, []);

  // Desenhar círculo de raio na localização do usuário
  useEffect(() => {
    if (!map || !userLocation || !showRadius) {
      // Remove círculo e marcador se existirem
      if (userLocationCircleRef.current) {
        map?.removeLayer(userLocationCircleRef.current);
        userLocationCircleRef.current = null;
      }
      if (userLocationMarkerRef.current) {
        map?.removeLayer(userLocationMarkerRef.current);
        userLocationMarkerRef.current = null;
      }
      return;
    }

    // Remove círculo e marcador anteriores
    if (userLocationCircleRef.current) {
      map.removeLayer(userLocationCircleRef.current);
    }
    if (userLocationMarkerRef.current) {
      map.removeLayer(userLocationMarkerRef.current);
    }

    // Cria círculo de raio
    const circle = L.circle([userLocation.lat, userLocation.lng], {
      radius: radiusSize,
      color: '#3B82F6',
      fillColor: '#3B82F6',
      fillOpacity: 0.1,
      weight: 2,
      opacity: 0.5
    });

    // Cria marcador de localização do usuário
    const userIcon = L.divIcon({
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background-color: #3B82F6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>
      `,
      className: 'user-location-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const marker = L.marker([userLocation.lat, userLocation.lng], {
      icon: userIcon
    });

    marker.bindPopup(`
      <div class="p-2">
        <p class="font-semibold text-sm">📍 Sua Localização</p>
        <p class="text-xs text-gray-600 mt-1">Raio: ${radiusSize}m</p>
      </div>
    `);

    circle.addTo(map);
    marker.addTo(map);

    userLocationCircleRef.current = circle;
    userLocationMarkerRef.current = marker;

    return () => {
      if (userLocationCircleRef.current) {
        map.removeLayer(userLocationCircleRef.current);
      }
      if (userLocationMarkerRef.current) {
        map.removeLayer(userLocationMarkerRef.current);
      }
    };
  }, [map, userLocation, showRadius, radiusSize]);

  // Carregar cores e dados das categorias com tipos
  useEffect(() => {
    const loadCategories = async () => {
      if (!company?.uid) return;
      
      try {
        const { data, error } = await supabaseClient
          .from('gbp_categorias')
          .select(`
            uid, 
            nome, 
            cor, 
            tipo_uid,
            tipo:gbp_categoria_tipos(nome)
          `)
          .eq('empresa_uid', company.uid)
          .order('nome');
        
        if (error) throw error;
        
        const colorsMap: Record<string, string> = {};
        const categoriesList: Array<{uid: string, nome: string, cor: string, tipo_uid: string | null, tipo_nome?: string}> = [];
        
        data?.forEach((cat: any) => {
          if (cat.uid) {
            if (cat.cor) colorsMap[cat.uid] = cat.cor;
            categoriesList.push({
              uid: cat.uid,
              nome: cat.nome,
              cor: cat.cor || '#3B82F6',
              tipo_uid: cat.tipo_uid,
              tipo_nome: cat.tipo?.nome || null
            });
          }
        });
        
        setCategoryColors(colorsMap);
        setCategories(categoriesList);
        // Inicia com todas as categorias selecionadas
        setSelectedCategories(new Set(categoriesList.map(cat => cat.uid)));
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
      }
    };
    
    loadCategories();
  }, [company?.uid]);

  // Carregar lista de indicados (promotores)
  useEffect(() => {
    const loadIndicados = async () => {
      if (!company?.uid) return;
      try {
        const { data, error } = await supabaseClient
          .from('gbp_indicado')
          .select('uid, nome')
          .eq('empresa_uid', company.uid)
          .order('nome');
          
        if (error) throw error;
        setIndicados(data || []);
      } catch (error) {
        console.error('Erro ao carregar indicados:', error);
      }
    };
    loadIndicados();
  }, [company?.uid]);

  // Extrair lista de atendimentos únicos a partir dos eleitores e ordenar de forma decrescente
  const uniqueAtendimentos = useMemo(() => {
    const set = new Set<string>();
    voters.forEach(v => {
      if (v.atendimento && v.atendimento.trim()) {
        set.add(v.atendimento.trim());
      }
    });
    return Array.from(set).sort((a, b) => {
      const countA = countByAtendimento[a] || 0;
      const countB = countByAtendimento[b] || 0;
      if (countA !== countB) return countB - countA;
      return a.localeCompare(b);
    });
  }, [voters, countByAtendimento]);

  // --- FILTROS PARA DEMANDAS DE RUA ---

  // Extrair tipos de demanda únicos
  const uniqueTiposDemanda = useMemo(() => {
    const set = new Set<string>();
    demandas.forEach(d => {
      if (d.tipo_de_demanda && d.tipo_de_demanda.trim()) {
        set.add(d.tipo_de_demanda.trim());
      }
    });
    return Array.from(set).sort();
  }, [demandas]);

  // Extrair cidades únicas das demandas
  const uniqueCidadesDemanda = useMemo(() => {
    const normMap = new Map<string, string>(); // lowercase -> original
    demandas.forEach(d => {
      if (d.cidade && d.cidade.trim()) {
        const trimmed = d.cidade.trim();
        const lower = trimmed.toLowerCase();
        if (!normMap.has(lower)) {
          normMap.set(lower, trimmed);
        }
      }
    });
    return Array.from(normMap.values()).sort();
  }, [demandas]);

  // Mapear bairros por cidade para as demandas
  const bairrosDemandaPorCidade = useMemo(() => {
    const map = new Map<string, Set<string>>();
    demandas.forEach(d => {
      const cidade = d.cidade?.trim();
      const bairro = d.bairro?.trim();
      if (cidade && bairro) {
        if (!map.has(cidade)) {
          map.set(cidade, new Set());
        }
        map.get(cidade)!.add(bairro);
      }
    });
    return map;
  }, [demandas]);

  // Filtrar bairros de demandas a serem exibidos de acordo com as cidades de demandas selecionadas
  const bairrosDemandaExibidos = useMemo(() => {
    const set = new Set<string>();
    if (selectedCidadesDemanda.size > 0) {
      selectedCidadesDemanda.forEach(cidade => {
        const bairros = bairrosDemandaPorCidade.get(cidade);
        if (bairros) {
          bairros.forEach(b => set.add(b));
        }
      });
    } else {
      demandas.forEach(d => {
        if (d.bairro && d.bairro.trim()) {
          set.add(d.bairro.trim());
        }
      });
    }
    return Array.from(set).sort();
  }, [demandas, selectedCidadesDemanda, bairrosDemandaPorCidade]);

  // Contagens por Tipo, Cidade e Bairro de Demandas
  const countByTipoDemanda = useMemo(() => {
    const counts: Record<string, number> = {};
    demandas.forEach(d => {
      const tipo = d.tipo_de_demanda?.trim();
      if (tipo) counts[tipo] = (counts[tipo] || 0) + 1;
    });
    return counts;
  }, [demandas]);

  const countByCidadeDemanda = useMemo(() => {
    const counts: Record<string, number> = {};
    demandas.forEach(d => {
      const cidade = d.cidade?.trim();
      if (cidade) {
        const lower = cidade.toLowerCase();
        counts[lower] = (counts[lower] || 0) + 1;
      }
    });
    return counts;
  }, [demandas]);

  const countByBairroDemanda = useMemo(() => {
    const counts: Record<string, number> = {};
    demandas.forEach(d => {
      const bairro = d.bairro?.trim();
      if (bairro) counts[bairro] = (counts[bairro] || 0) + 1;
    });
    return counts;
  }, [demandas]);

  // Extrair status de demanda únicos
  const uniqueStatusDemanda = useMemo(() => {
    const set = new Set<string>();
    demandas.forEach(d => {
      if (d.status && d.status.trim()) {
        set.add(d.status.trim());
      }
    });
    return Array.from(set).sort();
  }, [demandas]);

  // Contagens por Status de Demandas
  const countByStatusDemanda = useMemo(() => {
    const counts: Record<string, number> = {};
    demandas.forEach(d => {
      const status = d.status?.trim();
      if (status) counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [demandas]);

  // Filtrar demandas com base nos filtros selecionados na barra lateral
  const filteredDemandas = useMemo(() => {
    return demandas.filter(d => {
      const tipo = d.tipo_de_demanda?.trim();
      const cidade = d.cidade?.trim();
      const bairro = d.bairro?.trim();
      const status = d.status?.trim();

      // Filtro por tipo de demanda
      if (selectedTiposDemanda.size > 0 && (!tipo || !selectedTiposDemanda.has(tipo))) {
        return false;
      }
      // Filtro por cidade de demanda
      if (selectedCidadesDemanda.size > 0 && (!cidade || !selectedCidadesDemanda.has(cidade))) {
        return false;
      }
      // Filtro por bairro de demanda
      if (selectedBairrosDemanda.size > 0 && (!bairro || !selectedBairrosDemanda.has(bairro))) {
        return false;
      }
      // Filtro por status de demanda
      if (selectedStatusDemanda.size > 0 && (!status || !selectedStatusDemanda.has(status))) {
        return false;
      }
      return true;
    });
  }, [demandas, selectedTiposDemanda, selectedCidadesDemanda, selectedBairrosDemanda, selectedStatusDemanda]);

  // --- FIM DOS FILTROS PARA DEMANDAS DE RUA ---

  // Inicialização do mapa
  useEffect(() => {
    if (!containerRef.current || map) return;

    // Configuração das camadas do mapa (OpenFreeMap Positron - Visual Limpo e Premium)
    const streetLayer = L.tileLayer('https://tiles.openfreemap.org/styles/positron/{z}/{x}/{y}.png', {
      attribution: 'OpenFreeMap &copy; OpenMapTiles Data from OpenStreetMap',
      maxZoom: 22,
      maxNativeZoom: 19
    });

    const satelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      attribution: ' Esri',
      maxZoom: 22,
      maxNativeZoom: 21
    });

    // Pequeno delay para garantir que o DOM está pronto
    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      // Calcula os limites iniciais
      const bounds = calculateBounds(voters);
      const initialCenter = bounds ? bounds.getCenter() : [-8.0476, -34.8770]; // Recife como fallback
      const initialZoom = bounds ? 12 : 12;

      const newMap = L.map(containerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        layers: [streetLayer],
        maxZoom: 22,
        minZoom: 4,
        zoomControl: false,
        wheelDebounceTime: 100,
        wheelPxPerZoomLevel: 100,
        zoomSnap: 0.5,
        zoomDelta: 0.5
      });

      // Se tiver pontos, ajusta o zoom para mostrar todos
      if (bounds) {
        newMap.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 15 // Limita o zoom máximo ao ajustar
        });
      }

      // Adiciona controles em ordem específica para garantir o posicionamento correto
      // 1. Controle de zoom
      L.control.zoom({
        position: 'bottomright',
        zoomInTitle: 'Aumentar zoom',
        zoomOutTitle: 'Diminuir zoom'
      }).addTo(newMap);

      // 2. Controle de camadas (posicionado acima do zoom)
      const baseLayers = {
        'Mapa': streetLayer,
        'Satélite': satelliteLayer
      };

      L.control.layers(baseLayers, {}, {
        position: 'bottomright',
        collapsed: false
      }).addTo(newMap);

      // Configuração do cluster de marcadores com cores personalizadas
      // Desabilita clustering se:
      // 1. Opção manual ativada OU
      // 2. 5 ou menos categorias selecionadas
      const shouldDisableClustering = disableClustering || (selectedCategories.size > 0 && selectedCategories.size <= 5);
      
      const markers = L.markerClusterGroup({
        maxClusterRadius: shouldDisableClustering ? 0 : 50, // 0 = sem agrupamento
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: voterViewMode !== 'densidade',
        disableClusteringAtZoom: shouldDisableClustering ? 1 : 16,
        chunkedLoading: true,
        chunkInterval: 100,
        chunkDelay: 50,
        iconCreateFunction: function(cluster) {
          const childCount = cluster.getChildCount();
          const markers = cluster.getAllChildMarkers();
          
          // Conta as categorias no cluster
          const categoryCounts: Record<string, number> = {};
          markers.forEach((marker: any) => {
            const voter = marker.options.voter;
            if (voter?.categoria_uid) {
              categoryCounts[voter.categoria_uid] = (categoryCounts[voter.categoria_uid] || 0) + 1;
            }
          });
          
          // Encontra a categoria predominante
          let dominantCategory = '';
          let maxCount = 0;
          Object.entries(categoryCounts).forEach(([catUid, count]) => {
            if (count > maxCount) {
              maxCount = count;
              dominantCategory = catUid;
            }
          });
          
          // Usa a cor da categoria predominante ou azul padrão
          const clusterColor = dominantCategory && categoryColors[dominantCategory] 
            ? categoryColors[dominantCategory] 
            : '#3B82F6';
          
          // Define o tamanho do cluster baseado na quantidade
          let iconSize = 40;
          if (childCount >= 100) iconSize = 50;
          else if (childCount >= 10) iconSize = 45;
          
          return L.divIcon({
            html: `
              <div style="
                background-color: ${clusterColor};
                width: ${iconSize}px;
                height: ${iconSize}px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 14px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                border: 3px solid rgba(255,255,255,0.8);
              ">
                <span>${childCount}</span>
              </div>
            `,
            className: 'marker-cluster-custom',
            iconSize: L.point(iconSize, iconSize)
          });
        }
      });

      const selectedAreasLayer = L.layerGroup();
      selectedAreasLayer.addTo(newMap);
      selectedAreasLayerRef.current = selectedAreasLayer;

      setMap(newMap);
      markerClusterRef.current = markers;
      setMarkerClusterGroup(markers);
      newMap.addLayer(markers);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (map) {
        if (selectedAreasLayerRef.current) {
          map.removeLayer(selectedAreasLayerRef.current);
          selectedAreasLayerRef.current = null;
        }
        map.remove();
      }
    };
  }, [map, voters, selectedCategories, disableClustering]);

  // Efeito para alternar entre as camadas do mapa
  useEffect(() => {
    if (!map) return;

    // Remove todas as camadas de tile existentes
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    // Adiciona a camada selecionada
    const layer = mapType === 'satellite' 
      ? L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
          attribution: ' Esri',
          maxZoom: 22,
          maxNativeZoom: 21
        })
      : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: ' OpenStreetMap contributors',
          maxZoom: 22,
          maxNativeZoom: 19
        });

    layer.addTo(map);
  }, [map, mapType]);

  // Função para criar o ícone personalizado do eleitor
  const createVoterIcon = (voter: Voter) => {
    // Determina a cor com base na categoria (se configurada) ou no gênero
    let color = '#3B82F6'; // Azul padrão
    
    // Prioridade 1: Cor da categoria
    if (voter.categoria_uid && categoryColors[voter.categoria_uid]) {
      color = categoryColors[voter.categoria_uid];
    }
    // Prioridade 2: Cor por gênero (fallback)
    else if (voter.genero?.toUpperCase() === 'F' || voter.genero?.toLowerCase() === 'feminino') {
      color = '#EC4899'; // Rosa (pink-500)
    }
    
    // Cria um ícone SVG de ponto de localização refinado e discreto
    const svgTemplate = `
      <svg width="20" height="26" viewBox="0 0 20 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0Z" fill="${color}"/>
        <path d="M10 26L2.5 20.5H17.5L10 26Z" fill="${color}"/>
        <circle cx="10" cy="10" r="4.5" fill="white"/>
      </svg>
    `;

    // Converte o SVG para uma URL de dados
    const svgUrl = 'data:image/svg+xml;base64,' + btoa(svgTemplate);

    return L.icon({
      iconUrl: svgUrl,
      iconSize: [20, 26],
      iconAnchor: [10, 26],
      popupAnchor: [0, -26]
    });
  };

  // Função para criar o ícone personalizado de demandas de rua
  const createDemandaIcon = (demanda: DemandaMapItem) => {
    const color = '#F59E0B'; // Cor Amber (Laranja)
    
    const svgTemplate = `
      <svg width="20" height="26" viewBox="0 0 20 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0Z" fill="${color}"/>
        <path d="M10 26L2.5 20.5H17.5L10 26Z" fill="${color}"/>
        <circle cx="10" cy="10" r="4.5" fill="white"/>
      </svg>
    `;

    const svgUrl = 'data:image/svg+xml;base64,' + btoa(svgTemplate);

    return L.icon({
      iconUrl: svgUrl,
      iconSize: [20, 26],
      iconAnchor: [10, 26],
      popupAnchor: [0, -26]
    });
  };

  // Ícone invisível para modo densidade (os clusters ainda contam os marcadores)
  const invisibleIcon = useMemo(() => L.divIcon({
    html: '',
    className: 'invisible-voter-marker',
    iconSize: [0, 0]
  }), []);

  // Função para adicionar marcadores ao mapa
  const addMarkersToMap = useCallback((votersToShow: Voter[]) => {
    const activeCluster = markerClusterRef.current || markerClusterGroup;
    if (!map || !activeCluster) return;

    activeCluster.clearLayers();

    votersToShow.forEach((voter) => {
      if (!voter.lat || !voter.lng) return;

      const isDensity = voterViewMode === 'densidade';
      const marker = L.marker([voter.lat, voter.lng], {
        icon: isDensity ? invisibleIcon : createVoterIcon(voter),
        voter: voter // Adiciona os dados do eleitor ao marcador para uso no cluster
      } as any);

      const popupContent = `
        <div class="p-1 min-w-[280px]">
          <div class="bg-white rounded-lg shadow-lg">
            <div class="p-4">
              <h3 class="text-xl font-bold text-gray-800 mb-3">${voter.name}</h3>
              <div class="text-sm text-gray-600 space-y-2 mb-4">
                <div>
                  <p class="font-semibold text-gray-700">Endereço:</p>
                  <p>${voter.address || 'Não informado'}</p>
                  <p>${voter.bairro || ''}, ${voter.cidade || ''}</p>
                  <p>CEP: ${voter.cep || 'Não informado'}</p>
                </div>
                ${voter.atendimento ? `
                  <div style="margin-top: 8px; border-top: 1px dashed #E5E7EB; padding-top: 8px;">
                    <p class="font-semibold text-gray-700">Atendimento:</p>
                    <p class="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-medium inline-block mt-0.5">${voter.atendimento}</p>
                    ${voter.data_atendimento ? `<span class="text-xs text-gray-400 block mt-0.5">Data: ${voter.data_atendimento}</span>` : ''}
                  </div>
                ` : ''}
                ${voter.indicado_uid ? `
                  <div style="margin-top: 8px; border-top: 1px dashed #E5E7EB; padding-top: 8px;">
                    <p class="font-semibold text-gray-700">Indicado por:</p>
                    <p class="text-gray-600 font-medium">${indicados.find(i => i.uid === voter.indicado_uid)?.nome || 'Promotor Cadastrado'}</p>
                  </div>
                ` : ''}
              </div>
              <div class="flex justify-around items-center pt-3 border-t border-gray-200">
                ${voter.telefone ? `
                  <a href="https://wa.me/55${voter.telefone.replace(/\D/g, '')}" 
                     target="_blank" 
                     title="WhatsApp"
                     class="flex flex-col items-center text-green-600 hover:text-green-700 transition-colors duration-200">
                    <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.654 4.495 1.932 6.344l-1.225 4.429 4.555-1.193zM8.381 9.979c.345-.137.636-.216.791-.216.21 0 .371.016.53.046.174.032.387.182.486.358.144.258.494 1.193.532 1.278.04.087.062.188.018.293-.045.107-.099.17-.188.263-.089.094-.192.148-.28.232-.103.095-.207.184-.322.292-.125.118-.257.244-.125.519.142.288.623.839 1.299 1.492 1.026.96 1.893 1.293 2.137 1.448.244.155.45.13.612-.023.184-.175.752-.863.87-.99.119-.128.24-.15.404-.092.164.058 1.274.6 1.488.694.213.092.366.14.407.19.04.048.04.307.023.593-.018 2.3-2.344 2.274-2.344 2.274s-2.112-.015-3.83-1.734c-1.718-1.718-2.94-3.83-3.014-3.922-.075-.092-.588-1.52-.588-1.52s-.11-.258-.11-.539c0-.28.158-.428.308-.5.15-.073.323-.09.43-.09z"/>
                    </svg>
                    <span class="text-xs mt-1">WhatsApp</span>
                  </a>
                ` : ''}
                <a href="/app/eleitores/${voter.uid}" 
                   title="Ver Eleitor"
                   class="flex flex-col items-center text-blue-600 hover:text-blue-700 transition-colors duration-200">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span class="text-xs mt-1">Detalhes</span>
                </a>
                <a href="https://www.google.com/maps/search/?api=1&query=${voter.lat},${voter.lng}"
                   target="_blank"
                   rel="noopener noreferrer"
                   title="Abrir no GPS"
                   class="flex flex-col items-center text-blue-600 hover:text-blue-700 transition-colors duration-200">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span class="text-xs mt-1">GPS</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'rounded-lg shadow-lg',
        maxWidth: 300,
        minWidth: 250
      });

      activeCluster.addLayer(marker);
    });

    // Adiciona as demandas de rua se a camada 'atendimentos' estiver ativa
    if (activeLayers.has('atendimentos') && filteredDemandas && filteredDemandas.length > 0) {
      filteredDemandas.forEach((dem) => {
        if (!dem.lat || !dem.lng) return;

        const marker = L.marker([dem.lat, dem.lng], {
          icon: createDemandaIcon(dem)
        });

        const popupContent = `
          <div class="p-1 min-w-[280px]">
            <div class="bg-white rounded-lg shadow-lg">
              <div class="p-4">
                <h3 class="text-xl font-bold text-gray-800 mb-1">${dem.tipo_de_demanda}</h3>
                <span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold mb-3 ${
                  dem.nivel_de_urgencia === 'alta' ? 'bg-red-100 text-red-800' :
                  dem.nivel_de_urgencia === 'média' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }">
                  Urgência: ${dem.nivel_de_urgencia}
                </span>
                <div class="text-sm text-gray-600 space-y-2 mb-4">
                  <div>
                    <p class="font-semibold text-gray-700">Descrição:</p>
                    <p class="italic text-gray-600">"${dem.descricao_do_problema}"</p>
                  </div>
                  <div>
                    <p class="font-semibold text-gray-700">Endereço:</p>
                    <p>${dem.logradouro || 'Não informado'}${dem.numero ? `, nº ${dem.numero}` : ''}</p>
                    <p>${dem.bairro || ''}, ${dem.cidade || ''} - ${dem.uf || ''}</p>
                    ${dem.cep ? `<p>CEP: ${dem.cep}</p>` : ''}
                  </div>
                  <div>
                    <p class="font-semibold text-gray-700">Status:</p>
                    <p class="capitalize font-medium text-amber-600">${dem.status || 'Recebido'}</p>
                  </div>
                </div>
                <div class="flex justify-around items-center pt-3 border-t border-gray-200">
                  <a href="/app/documentos/demandas" 
                     class="flex flex-col items-center text-blue-600 hover:text-blue-700 transition-colors duration-200">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span class="text-xs mt-1">Ver Demandas</span>
                  </a>
                  <a href="https://www.google.com/maps/search/?api=1&query=${dem.lat},${dem.lng}"
                     target="_blank"
                     rel="noopener noreferrer"
                     class="flex flex-col items-center text-blue-600 hover:text-blue-700 transition-colors duration-200">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span class="text-xs mt-1">GPS</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          className: 'rounded-lg shadow-lg',
          maxWidth: 300,
          minWidth: 250
        });

        activeCluster.addLayer(marker);
      });
    }

    if (!map.hasLayer(activeCluster)) {
      map.addLayer(activeCluster);
    }
  }, [map, markerClusterGroup, categoryColors, voterViewMode, invisibleIcon, activeLayers, filteredDemandas]);

  // Filtrar eleitores por camadas e seleções ativas
  const filteredVoters = useMemo(() => {
    return voters.filter(voter => {
      // 1. Filtragem por Camadas Ativas (activeLayers)
      const temAtendimento = !!(voter.atendimento && voter.atendimento.trim());
      const temCategoria = !!voter.categoria_uid;
      const temIndicado = !!voter.indicado_uid;
      const temCidadeBairro = !!(voter.cidade || voter.bairro);
      const temVotacao = !!(voter.colegio_eleitoral || voter.zona || voter.secao);

      let pertenceCamadaAtiva = false;

      // Se a camada geral "eleitores" estiver ativa, o registro básico sempre é aceito
      if (activeLayers.has('eleitores')) {
        pertenceCamadaAtiva = true;
      } else {
        // Se a camada "eleitores" está desligada, o eleitor só aparece se se enquadrar em outra camada ativa
        if (activeLayers.has('atendimentos') && temAtendimento) pertenceCamadaAtiva = true;
        if (activeLayers.has('categorias') && temCategoria) pertenceCamadaAtiva = true;
        if (activeLayers.has('indicado') && temIndicado) pertenceCamadaAtiva = true;
        if (activeLayers.has('cidades_bairros') && temCidadeBairro) pertenceCamadaAtiva = true;
        if (activeLayers.has('votacao') && temVotacao) pertenceCamadaAtiva = true;
      }

      if (!pertenceCamadaAtiva) return false;

      // 2. Filtragem por Seleção Específica de cada dimensão

      // Se a camada de categorias está ativa E filtramos por categorias específicas
      if (activeLayers.has('categorias') && selectedCategories.size > 0) {
        if (!voter.categoria_uid || !selectedCategories.has(voter.categoria_uid)) {
          return false;
        }
      }

      // Se a camada de indicados está ativa E filtramos por indicados específicos
      if (activeLayers.has('indicado') && selectedIndicados.size > 0) {
        if (!voter.indicado_uid || !selectedIndicados.has(voter.indicado_uid)) {
          return false;
        }
      }

      // Se a camada de atendimentos está ativa E filtramos por atendimentos específicos
      if (activeLayers.has('atendimentos') && selectedAtendimentos.size > 0) {
        if (!voter.atendimento || !selectedAtendimentos.has(voter.atendimento.trim())) {
          return false;
        }
      }

      // Se visualização de cidade por dropdown está ativa
      if (selectedCityView) {
        const voterCidade = voter.cidade?.trim().toLowerCase() || '';
        const cityViewNormalized = selectedCityView.trim().toLowerCase();
        if (voterCidade !== cityViewNormalized) return false;
      }

      // Filtros de Cidade e Bairro (sempre aplicados quando houver seleção, independente da camada ativa)
      if (selectedCidades.size > 0 || selectedBairros.size > 0) {
        const voterCidade = voter.cidade?.trim().toLowerCase() || '';
        const voterBairro = voter.bairro?.trim().toLowerCase() || '';

        let matchCidade = true;
        let matchBairro = true;

        if (selectedCidades.size > 0) {
          const cidadesNormalized = Array.from(selectedCidades).map(c => c.trim().toLowerCase());
          matchCidade = cidadesNormalized.includes(voterCidade);
        }
        if (selectedBairros.size > 0) {
          const bairrosNormalized = Array.from(selectedBairros).map(b => b.trim().toLowerCase());
          matchBairro = bairrosNormalized.includes(voterBairro);
        }

        if (!matchCidade || !matchBairro) return false;
      }

      // Filtro por Gênero
      if (activeLayers.has('eleitores') && selectedGeneros.size > 0) {
        const genero = voter.genero?.trim() || '';
        if (!selectedGeneros.has(genero)) return false;
      }

      // Filtro por Confiabilidade do Voto
      if (activeLayers.has('eleitores') && selectedConfiabilidade.size > 0) {
        const conf = voter.confiabilidade_do_voto?.trim() || '';
        if (!selectedConfiabilidade.has(conf)) return false;
      }

      return true;
    });
  }, [
    voters,
    activeLayers,
    selectedCategories,
    selectedIndicados,
    selectedAtendimentos,
    selectedCidades,
    selectedBairros,
    selectedCityView,
    selectedGeneros,
    selectedConfiabilidade
  ]);

  // Efeito para recriar o mapa quando o agrupamento muda
  useEffect(() => {
    if (!map) return;
    
    // Remove o cluster atual usando a Ref síncrona para evitar múltiplos grupos órfãos no mapa
    if (markerClusterRef.current) {
      map.removeLayer(markerClusterRef.current);
      markerClusterRef.current.clearLayers();
    } else if (markerClusterGroup) {
      map.removeLayer(markerClusterGroup);
    }
    
    // Recria o cluster com a nova configuração
    const shouldDisableClustering = disableClustering || (selectedCategories.size > 0 && selectedCategories.size <= 5);
    
    const newMarkers = L.markerClusterGroup({
      maxClusterRadius: shouldDisableClustering ? 0 : 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: voterViewMode !== 'densidade',
      disableClusteringAtZoom: shouldDisableClustering ? 1 : 16,
      chunkedLoading: true,
      chunkInterval: 100,
      chunkDelay: 50,
      iconCreateFunction: function(cluster) {
        const childCount = cluster.getChildCount();
        const markers = cluster.getAllChildMarkers();
        
        const categoryCounts: Record<string, number> = {};
        markers.forEach((marker: any) => {
          const voter = marker.options.voter;
          if (voter?.categoria_uid) {
            categoryCounts[voter.categoria_uid] = (categoryCounts[voter.categoria_uid] || 0) + 1;
          }
        });
        
        let dominantCategory = '';
        let maxCount = 0;
        Object.entries(categoryCounts).forEach(([catUid, count]) => {
          if (count > maxCount) {
            maxCount = count;
            dominantCategory = catUid;
          }
        });
        
        const clusterColor = dominantCategory && categoryColors[dominantCategory] 
          ? categoryColors[dominantCategory] 
          : '#3B82F6';
        
        let iconSize = 40;
        if (childCount >= 100) iconSize = 50;
        else if (childCount >= 10) iconSize = 45;
        
        return L.divIcon({
          html: `
            <div style="
              background-color: ${clusterColor};
              width: ${iconSize}px;
              height: ${iconSize}px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 14px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              border: 3px solid rgba(255,255,255,0.8);
            ">
              <span>${childCount}</span>
            </div>
          `,
          className: 'marker-cluster-custom',
          iconSize: L.point(iconSize, iconSize)
        });
      }
    });
    
    map.addLayer(newMarkers);
    markerClusterRef.current = newMarkers;
    setMarkerClusterGroup(newMarkers);
  }, [disableClustering, selectedCategories.size, map, categoryColors, voterViewMode]);

  // Exportar registros filtrados para Excel (XLSX) com múltiplos atendimentos e hiperlinks entre abas
  const exportToExcel = useCallback(async () => {
    if (filteredVoters.length === 0) return;
    setIsLoading(true);

    try {
      // 1. Busca os múltiplos atendimentos da empresa de uma única vez (evitando URLs gigantescas com .in que causam erro 414/ERR_FAILED)
      const { data: atendimentosData, error: atendimentosError } = await supabaseClient
        .from('gbp_atendimentos')
        .select(`
          eleitor_uid,
          descricao,
          status,
          data_atendimento,
          responsavel,
          gbp_usuarios:usuario_uid ( nome ),
          gbp_categorias:categoria_uid ( nome )
        `)
        .eq('empresa_uid', company?.uid);

      if (atendimentosError) {
        console.error('Erro ao buscar múltiplos atendimentos para exportação:', atendimentosError);
      }

      // Filtra em memória usando Set para performance O(1)
      const filteredVoterUids = new Set(filteredVoters.map(v => v.uid));
      const atendimentosDoFiltro = (atendimentosData || []).filter((at: any) => 
        at.eleitor_uid && filteredVoterUids.has(at.eleitor_uid)
      );

      // 2. Mapeia e sanitiza os atendimentos encontrados
      const atendimentosMapeados = atendimentosDoFiltro.map((at: any) => {
        const voter = filteredVoters.find(v => v.uid === at.eleitor_uid);
        return {
          voterUid: at.eleitor_uid || '',
          voterName: voter?.name || 'Eleitor não identificado',
          voterCpf: voter?.cpf || '',
          data: at.data_atendimento ? new Date(at.data_atendimento).toLocaleDateString('pt-BR') : '',
          descricao: at.descricao || '',
          categoria: at.gbp_categorias?.nome || '',
          responsavel: at.responsavel || at.gbp_usuarios?.nome || '',
          status: at.status || ''
        };
      });

      // Ordena atendimentos por Nome do Eleitor para agrupar o histórico de cada um
      atendimentosMapeados.sort((a, b) => a.voterName.localeCompare(b.voterName));

      // Mapeia onde começa cada eleitor na planilha "Atendimentos" (Linha 1 é o cabeçalho, então dados começam na Linha 2)
      const voterRowMap = new Map<string, { startRow: number, count: number }>();
      atendimentosMapeados.forEach((item, index) => {
        const excelRowNumber = index + 2;
        if (!voterRowMap.has(item.voterUid)) {
          voterRowMap.set(item.voterUid, { startRow: excelRowNumber, count: 1 });
        } else {
          voterRowMap.get(item.voterUid)!.count += 1;
        }
      });

      const headers = [
        'Nome',
        'Histórico de Atendimentos', // Nova coluna de Link interativo!
        'CPF',
        'Data de Nascimento',
        'Mãe',
        'Gênero',
        'WhatsApp',
        'Telefone',
        'Instagram',
        'Nº do SUS',
        'Título de Eleitor',
        'Zona',
        'Seção',
        'Colégio Eleitoral',
        'CEP',
        'Logradouro',
        'Número',
        'Complemento',
        'Bairro',
        'Região/Bairro',
        'Cidade',
        'Estado',
        'Categoria',
        'Confiabilidade do Voto',
        'Indicado por',
        'Responsável pelo Cadastro',
        'Responsável pelo Eleitor',
        'Status',
        'Adultos na Residência'
      ];

      const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr.trim() === '') return '';
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
          return `${match[3]}/${match[2]}/${match[1]}`;
        }
        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('pt-BR');
          }
        } catch (e) {}
        return dateStr;
      };

      const formatValue = (val: any) => {
        if (val === null || val === undefined) return '';
        return String(val).trim().replace(/[\r\n\t]+/g, ' ');
      };

      // Cria o Workbook do ExcelJS
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet('Eleitores');

      // Adiciona o cabeçalho principal
      const headerRow = ws.addRow(headers);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' }
      };

      // Preenche os dados dos eleitores
      filteredVoters.forEach(voter => {
        const indicadoNome = indicados.find(i => i.uid === voter.indicado_uid)?.nome || '';
        const categoriaNome = categories.find(c => c.uid === voter.categoria_uid)?.nome || '';
        const atendimentoInfo = voterRowMap.get(voter.uid);

        const addedRow = ws.addRow([
          formatValue(voter.name),
          "", // Coluna B: Histórico de Atendimentos (preenchido abaixo com hyperlink nativo)
          formatValue(voter.cpf),
          formatDate(formatValue(voter.nascimento)),
          formatValue(voter.nome_mae),
          formatValue(voter.genero),
          formatValue(voter.whatsapp),
          formatValue(voter.telefone),
          formatValue(voter.instagram),
          formatValue(voter.numero_do_sus),
          formatValue(voter.titulo),
          formatValue(voter.zona),
          formatValue(voter.secao),
          formatValue(voter.colegio_eleitoral),
          formatValue(voter.cep),
          formatValue(voter.logradouro),
          formatValue(voter.numero),
          formatValue(voter.complemento),
          formatValue(voter.bairro),
          formatValue(voter.regiao_bairro),
          formatValue(voter.cidade),
          formatValue(voter.uf || voter.estado),
          formatValue(categoriaNome),
          formatValue(voter.confiabilidade_do_voto),
          formatValue(indicadoNome),
          formatValue(voter.responsavel),
          formatValue(voter.responsavel_pelo_eleitor),
          formatValue(voter.status),
          formatValue(voter.quantidade_adultos_residencia)
        ]);

        const cellLink = addedRow.getCell(2); // Coluna B
        if (atendimentoInfo) {
          cellLink.value = {
            text: `🔗 CLIQUE AQUI (${atendimentoInfo.count})`,
            hyperlink: `#'Atendimentos'!A${atendimentoInfo.startRow}`,
            tooltip: 'Clique para visualizar o histórico de atendimentos'
          };
          cellLink.font = {
            color: { argb: 'FF0000FF' }, // Azul clássico de hyperlink
            underline: true,
            bold: true
          };
        } else {
          cellLink.value = 'Nenhum atendimento';
          cellLink.font = {
            color: { argb: 'FF6C757D' } // Cinza
          };
        }
      });

      // --- ABA 2: Atendimentos ---
      const wsAtendimentos = workbook.addWorksheet('Atendimentos');
      
      const atendimentosHeaders = [
        'Nome do Eleitor',
        'CPF do Eleitor',
        'Data do Atendimento',
        'Descrição',
        'Categoria',
        'Responsável',
        'Status'
      ];

      const atendimentosHeaderRow = wsAtendimentos.addRow(atendimentosHeaders);
      atendimentosHeaderRow.font = { bold: true };
      atendimentosHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' }
      };

      const atendimentosRows = atendimentosMapeados.map(item => [
        formatValue(item.voterName),
        formatValue(item.voterCpf),
        formatValue(item.data),
        formatValue(item.descricao),
        formatValue(item.categoria),
        formatValue(item.responsavel),
        formatValue(item.status)
      ]);

      atendimentosRows.forEach(row => {
        wsAtendimentos.addRow(row);
      });

      // Autoajuste de largura de colunas na aba de Eleitores
      ws.columns.forEach(column => {
        let maxLen = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const val = cell.value;
          let len = 0;
          if (val && typeof val === 'object' && (val as any).text) {
            len = (val as any).text.length;
          } else if (val) {
            len = String(val).length;
          }
          if (len > maxLen) {
            maxLen = len;
          }
        });
        column.width = Math.max(maxLen + 3, 10);
      });

      // Autoajuste de largura de colunas na aba de Atendimentos
      wsAtendimentos.columns.forEach(column => {
        let maxLen = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const val = cell.value;
          const len = val ? String(val).length : 0;
          if (len > maxLen) {
            maxLen = len;
          }
        });
        wsAtendimentos.getColumn(column.number).width = Math.max(maxLen + 3, 10);
      });

      // Salva o arquivo XLSX completo usando exceljs
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `eleitores_com_atendimentos_${selectedCityView || 'todos'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(blob, fileName);
    } catch (err) {
      console.error('Erro ao gerar Excel completo:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filteredVoters, indicados, categories, selectedCityView, company?.uid]);

  // Popup ao clicar em cluster no modo densidade
  useEffect(() => {
    if (!markerClusterGroup || !map) return;

    const handleClusterClick = (e: any) => {
      if (voterViewMode !== 'densidade') return;

      const cluster = e.layer;
      const markers = cluster.getAllChildMarkers();

      const bairroCounts: Record<string, number> = {};
      markers.forEach((m: any) => {
        const bairro = m.options.voter?.bairro || 'Bairro não informado';
        bairroCounts[bairro] = (bairroCounts[bairro] || 0) + 1;
      });

      const sortedBairros = Object.entries(bairroCounts).sort((a, b) => b[1] - a[1]);
      const total = markers.length;

      const popupContent = `
        <div style="padding:8px; min-width:220px; font-family:sans-serif;">
          <h4 style="font-weight:bold; color:#1f2937; margin:0 0 8px 0; font-size:14px;">
            ${total} pessoa${total > 1 ? 's' : ''} cadastrada${total > 1 ? 's' : ''}
          </h4>
          <div style="display:flex; flex-direction:column; gap:4px;">
            ${sortedBairros.map(([bairro, count]) => `
              <div style="display:flex; justify-content:space-between; font-size:13px;">
                <span style="color:#4b5563;">${bairro}</span>
                <span style="font-weight:600; color:#2563eb;">${count}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      L.popup({ maxWidth: 300, minWidth: 200, className: 'rounded-lg shadow-lg' })
        .setLatLng(cluster.getLatLng())
        .setContent(popupContent)
        .openOn(map);
    };

    markerClusterGroup.on('clusterclick', handleClusterClick);

    return () => {
      markerClusterGroup.off('clusterclick', handleClusterClick);
    };
  }, [markerClusterGroup, voterViewMode, map]);

  // Atualização dos marcadores
  useEffect(() => {
    const activeCluster = markerClusterRef.current || markerClusterGroup;
    if (!map || !activeCluster) return;

    const updateMarkers = () => {
      const currentCluster = markerClusterRef.current || markerClusterGroup;
      if (!map || !currentCluster) return;

      // Limpa todos os marcadores do cluster atual
      currentCluster.clearLayers();

      // Se não há eleitores filtrados e não há demandas para exibir, limpa e retorna
      const hasDemandas = activeLayers.has('atendimentos') && filteredDemandas && filteredDemandas.length > 0;
      if (filteredVoters.length === 0 && !hasDemandas) {
        return;
      }

      // Restaurar última posição conhecida se disponível
      if (lastCenter.current && lastZoom.current) {
        map.setView(lastCenter.current, lastZoom.current, { animate: false });
      }

      // Criar marcadores apenas para os eleitores filtrados
      addMarkersToMap(filteredVoters);
    };

    // Atualizar marcadores com debounce
    if (updateTimeout.current) {
      clearTimeout(updateTimeout.current);
    }
    updateTimeout.current = setTimeout(updateMarkers, 300);

    return () => {
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }
    };
  }, [filteredVoters, map, markerClusterGroup, addMarkersToMap, activeLayers, filteredDemandas]);

  // Prevenir que cliques, arrastos e rolagem no painel de filtros afetem o mapa base do Leaflet
  useEffect(() => {
    const el = categoryFilterRef.current;
    if (!el) return;

    L.DomEvent.disableScrollPropagation(el);
    L.DomEvent.disableClickPropagation(el);

    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation();
    };
    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [showCategoryFilter]);

  // Alternar entre visualizações (markers, heatmap, circles)
  useEffect(() => {
    if (!map) return;

    const activeCluster = markerClusterRef.current || markerClusterGroup;

    // Remove preventivamente todas as instâncias de MarkerClusterGroup que possam ter vazado no mapa base
    map.eachLayer((layer: any) => {
      if (layer instanceof L.MarkerClusterGroup) {
        map.removeLayer(layer);
      }
    });

    if (heatmapLayerRef.current) {
      map.removeLayer(heatmapLayerRef.current);
      heatmapLayerRef.current = null;
    }
    if (circlesLayerRef.current) {
      map.removeLayer(circlesLayerRef.current);
      circlesLayerRef.current = null;
    }

    if (filteredVoters.length === 0) return;

    if (mapVisualization === 'heatmap') {
      // Criar heatmap
      const heatData = filteredVoters.map(v => [v.lat, v.lng, 1]);
      const heatLayer = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 18,
        max: 10,
        gradient: {
          0.0: 'blue',
          0.3: 'cyan',
          0.5: 'lime',
          0.7: 'yellow',
          1.0: 'red'
        }
      });
      heatLayer.addTo(map);
      heatmapLayerRef.current = heatLayer;
    } else if (mapVisualization === 'circles') {
      // Deixamos a camada de polígonos de realce e limites assumir o protagonismo completo
    } else {
      // Visualização padrão com marcadores
      if (activeCluster) {
        map.addLayer(activeCluster);
      }
    }
  }, [mapVisualization, filteredVoters, map, markerClusterGroup]);

  // Efeito para desenhar polígonos de realce para as áreas selecionadas
  useEffect(() => {
    if (!map) return;

    // Inicializa ou limpa a camada de áreas selecionadas
    if (!selectedAreasLayerRef.current) {
      selectedAreasLayerRef.current = L.layerGroup().addTo(map);
    } else {
      selectedAreasLayerRef.current.clearLayers();
    }

    const selectedAreasLayer = selectedAreasLayerRef.current;

    // Só desenha o contorno da cidade quando a camada 'cidades_bairros' (Localidade) ou 'atendimentos' (Demandas) está ativa
    const cityOutlineActive = (activeLayers.has('cidades_bairros') || activeLayers.has('atendimentos')) && !!cityGeoJson;
    if (cityOutlineActive) {
      try {
        let geometry = cityGeoJson.geojson;
        if (cityGeoJson.geojson.type === 'FeatureCollection') {
          geometry = cityGeoJson.geojson.features[0]?.geometry || cityGeoJson.geojson;
        } else if (cityGeoJson.geojson.type === 'Feature') {
          geometry = cityGeoJson.geojson.geometry || cityGeoJson.geojson;
        }
        
        const rings: Array<Array<[number, number]>> = [];
        if (geometry.type === 'Polygon') {
          geometry.coordinates.forEach((ring: any) => {
            const mappedRing = ring.map((coord: any) => [coord[1], coord[0]] as [number, number]);
            rings.push(mappedRing);
          });
        } else if (geometry.type === 'MultiPolygon') {
          geometry.coordinates.forEach((polygon: any) => {
            polygon.forEach((ring: any) => {
              const mappedRing = ring.map((coord: any) => [coord[1], coord[0]] as [number, number]);
              rings.push(mappedRing);
            });
          });
        }

        if (rings.length > 0) {
          // 1. Criar máscara escura ao redor (mundo inteiro com o município como furo/hole)
          const worldCoords = [
            [-90, -180],
            [-90, 180],
            [90, 180],
            [90, -180]
          ];
          
          const maskPolygon = L.polygon([worldCoords, ...rings], {
            fillColor: '#0a0a0a',   // Escuro profundo premium
            fillOpacity: 0.55,      // Escurece o entorno em 55% para focar na cidade
            stroke: false,
            interactive: false
          });
          selectedAreasLayer.addLayer(maskPolygon);

          // 2. Glow Neon Externo do contorno da cidade
          const cityGlowPolygon = L.polygon(rings, {
            fillColor: 'transparent',
            color: '#3b82f6',       // Azul royal brilhante
            weight: 10,             // Glow largo de destaque
            opacity: 0.45,
            lineJoin: 'round',
            interactive: false
          });
          selectedAreasLayer.addLayer(cityGlowPolygon);

          // 3. Contorno Principal Interno da cidade selecionada com pintura sólida, clara e nítida
          const cityMainPolygon = L.polygon(rings, {
            fillColor: '#3b82f6',   // Azul royal translúcido de alta visibilidade
            fillOpacity: 0.20,      // Preenchimento claro de 20% de opacidade
            color: '#1d4ed8',       // Borda sólida azul escura nítida (sem tracejado)
            weight: 4,              // Borda espessa
            lineJoin: 'round',
            interactive: false
          });

          cityMainPolygon.bindTooltip(`Município de ${selectedCityView}`, {
            permanent: true,
            direction: 'top',
            className: 'city-highlight-label'
          });

          selectedAreasLayer.addLayer(cityMainPolygon);
        }
      } catch (err) {
        console.error('Erro ao desenhar GeoJSON do IBGE/Nominatim:', err);
      }
    }

    // Desenha polígonos de bairro (convex hull) apenas no modo 'Áreas' legado (não mais vinculado à camada Localidade)
    // A camada Localidade agora mostra o contorno oficial do município (cityGeoJson) quando uma cidade está selecionada
    const shouldDrawAreas = mapVisualization === 'circles';
    if (!shouldDrawAreas || filteredVoters.length === 0) {
      return;
    }

    // Agrupa eleitores por Bairro
    const votersByBairro: Record<string, Voter[]> = {};
    filteredVoters.forEach(v => {
      const bairro = v.bairro?.trim();
      if (bairro) {
        if (!votersByBairro[bairro]) {
          votersByBairro[bairro] = [];
        }
        votersByBairro[bairro].push(v);
      }
    });

    // Se o usuário selecionou bairros específicos, desenhamos apenas esses.
    // Caso contrário, se selecionou cidade, desenha os bairros dessa cidade.
    // Se não selecionou nada específico, desenha todas as áreas que contêm pessoas visíveis.
    const bairrosParaDesenhar = Object.keys(votersByBairro).filter(bairro => {
      const bairroLower = bairro.toLowerCase();
      // Se há bairros selecionados explicitamente
      if (selectedBairros.size > 0) {
        const bairrosNormalized = Array.from(selectedBairros).map(b => b.trim().toLowerCase());
        return bairrosNormalized.includes(bairroLower);
      }
      // Se não há filtro de localização, mas a camada está ativa, mostramos o preenchimento de todas as áreas habitadas
      return true;
    });

    bairrosParaDesenhar.forEach((bairro, index) => {
      const votersInBairro = votersByBairro[bairro];
      if (!votersInBairro || votersInBairro.length === 0) return;

      // Filtra apenas pontos com geolocalizações distintas para evitar círculos e textos encavalados
      const uniquePoints: Array<[number, number]> = [];
      const seenCoords = new Set<string>();
      votersInBairro.forEach(v => {
        if (typeof v.lat === 'number' && typeof v.lng === 'number' && !isNaN(v.lat) && !isNaN(v.lng)) {
          const key = `${v.lat.toFixed(5)},${v.lng.toFixed(5)}`;
          if (!seenCoords.has(key)) {
            seenCoords.add(key);
            uniquePoints.push([v.lat, v.lng]);
          }
        }
      });

      if (uniquePoints.length >= 3) {
        // Calcula a envoltória convexa (Convex Hull) para formar o polígono das áreas distintas
        const hull = getConvexHull(uniquePoints);

        // Cor única e sutil para todos os bairros — visual limpo e não polui o mapa
        const polygon = L.polygon(hull, {
          fillColor: '#10B981',
          fillOpacity: 0.10,
          color: '#059669',
          weight: 1,
          lineJoin: 'round'
        });

        // Popup no hover/clique com informações do bairro
        polygon.bindPopup(`
          <div class="p-1 text-center">
            <h4 class="font-bold text-gray-800 dark:text-gray-100 text-sm mb-1">${bairro}</h4>
            <p class="text-xs text-gray-600 dark:text-gray-400 font-medium">${votersInBairro.length} pessoas cadastradas</p>
          </div>
        `, { className: 'rounded-lg shadow-md' });

        // Tooltip no hover (não permanente) para não poluir o mapa
        polygon.bindTooltip(bairro, {
          permanent: false,
          direction: 'center',
          className: 'bairro-map-label'
        });

        selectedAreasLayer.addLayer(polygon);
      } else if (uniquePoints.length > 0) {
        // Se houver 1 ou 2 pontos únicos, desenhamos círculos semitransparentes ao redor para demarcar a presença
        uniquePoints.forEach((pt) => {
          const circle = L.circle(pt, {
            radius: 120,
            fillColor: '#10B981',
            fillOpacity: 0.10,
            color: '#059669',
            weight: 1
          });

          circle.bindPopup(`
            <div class="p-1 text-center">
              <h4 class="font-bold text-gray-800 dark:text-gray-100 text-sm mb-1">${bairro}</h4>
              <p class="text-xs text-gray-600 dark:text-gray-400 font-medium">${votersInBairro.length} pessoas cadastradas</p>
            </div>
          `, { className: 'rounded-lg shadow-md' });

          // Tooltip no hover (não permanente)
          circle.bindTooltip(bairro, {
            permanent: false,
            direction: 'center',
            className: 'bairro-map-label'
          });

          selectedAreasLayer.addLayer(circle);
        });
      }
    });
  }, [map, filteredVoters, activeLayers, selectedBairros, selectedCidades, selectedCityView, mapVisualization, cityGeoJson]);

  // Centralizar mapa na cidade selecionada usando prioritariamente as divisas geográficas reais do GeoJSON oficial
  useEffect(() => {
    if (!map) return;

    // 1. Se a malha oficial da cidade selecionada (ou detectada por camada ativa) estiver carregada, enquadra usando as divisas geográficas reais do município
    if (cityGeoJson && (selectedCityView || activeLayers.has('cidades_bairros') || activeLayers.has('atendimentos'))) {
      try {
        const tempLayer = L.geoJSON(cityGeoJson.geojson);
        const bounds = tempLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
          return; // Enquadramento por divisas geográficas oficiais aplicado com sucesso!
        }
      } catch (err) {
        console.error('Erro ao centralizar mapa pelas coordenadas oficiais do GeoJSON:', err);
      }
    }

    // 2. Se selectedCityView está ativo e o GeoJSON ainda está carregando, centraliza provisoriamente pelas coordenadas dos eleitores
    if (selectedCityView) {
      const cityVoters = voters.filter(v => 
        v.cidade?.trim().toLowerCase() === selectedCityView.trim().toLowerCase()
      );

      if (cityVoters.length > 0) {
        const bounds = L.latLngBounds(
          cityVoters.map(v => [v.lat, v.lng])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        return;
      }
    }

    // 3. Se a camada de demandas está ativa e temos demandas válidas com coordenadas (fallback caso GeoJSON falhe ou demore)
    if (activeLayers.has('atendimentos') && filteredDemandas && filteredDemandas.length > 0) {
      const validDemands = filteredDemandas.filter(d => d.lat && d.lng);
      if (validDemands.length > 0) {
        const bounds = L.latLngBounds(validDemands.map(d => [d.lat, d.lng]));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      }
    }
  }, [selectedCityView, cityGeoJson, voters, map, activeLayers, filteredDemandas]);

  // Direcionar o mapa automaticamente quando cidades são selecionadas via checkbox no filtro lateral
  useEffect(() => {
    if (!map) return;

    if (selectedCidades.size === 1) {
      // Uma cidade selecionada → carrega seu GeoJSON e centraliza (via selectedCityView)
      const cidade = Array.from(selectedCidades)[0];
      setSelectedCityView(cidade);
    } else if (selectedCidades.size > 1) {
      // Múltiplas cidades → centraliza nos eleitores das cidades selecionadas
      const cidadesNormalized = Array.from(selectedCidades).map(c => c.trim().toLowerCase());
      const cityVoters = voters.filter(v => {
        const voterCidade = v.cidade?.trim().toLowerCase() || '';
        return cidadesNormalized.includes(voterCidade);
      });
      if (cityVoters.length > 0) {
        const bounds = L.latLngBounds(cityVoters.map(v => [v.lat, v.lng]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
      setSelectedCityView('');
    } else {
      // Nenhuma cidade selecionada → limpa
      setSelectedCityView('');
    }
  }, [selectedCidades, voters, map]);

  // Direcionar o mapa automaticamente aos eleitores filtrados quando filtros (gênero, confiabilidade, etc.) são alterados
  useEffect(() => {
    if (!map || !filteredVoters || filteredVoters.length === 0) return;
    // Se selectedCityView está ativo, o efeito acima já cuida da centralização; senão, centraliza nos eleitores filtrados
    if (selectedCityView) return;

    const bounds = L.latLngBounds(filteredVoters.map(v => [v.lat, v.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [map, filteredVoters, selectedGeneros, selectedConfiabilidade, selectedCategories, selectedIndicados, selectedAtendimentos, selectedBairros, selectedCityView]);

  // Carregar GeoJSON automaticamente quando filtros resultam em eleitores de uma cidade predominante
  useEffect(() => {
    if (!filteredVoters || filteredVoters.length === 0) return;
    if (selectedCityView) return; // Já está tratado pelo useEffect abaixo

    // Detecta a cidade mais frequente nos eleitores filtrados
    const cityCounts: Record<string, number> = {};
    filteredVoters.forEach(v => {
      const cidade = v.cidade?.trim();
      if (cidade) cityCounts[cidade.toLowerCase()] = (cityCounts[cidade.toLowerCase()] || 0) + 1;
    });

    const sortedCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]);
    if (sortedCities.length === 0) return;

    const predominantLower = sortedCities[0][0];
    const predominantCityObj = filteredVoters.find(v => v.cidade?.trim().toLowerCase() === predominantLower);
    const predominantCity = predominantCityObj?.cidade?.trim() || predominantLower;

    // Só busca se ainda não temos o GeoJSON dessa cidade
    if (cityGeoJson && cityGeoJson.cityName.toLowerCase() === predominantCity.toLowerCase()) return;

    const timer = setTimeout(async () => {
      const geojson = await fetchCityBoundary(predominantCity);
      if (geojson) {
        setCityGeoJson({ cityName: predominantCity, geojson });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [filteredVoters, selectedCityView, cityGeoJson]);

  // Carregar GeoJSON do limite do município do OpenStreetMap (Nominatim) ao selecionar a cidade
  useEffect(() => {
    // Limpa síncronamente o estado anterior para evitar que limites de cidades antigas apareçam na tela com novos filtros
    setCityGeoJson(null);

    if (!selectedCityView) {
      return;
    }

    const timer = setTimeout(async () => {
      const geojson = await fetchCityBoundary(selectedCityView);
      if (geojson) {
        setCityGeoJson({ cityName: selectedCityView, geojson });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedCityView]);

  // Quando a camada Localidade ou Demandas é ativada sem cidade selecionada no filtro,
  // detecta automaticamente a cidade mais frequente e carrega seu GeoJSON
  useEffect(() => {
    if (!activeLayers.has('cidades_bairros') && !activeLayers.has('atendimentos')) return;
    if (selectedCityView) return;
    if (activeLayers.has('cidades_bairros') && !activeLayers.has('atendimentos') && selectedCidades.size === 0) return; // Não carrega contorno se nenhuma cidade estiver selecionada para Localidades
    
    const hasVoters = filteredVoters && filteredVoters.length > 0;
    const hasDemands = activeLayers.has('atendimentos') && filteredDemandas && filteredDemandas.length > 0;
    if (!hasVoters && !hasDemands) return;

    // Detecta a cidade mais frequente nos eleitores filtrados ou demandas
    const cityCounts: Record<string, number> = {};
    
    if (hasVoters) {
      filteredVoters.forEach(v => {
        const cidade = v.cidade?.trim();
        if (cidade) {
          cityCounts[cidade.toLowerCase()] = (cityCounts[cidade.toLowerCase()] || 0) + 1;
        }
      });
    }

    if (hasDemands) {
      filteredDemandas.forEach(d => {
        const cidade = d.cidade?.trim();
        if (cidade) {
          cityCounts[cidade.toLowerCase()] = (cityCounts[cidade.toLowerCase()] || 0) + 1;
        }
      });
    }

    const sortedCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]);
    if (sortedCities.length === 0) return;

    const predominantLower = sortedCities[0][0];
    let predominantCity = predominantLower;
    if (hasVoters) {
      const found = filteredVoters.find(v => v.cidade?.trim().toLowerCase() === predominantLower);
      if (found?.cidade) predominantCity = found.cidade.trim();
    } else if (hasDemands) {
      const found = filteredDemandas.find(d => d.cidade?.trim().toLowerCase() === predominantLower);
      if (found?.cidade) predominantCity = found.cidade.trim();
    }

    // Só busca se ainda não temos o GeoJSON dessa cidade
    if (cityGeoJson && cityGeoJson.cityName.toLowerCase() === predominantCity.toLowerCase()) return;

    const timer = setTimeout(async () => {
      const geojson = await fetchCityBoundary(predominantCity);
      if (geojson) {
        setCityGeoJson({ cityName: predominantCity, geojson });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [activeLayers, selectedCityView, filteredVoters, cityGeoJson, filteredDemandas]);

  // Eventos do mapa
  useEffect(() => {
    if (!map) return;

    const handleMoveEnd = () => {
      if (!map) return;
      lastCenter.current = map.getCenter();
      lastZoom.current = map.getZoom();
    };

    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
    };
  }, [map]);

  // Função para capturar/imprimir o mapa
  const handleCaptureMap = useCallback(async () => {
    try {
      // Importa html2canvas dinamicamente
      const html2canvas = (await import('html2canvas')).default;
      
      const mapElement = containerRef.current;
      if (!mapElement) return;

      // Esconde temporariamente os painéis e controles
      const elementsToHide = mapElement.querySelectorAll('.leaflet-control-container, [class*="absolute"]');
      const originalDisplays: string[] = [];
      
      elementsToHide.forEach((el) => {
        const htmlEl = el as HTMLElement;
        originalDisplays.push(htmlEl.style.display);
        htmlEl.style.display = 'none';
      });

      // Aguarda um momento para garantir que os elementos foram escondidos
      await new Promise(resolve => setTimeout(resolve, 100));

      // Captura o elemento do mapa
      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 2, // Maior qualidade
      });

      // Restaura a visibilidade dos elementos
      elementsToHide.forEach((el, index) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.display = originalDisplays[index];
      });

      // Converte para blob e baixa
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `mapa-eleitoral-${new Date().toISOString().split('T')[0]}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (error) {
      console.error('Erro ao capturar mapa:', error);
      alert('Erro ao capturar o mapa. Tente novamente.');
    }
  }, []);

  // Função para alternar o modo tela cheia
  const toggleFullscreen = useCallback(async () => {
    try {
      const mapContainer = containerRef.current;
      if (!mapContainer) return;

      if (!isFullscreen) {
        if (mapContainer.requestFullscreen) {
          await mapContainer.requestFullscreen();
        } else if ((mapContainer as any).webkitRequestFullscreen) {
          await (mapContainer as any).webkitRequestFullscreen();
        } else if ((mapContainer as any).msRequestFullscreen) {
          await (mapContainer as any).msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Erro ao alternar modo tela cheia:', error);
    }
  }, [isFullscreen]);

  // Efeito para atualizar o mapa quando o modo tela cheia muda
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isDocFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );
      
      if (!isDocFullscreen && isFullscreen) {
        setIsFullscreen(false);
      }

      // Atualizar o tamanho do mapa após um pequeno delay
      setTimeout(() => {
        if (map) {
          map.invalidateSize();
        }
      }, 100);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen, map]);

  // Função para limpar a busca
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setVisibleVoters([]);
    if (mapRef.current) {
      mapRef.current.setView([-8.0476, -34.8770], 13);
    }
  }, []);

  // Função de filtro aprimorada
  const filterVoters = useCallback((query: string) => {
    if (!query.trim()) {
      setVisibleVoters(voters);
      if (map && markerClusterGroup) {
        const group = L.featureGroup(voters.map(voter => {
          if (!voter.lat || !voter.lng) return null;
          return L.marker([voter.lat, voter.lng]);
        }).filter(Boolean) as L.Marker[]);
        
        if (group.getLayers().length > 0) {
          map.fitBounds(group.getBounds(), { padding: [50, 50] });
        }
      }
      return;
    }

    const searchTerms = normalizeText(query).split(/\s+/);
    
    // Função para verificar se é um CEP
    const isCepSearch = (term: string) => {
      const cepDigits = term.replace(/\D/g, '');
      return cepDigits.length >= 5;
    };

    // Função para verificar se é uma busca por número
    const isNumberSearch = (term: string) => {
      return /^\d+$/.test(term);
    };

    // Função para calcular relevância de CEP
    const calculateCepRelevance = (voterCep: string, searchCep: string): number => {
      const normalizedVoterCep = voterCep.replace(/\D/g, '');
      const normalizedSearchCep = searchCep.replace(/\D/g, '');
      
      if (normalizedVoterCep === normalizedSearchCep) return 20; // Match exato
      if (normalizedVoterCep.startsWith(normalizedSearchCep)) return 15; // Match no início
      if (normalizedVoterCep.includes(normalizedSearchCep)) return 10; // Match parcial
      return 0;
    };

    // Função para calcular relevância de logradouro
    const calculateAddressRelevance = (address: string, term: string): number => {
      const normalizedAddress = normalizeText(address);
      const words = normalizedAddress.split(/\s+/);
      
      // Match exato no endereço completo
      if (normalizedAddress === term) return 20;
      
      // Match em palavras específicas do endereço
      for (const word of words) {
        if (word === term) return 15; // Match exato em uma palavra
        if (word.startsWith(term)) return 10; // Match no início de uma palavra
      }
      
      // Match parcial em qualquer parte
      if (normalizedAddress.includes(term)) return 5;
      
      return 0;
    };

    const filtered = voters
      .map(voter => {
        let relevance = 0;
        const matches = searchTerms.every(term => {
          let termMatched = false;

          // Busca por CEP
          if (isCepSearch(term) && voter.cep) {
            const cepRelevance = calculateCepRelevance(voter.cep, term);
            if (cepRelevance > 0) {
              relevance += cepRelevance;
              termMatched = true;
            }
          }
          
          // Busca por logradouro
          if (!termMatched && voter.address) {
            // Se o termo é um número, dá prioridade para match exato no número
            if (isNumberSearch(term)) {
              const addressNumber = voter.address.match(/\d+/)?.[0];
              if (addressNumber === term) {
                relevance += 20;
                termMatched = true;
              }
            }
            
            // Se ainda não encontrou match, procura no endereço completo
            if (!termMatched) {
              const addressRelevance = calculateAddressRelevance(voter.address, term);
              if (addressRelevance > 0) {
                relevance += addressRelevance;
                termMatched = true;
              }
            }
          }

          // Busca em outros campos se ainda não encontrou match
          if (!termMatched) {
            const fields = [
              { value: voter.cidade || '', weight: 4 },
              { value: voter.bairro || '', weight: 4 }
            ];

            termMatched = fields.some(field => {
              const normalizedField = normalizeText(field.value);
              if (normalizedField === term) {
                relevance += 3 * field.weight;
                return true;
              }
              if (normalizedField.startsWith(term)) {
                relevance += 2 * field.weight;
                return true;
              }
              if (normalizedField.includes(term)) {
                relevance += field.weight;
                return true;
              }
              return false;
            });
          }

          return termMatched;
        });

        return { voter, matches, relevance };
      })
      .filter(item => item.matches)
      .sort((a, b) => b.relevance - a.relevance)
      .map(item => item.voter);

    setVisibleVoters(filtered);

    if (filtered.length > 0 && map && markerClusterGroup) {
      const group = L.featureGroup(filtered.map(voter => {
        if (!voter.lat || !voter.lng) return null;
        return L.marker([voter.lat, voter.lng]);
      }).filter(Boolean) as L.Marker[]);
      
      if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds(), { padding: [50, 50] });
      }
    }
  }, [voters, map, markerClusterGroup]);

  // Debounce do filtro
  const debouncedFilter = useMemo(
    () => debounce(filterVoters, 300),
    [filterVoters]
  );

  // Função para calcular estatísticas dos eleitores visíveis
  const calculateVisibleStats = useCallback(() => {
    if (!map || !markerClusterGroup) return;

    const bounds = map.getBounds();
    const visibleVoters = voters.filter(voter => {
      return bounds.contains(L.latLng(voter.lat, voter.lng));
    });

    // Calcula estatísticas de bairros
    const bairrosCount = visibleVoters.reduce((acc, voter) => {
      const bairro = voter.bairro || 'Não informado';
      acc[bairro] = (acc[bairro] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bairrosEntries = Object.entries(bairrosCount);
    const bairroMaisPopuloso = bairrosEntries.reduce(
      (max, [bairro, count]) => (count > max.count ? { bairro, count } : max),
      { bairro: '', count: 0 }
    );

    // Calcula estatísticas de cidades
    const cidadesCount = visibleVoters.reduce((acc, voter) => {
      const cidade = voter.cidade || 'Não informada';
      acc[cidade] = (acc[cidade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const cidadesEntries = Object.entries(cidadesCount);
    const cidadeMaisPopulosa = cidadesEntries.reduce(
      (max, [cidade, count]) => (count > max.count ? { cidade, count } : max),
      { cidade: '', count: 0 }
    );

    setMapStats({
      totalEleitores: visibleVoters.length,
      bairros: {
        total: bairrosEntries.length,
        maisPopuloso: {
          nome: bairroMaisPopuloso.bairro,
          quantidade: bairroMaisPopuloso.count,
          percentual: (bairroMaisPopuloso.count / visibleVoters.length) * 100
        }
      },
      cidades: {
        total: cidadesEntries.length,
        maisPopulosa: {
          nome: cidadeMaisPopulosa.cidade,
          quantidade: cidadeMaisPopulosa.count,
          percentual: (cidadeMaisPopulosa.count / visibleVoters.length) * 100
        }
      }
    });
  }, [map, markerClusterGroup, voters]);

  // Atualiza as estatísticas quando o mapa se move ou dá zoom
  useEffect(() => {
    if (!map) return;

    const handleMapChange = () => {
      calculateVisibleStats();
    };

    map.on('moveend', handleMapChange);
    map.on('zoomend', handleMapChange);

    // Calcula estatísticas iniciais
    calculateVisibleStats();

    return () => {
      map.off('moveend', handleMapChange);
      map.off('zoomend', handleMapChange);
    };
  }, [map, calculateVisibleStats]);

  // Atualiza o mapa quando os eleitores mudarem
  useEffect(() => {
    if (!map || !voters.length) return;

    const bounds = calculateBounds(voters);
    if (bounds) {
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15
      });
    }
  }, [map, voters, calculateBounds]);

  // Calcular totais e visíveis com base nas camadas ativas
  const displayTotal = useMemo(() => {
    let total = 0;
    const temVotantesAtivos = activeLayers.has('eleitores') || 
                              activeLayers.has('categorias') || 
                              activeLayers.has('indicado') || 
                              activeLayers.has('cidades_bairros') || 
                              activeLayers.has('colegio');
    const temDemandasAtivas = activeLayers.has('atendimentos');

    if (temVotantesAtivos) {
      total += voters.length;
    }
    if (temDemandasAtivas) {
      total += demandas.length;
    }
    // Fallback se nada estiver selecionado
    if (total === 0) {
      total = voters.length;
    }
    return total;
  }, [activeLayers, voters, demandas]);

  const displayVisibles = useMemo(() => {
    let visibles = 0;
    const temVotantesAtivos = activeLayers.has('eleitores') || 
                              activeLayers.has('categorias') || 
                              activeLayers.has('indicado') || 
                              activeLayers.has('cidades_bairros') || 
                              activeLayers.has('colegio');
    const temDemandasAtivas = activeLayers.has('atendimentos');

    if (temVotantesAtivos) {
      visibles += filteredVoters.length;
    }
    if (temDemandasAtivas) {
      visibles += filteredDemandas.length;
    }
    return visibles;
  }, [activeLayers, filteredVoters, filteredDemandas]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full"
      style={{
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : undefined,
        left: isFullscreen ? 0 : undefined,
        right: isFullscreen ? 0 : undefined,
        bottom: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 9999 : undefined,
        backgroundColor: 'white',
        height: isFullscreen ? '100vh' : '100%',
        width: isFullscreen ? '100vw' : '100%'
      }}
    >
      <style>{`
        .bairro-map-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          font-weight: 800 !important;
          font-size: 11px !important;
          color: #111827 !important;
          text-shadow: -1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff !important;
          transition: none !important;
          white-space: nowrap !important;
          pointer-events: none !important;
        }
        .dark .bairro-map-label {
          color: #f9fafb !important;
          text-shadow: -1.5px -1.5px 0 #1f2937, 1.5px -1.5px 0 #1f2937, -1.5px 1.5px 0 #1f2937, 1.5px 1.5px 0 #1f2937 !important;
        }
        .leaflet-tooltip-pane {
          z-index: 650 !important;
        }
        .city-highlight-label {
          background: #2563EB !important;
          color: white !important;
          border: none !important;
          border-radius: 4px !important;
          padding: 3px 8px !important;
          font-weight: 800 !important;
          font-size: 11px !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
          text-shadow: none !important;
        }
        .invisible-voter-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      {/* Barra superior com controles */}
      <div className={`absolute top-2 left-2 z-[1000] flex flex-row flex-nowrap gap-2 transition-all duration-200 ${showCategoryFilter ? 'right-2 sm:right-[466px]' : 'right-2'}`}>
        {/* Searchbox e botão de estatísticas */}
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              placeholder="Buscar por cidade, bairro, CEP ou endereço..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                debouncedFilter(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 text-sm sm:text-base rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-white"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  debouncedFilter('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            )}
          </div>

        {/* Controles do mapa */}
        <div className="flex gap-1.5 sm:gap-2 justify-end flex-shrink-0">
          <button
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative flex-shrink-0"
            title="Filtrar Categorias"
          >
            <svg className="h-5 w-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {selectedCategories.size < categories.length && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                {selectedCategories.size}
              </span>
            )}
          </button>

          {userLocation && (
            <button
              onClick={() => {
                if (map && userLocation) {
                  map.setView([userLocation.lat, userLocation.lng], 15);
                }
              }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
              title="Ir para minha localização"
            >
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}

          <button
            onClick={handleCaptureMap}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
            title="Capturar/Imprimir Mapa"
          >
            <Camera className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
            title={isFullscreen ? "Pressione ESC para sair da tela cheia" : "Tela cheia"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            ) : (
              <Maximize2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            )}
          </button>

        </div>
      </div>

      {/* Painel de Filtro de Categorias */}
      {showCategoryFilter && (
        <div 
          ref={categoryFilterRef}
          className="fixed inset-0 sm:fixed sm:inset-auto sm:right-2 sm:top-0 sm:bottom-0 z-[9999] sm:w-[450px] sm:h-screen transition-all duration-200 ease-in-out flex flex-col cursor-default"
          style={{ cursor: 'default' }}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation();
            // Desabilita temporariamente o drag do mapa
            if (map) {
              map.dragging.disable();
            }
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            // Reabilita o drag do mapa
            if (map) {
              map.dragging.enable();
            }
          }}
          onMouseLeave={() => {
            // Reabilita o drag quando o mouse sai do painel
            if (map) {
              map.dragging.enable();
            }
          }}
          onDragStart={(e) => e.preventDefault()}
        >
          <div className="bg-white dark:bg-gray-800 sm:bg-white/95 sm:dark:bg-gray-800/95 sm:backdrop-blur-sm rounded-none sm:rounded-lg shadow-lg flex flex-col h-full sm:max-h-full">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filtrar por Categoria
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowCategoryFilter(false)} className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-full">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="p-3 overflow-y-auto overflow-x-hidden flex-1 flex flex-col">
              {/* Opção de desagrupar pinos */}
              <label className="flex items-center gap-2 p-2 mb-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="checkbox"
                  checked={disableClustering}
                  onChange={(e) => setDisableClustering(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Desagrupar pinos no mapa
                </span>
              </label>

              {/* Filtro por Cidade */}
              {activeLayers.has('cidades_bairros') && uniqueCidades.length > 0 && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Building className="h-4 w-4 text-green-600" />
                      Cidades ({uniqueCidades.length})
                    </label>
                    {selectedCidades.size > 0 && (
                      <button
                        onClick={() => {
                          setSelectedCidades(new Set());
                          setSelectedBairros(new Set());
                        }}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors flex items-center gap-1"
                        title="Limpar Localidade"
                      >
                        <X className="h-3 w-3" />
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                    {uniqueCidades.map((cidade) => (
                      <label key={cidade} className="flex items-center gap-2 p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCidades.has(cidade)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedCidades);
                            const newBairros = new Set(selectedBairros);
                            if (e.target.checked) {
                              newSelected.add(cidade);
                              // Automaticamente selecionar todos os bairros desta cidade
                              const bairrosDaCidade = bairrosPorCidade.get(cidade);
                              if (bairrosDaCidade) {
                                bairrosDaCidade.forEach(bairro => newBairros.add(bairro));
                              }
                            } else {
                              newSelected.delete(cidade);
                              // Remover bairros desta cidade da seleção
                              const bairrosDaCidade = bairrosPorCidade.get(cidade);
                              if (bairrosDaCidade) {
                                bairrosDaCidade.forEach(bairro => newBairros.delete(bairro));
                              }
                            }
                            setSelectedCidades(newSelected);
                            setSelectedBairros(newBairros);
                          }}
                          className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{cidade} ({countByCidade[cidade.toLowerCase()] || 0})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtro por Bairro */}
              {activeLayers.has('cidades_bairros') && bairrosExibidos.length > 0 && (
                <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-orange-600" />
                      Bairros {selectedCidades.size > 0 && <span className="text-xs text-gray-500">(das cidades selecionadas)</span>}
                      <span className="text-xs bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-0.5 rounded-full">
                        {bairrosExibidos.length}
                      </span>
                    </label>
                    {selectedBairros.size > 0 && (
                      <button
                        onClick={() => setSelectedBairros(new Set())}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors flex items-center gap-1"
                        title="Limpar Bairros"
                      >
                        <X className="h-3 w-3" />
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                    {bairrosExibidos.map((bairro) => (
                      <label key={bairro} className="flex items-center gap-2 p-1 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedBairros.has(bairro)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedBairros);
                            if (e.target.checked) {
                              newSelected.add(bairro);
                            } else {
                              newSelected.delete(bairro);
                            }
                            setSelectedBairros(newSelected);
                          }}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{bairro} ({countByBairro[bairro] || 0})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtro por Gênero */}
              {activeLayers.has('eleitores') && uniqueGeneros.length > 0 && (
                <div className="mb-4 p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                    Gênero ({uniqueGeneros.length})
                  </label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {uniqueGeneros.map((genero) => (
                      <label key={genero} className="flex items-center gap-2 p-1 rounded hover:bg-pink-100 dark:hover:bg-pink-900/30 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedGeneros.has(genero)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedGeneros);
                            if (e.target.checked) {
                              newSelected.add(genero);
                            } else {
                              newSelected.delete(genero);
                            }
                            setSelectedGeneros(newSelected);
                          }}
                          className="w-4 h-4 text-pink-600 rounded focus:ring-2 focus:ring-pink-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{genero} ({countByGenero[genero] || 0})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtro por Confiabilidade do Voto */}
              {activeLayers.has('eleitores') && uniqueConfiabilidade.length > 0 && (
                <div className="mb-4 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                    Confiabilidade do Voto ({uniqueConfiabilidade.length})
                  </label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {uniqueConfiabilidade.map((conf) => (
                      <label key={conf} className="flex items-center gap-2 p-1 rounded hover:bg-teal-100 dark:hover:bg-teal-900/30 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedConfiabilidade.has(conf)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedConfiabilidade);
                            if (e.target.checked) {
                              newSelected.add(conf);
                            } else {
                              newSelected.delete(conf);
                            }
                            setSelectedConfiabilidade(newSelected);
                          }}
                          className="w-4 h-4 text-teal-600 rounded focus:ring-2 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{conf} ({countByConfiabilidade[conf] || 0})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtros de Demandas de Rua */}
              {activeLayers.has('atendimentos') && (
                <>
                  {/* Tipo de Demanda */}
                  {uniqueTiposDemanda.length > 0 && (
                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/50 flex flex-col max-h-48 flex-shrink-0 min-h-[120px]">
                      <div className="flex items-center justify-between mb-2 flex-shrink-0">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
                          Tipos de Demanda ({uniqueTiposDemanda.length})
                        </label>
                        {selectedTiposDemanda.size > 0 && (
                          <button
                            onClick={() => setSelectedTiposDemanda(new Set())}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                            title="Limpar Tipos"
                          >
                            <X className="h-3 w-3" />
                            Limpar
                          </button>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
                        {uniqueTiposDemanda.map((tipo) => (
                          <label key={tipo} className="flex items-center gap-2 p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/20 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedTiposDemanda.has(tipo)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedTiposDemanda);
                                if (e.target.checked) {
                                  newSelected.add(tipo);
                                } else {
                                  newSelected.delete(tipo);
                                }
                                setSelectedTiposDemanda(newSelected);
                              }}
                              className="w-4 h-4 text-amber-600 rounded focus:ring-2 focus:ring-amber-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{tipo} ({countByTipoDemanda[tipo] || 0})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cidades - Demandas */}
                  {uniqueCidadesDemanda.length > 0 && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800/50 flex flex-col max-h-48 flex-shrink-0 min-h-[120px]">
                      <div className="flex items-center justify-between mb-2 flex-shrink-0">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <Building className="h-4 w-4 text-green-600" />
                          Cidades - Demandas ({uniqueCidadesDemanda.length})
                        </label>
                        {selectedCidadesDemanda.size > 0 && (
                          <button
                            onClick={() => {
                              setSelectedCidadesDemanda(new Set());
                              setSelectedBairrosDemanda(new Set());
                            }}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                            title="Limpar Cidades"
                          >
                            <X className="h-3 w-3" />
                            Limpar
                          </button>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
                        {uniqueCidadesDemanda.map((cidade) => (
                          <label key={cidade} className="flex items-center gap-2 p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/20 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedCidadesDemanda.has(cidade)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedCidadesDemanda);
                                const newBairros = new Set(selectedBairrosDemanda);
                                if (e.target.checked) {
                                  newSelected.add(cidade);
                                  const bairrosDaCidade = bairrosDemandaPorCidade.get(cidade);
                                  if (bairrosDaCidade) {
                                    bairrosDaCidade.forEach(b => newBairros.add(b));
                                  }
                                } else {
                                  newSelected.delete(cidade);
                                  const bairrosDaCidade = bairrosDemandaPorCidade.get(cidade);
                                  if (bairrosDaCidade) {
                                    bairrosDaCidade.forEach(b => newBairros.delete(b));
                                  }
                                }
                                setSelectedCidadesDemanda(newSelected);
                                setSelectedBairrosDemanda(newBairros);
                              }}
                              className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{cidade} ({countByCidadeDemanda[cidade.toLowerCase()] || 0})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bairros - Demandas (Atrelados à Cidade) */}
                  {bairrosDemandaExibidos.length > 0 && (
                    <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800/50 flex flex-col max-h-48 flex-shrink-0 min-h-[120px]">
                      <div className="flex items-center justify-between mb-2 flex-shrink-0">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-orange-600" />
                          Bairros - Demandas ({bairrosDemandaExibidos.length})
                        </label>
                        {selectedBairrosDemanda.size > 0 && (
                          <button
                            onClick={() => setSelectedBairrosDemanda(new Set())}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                            title="Limpar Bairros"
                          >
                            <X className="h-3 w-3" />
                            Limpar
                          </button>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
                        {bairrosDemandaExibidos.map((bairro) => (
                          <label key={bairro} className="flex items-center gap-2 p-1 rounded hover:bg-orange-100 dark:hover:bg-orange-900/20 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedBairrosDemanda.has(bairro)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedBairrosDemanda);
                                if (e.target.checked) {
                                  newSelected.add(bairro);
                                } else {
                                  newSelected.delete(bairro);
                                }
                                setSelectedBairrosDemanda(newSelected);
                              }}
                              className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{bairro} ({countByBairroDemanda[bairro] || 0})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status - Demandas */}
                  {uniqueStatusDemanda.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800/50 flex flex-col max-h-48 flex-shrink-0 min-h-[120px]">
                      <div className="flex items-center justify-between mb-2 flex-shrink-0">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
                          Status - Demandas ({uniqueStatusDemanda.length})
                        </label>
                        {selectedStatusDemanda.size > 0 && (
                          <button
                            onClick={() => setSelectedStatusDemanda(new Set())}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                            title="Limpar Status"
                          >
                            <X className="h-3 w-3" />
                            Limpar
                          </button>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
                        {uniqueStatusDemanda.map((status) => (
                          <label key={status} className="flex items-center gap-2 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedStatusDemanda.has(status)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedStatusDemanda);
                                if (e.target.checked) {
                                  newSelected.add(status);
                                } else {
                                  newSelected.delete(status);
                                }
                                setSelectedStatusDemanda(newSelected);
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {STATUS_LABELS[status.toLowerCase()] || status} ({countByStatusDemanda[status] || 0})
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Filtro por Atendimento */}
              {activeLayers.has('atendimentos') && uniqueAtendimentos.length > 0 && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Solicitações / Atendimentos ({uniqueAtendimentos.length})
                  </label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {uniqueAtendimentos.map((atend) => (
                      <label key={atend} className="flex items-center gap-2 p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAtendimentos.has(atend)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedAtendimentos);
                            if (e.target.checked) {
                              newSelected.add(atend);
                            } else {
                              newSelected.delete(atend);
                            }
                            setSelectedAtendimentos(newSelected);
                          }}
                          className="w-4 h-4 text-amber-600 rounded focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{atend} ({countByAtendimento[atend] || 0})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtro por Quem Indicou */}
              {activeLayers.has('indicado') && indicados.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    Indicado por ({indicados.length})
                  </label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {sortedIndicados.map((ind) => (
                      <label key={ind.uid} className="flex items-center gap-2 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedIndicados.has(ind.uid)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedIndicados);
                            if (e.target.checked) {
                              newSelected.add(ind.uid);
                            } else {
                              newSelected.delete(ind.uid);
                            }
                            setSelectedIndicados(newSelected);
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{ind.nome} ({countByIndicado[ind.uid] || 0})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Categorias agrupadas por tipo */}
              {activeLayers.has('categorias') && (
                <>
                  <div className="space-y-3">
                {(() => {
                  // Filtra categorias que têm pelo menos 1 eleitor
                  const categoriesWithVoters = categories.filter(cat => 
                    voters.some(voter => voter.categoria_uid === cat.uid)
                  );

                  // Agrupa categorias por tipo
                  const grouped = categoriesWithVoters.reduce((acc, cat) => {
                    const tipo = cat.tipo_nome || 'Sem Tipo';
                    if (!acc[tipo]) acc[tipo] = [];
                    acc[tipo].push(cat);
                    return acc;
                  }, {} as Record<string, typeof categoriesWithVoters>);

                  return Object.entries(grouped).map(([tipo, cats]) => (
                    <div key={tipo} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                      <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 flex items-center justify-between">
                        <span className="font-semibold text-xs text-gray-700 dark:text-gray-300">{tipo}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              const newSelected = new Set(selectedCategories);
                              cats.forEach(cat => newSelected.add(cat.uid));
                              setSelectedCategories(newSelected);
                              
                              // Centralizar no mapa
                              if (map) {
                                const selectedVoters = filteredVoters.filter(v => 
                                  cats.some(cat => cat.uid === v.categoria_uid)
                                );
                                if (selectedVoters.length > 0) {
                                  const bounds = L.latLngBounds(
                                    selectedVoters.map(v => [v.lat, v.lng])
                                  );
                                  map.fitBounds(bounds, { padding: [50, 50] });
                                }
                              }
                            }}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                            title="Selecionar todas deste tipo"
                          >
                            Todos
                          </button>
                          <button
                            onClick={() => {
                              const newSelected = new Set(selectedCategories);
                              cats.forEach(cat => newSelected.delete(cat.uid));
                              setSelectedCategories(newSelected);
                            }}
                            className="px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
                            title="Desmarcar todas deste tipo"
                          >
                            Nenhum
                          </button>
                        </div>
                      </div>
                      <div className="p-2 space-y-1">
                        {cats.map((category) => (
                          <label
                            key={category.uid}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCategories.has(category.uid)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedCategories);
                                if (e.target.checked) {
                                  newSelected.add(category.uid);
                                } else {
                                  newSelected.delete(category.uid);
                                }
                                setSelectedCategories(newSelected);
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="color"
                              value={category.cor}
                              onChange={async (e) => {
                                e.stopPropagation();
                                const newColor = e.target.value;
                                
                                // Atualiza no banco de dados
                                try {
                                  const { error } = await supabaseClient
                                    .from('gbp_categorias')
                                    .update({ cor: newColor })
                                    .eq('uid', category.uid);
                                  
                                  if (error) throw error;
                                  
                                  // Atualiza localmente
                                  setCategoryColors(prev => ({ ...prev, [category.uid]: newColor }));
                                  setCategories(prev => prev.map(c => 
                                    c.uid === category.uid ? { ...c, cor: newColor } : c
                                  ));
                                } catch (error) {
                                  console.error('Erro ao atualizar cor:', error);
                                }
                              }}
                              className="w-8 h-8 rounded cursor-pointer border-2 border-gray-300 flex-shrink-0"
                              title="Alterar cor da categoria"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                {category.nome}
                              </span>
                              {category.tipo_nome && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 block">
                                  {category.tipo_nome}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // Seleciona apenas esta categoria
                                setSelectedCategories(new Set([category.uid]));
                                
                                // Centralizar no mapa
                                if (map) {
                                  const categoryVoters = voters.filter(v => v.categoria_uid === category.uid);
                                  if (categoryVoters.length > 0) {
                                    const bounds = L.latLngBounds(
                                      categoryVoters.map(v => [v.lat, v.lng])
                                    );
                                    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
                                  }
                                }
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                              title="Ver apenas esta categoria no mapa"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </label>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {categories.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  Nenhuma categoria cadastrada
                </div>
              )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Painel de Camadas Flutuante */}
      <div className="absolute left-2 bottom-36 z-[999] w-60 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3.5 flex flex-col gap-2">
        <h3 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Camadas
        </h3>

        {/* Toggle Visualização Pinos / Densidade */}
        <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 overflow-hidden mb-1">
          <button
            onClick={() => setVoterViewMode('pinos')}
            className={`flex-1 px-2 py-1.5 text-[11px] font-medium transition-colors ${
              voterViewMode === 'pinos'
                ? 'bg-emerald-500 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            Pinos
          </button>
          <button
            onClick={() => setVoterViewMode('densidade')}
            className={`flex-1 px-2 py-1.5 text-[11px] font-medium transition-colors ${
              voterViewMode === 'densidade'
                ? 'bg-emerald-500 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            Densidade
          </button>
        </div>

        <button
          onClick={exportToExcel}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors border border-emerald-200 dark:border-emerald-700"
        >
          <Download className="h-3.5 w-3.5" />
          Baixar registros ({filteredVoters.length})
        </button>

        <div className="space-y-2">
          {/* Camada Eleitores */}
          <label className="flex items-center justify-between cursor-pointer select-none group">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Eleitores ({layerStats.pessoas})
              </span>
            </div>
            <input
              type="checkbox"
              checked={activeLayers.has('eleitores')}
              onChange={() => {
                const newLayers = new Set(activeLayers);
                if (newLayers.has('eleitores')) {
                  newLayers.delete('eleitores');
                } else {
                  newLayers.add('eleitores');
                }
                setActiveLayers(newLayers);
              }}
              className="w-4 h-4 text-emerald-600 rounded-full focus:ring-0 border-gray-300 dark:border-gray-600 cursor-pointer"
            />
          </label>

          {/* Camada Atendimentos */}
          <label className="flex items-center justify-between cursor-pointer select-none group">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Demandas ({layerStats.solicitacoes})
              </span>
            </div>
            <input
              type="checkbox"
              checked={activeLayers.has('atendimentos')}
              onChange={() => {
                const newLayers = new Set(activeLayers);
                if (newLayers.has('atendimentos')) {
                  newLayers.delete('atendimentos');
                } else {
                  newLayers.add('atendimentos');
                  // Seleciona automaticamente todos os atendimentos por padrão ao ativar a camada
                  setSelectedAtendimentos(new Set(uniqueAtendimentos));
                }
                setActiveLayers(newLayers);
              }}
              className="w-4 h-4 text-amber-500 rounded-full focus:ring-0 border-gray-300 dark:border-gray-600 cursor-pointer"
            />
          </label>

          {/* Camada Categorias */}
          <label className="flex items-center justify-between cursor-pointer select-none group">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Categoria ({layerStats.acoes})
              </span>
            </div>
            <input
              type="checkbox"
              checked={activeLayers.has('categorias')}
              onChange={() => {
                const newLayers = new Set(activeLayers);
                if (newLayers.has('categorias')) {
                  newLayers.delete('categorias');
                } else {
                  newLayers.add('categorias');
                  // Seleciona automaticamente todas as categorias por padrão ao ativar a camada
                  setSelectedCategories(new Set(categories.map(c => c.uid)));
                }
                setActiveLayers(newLayers);
              }}
              className="w-4 h-4 text-purple-600 rounded-full focus:ring-0 border-gray-300 dark:border-gray-600 cursor-pointer"
            />
          </label>

          {/* Camada Cidade e Bairros */}
          <label className="flex items-center justify-between cursor-pointer select-none group">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Localidade ({layerStats.eventos})
              </span>
            </div>
            <input
              type="checkbox"
              checked={activeLayers.has('cidades_bairros')}
              onChange={() => {
                const newLayers = new Set(activeLayers);
                if (newLayers.has('cidades_bairros')) {
                  newLayers.delete('cidades_bairros');
                } else {
                  newLayers.add('cidades_bairros');
                  // Seleciona automaticamente apenas a PRIMEIRA cidade e seus bairros ao ativar
                  const firstCity = uniqueCidades[0];
                  if (firstCity) {
                    const newBairros = new Set<string>();
                    const bairrosDaCidade = bairrosPorCidade.get(firstCity);
                    if (bairrosDaCidade) {
                      bairrosDaCidade.forEach(bairro => newBairros.add(bairro));
                    }
                    setSelectedCidades(new Set([firstCity]));
                    setSelectedBairros(newBairros);
                  }
                }
                setActiveLayers(newLayers);
              }}
              className="w-4 h-4 text-orange-500 rounded-full focus:ring-0 border-gray-300 dark:border-gray-600 cursor-pointer"
            />
          </label>

          {/* Camada Indicados (Quem Indicou) */}
          <label className="flex items-center justify-between cursor-pointer select-none group">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Indicados ({layerStats.indicadosCount})
              </span>
            </div>
            <input
              type="checkbox"
              checked={activeLayers.has('indicado')}
              onChange={() => {
                const newLayers = new Set(activeLayers);
                if (newLayers.has('indicado')) {
                  newLayers.delete('indicado');
                } else {
                  newLayers.add('indicado');
                  // Seleciona automaticamente todos os indicados por padrão ao ativar a camada
                  setSelectedIndicados(new Set(indicados.map(i => i.uid)));
                }
                setActiveLayers(newLayers);
              }}
              className="w-4 h-4 text-blue-500 rounded-full focus:ring-0 border-gray-300 dark:border-gray-600 cursor-pointer"
            />
          </label>

          {/* Camada Votação Eleitoral */}
          <label className="flex items-center justify-between cursor-pointer select-none group">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Votação Eleitoral ({layerStats.votacao})
              </span>
            </div>
            <input
              type="checkbox"
              checked={activeLayers.has('votacao')}
              onChange={() => {
                const newLayers = new Set(activeLayers);
                if (newLayers.has('votacao')) {
                  newLayers.delete('votacao');
                } else {
                  newLayers.add('votacao');
                }
                setActiveLayers(newLayers);
              }}
              className="w-4 h-4 text-rose-500 rounded-full focus:ring-0 border-gray-300 dark:border-gray-600 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Estatísticas Discretas */}
      <div className="absolute left-2 bottom-16 z-[999] flex gap-2">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{displayTotal}</p>
        </div>
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Visíveis</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">{displayVisibles}</p>
        </div>
      </div>

      {/* Container do Mapa */}
      <div 
        className="absolute inset-0"
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0 
        }}
      />

      {/* Estatísticas do Mapa */}
      {isStatsVisible && (
        <div className="absolute left-2 top-16 z-[1000] w-72 transition-all duration-200 ease-in-out">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-blue-500" />
                Estatísticas do Mapa
              </h2>
              <button onClick={() => setIsStatsVisible(false)} className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-full">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-3">
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 mb-4">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{mapStats.totalEleitores}</p>
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80">pessoas na área visível</p>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      Bairros
                    </h3>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Total: {mapStats.bairros.total}
                    </span>
                  </div>
                  {mapStats.bairros.maisPopuloso.nome && (
                    <div className="mt-1">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{mapStats.bairros.maisPopuloso.nome}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {mapStats.bairros.maisPopuloso.quantidade} pessoas
                        <span className="text-gray-400 dark:text-gray-500 ml-1">
                          ({mapStats.bairros.maisPopuloso.percentual.toFixed(1)}%)
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      Cidades
                    </h3>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Total: {mapStats.cidades.total}
                    </span>
                  </div>
                  {mapStats.cidades.maisPopulosa.nome && (
                    <div className="mt-1">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{mapStats.cidades.maisPopulosa.nome}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {mapStats.cidades.maisPopulosa.quantidade} pessoas
                        <span className="text-gray-400 dark:text-gray-500 ml-1">
                          ({mapStats.cidades.maisPopulosa.percentual.toFixed(1)}%)
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
