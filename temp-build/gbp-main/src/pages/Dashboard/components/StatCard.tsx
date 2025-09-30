import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { Users, Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { usePermissions } from "../../../hooks/usePermissions";
import { cn } from '../../../lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  total: number;
  icon: any;
  color: string;
  stats: any;
  showDetailsLink?: boolean;
  detailsUrl?: string;
}

export function StatCard({ 
  title, 
  value, 
  total, 
  icon: Icon, 
  color, 
  stats,
  showDetailsLink,
  detailsUrl
}: StatCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('7');
  const { isAdmin } = usePermissions();

  const periods = [
    { label: '7 dias', value: '7' },
    { label: '30 dias', value: '30' },
    { label: '90 dias', value: '90' },
    { label: '180 dias', value: '180' },
  ];

  return (
    <div className="relative">
      <div 
        className="bg-white rounded-lg shadow p-3 cursor-pointer hover:shadow-md transition-shadow h-[90px]"
        onClick={() => setIsDetailsOpen(!isDetailsOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`p-1.5 rounded-lg ${color} bg-opacity-10`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">{title}</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-bold text-gray-900">
                  {value.toLocaleString('pt-BR')}
                </p>
                <p className="ml-1 text-sm font-medium text-gray-600">
                  /{total}
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              stats.crescimento >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {stats.crescimento >= 0 ? '+' : ''}{stats.crescimento.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {isDetailsOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg z-10 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {title}
            </h3>
            <button
              onClick={() => setIsDetailsOpen(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Fechar</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Análise detalhada dos últimos {selectedPeriod} dias
          </p>

          <div className="flex space-x-2 mb-6">
            {periods.map(period => (
              <button
                key={period.value}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPeriod(period.value);
                }}
                className={`px-3 py-1 text-sm rounded-md ${
                  selectedPeriod === period.value
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* Botão Ver Mais - para Total de Atendimentos */}
          {showDetailsLink && isAdmin && (
            <div className="flex justify-end mb-4">
              <Link
                to={detailsUrl || '#'}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Ver mais detalhes
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          <div className="mt-4 space-y-4">
            {/* Botão Ver Detalhes - apenas para Total de Eleitores */}
            {title === 'Total de Eleitores' && (
              <div className="flex justify-end">
                <Link
                  to="/app/eleitores/relatorio"
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                >
                  Ver detalhes
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900">Total no Período</h4>
                <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-900">Crescimento</h4>
                <p className={`text-2xl font-bold ${stats.crescimento >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {stats.crescimento >= 0 ? '+' : ''}{stats.crescimento.toFixed(1)}%
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Distribuição por Dia</h4>
                {Object.entries(stats.distribuicaoPorDia).map(([dia, valor]) => (
                  <div key={dia} className="mb-3">
                    <div className="flex justify-between items-center text-sm mb-1.5">
                      <span className="font-medium text-gray-700">{dia}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        {valor} registros
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                        style={{
                          width: `${(valor / total) * 100}%`,
                          transition: 'width 0.5s ease-in-out'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Distribuição por Horário</h4>
                {Object.entries(stats.distribuicaoPorHorario).map(([horario, valor], index) => {
                  const colors = {
                    'Manhã (6h-12h)': 'from-yellow-500 to-yellow-600',
                    'Tarde (12h-18h)': 'from-orange-500 to-orange-600',
                    'Noite (18h-6h)': 'from-blue-500 to-blue-600'
                  };
                  const bgColors = {
                    'Manhã (6h-12h)': 'bg-yellow-50 text-yellow-700',
                    'Tarde (12h-18h)': 'bg-orange-50 text-orange-700',
                    'Noite (18h-6h)': 'bg-blue-50 text-blue-700'
                  };
                  return (
                    <div key={horario} className="mb-3">
                      <div className="flex justify-between items-center text-sm mb-1.5">
                        <span className="font-medium text-gray-700">{horario}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bgColors[horario as keyof typeof bgColors]}`}>
                            {valor} registros
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full bg-gradient-to-r ${colors[horario as keyof typeof colors]}`}
                          style={{
                            width: `${(valor / total) * 100}%`,
                            transition: 'width 0.5s ease-in-out'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}