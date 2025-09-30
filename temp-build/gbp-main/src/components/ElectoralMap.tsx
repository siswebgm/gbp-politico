import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, LayerGroup, LayersControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import '../styles/leaflet.css';
import L from 'leaflet';
import { debounce } from 'lodash';

// Importando os ícones
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Corrigindo os ícones do Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Cache de ícones
const markerIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Voter {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  bairro?: string;
  cidade?: string;
  estado?: string;
  influencia?: 'alta' | 'media' | 'baixa';
  categoria?: string;
}

interface ElectoralMapProps {
  voters: Voter[];
  center?: [number, number];
  zoom?: number;
  pageSize?: number;
}

// Estilos personalizados para os marcadores
const customIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Estilos CSS para os clusters
const clusterStyles = `
  .marker-cluster-small {
    background-color: rgba(241, 128, 23, 0.6);
  }
  .marker-cluster-small div {
    background-color: rgba(240, 194, 12, 0.6);
  }

  .marker-cluster-medium {
    background-color: rgba(241, 128, 23, 0.6);
  }
  .marker-cluster-medium div {
    background-color: rgba(240, 194, 12, 0.6);
  }

  .marker-cluster-large {
    background-color: rgba(241, 128, 23, 0.6);
  }
  .marker-cluster-large div {
    background-color: rgba(240, 194, 12, 0.6);
  }

  .marker-cluster {
    background-clip: padding-box;
    border-radius: 20px;
  }

  .marker-cluster div {
    width: 30px;
    height: 30px;
    margin-left: 5px;
    margin-top: 5px;
    text-align: center;
    border-radius: 15px;
    font-size: 12px;
    color: #000;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .marker-cluster span {
    line-height: 30px;
  }
`;

// Componente para adicionar estilos CSS
const MapStyles = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(clusterStyles));
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return null;
};

// Ícone personalizado para os marcadores
const voterIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Componente para os marcadores
const VoterMarkers = ({ voters, map }: { voters: Voter[]; map: L.Map }) => {
  const markersRef = useRef<L.Marker[]>([]);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    // Limpa marcadores anteriores
    if (markerLayerRef.current) {
      markerLayerRef.current.clearLayers();
      map.removeLayer(markerLayerRef.current);
    }

    // Cria novo grupo de camadas
    markerLayerRef.current = L.layerGroup().addTo(map);

    // Adiciona os marcadores
    markersRef.current = voters.map(voter => {
      const marker = L.marker([voter.lat, voter.lng], {
        icon: voterIcon,
        title: voter.name
      });

      // Popup informativo
      marker.bindPopup(`
        <div class="p-4 min-w-[250px]">
          <h3 class="text-lg font-bold mb-2">${voter.name}</h3>
          <p class="text-gray-600 mb-2">${voter.address}</p>
          ${voter.bairro ? `<p class="text-gray-600 mb-2">Bairro: ${voter.bairro}</p>` : ''}
          ${voter.cidade ? `<p class="text-gray-600 mb-2">Cidade: ${voter.cidade}</p>` : ''}
          <div class="mt-3">
            ${voter.influencia ? `
              <span class="inline-block px-2 py-1 rounded-full text-xs font-semibold mr-2 ${
                voter.influencia === 'alta' ? 'bg-green-100 text-green-800' : 
                voter.influencia === 'media' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-red-100 text-red-800'
              }">
                Influência: ${voter.influencia.charAt(0).toUpperCase() + voter.influencia.slice(1)}
              </span>
            ` : ''}
            ${voter.categoria ? `
              <span class="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                ${voter.categoria.charAt(0).toUpperCase() + voter.categoria.slice(1)}
              </span>
            ` : ''}
          </div>
        </div>
      `);

      markerLayerRef.current?.addLayer(marker);
      return marker;
    });

    // Ajusta o zoom para mostrar todos os marcadores
    if (voters.length > 0) {
      const bounds = L.latLngBounds(voters.map(voter => [voter.lat, voter.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      if (markerLayerRef.current) {
        map.removeLayer(markerLayerRef.current);
      }
      markersRef.current.forEach(marker => marker.remove());
    };
  }, [voters, map]);

  return null;
};

// Componente otimizado para análise de densidade
const OptimizedDensityAnalysis = ({ voters, map }: { voters: Voter[]; map: L.Map }) => {
  const densityLayerRef = useRef<L.LayerGroup | null>(null);
  const bounds = map.getBounds();
  const zoom = map.getZoom();

  const getColor = useCallback((count: number) => {
    return count > 20 ? '#800026' :
           count > 15 ? '#BD0026' :
           count > 10 ? '#E31A1C' :
           count > 5  ? '#FC4E2A' :
           count > 2  ? '#FD8D3C' :
                       '#FEB24C';
  }, []);

  useEffect(() => {
    if (zoom < 12) {
      if (densityLayerRef.current) {
        densityLayerRef.current.clearLayers();
      }
      return;
    }

    const visibleVoters = voters.filter(voter => 
      bounds.contains([voter.lat, voter.lng])
    ).slice(0, 300); 

    const bairrosCount = visibleVoters.reduce((acc, voter) => {
      const bairro = voter.bairro || 'Desconhecido';
      acc[bairro] = (acc[bairro] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (!densityLayerRef.current) {
      densityLayerRef.current = L.layerGroup().addTo(map);
    }

    densityLayerRef.current.clearLayers();

    visibleVoters.forEach((voter) => {
      const count = bairrosCount[voter.bairro || 'Desconhecido'];
      L.circle([voter.lat, voter.lng], {
        radius: 100,
        color: getColor(count),
        fillColor: getColor(count),
        fillOpacity: 0.3,
        weight: 1
      }).addTo(densityLayerRef.current!);
    });

    return () => {
      if (densityLayerRef.current) {
        densityLayerRef.current.clearLayers();
      }
    };
  }, [voters, bounds, zoom, getColor]);

  return null;
};

const ElectoralMap = ({ 
  voters, 
  center = [-8.0476, -34.8770],
  zoom = 12,
  pageSize = 1000
}: ElectoralMapProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LatLng[]>([]);
  const boundsRef = useRef<L.LatLngBounds | null>(null);

  // Filtragem otimizada com useMemo
  const filteredVoters = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return voters
      .filter(voter => {
        if (!searchLower) return true;
        return (
          voter.name.toLowerCase().includes(searchLower) ||
          voter.address.toLowerCase().includes(searchLower) ||
          voter.bairro?.toLowerCase().includes(searchLower) ||
          voter.cidade?.toLowerCase().includes(searchLower)
        );
      })
      .slice(0, 1000);
  }, [voters, searchTerm]);

  // Paginação otimizada
  const paginatedVoters = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVoters.slice(start, start + pageSize);
  }, [filteredVoters, currentPage, pageSize]);

  // Estatísticas otimizadas
  const stats = useMemo(() => ({
    total: filteredVoters.length,
    altaInfluencia: filteredVoters.filter(v => v.influencia === 'alta').length,
    mediaInfluencia: filteredVoters.filter(v => v.influencia === 'media').length,
    baixaInfluencia: filteredVoters.filter(v => v.influencia === 'baixa').length,
    lideres: filteredVoters.filter(v => v.categoria === 'lider').length,
    bairros: new Set(filteredVoters.map(v => v.bairro)).size,
    cidades: new Set(filteredVoters.map(v => v.cidade)).size
  }), [filteredVoters]);

  // Função para ajustar o mapa aos marcadores filtrados
  const fitMapToBounds = useCallback(() => {
    if (!mapInstance || filteredVoters.length === 0) return;

    // Calcula os bounds com base nos eleitores filtrados
    const points = filteredVoters.map(voter => [voter.lat, voter.lng] as L.LatLngTuple);
    const bounds = L.latLngBounds(points);
    
    // Armazena os bounds para referência
    boundsRef.current = bounds;

    // Ajusta o mapa com animação
    mapInstance.flyToBounds(bounds, {
      padding: [50, 50],
      maxZoom: 15,
      duration: 1.5 // Aumentado para animação mais suave
    });

    // Atualiza os marcadores
    markersRef.current = filteredVoters.map(voter => L.latLng(voter.lat, voter.lng));
  }, [filteredVoters, mapInstance]);

  // Efeito para ajustar o mapa quando os filtros mudam
  useEffect(() => {
    if (mapInstance && filteredVoters.length > 0) {
      // Pequeno delay para garantir que o mapa está pronto
      const timer = setTimeout(() => {
        fitMapToBounds();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [filteredVoters, mapInstance, fitMapToBounds]);

  // Configuração inicial do mapa
  useEffect(() => {
    if (mapInstance && !mapRef.current) {
      mapRef.current = mapInstance;
      
      // Configurações de performance
      mapInstance.options.preferCanvas = true;
      mapInstance.options.renderer = L.canvas();

      // Event listeners
      const handleMoveEnd = () => {
        if (boundsRef.current) {
          const currentBounds = mapInstance.getBounds();
          const currentCenter = mapInstance.getCenter();
          
          // Verifica se o centro atual está dentro dos bounds dos marcadores
          if (!boundsRef.current.contains(currentCenter)) {
            mapInstance.flyToBounds(boundsRef.current, {
              padding: [50, 50],
              maxZoom: 15,
              duration: 1
            });
          }
        }
      };

      mapInstance.on('moveend', handleMoveEnd);
      mapInstance.on('zoomend', () => {
        const currentZoom = mapInstance.getZoom();
        if (currentZoom < 12) {
          mapInstance.getPane('markerPane')?.style.setProperty('opacity', '0.5');
        } else {
          mapInstance.getPane('markerPane')?.style.setProperty('opacity', '1');
        }
      });

      // Ajuste inicial
      fitMapToBounds();
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off('moveend');
        mapRef.current.off('zoomend');
      }
    };
  }, [mapInstance, fitMapToBounds]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 p-4 bg-white rounded-lg shadow">
        <input
          type="text"
          placeholder="Buscar por nome, endereço, bairro ou cidade..."
          className="flex-1 p-2 border rounded"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          minZoom={4}
          maxZoom={18}
          preferCanvas={true}
          whenCreated={setMapInstance}
        >
          <MapStyles />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          
          {mapInstance && (
            <>
              <VoterMarkers voters={paginatedVoters} map={mapInstance} />
              <OptimizedDensityAnalysis voters={paginatedVoters} map={mapInstance} />
            </>
          )}
        </MapContainer>
      </div>

      {filteredVoters.length > pageSize && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Anterior
          </button>
          <span className="px-4 py-2">
            Página {currentPage} de {Math.ceil(filteredVoters.length / pageSize)}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredVoters.length / pageSize), p + 1))}
            disabled={currentPage >= Math.ceil(filteredVoters.length / pageSize)}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
};

export default ElectoralMap;
