import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requireTool } from '../../middleware/authorize'
import * as controller from './haushaltsbuch.controller'

const router = Router()

router.use(authenticate, requireTool('haushaltsbuch'))

router.get('/kasse', controller.getKasse)
router.put('/kasse', controller.setKasse)

router.get('/kategorien', controller.listKategorien)
router.post('/kategorien', controller.createKategorie)
router.post('/kategorien/sortieren', controller.sortiereKategorien)
router.put('/kategorien/:id', controller.updateKategorie)
router.delete('/kategorien/:id', controller.deleteKategorie)

router.get('/buchungen', controller.listBuchungen)
router.post('/buchungen', controller.createBuchung)
router.post('/buchungen/batch', controller.createBuchungen)
router.put('/buchungen/:id', controller.updateBuchung)
router.delete('/buchungen/:id', controller.deleteBuchung)

router.get('/uebersicht/monat', controller.monatsUebersicht)
router.get('/uebersicht/jahr', controller.jahresUebersicht)

export default router
