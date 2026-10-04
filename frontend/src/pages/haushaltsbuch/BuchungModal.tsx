import { useState, FormEvent } from 'react'
import { Button } from '@components/ui/Button'
import { haushaltsbuchService } from '@services/haushaltsbuch.service'
import type { Buchung, Kategorie } from '@app-types/haushaltsbuch'
import { toDateOnlyLocal } from './format'
import { KategorieCombobox } from './KategorieCombobox'
import { HaendlerCombobox } from './HaendlerCombobox'
import { DatumInput } from './DatumInput'

interface BuchungModalProps {
  kategorien: Kategorie[]
  buchung?: Buchung
  onClose: () => void
  onSaved: () => void
}

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message
  return message ?? 'Das hat leider nicht geklappt.'
}

export function BuchungModal({ kategorien, buchung, onClose, onSaved }: BuchungModalProps) {
  const [betrag, setBetrag] = useState(buchung ? String(buchung.betrag) : '')
  const [datum, setDatum] = useState(buchung?.datum ?? toDateOnlyLocal(new Date()))
  const [kategorieId, setKategorieId] = useState(buchung?.kategorieId ?? '')
  const [haendler, setHaendler] = useState(buchung?.haendler ?? '')
  const [notiz, setNotiz] = useState(buchung?.notiz ?? '')
  const [fehler, setFehler] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const gewaehlt = kategorien.find((k) => k.id === kategorieId)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFehler(null)
    const input = {
      datum,
      betrag: Number(betrag.replace(',', '.')),
      kategorieId,
      haendler: haendler.trim() || null,
      notiz: notiz.trim() || null,
    }
    setSaving(true)
    try {
      if (buchung) await haushaltsbuchService.updateBuchung(buchung.id, input)
      else await haushaltsbuchService.createBuchung(input)
      onSaved()
    } catch (err) {
      setFehler(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!buchung) return
    if (!window.confirm('Diese Buchung wirklich löschen?')) return
    await haushaltsbuchService.deleteBuchung(buchung.id)
    onSaved()
  }

  return (
    // Kein Schließen per Klick daneben: sonst geht die Eingabe verloren.
    <div className="farsi-modal-backdrop">
      <form
        className="farsi-modal"
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-label={buchung ? 'Buchung bearbeiten' : 'Neue Buchung'}
      >
        <span className="farsi-modal__handle" aria-hidden="true" />
        <div className="trainingsplan-modal-body">
          <div className="trainingsplan-modal-header">
            <h3>{buchung ? 'Buchung bearbeiten' : 'Neue Buchung'}</h3>
            <button type="button" className="trainingsplan-modal-close" onClick={onClose} aria-label="Schließen">
              ×
            </button>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="haushalt-kategorie">Kategorie</label>
            <KategorieCombobox id="haushalt-kategorie" kategorien={kategorien} value={kategorieId} onChange={setKategorieId} />
            {gewaehlt && (
              <p className="form-hint">
                {gewaehlt.typ === 'EINNAHME' ? 'Einnahme (+)' : 'Ausgabe (−)'}
                {gewaehlt.effektivInStatistik ? '' : ' · Verschiebung, zählt nicht in der Statistik'}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="haushalt-betrag">Betrag (€)</label>
            <input
              id="haushalt-betrag"
              className="input"
              inputMode="decimal"
              placeholder="0,00"
              value={betrag}
              onChange={(e) => setBetrag(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="haushalt-datum">Datum</label>
            <DatumInput id="haushalt-datum" value={datum} onChange={setDatum} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="haushalt-haendler">Händler</label>
            <HaendlerCombobox id="haushalt-haendler" value={haendler} onChange={setHaendler} placeholder="z.B. Edeka" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="haushalt-notiz">Notiz (optional)</label>
            <input id="haushalt-notiz" className="input" placeholder="z.B. Abreise nach Köln" value={notiz} onChange={(e) => setNotiz(e.target.value)} />
          </div>

          {fehler && <p className="form-error">{fehler}</p>}
        </div>

        <div className="farsi-modal__actions">
          {buchung && (
            <button type="button" className="farsi-modal__delete" onClick={handleDelete}>
              Löschen
            </button>
          )}
          <div className="farsi-modal__actions-right">
            <Button type="button" variant="secondary" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving || !kategorieId}>
              {saving ? 'Speichern…' : 'Speichern'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
