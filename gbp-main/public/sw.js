const CACHE_NAME = 'gbp-politico-v2';
const STATIC_RESOURCES = [
  '/manifest.json',
  '/icons/icon-512x512.png',
  '/offline.html'
];

const unregisterAndRefreshClients = async () => {
  try {
    await Promise.all((await caches.keys()).map((key) => caches.delete(key)));

    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      try {
        await client.navigate(client.url);
      } catch (_) {
        // ignore
      }
    }
  } finally {
    try {
      await self.registration.unregister();
    } catch (_) {
      // ignore
    }
  }
};

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
      self.clients.claim(),
      unregisterAndRefreshClients()
    ])
  );
});

// Permite que o app solicite a ativação imediata de uma nova versão
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Estratégia de cache com verificação de versão
self.addEventListener('fetch', (event) => {
  // Kill-switch: não interceptar requests; deixar rede mandar sempre.
  // (Se offline, cai no comportamento padrão do browser.)
  event.respondWith(fetch(event.request));
  return;

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

  // Navegação: sempre tentar rede (evita misturar versões). Offline -> /offline.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Para assets, prioriza rede. Se offline, usa cache apenas para imagens/ícones.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200) return response;

        // Cache apenas de imagens/ícones (evita cachear JS/CSS que pode quebrar versão)
        if (event.request.url.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
