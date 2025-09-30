export const checkForNewVersion = () => {
  let isChecking = false; // Flag para evitar verificações simultâneas
  let lastCheck = 0; // Timestamp da última verificação
  const CHECK_INTERVAL = 5 * 60 * 60 * 1000; // 5 horas em milissegundos

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
      const currentVersion = localStorage.getItem('appVersion');
      
      if (!currentVersion) {
        localStorage.setItem('appVersion', data.version);
        isChecking = false;
        lastCheck = now;
        return;
      }

      if (currentVersion !== data.version) {
        console.log('Nova versão detectada. Atualizando...');
        localStorage.setItem('appVersion', data.version);
        
        // Limpa o Service Worker apenas se houver nova versão
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        }
        
        window.location.reload();
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

  // Verifica a cada 5 horas
  return setInterval(checkVersion, CHECK_INTERVAL);
};
