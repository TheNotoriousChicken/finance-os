self.addEventListener('install', (event) => {
  console.log('Service Worker installed.');
});

self.addEventListener('fetch', (event) => {
  // Pass-through for all requests (network only for now)
  event.respondWith(fetch(event.request));
});
