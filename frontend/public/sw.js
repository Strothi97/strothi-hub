// Minimaler Service Worker — kein Caching, kein Offline-Modus.
// Existiert nur, damit Chrome die App als vollwertige installierbare
// WebAPK erkennt (sonst installiert Chrome einen einfachen Shortcut,
// der die Login-Session nicht zuverlässig mit dem Browser teilt).
self.addEventListener('fetch', () => {})
