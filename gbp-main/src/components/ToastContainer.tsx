import { useEffect } from 'react';
import { useToast } from '../hooks/useToast';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-500',
  error: 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300 border-red-500',
  info: 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-500',
  warning: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 border-yellow-500',
};

export function ToastContainer() {
  const { messages, hideToast } = useToast();

  useEffect(() => {
    // Limpa todos os toasts quando o componente é desmontado
    return () => {
      messages.forEach((message) => {
        if (message.id) {
          hideToast(message.id);
        }
      });
    };
  }, []);

  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-4 pointer-events-none max-w-md w-full">
      <AnimatePresence>
        {messages.map((message) => {
          const Icon = icons[message.type];

          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 50, scale: 0.3 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
              className={`
                pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg
                ${colors[message.type]}
              `}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <div className="flex-1 space-y-1">
                <h3 className="font-medium">{message.title}</h3>
                {message.description && (
                  <p className="text-sm opacity-90">{message.description}</p>
                )}
              </div>
              <button
                onClick={() => message.id && hideToast(message.id)}
                className="shrink-0 rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span className="sr-only">Fechar</span>
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
