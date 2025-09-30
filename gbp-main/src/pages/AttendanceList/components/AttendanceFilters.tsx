import React from 'react';
import { AttendanceFiltersProps } from '../types';
import { useCategoriaTipos } from '../../../hooks/useCategoriaTipos';
import { useAtendimentoIndicados } from '../../../hooks/useAtendimentoIndicados';
import { useAtendimentoLocais } from '../../../hooks/useAtendimentoLocais';
import { useAtendimentoResponsaveis } from '../../../hooks/useAtendimentoResponsaveis';
import { useCategories } from '../../../hooks/useCategories';
import { Button } from '@mui/material';
import { useAtendimentos } from '../../../hooks/useAtendimentos';

interface AttendanceFiltersProps {
  onClose: () => void;
  filters: AttendanceFilters;
  onApplyFilters: (filters: AttendanceFilters) => void;
}

export interface AttendanceFilters {
  categoria?: string;
  categoriaTipo?: string;
  eleitor?: string;
  indicadoPor?: string;
  cidade?: string;
  bairro?: string;
  logradouro?: string;
  responsavel?: string;
  dataInicio?: string;
  dataFim?: string;
}

export function AttendanceFilters({ onClose, filters, onApplyFilters }: AttendanceFiltersProps) {
  const { tipos, isLoading: tiposLoading } = useCategoriaTipos();
  const selectedTipo = tipos?.find(t => t.nome === filters.categoriaTipo);
  const { data: categorias, isLoading: categoriasLoading } = useCategories(selectedTipo?.uid);
  const { data: locais } = useAtendimentoLocais();
  const { data: responsaveis } = useAtendimentoResponsaveis();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Se mudar a cidade, limpa o bairro
    if (name === 'cidade') {
      onApplyFilters({
        ...filters,
        cidade: value || undefined,
        bairro: undefined // Limpa o bairro quando troca a cidade
      });
      return;
    }

    // Para outros campos, apenas atualiza o valor
    onApplyFilters({
      ...filters,
      [name]: value || undefined // Se o valor for vazio, enviamos undefined para remover o filtro
    });
  };

  const handleClearFilters = () => {
    onApplyFilters({});
  };

  return (
    <div>
      {/* Filtro de Eleitor - Destacado */}
      <div className="mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
          <label htmlFor="eleitor" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Eleitor
          </label>
          <div className="relative">
            <input
              type="text"
              id="eleitor"
              name="eleitor"
              value={filters.eleitor || ''}
              onChange={handleInputChange}
              placeholder="Digite o nome do eleitor"
              className="h-[38px] px-3 pr-8 form-input block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {filters.eleitor && (
              <button
                type="button"
                onClick={() => handleInputChange({ target: { name: 'eleitor', value: '' } } as React.ChangeEvent<HTMLInputElement>)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Outros Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tipo de Categoria */}
        <div className="flex flex-col space-y-1">
          <label htmlFor="categoriaTipo" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Tipo de Categoria
          </label>
          <select
            id="categoriaTipo"
            name="categoriaTipo"
            value={filters.categoriaTipo || ''}
            onChange={handleInputChange}
            className="h-[38px] px-3 form-select block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {tipos?.map((tipo) => (
              <option key={tipo.uid} value={tipo.nome}>
                {tipo.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Categoria */}
        <div className="flex flex-col space-y-1">
          <label htmlFor="categoria" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Categoria
          </label>
          <select
            id="categoria"
            name="categoria"
            value={filters.categoria || ''}
            onChange={handleInputChange}
            className="h-[38px] px-3 form-select block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {categorias?.map((categoria) => (
              <option key={categoria.uid} value={categoria.nome}>
                {categoria.nome}
              </option>
            ))}
          </select>
        </div>



        {/* Indicado por */}
        <div className="flex flex-col space-y-1">
          <label htmlFor="indicado" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Indicado por
          </label>
          <select
            id="indicado"
            name="indicado"
            value={filters.indicado || ''}
            onChange={handleInputChange}
            className="h-[38px] px-3 form-select block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {useAtendimentoIndicados().data?.map((indicado) => (
              <option key={indicado} value={indicado}>
                {indicado}
              </option>
            ))}
          </select>
        </div>

        {/* Cidade */}
        <div className="flex flex-col space-y-1">
          <label htmlFor="cidade" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Cidade
          </label>
          <select
            id="cidade"
            name="cidade"
            value={filters.cidade || ''}
            onChange={handleInputChange}
            className="h-[38px] px-3 form-select block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Todas</option>
            {locais?.cidades?.map((cidade) => (
              <option key={cidade} value={cidade}>
                {cidade}
              </option>
            ))}
          </select>
        </div>

        {/* Bairro */}
        <div className="flex flex-col space-y-1">
          <label htmlFor="bairro" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Bairro
          </label>
          <select
            id="bairro"
            name="bairro"
            value={filters.bairro || ''}
            onChange={handleInputChange}
            disabled={!filters.cidade}
            className="h-[38px] px-3 form-select block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">{filters.cidade ? 'Todos' : 'Selecione uma cidade'}</option>
            {filters.cidade && locais?.bairrosPorCidade[filters.cidade]?.map((bairro) => (
              <option key={bairro} value={bairro}>
                {bairro}
              </option>
            ))}
          </select>
        </div>

        {/* Logradouro */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Logradouro
          </label>
          <input
            type="text"
            name="logradouro"
            value={filters.logradouro || ''}
            onChange={handleInputChange}
            placeholder="Digite o logradouro"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-3 text-sm"
          />
        </div>

        {/* Responsável */}
        <div className="flex flex-col space-y-1">
          <label htmlFor="responsavel" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Responsável
          </label>
          <select
            id="responsavel"
            name="responsavel"
            value={filters.responsavel || ''}
            onChange={handleInputChange}
            className="h-[38px] px-3 form-select block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Todos os responsáveis</option>
            {responsaveis?.map((responsavel) => (
              <option key={responsavel.uid} value={responsavel.nome}>
                {responsavel.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Data Início */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data Início
          </label>
          <input
            type="date"
            name="dataInicio"
            value={filters.dataInicio || ''}
            onChange={handleInputChange}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-3 text-sm"
          />
        </div>

        {/* Data Fim */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data Fim
          </label>
          <input
            type="date"
            name="dataFim"
            value={filters.dataFim || ''}
            onChange={handleInputChange}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-3 text-sm"
          />
        </div>
      </div>

      {/* Botão de Limpar */}
      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleClearFilters}
          variant="outlined"
          size="small"
          className="text-gray-700 dark:text-gray-200"
        >
          Limpar Filtros
        </Button>
      </div>
    </div>
  );
}
