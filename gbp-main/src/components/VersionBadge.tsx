import { useVersionCheck } from '../hooks/useVersionCheck';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function VersionBadge() {
  const { isUpToDate, isChecking } = useVersionCheck();
  const [buildInfo, setBuildInfo] = useState<string>('');

  useEffect(() => {
    fetch('/version.json')
      .then(res => res.json())
      .then(data => {
        const date = new Date(data.buildDate);
        const formatted = date.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        setBuildInfo(formatted);
      })
      .catch(() => setBuildInfo(''));
  }, []);

  if (isChecking) {
    return (
      <div 
        className="fixed bottom-4 left-4 z-40 flex items-center gap-1.5 bg-gray-100/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-600 dark:text-gray-300 px-2 py-1.5 rounded-lg shadow-md text-xs"
        title="Verificando versão"
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        {buildInfo && <span className="font-mono">{buildInfo}</span>}
      </div>
    );
  }

  if (!isUpToDate) {
    return (
      <div 
        className="fixed bottom-4 left-4 z-40 flex items-center gap-1.5 bg-orange-500/90 dark:bg-orange-600/90 backdrop-blur-sm text-white px-2 py-1.5 rounded-lg shadow-md text-xs animate-pulse"
        title="Atualização disponível"
      >
        <AlertCircle className="w-3 h-3" />
        {buildInfo && <span className="font-mono">{buildInfo}</span>}
      </div>
    );
  }

  return (
    <div 
      className="fixed bottom-4 left-4 z-40 flex items-center gap-1.5 bg-emerald-500/80 dark:bg-emerald-600/80 backdrop-blur-sm text-white px-2 py-1.5 rounded-lg shadow-md text-xs"
      title="Versão atualizada"
    >
      <CheckCircle2 className="w-3 h-3" />
      {buildInfo && <span className="font-mono">{buildInfo}</span>}
    </div>
  );
}
