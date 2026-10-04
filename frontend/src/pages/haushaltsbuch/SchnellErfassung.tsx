import { useState } from 'react'
import { Button } from '@components/ui/Button'
import { haushaltsbuchService } from '@services/haushaltsbuch.service'
import type { BuchungInput, Kategorie } from '@app-types/haushaltsbuch'
import { KategorieCombobox } from './KategorieCombobox'
import { HaendlerCombobox } from './HaendlerCombobox'
import { toDateOnlyLocal } from './format'
import { DatumInput } from './DatumInput'

interface Zeile {
  key: number
  datum: string
  kategorieId: string
  haendler: string
  betrag: string
  notiz: string
}

interface SchnellErfassungProps {
  kategorien: Kategorie[]
  onSaved: (anzahl: number) => void
  onClose: () => void
}

let naechsterKey = 1
function neueZeile(datum: string): Zeile {
  return { key: naechsterKey++, datum, kategorieId: '', haendler: '', betrag: '', notiz: '' }
}

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message
  return message ?? 'Das hat leider nicht geklappt.'
}

// Mehrere Buchungen hintereinander. Immer genau eine leere Zeile am Ende: ist die
// letzte Zeile angefangen, folgt eine neue. Das Datum übernimmt sie von oben.
export function SchnellErfassung({ kategorien, onSaved, onClose }: SchnellErfassungProps) {
  const heute = toDateOnlyLocal(new Date())
  const [zeilen, setZeilen] = useState<Zeile[]>(() => [neueZeile(heute)])
  const [fehler, setFehler] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const mitLeererZeile = (liste: Zeile[]): Zeile[] => {
    const letzte = liste[liste.length - 1]
    if (!letzte) return [neueZeile(heute)]
    const angefangen = letzte.betrag || letzte.kategorieId || letzte.haendler || letzte.notiz
    return angefangen ? [...liste, neueZeile(letzte.datum)] : liste
  }

  const aendern = (key: number, patch: Partial<Zeile>) =>
    setZeilen((aktuell) => mitLeererZeile(aktuell.map((z) => (z.key === key ? { ...z, ...patch } : z))))

  const entfernen = (key: number) => setZeilen((aktuell) => mitLeererZeile(aktuell.filter((z) => z.key !== key)))

  const ausgefuellt = zeilen.filter((z) => z.betrag.trim() !== '')

  const speichern = async () => {
    setFehler(null)
    const inputs: BuchungInput[] = []
    for (const z of ausgefuellt) {
      const betrag = Number(z.betrag.replace(',', '.'))
      if (!(betrag > 0)) {
        setFehler(`Der Betrag "${z.betrag}" ist ungültig.`)
        return
      }
      if (!z.kategorieId) {
        setFehler(`Bitte eine Kategorie für ${betrag} € wählen.`)
        return
      }
      inputs.push({
        datum: z.datum,
        betrag,
        kategorieId: z.kategorieId,
        haendler: z.haendler.trim() || null,
        notiz: z.notiz.trim() || null,
      })
    }
    if (inputs.length === 0) {
      setFehler('Bitte mindestens einen Betrag eintragen.')
      return
    }
    setSaving(true)
    try {
      await haushaltsbuchService.createBuchungenBatch(inputs)
      onSaved(inputs.length)
    } catch (err) {
      setFehler(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="farsi-modal-backdrop" onClick={onClose}>
      <div
        className="farsi-modal haushalt-schnell"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Mehrere Buchungen erfassen"
      >
        <span className="farsi-modal__handle" aria-hidden="true" />
        <div className="trainingsplan-modal-body">
          <div className="trainingsplan-modal-header">
            <h3>Mehrere Buchungen</h3>
            <button type="button" className="trainingsplan-modal-close" onClick={onClose} aria-label="Schließen">
              ×
            </button>
          </div>

          <div className="haushalt-schnell__tabelle" role="table" aria-label="Buchungen">
            <div className="haushalt-schnell__head" role="row">
              <span>Datum</span>
              <span>Kategorie</span>
              <span>Händler</span>
              <span>Betrag €</span>
              <span>Notiz</span>
              <span />
            </div>
            {zeilen.map((z) => (
              <div key={z.key} className="haushalt-schnell__zeile" role="row">
                <DatumInput ariaLabel="Datum" value={z.datum} onChange={(datum) => aendern(z.key, { datum })} />
                <KategorieCombobox
                  kategorien={kategorien}
                  value={z.kategorieId}
                  onChange={(id) => aendern(z.key, { kategorieId: id })}
                  ariaLabel="Kategorie"
                  placeholder="Kategorie…"
                />
                <HaendlerCombobox
                  ariaLabel="Händler"
                  placeholder="Händler"
                  value={z.haendler}
                  onChange={(name) => aendern(z.key, { haendler: name })}
                />
                <input
                  className="input haushalt-schnell__betrag"
                  aria-label="Betrag"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={z.betrag}
                  onChange={(e) => aendern(z.key, { betrag: e.target.value })}
                />
                <input
                  className="input"
                  aria-label="Notiz"
                  placeholder="Notiz"
                  value={z.notiz}
                  onChange={(e) => aendern(z.key, { notiz: e.target.value })}
                />
                <button
                  type="button"
                  className="haushalt-icon-action haushalt-icon-action--delete"
                  aria-label="Zeile entfernen"
                  onClick={() => entfernen(z.key)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {fehler && <p className="form-error">{fehler}</p>}
        </div>

        <div className="farsi-modal__actions">
          <span className="form-hint">{ausgefuellt.length} Buchung{ausgefuellt.length === 1 ? '' : 'en'}</span>
          <div className="farsi-modal__actions-right">
            <Button type="button" variant="secondary" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="button" onClick={speichern} disabled={saving || ausgefuellt.length === 0}>
              {saving ? 'Speichern…' : 'Alle speichern'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
