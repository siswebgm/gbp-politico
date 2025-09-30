import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Version {
  version: string;
  timestamp: string;
}

const CACHE_KEY = 'app_version';
const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutos

export function useAppVersion() {
  const [needsUpdate, setNeedsUpdate] = useState(false);

  // Usar React Query para cache e revalidação automática
  const { data: serverVersion } = useQuery<Version>({
    queryKey: ['version'],
    queryFn: async () => {
      const response = await fetch('/version.json');
      return response.json();
    },
    // Configurações para otimizar as requisições
    staleTime: CHECK_INTERVAL, // Considera os dados válidos por 30 minutos
    cacheTime: CHECK_INTERVAL, // Mantém no cache por 30 minutos
    // Só refaz a requisição se a aba estiver ativa
    refetchOnWindowFocus: true,
    // Não refaz a requisição automaticamente
    refetchInterval: CHECK_INTERVAL,
    // Não bloqueia a interface durante a requisição
    suspense: false,
    // Tenta novamente apenas uma vez em caso de erro
    retry: 1,
  });

  useEffect(() => {
    if (!serverVersion) return;

    const cachedVersion = localStorage.getItem(CACHE_KEY);
    
    // Só atualiza se houver uma versão em cache e ela for diferente
    if (cachedVersion && cachedVersion !== serverVersion.version) {
      setNeedsUpdate(true);
    }
    
    // Atualiza a versão em cache
    localStorage.setItem(CACHE_KEY, serverVersion.version);
  }, [serverVersion]);

  const forceUpdate = () => {
    // Limpa o cache do service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
    }
    // Recarrega a página
    window.location.reload();
  };

  return { needsUpdate, forceUpdate };
}
