const CACHE = 'genting-trip-v3';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./trip-data.js','./venues.js','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('genting-trip-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if(event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Serve one version of the app together. A new worker version refreshes all assets.
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request, {ignoreSearch:true});
    if(cached) return cached;
    try { return await fetch(event.request); }
    catch(error) { if(event.request.mode === 'navigate') return cache.match('./index.html'); throw error; }
  }));
});
