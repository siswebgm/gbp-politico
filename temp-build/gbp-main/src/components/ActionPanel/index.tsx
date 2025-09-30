import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ActionPanelProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function ActionPanel({ title, children, defaultExpanded = true }: ActionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          {title}
        </h2>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-6 pb-4 animate-slideDown">
          {children}
        </div>
      )}
    </div>
  );
}
