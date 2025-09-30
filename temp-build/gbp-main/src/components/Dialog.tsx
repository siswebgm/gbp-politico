import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  confirmVariant?: 'primary' | 'danger';
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  confirmText,
  cancelText,
  onConfirm,
  confirmVariant = 'primary',
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" 
        />
        <DialogPrimitive.Content 
          className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl border border-gray-100 dark:border-gray-800 mx-4"
        >
          <div className="flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <DialogPrimitive.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {title}
                </DialogPrimitive.Title>
                {description && (
                  <DialogPrimitive.Description className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              <DialogPrimitive.Close className="rounded-full p-2.5 opacity-70 ring-offset-white transition-all hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2">
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            {/* Content with custom scrollbar */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 scrollbar-modern">
              {children}
            </div>

            {/* Footer */}
            {(confirmText || cancelText) && (
              <div className="flex justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
                {cancelText && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all"
                  >
                    {cancelText}
                  </button>
                )}
                {confirmText && (
                  <button
                    type="button"
                    onClick={onConfirm}
                    className={clsx(
                      "inline-flex justify-center rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all shadow-sm",
                      confirmVariant === 'danger'
                        ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
                        : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                    )}
                  >
                    {confirmText}
                  </button>
                )}
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
