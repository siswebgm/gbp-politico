import { Plus } from 'lucide-react';

interface Greeting {
  id: number;
  text: string;
}

interface GreetingMenuProps {
  greetings: Greeting[];
  onSelect: (greeting: Greeting) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function GreetingMenu({ greetings, onSelect, isOpen, onToggle }: GreetingMenuProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200 relative"
        title="Adicionar saudação"
      >
        <Plus className="h-4 w-4 text-gray-500" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {greetings.map((greeting) => (
            <button
              key={greeting.id}
              onClick={() => onSelect(greeting)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors duration-200"
            >
              {greeting.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
