// Minimaler Service Worker — kein Caching, kein Offline-Modus. Neben der
// reinen WebAPK-Installierbarkeit (siehe fetch-Handler) übernimmt er auch
// die Web-Push-Benachrichtigungen fürs Erinnerungen-Tool.
self.addEventListener('fetch', () => {})

// Neue Worker-Versionen sofort aktivieren, statt bis zum Schließen aller
// Tabs zu warten — sonst laufen Nutzer nach jedem Deploy erstmal weiter
// mit dem alten Worker (z.B. ohne den push-Handler unten).
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = { title: 'Erinnerung', body: '' }
  try {
    data = event.data ? event.data.json() : data
  } catch {
    // Nutzlast war kein JSON — Standardwerte oben verwenden.
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Erinnerung', {
      body: data.body || '',
      icon: '/android-chrome-192x192.png',
      badge: '/android-chrome-192x192.png',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
