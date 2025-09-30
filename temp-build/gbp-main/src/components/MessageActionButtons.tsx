import { Send } from 'lucide-react';
import React from 'react';

interface MessageActionButtonsProps {
  onTest: () => void;
  onSend: () => void;
  disabled: boolean;
}

export function MessageActionButtons({ onTest, onSend, disabled }: MessageActionButtonsProps) {
  return (
    <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
      <button
        onClick={onTest}
        disabled={disabled}
        className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 min-w-[120px] touch-manipulation"
      >
        <Send className="h-4 w-4 mr-2" />
        Testar
      </button>
      <button
        onClick={onSend}
        disabled={disabled}
        className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] touch-manipulation"
      >
        <Send className="h-4 w-4 mr-2" />
        Enviar
      </button>
    </div>
  );
}
