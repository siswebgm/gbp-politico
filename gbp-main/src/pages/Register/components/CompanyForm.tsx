import React, { useState } from 'react';
import { Building2, Phone, Globe, MapPin } from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase';

interface CompanyFormProps {
  onCompanyCreated: (companyUid: string) => void;
}

export function CompanyForm({ onCompanyCreated }: CompanyFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    website: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validações básicas
      if (!formData.nome || !formData.cnpj) {
        throw new Error('Nome e CNPJ são obrigatórios');
      }

      // Insere a empresa
      const { data: company, error: insertError } = await supabaseClient
        .from('gbp_empresas')
        .insert([{
          nome: formData.nome,
          cnpj: formData.cnpj,
          telefone: formData.telefone,
          website: formData.website,
          endereco: formData.endereco,
          cidade: formData.cidade,
          estado: formData.estado,
          cep: formData.cep,
          status: 'ativo'
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      if (!company) throw new Error('Erro ao criar empresa');

      onCompanyCreated(company.uid);
    } catch (error) {
      console.error('Erro ao cadastrar empresa:', error);
      setError(error instanceof Error ? error.message : 'Erro ao cadastrar empresa');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">
          Cadastro da Empresa
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Preencha os dados da sua empresa para continuar
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Nome da Empresa */}
          <div className="col-span-2">
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
              Nome da Empresa *
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building2 className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="nome"
                id="nome"
                required
                value={formData.nome}
                onChange={handleChange}
                disabled={isLoading}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Nome da sua empresa"
              />
            </div>
          </div>

          {/* CNPJ */}
          <div>
            <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700">
              CNPJ *
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="cnpj"
                id="cnpj"
                required
                value={formData.cnpj}
                onChange={handleChange}
                disabled={isLoading}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>

          {/* Telefone */}
          <div>
            <label htmlFor="telefone" className="block text-sm font-medium text-gray-700">
              Telefone
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                name="telefone"
                id="telefone"
                value={formData.telefone}
                onChange={handleChange}
                disabled={isLoading}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="(00) 0000-0000"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700">
              Website
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Globe className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="url"
                name="website"
                id="website"
                value={formData.website}
                onChange={handleChange}
                disabled={isLoading}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="www.exemplo.com.br"
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="col-span-2">
            <label htmlFor="endereco" className="block text-sm font-medium text-gray-700">
              Endereço
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="endereco"
                id="endereco"
                value={formData.endereco}
                onChange={handleChange}
                disabled={isLoading}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Rua, número, complemento"
              />
            </div>
          </div>

          {/* Cidade */}
          <div>
            <label htmlFor="cidade" className="block text-sm font-medium text-gray-700">
              Cidade
            </label>
            <input
              type="text"
              name="cidade"
              id="cidade"
              value={formData.cidade}
              onChange={handleChange}
              disabled={isLoading}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Sua cidade"
            />
          </div>

          {/* Estado */}
          <div>
            <label htmlFor="estado" className="block text-sm font-medium text-gray-700">
              Estado
            </label>
            <input
              type="text"
              name="estado"
              id="estado"
              value={formData.estado}
              onChange={handleChange}
              disabled={isLoading}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="UF"
              maxLength={2}
            />
          </div>

          {/* CEP */}
          <div>
            <label htmlFor="cep" className="block text-sm font-medium text-gray-700">
              CEP
            </label>
            <input
              type="text"
              name="cep"
              id="cep"
              value={formData.cep}
              onChange={handleChange}
              disabled={isLoading}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="00000-000"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Cadastrando...' : 'Cadastrar Empresa'}
          </button>
        </div>
      </form>
    </div>
  );
}
