import React, { useEffect, useState } from 'react';
import { Dialog } from '@radix-ui/react-dialog';

export const UpdatePrompt: React.FC = () => {
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  useEffect(() => {
    // Registra listener para mensagens do service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        setShowUpdateDialog(true);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleUpdate = () => {
    // Força o recarregamento da página
    window.location.reload();
  };

  if (!showUpdateDialog) return null;

  return (
    <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Nova versão disponível
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Uma nova versão do aplicativo está disponível. Atualize agora para ter acesso às últimas melhorias e correções.
          </p>
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setShowUpdateDialog(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Depois
            </button>
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Atualizar agora
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
