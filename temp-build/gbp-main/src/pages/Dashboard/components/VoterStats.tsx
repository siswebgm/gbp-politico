import React from 'react';
import { Users, MapPin, TrendingUp } from 'lucide-react';
import { Card } from '../../../components/Card';

export function VoterStats() {
  const stats = [
    {
      title: 'Total de Eleitores',
      value: '12',
      change: '+12%',
      description: 'Base total de eleitores',
      icon: Users,
      positive: true,
    },
    {
      title: 'Novos Eleitores',
      value: '12',
      change: '+8%',
      description: 'Cadastrados este mês',
      icon: Users,
      positive: true,
    },
    {
      title: 'Bairros Alcançados',
      value: '5',
      description: 'Bairros com eleitores',
      icon: MapPin,
    },
    {
      title: 'Taxa de Conversão',
      value: '68%',
      change: '+5%',
      description: 'Média de conversão',
      icon: TrendingUp,
      positive: true,
    },
  ];

  return (
    <div className="max-md:max-w-lg max-md:mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-md:grid-cols-1">
        {stats.map((stat, index) => (
          <Card key={index}>
            <div className="flex items-center p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                  {stat.title}
                </p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                  {stat.change && (
                    <p
                      className={`ml-2 flex items-baseline text-sm font-semibold ${
                        stat.positive
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {stat.change}
                    </p>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
                  {stat.description}
                </p>
              </div>
              <div className="flex-shrink-0 p-3 bg-blue-50 dark:bg-blue-900/50 rounded-lg ml-4">
                <stat.icon
                  className="h-6 w-6 text-blue-600 dark:text-blue-400"
                  aria-hidden="true"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}