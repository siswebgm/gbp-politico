import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl'
};

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className={`relative w-full ${sizeClasses[size]} rounded-xl bg-white shadow-xl dark:bg-gray-800 overflow-hidden`}>
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}