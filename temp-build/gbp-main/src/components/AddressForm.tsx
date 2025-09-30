import { useState } from 'react';
import { useGeocoding } from '../hooks/useGeocoding';
import { MapPin } from 'lucide-react';

interface AddressFormProps {
  onAddressSelect: (address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    lat: number;
    lng: number;
    formattedAddress: string;
  }) => void;
}

export function AddressForm({ onAddressSelect }: AddressFormProps) {
  const [address, setAddress] = useState({
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    cep: '',
  });

  const { geocodeAddress, loading, error } = useGeocoding();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fullAddress = `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city} - ${address.state}, ${address.cep}`;
    
    const result = await geocodeAddress(fullAddress);
    
    if (result) {
      onAddressSelect({
        ...address,
        lat: result.lat,
        lng: result.lng,
        formattedAddress: result.formattedAddress,
      });
    }
  };

  const handleCepBlur = async () => {
    if (address.cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${address.cep}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setAddress(prev => ({
            ...prev,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
          }));
        }
      } catch (err) {
        console.error('Erro ao buscar CEP:', err);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700">CEP</label>
          <input
            type="text"
            value={address.cep}
            onChange={(e) => setAddress(prev => ({ ...prev, cep: e.target.value }))}
            onBlur={handleCepBlur}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            maxLength={8}
            placeholder="00000000"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Rua</label>
          <input
            type="text"
            value={address.street}
            onChange={(e) => setAddress(prev => ({ ...prev, street: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700">Número</label>
          <input
            type="text"
            value={address.number}
            onChange={(e) => setAddress(prev => ({ ...prev, number: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Bairro</label>
          <input
            type="text"
            value={address.neighborhood}
            onChange={(e) => setAddress(prev => ({ ...prev, neighborhood: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700">Cidade</label>
          <input
            type="text"
            value={address.city}
            onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700">Estado</label>
          <input
            type="text"
            value={address.state}
            onChange={(e) => setAddress(prev => ({ ...prev, state: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            maxLength={2}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {loading ? (
            'Buscando...'
          ) : (
            <>
              <MapPin className="h-4 w-4 mr-2" />
              Buscar Coordenadas
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 mt-2">
          {error}
        </div>
      )}
    </form>
  );
}
