import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface InicialDropdownProps {
  onSelect: (letra: string) => void;
  letraSelecionada?: string;
}

export const InicialDropdown: React.FC<InicialDropdownProps> = ({ onSelect, letraSelecionada }) => {
  const [isOpen, setIsOpen] = useState(false);
  const alfabeto = ['Todos', ...Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ')];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between w-full px-1 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 text-gray-900 dark:text-gray-200"
      >
        <span>{letraSelecionada || 'A-Z'}</span>
        <ChevronDown className="w-4 h-4 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-36 -ml-10 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                onSelect('');
                setIsOpen(false);
              }}
              className={`w-full px-3 py-1.5 text-sm text-left rounded hover:bg-gray-50 dark:hover:bg-gray-700 ${!letraSelecionada ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium' : 'text-gray-900 dark:text-gray-200'}`}
            >
              Todos
            </button>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-4 gap-1">
              {alfabeto.slice(1).map((letra) => (
                <button
                  key={letra}
                  onClick={() => {
                    onSelect(letra);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-center w-10 h-10 text-sm font-medium rounded-full transition-colors ${letra === letraSelecionada
                    ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                >
                  {letra}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
