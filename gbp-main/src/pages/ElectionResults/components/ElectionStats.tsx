import React from 'react';
import { Users, UserX, CheckSquare, Vote } from 'lucide-react';
import type { ElectionStats } from '../../../types/election';

interface ElectionStatsProps {
  stats: ElectionStats;
}

export function ElectionStats({ stats }: ElectionStatsProps) {
  const cards = [
    {
      title: 'Total de Eleitores',
      value: stats.totalVoters.toLocaleString(),
      icon: Users,
    },
    {
      title: 'Abstenções',
      value: stats.abstentions.toLocaleString(),
      icon: UserX,
    },
    {
      title: 'Votos Válidos',
      value: stats.validVotes.toLocaleString(),
      icon: CheckSquare,
    },
    {
      title: 'Total de Votos',
      value: stats.totalVotes.toLocaleString(),
      icon: Vote,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.title} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <card.icon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {card.title}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {card.value}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}