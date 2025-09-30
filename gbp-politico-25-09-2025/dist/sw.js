const CACHE_NAME = 'gbp-politico-v1';
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-512x512.png',
  '/offline.html'
];

// Função para limpar caches antigos
const clearOldCaches = async () => {
  const keys = await caches.keys();
  return Promise.all(
    keys
      .filter(key => key !== CACHE_NAME)
      .map(key => caches.delete(key))
  );
};

// Cache inicial na instalação
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_RESOURCES);
      }),
      self.skipWaiting()
    ])
  );
});

// Limpa caches antigos na ativação
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clearOldCaches(),
      self.clients.claim()
    ])
  );
});

// Estratégia de cache com verificação de versão
self.addEventListener('fetch', (event) => {
  // Verifica se é uma requisição do version.json
  if (event.request.url.includes('version.json')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Ignora requisições não GET
  if (event.request.method !== 'GET') return;

  // Ignora requisições de API
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/auth/') ||
      event.request.url.includes('/rest/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        const responseToCache = response.clone();

        if (event.request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico)$/) ||
            event.request.mode === 'navigate') {
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }

        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            
            return new Response('', {
              status: 408,
              statusText: 'Request timed out.'
            });
          });
      })
  );
});
