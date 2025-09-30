import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

const toastStyles = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-500',
    text: 'text-green-800 dark:text-green-200',
    icon: CheckCircle,
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-500',
    text: 'text-red-800 dark:text-red-200',
    icon: XCircle,
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-500',
    text: 'text-yellow-800 dark:text-yellow-200',
    icon: AlertCircle,
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-500',
    text: 'text-blue-800 dark:text-blue-200',
    icon: Info,
  },
};

function Toast({ message, type, onClose }: ToastProps) {
  const style = toastStyles[type];
  const Icon = style.icon;

  return (
    <div
      className={`${style.bg} border-l-4 ${style.border} p-4 rounded-r shadow-lg flex items-center justify-between`}
      role="alert"
    >
      <div className="flex items-center">
        <Icon className={`h-5 w-5 ${style.text} mr-2`} />
        <span className={`${style.text} text-sm font-medium`}>{message}</span>
      </div>
      <button
        onClick={onClose}
        className={`${style.text} hover:opacity-75 focus:outline-none`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{
    id: number;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>;
  onClose: (id: number) => void;
}

function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onClose(toast.id)}
        />
      ))}
    </div>
  );
}

// Toaster component that can be used globally
export function Toaster() {
  const { toasts = [] } = useToast();
  
  const handleClose = (id: number) => {
    // O próprio hook já cuida da remoção automática
  };

  return <ToastContainer toasts={toasts} onClose={handleClose} />;
}
