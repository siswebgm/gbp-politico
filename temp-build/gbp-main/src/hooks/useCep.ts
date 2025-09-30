import { useState } from 'react';
import { useToast } from "../components/ui/use-toast";

interface CepData {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
  latitude?: number;
  longitude?: number;
}

export function useCep() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCoordinates = async (address: string, fallbackAddresses: string[]): Promise<{ lat: number; lon: number } | null> => {
    try {
      // Tenta primeiro o endereço completo
      const query = encodeURIComponent(`${address}, Brasil`);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
      let data = await response.json();
      
      // Se não encontrar com o endereço completo, tenta com os endereços alternativos
      if (!data || !data[0]) {
        for (const fallbackAddress of fallbackAddresses) {
          const fallbackQuery = encodeURIComponent(`${fallbackAddress}, Brasil`);
          const fallbackResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${fallbackQuery}`);
          data = await fallbackResponse.json();
          
          if (data && data[0]) {
            break; // Encontrou coordenadas, pode parar
          }
        }
      }
      
      if (data && data[0]) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon)
        };
      }
      return null;
    } catch (err) {
      console.error('Erro ao buscar coordenadas:', err);
      return null;
    }
  };

  const fetchAddress = async (cep: string): Promise<CepData | null> => {
    if (!cep || cep.length !== 8) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    toast({
      title: "🔍 Consultando CEP...",
      description: "Buscando endereço",
      className: "bg-blue-50 border-blue-200 text-blue-800",
      duration: 2000,
    });

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        setError('CEP não encontrado');
        toast({
          title: "❌ CEP não encontrado",
          description: "Verifique o CEP digitado",
          className: "bg-red-50 border-red-200 text-red-800",
          duration: 3000,
        });
        return null;
      }

      // Prepara endereços para busca de coordenadas, do mais específico para o mais geral
      const fullAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}`;
      const fallbackAddresses = [
        `${data.bairro}, ${data.localidade}, ${data.uf}`, // Bairro + Cidade
        `${data.localidade}, ${data.uf}`, // Apenas cidade
      ];

      const coordinates = await fetchCoordinates(fullAddress, fallbackAddresses);

      toast({
        title: "✅ CEP encontrado",
        description: "Endereço preenchido automaticamente",
        className: "bg-green-50 border-green-200 text-green-800",
        duration: 3000,
      });

      return {
        ...data,
        latitude: coordinates?.lat,
        longitude: coordinates?.lon
      };
    } catch (err) {
      setError('Erro ao buscar CEP');
      toast({
        title: "❌ Erro na consulta",
        description: "Não foi possível consultar o CEP. Tente novamente.",
        className: "bg-red-50 border-red-200 text-red-800",
        duration: 3000,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchAddress,
    isLoading,
    error
  };
}
