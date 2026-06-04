import express from 'express'
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

// ── Fehlerbehandlung ────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ── Server starten ──────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
})

export default app
