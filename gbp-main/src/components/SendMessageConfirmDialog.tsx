import { Dialog } from './Dialog';

interface SendProgress {
  total: number;
  current: number;
  step: string;
}

interface SendMessageConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  progress: SendProgress;
}

export function SendMessageConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  loading,
  progress
}: SendMessageConfirmDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      title="Confirmar envio de mensagem"
    >
      <div className="space-y-4">
        {loading ? (
          <LoadingState progress={progress} />
        ) : (
          <ConfirmationState onClose={onClose} onConfirm={onConfirm} />
        )}
      </div>
    </Dialog>
  );
}

function LoadingState({ progress }: { progress: SendProgress }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-gray-900">{progress.step}</p>
        {progress.total > 0 && (
          <>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-primary-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">
              {progress.current} de {progress.total} mensagens enviadas
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function ConfirmationState({
  onClose,
  onConfirm
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <p className="text-sm text-gray-500">
        Você está prestes a enviar uma mensagem para todos os eleitores que
        correspondem aos filtros selecionados. Deseja continuar?
      </p>

      <div className="mt-4 flex justify-end gap-3">
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          onClick={onClose}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          onClick={onConfirm}
        >
          Confirmar e Enviar
        </button>
      </div>
    </>
  );
}
