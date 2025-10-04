import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { Search, Maximize2, Minimize2, X, MapPin, Phone, User, Building2, Building, LandPlot, BarChart2, Users, Camera } from 'lucide-react';
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
  cep?: string;
  genero?: string;
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

interface MapComponentProps {
  voters: Voter[];
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

export default function MapComponent({ voters }: MapComponentProps) {
  const company = useCompanyStore(state => state.company);
  const mapRef = useRef<L.Map | null>(null);
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
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [showRadius, setShowRadius] = useState(true);
  const [radiusSize, setRadiusSize] = useState(500); // Raio em metros
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const userLocationCircleRef = useRef<L.Circle | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const [disableClustering, setDisableClustering] = useState(false);
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
        setSelectedCategories(new Set()); // Inicia sem nenhuma selecionada
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
      }
    };
    
    loadCategories();
  }, [company?.uid]);

  // Inicialização do mapa
  useEffect(() => {
    if (!containerRef.current || map) return;

    // Configuração das camadas do mapa
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
        zoomToBoundsOnClick: true,
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

      setMap(newMap);
      setMarkerClusterGroup(markers);
      newMap.addLayer(markers);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (map) {
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
    
    // Cria um ícone SVG de ponto de localização
    const svgTemplate = `
      <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0Z" fill="${color}"/>
        <path d="M16 42L3.05661 32H28.9434L16 42Z" fill="${color}"/>
        <circle cx="16" cy="16" r="8" fill="white"/>
      </svg>
    `;

    // Converte o SVG para uma URL de dados
    const svgUrl = 'data:image/svg+xml;base64,' + btoa(svgTemplate);

    return L.icon({
      iconUrl: svgUrl,
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -42]
    });
  };

  // Função para adicionar marcadores ao mapa
  const addMarkersToMap = useCallback((votersToShow: Voter[]) => {
    if (!map || !markerClusterGroup) return;

    markerClusterGroup.clearLayers();

    votersToShow.forEach((voter) => {
      if (!voter.lat || !voter.lng) return;

      const marker = L.marker([voter.lat, voter.lng], {
        icon: createVoterIcon(voter),
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

      markerClusterGroup.addLayer(marker);
    });

    map.addLayer(markerClusterGroup);
  }, [map, markerClusterGroup, categoryColors]);

  // Filtrar eleitores por categoria selecionada
  const filteredVoters = useMemo(() => {
    // Se nenhuma categoria selecionada, não mostra nada
    if (selectedCategories.size === 0) return [];
    
    return voters.filter(voter => {
      // Mostra apenas se a categoria estiver selecionada
      return voter.categoria_uid && selectedCategories.has(voter.categoria_uid);
    });
  }, [voters, selectedCategories]);

  // Efeito para recriar o mapa quando o agrupamento muda
  useEffect(() => {
    if (!map) return;
    
    // Remove o cluster atual
    if (markerClusterGroup) {
      map.removeLayer(markerClusterGroup);
    }
    
    // Recria o cluster com a nova configuração
    const shouldDisableClustering = disableClustering || (selectedCategories.size > 0 && selectedCategories.size <= 5);
    
    const newMarkers = L.markerClusterGroup({
      maxClusterRadius: shouldDisableClustering ? 0 : 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
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
    setMarkerClusterGroup(newMarkers);
  }, [disableClustering, selectedCategories.size, map, categoryColors]);

  // Atualização dos marcadores
  useEffect(() => {
    if (!map || !markerClusterGroup) return;

    const updateMarkers = () => {
      if (!map || !markerClusterGroup) return;

      // Limpa todos os marcadores
      markerClusterGroup.clearLayers();

      // Se não há eleitores filtrados, não adiciona nada
      if (filteredVoters.length === 0) {
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
  }, [filteredVoters, map, markerClusterGroup, addMarkersToMap]);

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
      {/* Barra superior com controles */}
      <div className="absolute top-2 left-2 right-2 z-[1000] flex flex-col sm:flex-row gap-2">
        {/* Searchbox e botão de estatísticas */}
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
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
          
          <button
            onClick={() => setIsStatsVisible(!isStatsVisible)}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-600 px-3 py-2 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <BarChart2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
              {isStatsVisible ? 'Ocultar Estatísticas' : 'Ver Estatísticas'}
            </span>
          </button>

          <button
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-600 px-3 py-2 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="h-5 w-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
              Filtrar Categorias
            </span>
            {selectedCategories.size < categories.length && (
              <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                {selectedCategories.size}
              </span>
            )}
          </button>
        </div>

        {/* Controles do mapa */}
        <div className="flex gap-2 justify-end">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-600 p-1 flex gap-1">
            <button
              onClick={() => setMapType('street')}
              className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-2 transition-colors ${
                mapType === 'street'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Mapa</span>
            </button>
            <button
              onClick={() => setMapType('satellite')}
              className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-2 transition-colors ${
                mapType === 'satellite'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">Satélite</span>
            </button>
          </div>

          {userLocation && (
            <button
              onClick={() => {
                if (map && userLocation) {
                  map.setView([userLocation.lat, userLocation.lng], 15);
                }
              }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-600 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-600 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Capturar/Imprimir Mapa"
          >
            <Camera className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-300 dark:border-gray-600 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
          className="fixed sm:absolute inset-0 sm:inset-auto sm:right-2 sm:top-16 sm:bottom-2 z-[1000] sm:w-[450px] transition-all duration-200 ease-in-out flex flex-col cursor-default"
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
              <button onClick={() => setShowCategoryFilter(false)} className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-full">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-3 overflow-y-auto overflow-x-hidden flex-1">
              {/* Botões Gerais de Seleção */}
              <div className="flex gap-3 mb-4 pb-4 border-b-2 border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setSelectedCategories(new Set(categories.map(c => c.uid)))}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Selecionar Todas
                </button>
                <button
                  onClick={() => setSelectedCategories(new Set())}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 dark:from-gray-600 dark:to-gray-700 dark:text-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-800 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Limpar Tudo
                </button>
              </div>

              {/* Controle de Raio */}
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={showRadius}
                    onChange={(e) => setShowRadius(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Exibir raio de alcance
                  </span>
                </label>
                {showRadius && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                      Raio: {radiusSize}m
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="100"
                      value={radiusSize}
                      onChange={(e) => setRadiusSize(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
                    />
                  </div>
                )}
              </div>

              {/* Controle de Agrupamento */}
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disableClustering}
                    onChange={(e) => setDisableClustering(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                      Desagrupar todos os pinos
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Mostra todos os marcadores individualmente
                    </span>
                  </div>
                </label>
              </div>

              {/* Categorias agrupadas por tipo */}
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
                        <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">{tipo}</span>
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
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
            </div>
          </div>
        </div>
      )}

      {/* Estatísticas Discretas */}
      <div className="absolute left-2 bottom-16 z-[999] flex gap-2">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{voters.length}</p>
        </div>
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Visíveis</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">{filteredVoters.length}</p>
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
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80">eleitores na área visível</p>
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
                        {mapStats.bairros.maisPopuloso.quantidade} eleitores
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
                        {mapStats.cidades.maisPopulosa.quantidade} eleitores
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
