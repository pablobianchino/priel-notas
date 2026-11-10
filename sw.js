const CACHE_NAME = 'priel-notas-v3.6';
const urlsToCache = ['/', '/manifest.json', '/tailwind.css', '/icon-192x192.png', '/icon-512x512.png'];

// Librerías externas que se cachean para que la app abra sin conexión
const CDN_HOSTS = ['cdn.quilljs.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // allSettled-like: un recurso que falle no debe impedir la instalación
      Promise.all(urlsToCache.map(u => cache.add(u).catch(() => {})))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return; // nunca interceptar escrituras

  const url = new URL(req.url);

  // version.json: siempre desde la red (nunca cacheado), es lo que dispara la actualización automática
  if (url.origin === self.location.origin && url.pathname.endsWith('version.json')) {
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }

  // Navegación (HTML): red primero, con respaldo en caché si no hay conexión
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return response;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/')))
    );
    return;
  }

  // Librerías de CDN: usar caché y actualizar en segundo plano (stale-while-revalidate)
  if (url.origin !== self.location.origin) {
    if (!CDN_HOSTS.includes(url.hostname)) return; // Supabase y otros: directo a la red
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(req).then(cached => {
          const red = fetch(req).then(res => {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || red;
        })
      )
    );
    return;
  }

  // Archivos propios (css, iconos, manifest): primero caché, luego red
  event.respondWith(caches.match(req).then(response => response || fetch(req)));
});
