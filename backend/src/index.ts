import express from 'express'
// Muss vor allen Router-Importen geladen werden: patcht Express 4 so, dass
// Fehler in async Route-Handlern automatisch an errorHandler weitergereicht
// werden, statt als unhandled promise rejection den Prozess zu crashen.
import 'express-async-errors'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import path from 'path'
import { router } from './routes'
import { errorHandler } from './middleware/errorHandler'
import { notFound } from './middleware/notFound'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// ── Middleware ──────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// ── Statische Dateien (Uploads) ─────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// ── Routen ──────────────────────────────────────────
app.use('/api', router)

// ── Frontend (Produktion) ────────────────────────────
// Plesk betreibt pro (Sub-)Domain eine einzelne Node.js-App, daher liefert
// Express hier zusätzlich das gebaute React-Frontend aus (SPA-Fallback für
// alles außer /api und /uploads). Im lokalen Dev-Betrieb übernimmt stattdessen
// der Vite-Dev-Server (:3000) das Frontend, dieser Block bleibt dann inaktiv.
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist')
  app.use(express.static(frontendDist))
  app.get(/^\/(?!api|uploads).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

// ── Fehlerbehandlung ────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ── Server starten ──────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
})

export default app
