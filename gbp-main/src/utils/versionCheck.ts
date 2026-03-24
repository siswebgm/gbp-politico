export const checkForNewVersion = () => {
  let isChecking = false; // Flag para evitar verificações simultâneas
  let lastCheck = 0; // Timestamp da última verificação
  const CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutos em milissegundos
  const RELOAD_GUARD_KEY = 'gbp_version_reload_guard';
  const MAX_RELOAD_ATTEMPTS = 3;

  const checkVersion = async () => {
    const now = Date.now();
    
    // Evita verificações muito frequentes
    if (isChecking || (now - lastCheck < CHECK_INTERVAL)) {
      return;
    }

    try {
      isChecking = true;
      
      const response = await fetch(`/version.json?t=${now}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      const data = await response.json();
      let currentVersion: string | null = null;
      try {
        currentVersion = localStorage.getItem('appVersion');
      } catch (e) {
        console.warn('Storage indisponível para leitura (appVersion). Ignorando check de versão.', e);
        return;
      }
      
      if (!currentVersion) {
        try {
          localStorage.setItem('appVersion', data.version);
        } catch (e) {
          console.warn('Storage indisponível para escrita (appVersion).', e);
        }
        isChecking = false;
        lastCheck = now;
        return;
      }

      if (currentVersion !== data.version) {
        console.log('Nova versão detectada. Atualizando...');
        try {
          localStorage.setItem('appVersion', data.version);
        } catch (e) {
          console.warn('Storage indisponível para escrita (appVersion). Prosseguindo sem persistir.', e);
        }

        // Limpa caches do navegador (funciona mesmo sem Service Worker)
        if ('caches' in window) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          } catch (e) {
            console.warn('Falha ao limpar CacheStorage:', e);
          }
        }
        
        // Limpa o Service Worker apenas se houver nova versão
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        }

        // Evita loop infinito em produção (ex.: múltiplas réplicas com version.json diferente durante rollout)
        // mas permite algumas tentativas por versão para lidar com cache agressivo (iOS/Safari).
        try {
          type GuardState = { version: string; attempts: number; ts: number };
          let raw: string | null = null;
          try {
            raw = sessionStorage.getItem(RELOAD_GUARD_KEY);
          } catch (e) {
            console.warn('sessionStorage indisponível. Cancelando reload automático para evitar loop.', e);
            return;
          }

          let guard: GuardState | null = null;
          try {
            guard = raw ? (JSON.parse(raw) as GuardState) : null;
          } catch {
            guard = null;
          }

          const targetVersion = data.version || now.toString();

          if (!guard || guard.version !== targetVersion) {
            guard = { version: targetVersion, attempts: 0, ts: now };
          }

          if (guard.attempts >= MAX_RELOAD_ATTEMPTS) {
            console.warn('Limite de tentativas de reload atingido. Abortando para evitar loop.', guard);
            return;
          }

          guard.attempts += 1;
          guard.ts = now;
          try {
            sessionStorage.setItem(RELOAD_GUARD_KEY, JSON.stringify(guard));
          } catch (e) {
            console.warn('Falha ao escrever no sessionStorage. Cancelando reload automático para evitar loop.', e);
            return;
          }

          // Hard reload com cache-bust (inclui attempt para variar URL e ajudar o Safari a não reutilizar recursos)
          try {
            const url = new URL(window.location.href);
            url.searchParams.set('v', targetVersion);
            url.searchParams.set('attempt', guard.attempts.toString());
            window.location.replace(url.toString());
          } catch {
            window.location.reload();
          }
        } catch {
          // Se sessionStorage falhar por algum motivo, mantém o comportamento antigo
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Erro ao verificar nova versão:', error);
    } finally {
      isChecking = false;
      lastCheck = now;
    }
  };

  // Verifica apenas na inicialização
  checkVersion();

  // Verifica a cada 10 minutos
  return setInterval(checkVersion, CHECK_INTERVAL);
};
