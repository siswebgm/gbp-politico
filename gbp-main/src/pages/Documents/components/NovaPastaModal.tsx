import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useDocumentosPastas } from '../../../hooks/useDocumentosPastas';
import { useToast } from '../../../components/ui/use-toast';
import { corPadrao, formatarNomePasta, iconePadrao, pastaCores, pastaIcones } from './pastaConfig';

interface NovaPastaModalProps {
  open: boolean;
  onClose: () => void;
}

export function NovaPastaModal({ open, onClose }: NovaPastaModalProps) {
  const { toast } = useToast();
  const { criarPasta } = useDocumentosPastas();

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cor, setCor] = useState(corPadrao);
  const [icone, setIcone] = useState(iconePadrao);
  const [isSaving, setIsSaving] = useState(false);

  if (!open) return null;

  const resetar = () => {
    setNome('');
    setDescricao('');
    setCor(corPadrao);
    setIcone(iconePadrao);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast({ title: 'Informe o nome da pasta', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      // Padroniza o nome (evita TUDO MAIÚSCULO e espaços duplicados)
      const nomeFinal = formatarNomePasta(nome);
      await criarPasta({ nome: nomeFinal, descricao, cor, icone });
      toast({ title: 'Pasta criada!', description: `"${nomeFinal}" está pronta para receber documentos.`, variant: 'success' });
      resetar();
      onClose();
    } catch (err) {
      console.error('[pastas] erro ao criar:', err);
      toast({ title: 'Erro ao criar pasta', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nova pasta</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Documentos do Bairro Centro"
            autoFocus
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {nome.trim() && formatarNomePasta(nome) !== nome.trim() && (
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Será salvo como: <strong className="text-gray-700 dark:text-gray-200">{formatarNomePasta(nome)}</strong>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Descrição</label>
          <input
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Para que serve esta pasta?"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Cor</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(pastaCores).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCor(key)}
                title={cfg.label}
                className={`w-8 h-8 rounded-lg ${cfg.bg} ring-2 transition-all ${
                  cor === key ? 'ring-offset-2 ring-gray-400 scale-110' : 'ring-black/5'
                }`}
              >
                <span className={`block w-3 h-3 mx-auto rounded-full bg-gradient-to-br ${cfg.gradientFrom} ${cfg.gradientTo}`} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ícone</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(pastaIcones).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcone(key)}
                  title={cfg.label}
                  className={`p-2 rounded-lg border transition-all ${
                    icone === key
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Criar pasta
          </button>
        </div>
      </form>
    </div>
  );
}
