const CACHE_NAME = 'taller-agil-v1'

// Solo cachear la ruta principal
const urlsToCache = ['/']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usar cache.add individual para que no falle si uno no existe
      return Promise.allSettled(
        urlsToCache.map(url => cache.add(url).catch(() => console.log('Cache skip:', url)))
      )
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    }).catch(() => {
      // Si falla el fetch, intentar devolver la página principal
      return caches.match('/')
    })
  )
})
