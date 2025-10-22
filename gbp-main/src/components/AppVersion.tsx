import { useEffect, useState } from 'react';

interface VersionInfo {
  version: string;
  buildDate: string;
  timestamp: number;
}

export function AppVersion() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/version.json')
      .then(response => response.json())
      .then((data: VersionInfo) => {
        setVersionInfo(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar versão:', err);
        setIsLoading(false);
      });
  }, []);

  if (isLoading || !versionInfo) return null;

  const buildDate = new Date(versionInfo.buildDate);
  const formattedDate = buildDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="text-xs text-gray-500 dark:text-gray-400">
      <div className="flex items-center gap-2">
        <span className="font-medium">Versão:</span>
        <span className="font-mono">{versionInfo.version.slice(0, 10)}</span>
        <span className="text-gray-400">•</span>
        <span>{formattedDate}</span>
      </div>
    </div>
  );
}
