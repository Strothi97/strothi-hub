import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../../middleware/authenticate'
import { requireTool } from '../../middleware/authorize'
import * as erinnerungenController from './erinnerungen.controller'

const router = Router()

router.use(authenticate, requireTool('erinnerungen'))

// ── Foto-Upload (Multer) ──────────────────────────────────
// Speichert im RAM statt direkt auf Platte — erinnerungen.service.ts
// wandelt das Bild per sharp in ein komprimiertes WebP um und schreibt
// es erst dann (in einen pro-Nutzer-Unterordner) auf die Platte.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Nur Bilddateien sind erlaubt'))
      return
    }
    cb(null, true)
  },
})

// ── Reminders ────────────────────────────────────────────
router.get('/reminders', erinnerungenController.listReminders)
router.post('/reminders', erinnerungenController.createReminder)
router.put('/reminders/:id', erinnerungenController.updateReminder)
router.delete('/reminders/:id', erinnerungenController.deleteReminder)

// ── Geburtstage ──────────────────────────────────────────
router.get('/people', erinnerungenController.listPeople)
router.post('/people', erinnerungenController.createPerson)
router.put('/people/:id', erinnerungenController.updatePerson)
router.delete('/people/:id', erinnerungenController.deletePerson)
router.post('/people/:id/photo', upload.single('photo'), erinnerungenController.uploadPersonPhoto)
router.post('/people/:id/congrats', erinnerungenController.setCongrats)

export default router
