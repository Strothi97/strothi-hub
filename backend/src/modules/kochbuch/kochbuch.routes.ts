import { Router, json } from 'express'
import multer from 'multer'
import { authenticate } from '../../middleware/authenticate'
import { requireTool } from '../../middleware/authorize'
import * as kochbuchController from './kochbuch.controller'

const router = Router()

router.use(authenticate, requireTool('kochbuch'))

// Gleiches Muster wie erinnerungen.routes.ts: RAM-Speicher, Konvertierung
// zu komprimiertem WebP passiert im Service.
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

router.get('/recipes', kochbuchController.listRecipes)
router.get('/tags', kochbuchController.listTags)
router.post('/recipes', kochbuchController.createRecipe)
router.put('/recipes/:id', kochbuchController.updateRecipe)
router.delete('/recipes/:id', kochbuchController.deleteRecipe)
router.get('/recipes/:id/export', kochbuchController.exportSingleRecipeFile)
router.post('/recipes/:id/photo', upload.single('photo'), kochbuchController.uploadRecipePhoto)
router.post('/recipes/:id/steps/:index/photo', upload.single('photo'), kochbuchController.uploadStepPhoto)
router.put('/recipes/:id/rating', kochbuchController.rateRecipe)

// KI-Foto-Import (Vorder-/Rückseiten-Foto -> strukturierte Rezeptdaten,
// noch nicht gespeichert — siehe kochbuch.import.ts).
router.get('/import/status', kochbuchController.importStatus)
router.post(
  '/import/analyze',
  upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 },
  ]),
  kochbuchController.analyzeImport,
)
// Höheres Body-Limit nur für diese Route (Standard ist 100kb, siehe
// index.ts) — ein HTML-Seitenquelltext sprengt das locker.
router.post('/import/analyze-text', json({ limit: '2mb' }), kochbuchController.analyzeTextImport)

// Rezepte zwischen zwei Hub-Instanzen mitnehmen (siehe kochbuch.transfer.ts)
// — eigene Multer-Instanz ohne Bild-fileFilter (die Datei ist JSON, kein
// Bild) und mit größerem Limit, da Fotos als Base64 eingebettet sind.
const uploadTransferFile = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })
router.get('/export', kochbuchController.exportRecipesFile)
router.post('/import-file', uploadTransferFile.single('file'), kochbuchController.importRecipesFile)
// Copy-Paste-Gegenstück zu /import-file (Rezept-JSON im Body statt als
// Datei) — höheres Body-Limit, da ein Rezeptfoto als Base64 eingebettet ist.
router.post('/import-text', json({ limit: '25mb' }), kochbuchController.importRecipesText)

export default router
