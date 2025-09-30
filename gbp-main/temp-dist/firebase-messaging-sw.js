importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-messaging-compat.js');

const CACHE_NAME = 'notification-cache-v1';
const MAX_NOTIFICATIONS = 50;

const firebaseConfig = {
  apiKey: "AIzaSyBwIsr-o9tj5noU9EQwR2z3hXRZSZTpHW0",
  authDomain: "gbppolitico.firebaseapp.com",
  projectId: "gbppolitico",
  storageBucket: "gbppolitico.firebasestorage.app",
  messagingSenderId: "48941500586",
  appId: "1:48941500586:web:7eb764b449bdb1292f28d3"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Cache de notificações
async function cacheNotification(notification) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const notifications = await getNotificationsFromCache();
    
    // Adiciona nova notificação
    notifications.unshift({
      ...notification,
      timestamp: Date.now()
    });
    
    // Mantém apenas as últimas MAX_NOTIFICATIONS
    if (notifications.length > MAX_NOTIFICATIONS) {
      notifications.length = MAX_NOTIFICATIONS;
    }
    
    // Salva no cache
    await cache.put('/notifications', new Response(JSON.stringify(notifications)));
  } catch (error) {
    console.error('[Service Worker] Erro ao cachear notificação:', error);
  }
}

async function getNotificationsFromCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match('/notifications');
    if (!response) return [];
    return await response.json();
  } catch (error) {
    console.error('[Service Worker] Erro ao buscar notificações do cache:', error);
    return [];
  }
}

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalado');
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME),
      self.skipWaiting()
    ])
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Ativado');
  event.waitUntil(
    Promise.all([
      // Limpa caches antigos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        );
      }),
      clients.claim()
    ])
  );
});

// Tratamento de mensagens em background
messaging.onBackgroundMessage(async (payload) => {
  console.log('[Service Worker] Mensagem recebida em background:', payload);

  try {
    const defaultLogo = '//8a9fa808ea18d066080b81b1741b3afc.cdn.bubble.io/f1683656885399x827876060621908000/gbp%20politico.png';
    
    const notificationData = {
      title: payload.notification?.title || payload.data?.title || 'GBP Politico',
      options: {
        body: payload.notification?.body || payload.data?.message || 'Nova notificação',
        icon: payload.notification?.image || defaultLogo,
        badge: payload.notification?.image || defaultLogo,
        tag: payload.data?.id || 'notification',
        data: {
          ...payload.data,
          dateOfArrival: Date.now(),
          primaryKey: 1
        },
        requireInteraction: true,
        vibrate: [200, 100, 200],
        silent: false,
        renotify: true,
        timestamp: Date.now(),
        sound: '/sounds/notification_sound.wav',
        actions: [
          {
            action: 'open',
            title: 'Visualizar'
          }
        ],
        dir: 'auto',
        lang: 'pt-BR',
        image: payload.notification?.image || defaultLogo,
        badge: payload.notification?.image || defaultLogo,
        timestamp: Date.now(),
        data: payload.data || {},
        showTrigger: new TimestampTrigger(Date.now()),
        priority: 2
      }
    };

    // Cache a notificação
    await cacheNotification({
      title: notificationData.title,
      ...notificationData.options
    });

    // Mostra a notificação
    await self.registration.showNotification(
      notificationData.title,
      notificationData.options
    );

    console.log('[Service Worker] Notificação mostrada e cacheada com sucesso');
  } catch (error) {
    console.error('[Service Worker] Erro ao processar mensagem:', error);
  }
});

// Tratamento de cliques em notificações
self.addEventListener('notificationclick', async (event) => {
  console.log('[Service Worker] Notificação clicada:', event);
  
  event.notification.close();
  
  const action = event.action || 'open';
  const notification = event.notification;
  const data = notification.data || {};
  
  if (action === 'open') {
    let urlToOpen = new URL('/', self.location.origin).href;
    
    // Se tiver um ID específico, adiciona à URL
    if (data.id) {
      urlToOpen += `app/lembretes/${data.id}`;
    } else {
      urlToOpen += 'app/lembretes';
    }

    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        // Procura por uma janela já aberta
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Se não encontrar, abre uma nova
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Tratamento de fechamento de notificações
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notificação fechada:', event);
}); 