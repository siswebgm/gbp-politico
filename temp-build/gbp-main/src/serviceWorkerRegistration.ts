// Este arquivo é responsável por registrar o service worker
export function register() {
  if ('serviceWorker' in navigator && 'Notification' in window) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('Service Worker registrado com sucesso:', registration);

          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) {
              return;
            }

            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('Nova versão disponível');
                } else {
                  console.log('Conteúdo em cache para uso offline');
                }
              }
            });
          });
        })
        .catch((error) => {
          console.error('Erro ao registrar service worker:', error);
        });
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
