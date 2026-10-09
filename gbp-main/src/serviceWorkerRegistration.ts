// Este arquivo é responsável por registrar o service worker
export function register() {
  unregister();
  return;

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

// Nunca desregistrar o SW do Firebase Messaging — desregistrá-lo apaga a
// push subscription e o FCM passa a rejeitar o token como 'unregistered'
// (era a causa das notificações de inscritos falharem após o 1º envio)
const isFirebaseMessagingSW = (r: ServiceWorkerRegistration): boolean => {
  const url = r.active?.scriptURL || r.waiting?.scriptURL || r.installing?.scriptURL || '';
  return url.includes('firebase-messaging-sw');
};

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.filter((r) => !isFirebaseMessagingSW(r)).map((r) => r.unregister()))
      )
      .catch((error) => {
        console.error(error?.message || error);
      });
  }
}
