import axios from 'axios';

interface Coordinates {
  lat: string;
  lon: string;
}

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
  coordinates?: Coordinates;
}

export const viaCepService = {
  getAddressByCep: async (cep: string): Promise<ViaCepResponse> => {
    try {
      const cleanCep = cep.replace(/\D/g, '');
      if (cleanCep.length !== 8) {
        throw new Error('CEP deve conter 8 dígitos');
      }

      const { data } = await axios.get<ViaCepResponse>(
        `https://viacep.com.br/ws/${cleanCep}/json/`,
        { timeout: 5000 }
      );

      if (data.erro) {
        throw new Error('CEP não encontrado');
      }

      // Buscar coordenadas usando Nominatim
      try {
        const address = `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}, Brasil`;
        const nominatimResponse = await axios.get(
          `https://nominatim.openstreetmap.org/search`,
          {
            params: {
              q: address,
              format: 'json',
              limit: 1
            },
            headers: {
              'User-Agent': 'GBP Politico'
            }
          }
        );

        if (nominatimResponse.data && nominatimResponse.data.length > 0) {
          data.coordinates = {
            lat: nominatimResponse.data[0].lat,
            lon: nominatimResponse.data[0].lon
          };
        }
      } catch (error) {
        console.error('Erro ao buscar coordenadas:', error);
      }

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Tempo limite excedido ao buscar CEP');
        }
        if (error.response?.status === 404) {
          throw new Error('CEP não encontrado');
        }
      }
      throw new Error('Erro ao buscar CEP. Tente novamente.');
    }
  },
};