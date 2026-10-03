import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../../middleware/authenticate'
import { requireTool } from '../../middleware/authorize'
import * as trainingsplanController from './trainingsplan.controller'

const router = Router()

router.use(authenticate, requireTool('trainingsplan'))

// Gleiches Muster wie kochbuch.routes.ts: RAM-Speicher, Konvertierung zu
// komprimiertem WebP passiert im Service.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Nur Bilddateien sind erlaubt'))
      return
    }
    cb(null, true)
  },
})

router.get('/focus-areas', trainingsplanController.listFocusAreas)
router.post('/focus-areas', trainingsplanController.createFocusArea)
router.put('/focus-areas/:id', trainingsplanController.updateFocusArea)
router.delete('/focus-areas/:id', trainingsplanController.deleteFocusArea)

router.get('/exercises', trainingsplanController.listExercises)
router.post('/exercises', trainingsplanController.createExercise)
router.get('/exercises/:id', trainingsplanController.getExercise)
router.put('/exercises/:id', trainingsplanController.updateExercise)
router.delete('/exercises/:id', trainingsplanController.deleteExercise)
router.get('/exercises/:id/history', trainingsplanController.getExerciseHistory)
router.post('/exercises/:id/photo', upload.single('photo'), trainingsplanController.uploadExercisePhoto)
router.post(
  '/exercises/:id/sections/:index/photo',
  upload.single('photo'),
  trainingsplanController.uploadExerciseSectionPhoto,
)

router.get('/sessions', trainingsplanController.listSessions)
router.post('/sessions', trainingsplanController.createSession)
router.get('/sessions/:id', trainingsplanController.getSession)
router.put('/sessions/:id', trainingsplanController.updateSession)
router.delete('/sessions/:id', trainingsplanController.deleteSession)
router.post('/sessions/:id/exercises', trainingsplanController.addSessionExercise)
router.put('/sessions/:id/exercises/:sessionExerciseId', trainingsplanController.updateSessionExerciseSets)
router.delete('/sessions/:id/exercises/:sessionExerciseId', trainingsplanController.removeSessionExercise)

export default router
