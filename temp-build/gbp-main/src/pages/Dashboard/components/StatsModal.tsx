import React from 'react';
import { X, Users } from 'lucide-react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  data: {
    total: number;
    crescimento: number;
    distribuicaoPorDia: Record<string, number>;
    distribuicaoPorHorario: Record<string, number>;
    mediaDiaria: number;
    melhorDia: {
      dia: string;
      valor: number;
    };
  };
}

export function StatsModal({ isOpen, onClose, title, subtitle, data }: StatsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-gray-500">{subtitle}</p>
        </div>

        <div className="flex space-x-4 mb-6">
          <button className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-medium">
            7 dias
          </button>
          <button className="text-gray-500 px-4 py-2 rounded-lg font-medium">
            30 dias
          </button>
          <button className="text-gray-500 px-4 py-2 rounded-lg font-medium">
            90 dias
          </button>
          <button className="text-gray-500 px-4 py-2 rounded-lg font-medium">
            180 dias
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="flex items-center mb-2">
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-sm text-gray-600">Total no Período</span>
            </div>
            <p className="text-3xl font-bold text-blue-600">{data.total}</p>
          </div>

          <div className="bg-green-50 p-6 rounded-lg">
            <div className="flex items-center mb-2">
              <span className="text-sm text-gray-600">Crescimento</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{data.crescimento}%</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4">Distribuição por Dia</h3>
          {Object.entries(data.distribuicaoPorDia).map(([dia, valor]) => (
            <div key={dia} className="mb-2">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">{dia}</span>
                <span className="text-sm font-medium">{valor}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div
                  className="h-2 bg-blue-600 rounded-full"
                  style={{ width: `${(valor / data.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4">Distribuição por Horário</h3>
          {Object.entries(data.distribuicaoPorHorario).map(([horario, valor]) => (
            <div key={horario} className="mb-2">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">{horario}</span>
                <span className="text-sm font-medium">{valor}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div
                  className="h-2 bg-blue-600 rounded-full"
                  style={{ width: `${(valor / data.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-purple-50 p-6 rounded-lg">
            <div className="flex items-center mb-2">
              <span className="text-sm text-gray-600">Média Diária</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">{data.mediaDiaria}</p>
          </div>

          <div className="bg-orange-50 p-6 rounded-lg">
            <div className="flex items-center mb-2">
              <span className="text-sm text-gray-600">Melhor Dia</span>
            </div>
            <p className="text-3xl font-bold text-orange-600">{data.melhorDia.dia}</p>
            <p className="text-sm text-gray-500">{data.melhorDia.valor} registros</p>
          </div>
        </div>
      </div>
    </div>
  );
} 