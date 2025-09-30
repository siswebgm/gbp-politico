import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, MapPin, Home, Building2, User2, Filter } from 'lucide-react';
import { EleitorFilters } from '../../../types/eleitor';
import { useEleitorOptions } from '../../../hooks/useEleitorOptions';
import { useCategories } from '../../../hooks/useCategories';
import { useCategoryTypes } from '../../../hooks/useCategoryTypes';
import { useLocationOptions } from '../../../hooks/useLocationOptions';
import { Calendar } from 'lucide-react';

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: EleitorFilters;
  onFilterChange: (filters: EleitorFilters) => void;
}

export function FiltersModal({
  isOpen,
  onClose,
  filters,
  onFilterChange,
}: FiltersModalProps) {
  const mesesOptions = [
    { value: '', label: 'Todos' },
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];
  const { 
    indicadores: indications,
    responsaveis: users,
    isLoading 
  } = useEleitorOptions();

  const { data: categorias, isLoading: isLoadingCategorias } = useCategories();
  const { data: categoriaTipos, isLoading: isLoadingCategoriaTipos } = useCategoryTypes();
  const { cities, neighborhoods, loading: isLoadingLocations } = useLocationOptions();
  
  // Estado local para todos os campos
  const [formState, setFormState] = useState({
    zona: filters.zona?.toString() || '',
    secao: filters.secao?.toString() || '',
    bairro: filters.bairro || '',
    cidade: filters.cidade || '',
    logradouro: filters.logradouro || '',
    categoria_uid: filters.categoria_uid || '',
    categoria_tipo_uid: '',
    indicado: filters.indicado || '',
    responsavel: filters.responsavel || '',
    mes_nascimento: filters.mes_nascimento || ''
  });

  // Atualizar estado local quando os filtros externos mudarem
  useEffect(() => {
    setFormState(prev => ({
      ...prev,
      zona: filters.zona?.toString() || '',
      secao: filters.secao?.toString() || '',
      bairro: filters.bairro || '',
      cidade: filters.cidade || '',
      logradouro: filters.logradouro || '',
      categoria_uid: filters.categoria_uid || '',
      indicado: filters.indicado || '',
      responsavel: filters.responsavel || '',
      mes_nascimento: filters.mes_nascimento || ''
    }));
  }, [filters]);

  // Função para atualizar o estado local
  const handleInputChange = (field: string, value: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: value,
      // Limpar categoria se trocar o tipo
      ...(field === 'categoria_tipo_uid' ? { categoria_uid: '' } : {})
    }));

    // Atualiza automaticamente apenas os campos de seleção exceto categoria_tipo_uid
    if (['bairro', 'cidade', 'categoria_uid', 'indicado', 'responsavel', 'mes_nascimento'].includes(field)) {
      const newFilters = {
        ...filters,
        [field]: value || undefined
      };
      onFilterChange(newFilters);
    }
  };

  // Função para aplicar os filtros
  const handleApplyFilters = useCallback(() => {
    const newFilters: EleitorFilters = {
      ...filters,
      zona: formState.zona ? parseInt(formState.zona, 10) : undefined,
      secao: formState.secao ? parseInt(formState.secao, 10) : undefined,
      logradouro: formState.logradouro || undefined,
      bairro: formState.bairro || undefined,
      cidade: formState.cidade || undefined,
      categoria_uid: formState.categoria_uid || undefined,
      indicado: formState.indicado || undefined,
      responsavel: formState.responsavel || undefined,
      mes_nascimento: formState.mes_nascimento || undefined
    };
    onFilterChange(newFilters);
  }, [formState, filters, onFilterChange]);

  // Função para limpar os filtros
  const handleClearFilters = useCallback(() => {
    const clearedState = {
      zona: '',
      secao: '',
      bairro: '',
      cidade: '',
      logradouro: '',
      categoria_uid: '',
      categoria_tipo_uid: '',
      indicado: '',
      responsavel: '',
      mes_nascimento: ''
    };
    setFormState(clearedState);
    onFilterChange({
      nome: '',
      genero: '',
      zona: undefined,
      secao: undefined,
      bairro: '',
      categoria_uid: undefined,
      logradouro: '',
      indicado: '',
      cep: '',
      responsavel: '',
      cidade: '',
      mes_nascimento: '',
      whatsapp: '',
      cpf: ''
    });
  }, [onFilterChange]);

  // Preparar opções do dropdown de tipos de categoria
  const categoriaTiposOptions = useMemo(() => [
    { value: '', label: 'Selecione...' },
    ...(categoriaTipos || []).map(tipo => ({
      value: tipo.uid,
      label: tipo.nome
    }))
  ], [categoriaTipos]);

  // Filtrar categorias baseado no tipo selecionado
  const categoriasFiltradas = useMemo(() => {
    if (!formState.categoria_tipo_uid) return categorias || [];
    return (categorias || []).filter(cat => cat.tipo_uid === formState.categoria_tipo_uid);
  }, [categorias, formState.categoria_tipo_uid]);

  // Preparar opções do dropdown de categorias
  const categoriasOptions = useMemo(() => [
    { value: '', label: 'Selecione...' },
    ...categoriasFiltradas.map(categoria => ({
      value: categoria.uid,
      label: categoria.nome
    }))
  ], [categoriasFiltradas]);

  const indicadoresOptions = [
    { value: '', label: 'Selecione...' },
    ...(indications || []).map(item => ({
      value: item.value,
      label: item.label || 'Sem nome'
    }))
  ];

  const responsaveisOptions = [
    { value: '', label: 'Selecione...' },
    ...(users || []).map(item => ({
      value: item.value,
      label: item.label || 'Sem nome'
    }))
  ];

  const cityOptions = [
    { value: '', label: 'Selecione...' },
    ...(cities || []).map(city => ({
      value: city,
      label: city
    }))
  ];

  const neighborhoodOptions = [
    { value: '', label: 'Selecione...' },
    ...(neighborhoods || []).map(neighborhood => ({
      value: neighborhood,
      label: neighborhood
    }))
  ];

  const SelectField = ({ id, label, options, value, icon: Icon, isLoading, onChange }: {
    id: keyof EleitorFilters;
    label: string;
    options: { value: string; label: string }[];
    value: string | undefined;
    icon?: React.ComponentType<any>;
    isLoading?: boolean;
    onChange?: (value: string) => void;
  }) => (
    <div className="relative group">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className={`h-4 w-4 ${isLoading ? 'animate-pulse' : ''} text-gray-400`} />
          </div>
        )}
        <select
          id={id}
          value={value || ''}
          onChange={(e) => onChange ? onChange(e.target.value) : handleInputChange(id, e.target.value)}
          disabled={isLoading}
          className="block w-full h-11 pl-10 pr-4 text-sm rounded-lg border border-gray-200 
            focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
            dark:bg-gray-700/50 dark:border-gray-600 dark:text-white
            transition-all duration-200
            hover:border-primary-400 dark:hover:border-primary-500
            placeholder-gray-400 dark:placeholder-gray-500
            shadow-sm"
        >
          {options.map((option, index) => (
            <option key={`${id}-${option.value || 'empty'}-${index}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
          <svg className={`h-4 w-4 text-gray-400 ${isLoading ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40" 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }} 
      />
      <div 
        className={`fixed inset-y-0 right-0 w-full sm:w-[400px] bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } z-50 h-full border-l border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-500 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filtros</h2>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1" onClick={(e) => e.stopPropagation()}>
          <div className="p-8 space-y-8">
            {/* Localização */}
            <div className="rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100/50 dark:border-gray-700/50 p-6 backdrop-blur-sm backdrop-filter">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30">
                  <MapPin className="h-5 w-5 text-primary-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Localização
                </h3>
              </div>
              
              {/* Grid para Zona e Seção */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <div className="relative">
                  <label htmlFor="zona" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Zona
                  </label>
                  <div className="relative group">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-hover:text-primary-500 transition-colors duration-200" />
                    <input
                      type="number"
                      id="zona"
                      value={formState.zona}
                      onChange={(e) => handleInputChange('zona', e.target.value)}
                      className="block w-full h-11 pl-10 pr-4 text-sm rounded-lg border border-gray-200 
                        focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
                        dark:bg-gray-700/50 dark:border-gray-600 dark:text-white
                        transition-all duration-200
                        hover:border-primary-400 dark:hover:border-primary-500
                        placeholder-gray-400 dark:placeholder-gray-500
                        shadow-sm"
                      placeholder="Digite a zona..."
                      min="0"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label htmlFor="secao" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Seção
                  </label>
                  <div className="relative group">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-hover:text-primary-500 transition-colors duration-200" />
                    <input
                      type="number"
                      id="secao"
                      value={formState.secao}
                      onChange={(e) => handleInputChange('secao', e.target.value)}
                      className="block w-full h-11 pl-10 pr-4 text-sm rounded-lg border border-gray-200 
                        focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
                        dark:bg-gray-700/50 dark:border-gray-600 dark:text-white
                        transition-all duration-200
                        hover:border-primary-400 dark:hover:border-primary-500
                        placeholder-gray-400 dark:placeholder-gray-500
                        shadow-sm"
                      placeholder="Digite a seção..."
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Campos restantes */}
              <div className="space-y-5">
                <SelectField 
                  id="cidade" 
                  label="Cidade" 
                  options={cityOptions}
                  value={formState.cidade}
                  onChange={(value) => handleInputChange('cidade', value)}
                  icon={Building2}
                  isLoading={isLoadingLocations}
                />
                <SelectField 
                  id="bairro" 
                  label="Bairro" 
                  options={neighborhoodOptions}
                  value={formState.bairro}
                  onChange={(value) => handleInputChange('bairro', value)}
                  icon={Home}
                  isLoading={isLoadingLocations}
                />
                <div className="relative">
                  <label htmlFor="logradouro" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Logradouro
                  </label>
                  <div className="relative group">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-hover:text-primary-500 transition-colors duration-200" />
                    <input
                      type="text"
                      id="logradouro"
                      value={formState.logradouro}
                      onChange={(e) => handleInputChange('logradouro', e.target.value)}
                      className="block w-full h-11 pl-10 pr-4 text-sm rounded-lg border border-gray-200 
                        focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
                        dark:bg-gray-700/50 dark:border-gray-600 dark:text-white
                        transition-all duration-200
                        hover:border-primary-400 dark:hover:border-primary-500
                        placeholder-gray-400 dark:placeholder-gray-500
                        shadow-sm"
                      placeholder="Digite o logradouro..."
                    />
                  </div>
                </div>

                <SelectField 
                  id="mes_nascimento"
                  label="Mês de Nascimento"
                  options={mesesOptions}
                  value={formState.mes_nascimento}
                  onChange={(value) => handleInputChange('mes_nascimento', value)}
                  icon={Calendar}
                />

                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleApplyFilters}
                    className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white 
                      bg-gradient-to-r from-primary-600 to-primary-500 
                      border border-transparent rounded-lg shadow-md 
                      hover:from-primary-700 hover:to-primary-600 
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 
                      transform hover:scale-[1.02] active:scale-[0.98]
                      transition-all duration-200"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Aplicar Localização
                  </button>
                </div>
              </div>
            </div>

            {/* Categorização */}
            <div className="rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100/50 dark:border-gray-700/50 p-6 backdrop-blur-sm backdrop-filter">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30">
                  <User2 className="h-5 w-5 text-primary-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Categorização
                </h3>
              </div>
              
              <div className="space-y-5">
                <SelectField 
                  id="categoria_tipo_uid" 
                  label="Tipo de Categoria" 
                  options={categoriaTiposOptions}
                  value={formState.categoria_tipo_uid}
                  onChange={(value) => handleInputChange('categoria_tipo_uid', value)}
                  icon={User2}
                  isLoading={isLoadingCategoriaTipos}
                />
                <SelectField 
                  id="categoria_uid" 
                  label="Categoria" 
                  options={categoriasOptions}
                  value={formState.categoria_uid}
                  onChange={(value) => handleInputChange('categoria_uid', value)}
                  icon={User2}
                  isLoading={isLoadingCategorias}
                />
                <SelectField 
                  id="indicado" 
                  label="Indicado por" 
                  options={indicadoresOptions}
                  value={formState.indicado}
                  onChange={(value) => handleInputChange('indicado', value)}
                  icon={User2}
                  isLoading={isLoading}
                />
                <SelectField 
                  id="responsavel" 
                  label="Responsável" 
                  options={responsaveisOptions}
                  value={formState.responsavel}
                  onChange={(value) => handleInputChange('responsavel', value)}
                  icon={User2}
                  isLoading={isLoading}
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-4">
              <button
                onClick={handleClearFilters}
                className="flex-1 inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-gray-700 
                  bg-white border border-gray-200 rounded-lg shadow-md 
                  hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 
                  dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50 
                  transform hover:scale-[1.02] active:scale-[0.98]
                  transition-all duration-200"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar
              </button>
              <button
                onClick={onClose}
                className="flex-1 inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-gray-700 
                  bg-white border border-gray-200 rounded-lg shadow-md 
                  hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 
                  dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50 
                  transform hover:scale-[1.02] active:scale-[0.98]
                  transition-all duration-200"
              >
                <X className="h-4 w-4 mr-2" />
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
