const CACHE = 'maxima-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  self.clients.claim();
});

// API isteklerini cache'leme, statik dosyaları cache'le
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // API isteklerini her zaman ağdan al
  if(url.pathname.startsWith('/api/')) return;
  // Statik dosyalar için cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(res => {
        if(res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
