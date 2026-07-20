import React from 'react';

interface AlfabetoFilterProps {
  onSelect: (letra: string) => void;
  letraSelecionada?: string;
}

export const AlfabetoFilter: React.FC<AlfabetoFilterProps> = ({ onSelect, letraSelecionada }) => {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="flex flex-wrap gap-1 mb-4">
      <button
        onClick={() => onSelect('')}
        className={`px-2 py-1 text-sm rounded ${
          !letraSelecionada
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        Todos
      </button>
      {alfabeto.map((letra) => (
        <button
          key={letra}
          onClick={() => onSelect(letra)}
          className={`px-2 py-1 text-sm rounded ${
            letra === letraSelecionada
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          {letra}
        </button>
      ))}
    </div>
  );
};
