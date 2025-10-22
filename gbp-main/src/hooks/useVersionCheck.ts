import { useEffect, useState } from 'react';

interface VersionCheck {
  currentVersion: string | null;
  serverVersion: string | null;
  isUpToDate: boolean;
  isChecking: boolean;
}

/**
 * Hook para verificar se o usuário está na versão mais recente
 * Útil para debugging e monitoramento
 */
export function useVersionCheck(): VersionCheck {
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Versão em cache do usuário
    const cached = localStorage.getItem('app_version');
    setCurrentVersion(cached);

    // Versão no servidor
    fetch('/version.json')
      .then(res => res.json())
      .then(data => {
        setServerVersion(data.version);
        setIsChecking(false);
      })
      .catch(err => {
        console.error('Erro ao verificar versão:', err);
        setIsChecking(false);
      });
  }, []);

  const isUpToDate = currentVersion === serverVersion;

  return {
    currentVersion,
    serverVersion,
    isUpToDate,
    isChecking
  };
}
