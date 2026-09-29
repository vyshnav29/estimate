// Keeps the Estimate app on the phone so it opens and works with no internet.
// When online, the page is refreshed from the site so updates arrive automatically.
const CACHE = 'estimate-v8';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Try the network for at most 3 seconds, then fall back to the saved copy
function networkFirst(request, cacheKey) {
  return new Promise(resolve => {
    let settled = false;
    const fallback = () => {
      if (settled) return; settled = true;
      caches.match(cacheKey).then(r => resolve(r || caches.match('./index.html')));
    };
    const timer = setTimeout(fallback, 3000);
    fetch(request).then(res => {
      if (settled) return;
      if (!res || !res.ok) return fallback();
      settled = true; clearTimeout(timer);
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(cacheKey, copy));
      resolve(res);
    }).catch(() => { clearTimeout(timer); fallback(); });
  });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // anything off-site: leave alone
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, './index.html'));
    return;
  }
  event.respondWith(caches.match(req).then(r => r || fetch(req)));
});
