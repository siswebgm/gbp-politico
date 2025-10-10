import { useState } from 'react';

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export function useGeocoding() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocodeAddress = async (address: string): Promise<GeocodeResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // Usando Nominatim API (OpenStreetMap) com timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          address
        )}&format=json&limit=1&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': 'pt-BR',
            'User-Agent': 'GBPolitico/1.0'
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data && data[0]) {
        const result = data[0];
        
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          formattedAddress: result.display_name,
        };
      } else {
        setError('Endereço não encontrado');
        return null;
      }
    } catch (err) {
      setError('Erro ao buscar coordenadas');
      console.error('Erro na geocodificação:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Função para fazer o processo inverso: coordenadas para endereço
  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': 'pt-BR',
            'User-Agent': 'GBPolitico/1.0'
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.display_name) {
        return data.display_name;
      } else {
        setError('Localização não encontrada');
        return null;
      }
    } catch (err) {
      setError('Erro ao buscar endereço');
      console.error('Erro na geocodificação reversa:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { geocodeAddress, reverseGeocode, loading, error };
}
