import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Version {
  version: string;
  timestamp: string;
}

const CACHE_KEY = 'appVersion';
const LEGACY_CACHE_KEY = 'app_version';
const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutos

const safeGetLocalStorageItem = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn('[useAppVersion] localStorage.getItem falhou:', key, e);
    return null;
  }
};

const safeSetLocalStorageItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('[useAppVersion] localStorage.setItem falhou:', key, e);
  }
};

export function useAppVersion() {
  const [needsUpdate, setNeedsUpdate] = useState(false);

  // Usar React Query para cache e revalidação automática
  const { data: serverVersion } = useQuery<Version>({
    queryKey: ['version'],
    queryFn: async () => {
      const now = Date.now();
      const response = await fetch(`/version.json?t=${now}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
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

    const cachedVersion = safeGetLocalStorageItem(CACHE_KEY) || safeGetLocalStorageItem(LEGACY_CACHE_KEY);
    
    // Só atualiza se houver uma versão em cache e ela for diferente
    if (cachedVersion && cachedVersion !== serverVersion.version) {
      setNeedsUpdate(true);
    }
    
    // Atualiza a versão em cache
    safeSetLocalStorageItem(CACHE_KEY, serverVersion.version);
  }, [serverVersion]);

  const forceUpdate = async () => {
    try {
      // Limpa caches do navegador independente de SW (iOS Safari costuma manter cache agressivo)
      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch (err) {
          console.warn('Falha ao limpar caches:', err);
        }
      }

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();

        // Solicita ao SW instalado/aguardando que assuma imediatamente
        await Promise.all(
          registrations.map(async (registration) => {
            if (registration.waiting) {
              registration.waiting.postMessage?.({ type: 'SKIP_WAITING' });
            } else if (registration.installing) {
              await new Promise<void>((resolve) => {
                const sw = registration.installing!;
                sw.addEventListener('statechange', () => {
                  if (sw.state === 'installed') {
                    sw.postMessage?.({ type: 'SKIP_WAITING' });
                    resolve();
                  }
                });
              });
            } else {
              // Força verificação de atualização
              try { await registration.update(); } catch {}
            }
          })
        );

        // Aguarda a troca de controller para garantir que a nova versão esteja ativa
        await new Promise<void>((resolve) => {
          let done = false;
          const finish = () => { if (!done) { done = true; resolve(); } };
          navigator.serviceWorker.addEventListener('controllerchange', finish);
          // Fallback para ambientes onde não há SW em dev
          setTimeout(finish, 1000);
        });
      }
    } catch (e) {
      console.error('Erro durante atualização forçada:', e);
    } finally {
      // Recarrega a página com cache-bust para forçar novo HTML/JS em qualquer dispositivo
      try {
        const url = new URL(window.location.href);
        const v = serverVersion?.version || Date.now().toString();
        url.searchParams.set('v', v);
        window.location.replace(url.toString());
      } catch {
        window.location.reload();
      }
    }
  };

  return { needsUpdate, forceUpdate };
}
