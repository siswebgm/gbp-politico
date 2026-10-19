importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-messaging-compat.js');

const CACHE_NAME = 'notification-cache-v1';
const MAX_NOTIFICATIONS = 50;

const firebaseConfig = {
  apiKey: "AIzaSyD68oM2v_1zskhGgoHFnUW0REFAf-hyuxE",
  authDomain: "sistema-para-vereador.firebaseapp.com",
  projectId: "sistema-para-vereador",
  storageBucket: "sistema-para-vereador.firebasestorage.app",
  messagingSenderId: "955852815886",
  appId: "1:955852815886:web:a625a99a6d2969b11fc65f"
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

// Exibe a notificação diretamente no evento push (não depende do SDK,
// que falha silenciosamente ao exibir payloads com 'notification')
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push recebido:', event.data ? event.data.text() : '(sem dados)');

  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('[Service Worker] Falha ao parsear payload:', e);
    return;
  }

  const data = payload.data || {};
  const notification = payload.notification || {};
  const title = notification.title || data.title || 'GBP Politico';
  const body = notification.body || data.body || 'Nova notificação';
  // Uma tag por empresa: notificações da mesma empresa se agrupam em uma
  // única entrada que mostra "N mensagens" (estilo WhatsApp recolhido)
  const grupoTag = `gbp-${String(data.empresa_nome || 'geral').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;

  event.waitUntil((async () => {
    // Conta mensagens ativas do grupo para exibir "N mensagens"
    let count = 1;
    try {
      const ativas = await self.registration.getNotifications();
      const anterior = ativas.find(n => n.tag === grupoTag);
      if (anterior) {
        count = (anterior.data && Number(anterior.data.msg_count)) ? Number(anterior.data.msg_count) + 1 : 2;
      }
    } catch (e) {
      console.warn('[Service Worker] getNotifications indisponível:', e);
    }

    await self.registration.showNotification(title, {
      body: count > 1 ? `${count} mensagens` : body,
      icon: notification.icon || data.icon_url || data.badge_url || '/icons/icon-512x512.png',
      image: count > 1 ? undefined : (notification.image || undefined),
      badge: notification.icon || data.badge_url || data.icon_url || '/icons/icon-512x512.png',
      tag: grupoTag,
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: 'Visualizar' }
      ],
      data: {
        ...data,
        msg_count: String(count),
        link: data.link || (payload.fcmOptions && payload.fcmOptions.link) || ''
      }
    });
    console.log('[Service Worker] Notificação exibida');
  })().catch((err) => {
    console.error('[Service Worker] Erro ao exibir notificação:', err);
  }));
});

// Tratamento de mensagens em background
messaging.onBackgroundMessage(async (payload) => {
  console.log('[Service Worker] Mensagem recebida em background:', payload);

  try {
    const defaultLogo = '/icons/icon-512x512.png';
    const data = payload.data || {};
    const empresaNome = data.empresa_nome || 'GBP Politico';
    // Logo da empresa enviado como icon_url/badge_url; fallback para imagem da notificação
    const companyIcon =
      data.badge_url || data.icon_url || payload.notification?.icon || defaultLogo;

    // Mesma tag do handler push: agrupa por empresa e mostra "N mensagens"
    const grupoTag = `gbp-${String(empresaNome).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;
    let count = 1;
    try {
      const ativas = await self.registration.getNotifications();
      const anterior = ativas.find(n => n.tag === grupoTag);
      if (anterior) {
        count = (anterior.data && Number(anterior.data.msg_count)) ? Number(anterior.data.msg_count) + 1 : 2;
      }
    } catch (e) { /* getNotifications indisponível */ }

    const notificationData = {
      title: payload.notification?.title || empresaNome,
      options: {
        body: count > 1 ? `${count} mensagens` : (payload.notification?.body || data.message || 'Nova notificação'),
        icon: companyIcon,
        badge: companyIcon,
        tag: grupoTag,
        data: {
          ...data,
          msg_count: String(count),
          link: data.link || payload.fcmOptions?.link || '',
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
        image: payload.notification?.image || undefined,
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
    let urlToOpen;

    // Prioridade: link enviado no payload (personalizado por disparo)
    if (data.link) {
      urlToOpen = /^https?:\/\//i.test(data.link)
        ? data.link
        : new URL(data.link, self.location.origin).href;
    } else {
      // Sem link personalizado: abre a página pública de visualização da notificação
      urlToOpen = new URL(
        data.id ? `notificacao/${data.id}` : '',
        self.location.origin
      ).href;
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