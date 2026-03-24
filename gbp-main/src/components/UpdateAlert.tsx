import { useAppVersion } from '../hooks/useAppVersion';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

export function UpdateAlert() {
  const { needsUpdate, forceUpdate } = useAppVersion();
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!needsUpdate) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      setIsUpdating(true);
      await forceUpdate();
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [needsUpdate, forceUpdate]);

  if (!needsUpdate) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-md overflow-hidden rounded-xl shadow-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="h-1 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500" />
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
                <div className="relative bg-white/10 backdrop-blur-sm p-2 rounded-full">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <h3 className="text-lg font-semibold mb-1">Atualização Obrigatória</h3>
              <p className="text-blue-100 text-sm mb-4">
                Uma nova versão está disponível e precisa ser aplicada para continuar.
              </p>

              <button
                onClick={async () => {
                  setIsUpdating(true);
                  await forceUpdate();
                }}
                disabled={isUpdating}
                className="flex items-center justify-center gap-2 bg-white text-blue-600 px-4 py-2.5 rounded-lg font-medium hover:bg-blue-50 active:scale-95 transition-all shadow-lg hover:shadow-xl text-base disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <RefreshCw className={isUpdating ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
                {isUpdating ? 'Atualizando...' : 'Atualizar Agora'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
