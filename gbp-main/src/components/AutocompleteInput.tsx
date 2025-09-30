import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { useAddressSuggestions, AddressSuggestion } from '../hooks/useAddressSuggestions';
import { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { EleitorFormData } from '../types/eleitor';

interface AutocompleteInputProps {
  name: keyof EleitorFormData;
  label: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
  register: UseFormRegister<EleitorFormData>;
  setValue: UseFormSetValue<EleitorFormData>;
}

export function AutocompleteInput({
  name,
  label,
  required,
  placeholder,
  error,
  register,
  setValue
}: AutocompleteInputProps) {
  const [inputValue, setInputValue] = useState('');
  const { suggestions, loading } = useAddressSuggestions(inputValue);
  const datalistId = `datalist-${name}`;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Se encontrar uma sugestão exata, preenche os outros campos
    const exactMatch = suggestions.find(s => s.logradouro === value);
    if (exactMatch) {
      setValue('logradouro', exactMatch.logradouro);
      setValue('complemento', exactMatch.complemento || '');
      setValue('cidade', exactMatch.cidade || '');
      setValue('bairro', exactMatch.bairro || '');
      setValue('cep', exactMatch.cep || '');
    }
  };

  const { onChange, ...rest } = register(name);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}{required && '*'}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          {...rest}
          onChange={(e) => {
            onChange(e);
            handleInputChange(e);
          }}
          value={inputValue}
          list={datalistId}
          className="block w-full pl-10 pr-3 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder={loading ? 'Carregando...' : placeholder}
        />
        <datalist id={datalistId}>
          {suggestions.map((suggestion, index) => (
            <option key={index} value={suggestion.logradouro} />
          ))}
        </datalist>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
