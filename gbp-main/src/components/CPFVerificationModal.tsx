import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Info, Calendar, Tag } from 'lucide-react';

interface EmpresaInfo {
  empresa: string;
  dataCadastro: string | null;
  categoria: string | null;
}

interface CPFVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresas: EmpresaInfo[];
}

export function CPFVerificationModal({ open, onOpenChange, empresas }: CPFVerificationModalProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Data não informada';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            CPF em outras empresas
          </DialogTitle>
          <DialogDescription>
            Pessoa já cadastrada em outra empresa.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ul className="space-y-3">
            {empresas.map((item, index) => (
              <li key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  {item.empresa}
                </div>
                <div className="flex flex-col gap-1 ml-3.5 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    <span>Cadastrado em: {formatDate(item.dataCadastro)}</span>
                  </div>
                  {item.categoria && (
                    <div className="flex items-center gap-1.5">
                      <Tag className="h-3 w-3" />
                      <span>Categoria: {item.categoria}</span>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Entendi, continuar cadastro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
