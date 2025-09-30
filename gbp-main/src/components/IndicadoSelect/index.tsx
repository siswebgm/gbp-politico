import React, { useState } from 'react';
import { Plus, ChevronDown, Loader2 } from 'lucide-react';
import { useCompanyStore } from '../../hooks/useCompanyContext';
import { indicadoService } from '../../services/indicados';
import { IndicadoModal } from './IndicadoModal';
import type { Indicado } from '../../types/indicado';
import { useIndicadosRealtime } from '../../hooks/useIndicadosRealtime';

interface IndicadoSelectProps {
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
}

export function IndicadoSelect({ value, onChange, error }: IndicadoSelectProps) {
  const [showModal, setShowModal] = useState(false);
  const { indicados, isLoading } = useIndicadosRealtime();

  const handleSuccess = (indicadoId: number) => {
    onChange(indicadoId);
    setShowModal(false);
  };

  const selectedIndicado = indicados.find(i => i.id === value);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Indicado por
        </label>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          <Plus className="h-4 w-4 inline-block mr-1" />
          Novo Indicado
        </button>
      </div>

      <div className="relative mt-1">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          className="block w-full h-11 pl-4 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white appearance-none"
          disabled={isLoading}
        >
          <option value="">Selecione um indicado</option>
          {indicados.map((indicado) => (
            <option key={indicado.id} value={indicado.id}>
              {indicado.nome}
              {indicado.cidade && ` - ${indicado.cidade}`}
              {indicado.bairro && ` (${indicado.bairro})`}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <IndicadoModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}