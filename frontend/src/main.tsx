import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/variables.css'
import './styles/index.css'
import './styles/components.css'
import './styles/homeoffice.css'
import './styles/farsi.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Kein Caching/Offline-Verhalten — der Service Worker existiert nur,
// damit Chrome die App als vollwertige WebAPK installiert (siehe sw.js).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
