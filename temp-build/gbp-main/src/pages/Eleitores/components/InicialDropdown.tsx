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
        className="inline-flex items-center justify-between w-full px-1 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        <span>{letraSelecionada || 'A-Z'}</span>
        <ChevronDown className="w-4 h-4 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-36 -ml-10 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <button
              onClick={() => {
                onSelect('');
                setIsOpen(false);
              }}
              className={`w-full px-3 py-1.5 text-sm text-left rounded hover:bg-gray-50 ${!letraSelecionada ? 'bg-primary-50 text-primary-700 font-medium' : ''}`}
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
                    ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                    : 'hover:bg-gray-100 text-gray-700'}`}
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
