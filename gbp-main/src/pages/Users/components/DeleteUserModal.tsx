import { AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  userName: string;
}

export function DeleteUserModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isDeleting,
  userName 
}: DeleteUserModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <DialogTitle className="text-center text-lg font-semibold leading-6 text-gray-900 mt-4">
            Excluir Usuário
          </DialogTitle>
          <div className="mt-2">
            <p className="text-center text-sm text-gray-500">
              Tem certeza que deseja excluir o usuário{' '}
              <span className="font-medium text-gray-900">{userName}</span>?
              <br />
              Esta ação não poderá ser desfeita.
            </p>
          </div>
        </DialogHeader>

        <div className="mt-6 flex justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="min-w-[100px]"
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            className="min-w-[100px] gap-2"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
