import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { CheckCircle2, FileText, Filter, MessageCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  message: string;
  files: FileList | null;
  filters: {
    bairro: string;
    cidade: string;
    categoria: string;
    genero: string;
  };
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  message,
  files,
  filters,
}: ConfirmDialogProps) {
  const getFilterSummary = () => {
    const activeFilters = Object.entries(filters)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}: ${value}`);
    return activeFilters.length > 0
      ? activeFilters.join(', ')
      : 'Nenhum filtro selecionado';
  };

  const getFilesSummary = () => {
    if (!files) return 'Nenhum arquivo anexado';
    return `${files.length} arquivo(s) anexado(s)`;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader className="space-y-4">
          <div className="flex items-center justify-center space-x-2 text-primary sticky top-0 bg-background py-2">
            <CheckCircle2 className="h-8 w-8" />
            <AlertDialogTitle className="text-xl md:text-2xl font-bold">
              Confirmar Envio
            </AlertDialogTitle>
          </div>
          
          <AlertDialogDescription className="space-y-4">
            {/* Filtros */}
            <div className="rounded-lg border bg-card p-3 md:p-4 shadow-sm">
              <div className="flex items-center space-x-2 text-primary mb-2">
                <Filter className="h-4 md:h-5 w-4 md:w-5" />
                <h3 className="font-semibold text-sm md:text-base">Filtros selecionados</h3>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">
                {getFilterSummary()}
              </p>
            </div>

            {/* Mensagem */}
            <div className="rounded-lg border bg-card p-3 md:p-4 shadow-sm">
              <div className="flex items-center space-x-2 text-primary mb-2">
                <MessageCircle className="h-4 md:h-5 w-4 md:w-5" />
                <h3 className="font-semibold text-sm md:text-base">Mensagem</h3>
              </div>
              <div className="max-h-[20vh] overflow-y-auto">
                <p className="text-xs md:text-sm text-muted-foreground whitespace-pre-wrap">
                  {message}
                </p>
              </div>
            </div>

            {/* Arquivos */}
            <div className="rounded-lg border bg-card p-3 md:p-4 shadow-sm">
              <div className="flex items-center space-x-2 text-primary mb-2">
                <FileText className="h-4 md:h-5 w-4 md:w-5" />
                <h3 className="font-semibold text-sm md:text-base">Arquivos</h3>
              </div>
              <div className="max-h-[30vh] overflow-y-auto">
                {files && Array.from(files).map((file, index) => (
                  <div key={index} className="flex items-center space-x-2 py-1 text-xs md:text-sm text-muted-foreground">
                    <FileText className="h-3 md:h-4 w-3 md:w-4 shrink-0" />
                    <span className="truncate">{file.name}</span>
                    <span className="shrink-0">({Math.round(file.size / 1024)}KB)</span>
                  </div>
                ))}
                {(!files || files.length === 0) && (
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Nenhum arquivo anexado
                  </p>
                )}
              </div>
            </div>

            {/* Aviso */}
            <div className="flex items-start space-x-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 md:p-4">
              <AlertTriangle className="h-4 md:h-5 w-4 md:w-5 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-xs md:text-sm text-yellow-700">
                Esta ação enviará a mensagem para todos os contatos que correspondem
                aos filtros selecionados. Certifique-se de que todos os dados estão corretos antes de confirmar.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="sticky bottom-0 bg-background py-2">
          <AlertDialogCancel className="text-xs md:text-sm">Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={cn(
              "text-xs md:text-sm",
              "bg-primary hover:bg-primary/90",
              "text-white font-semibold"
            )}
          >
            Confirmar Envio
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
