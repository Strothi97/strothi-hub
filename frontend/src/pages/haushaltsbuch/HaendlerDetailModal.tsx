import { useEffect, useMemo, useState } from 'react'
import { haushaltsbuchService } from '@services/haushaltsbuch.service'
import type { Buchung, Haendler, Kategorie } from '@app-types/haushaltsbuch'
import { BuchungModal } from './BuchungModal'
import { formatDateWithWeekday, formatEuro } from './format'

interface HaendlerDetailModalProps {
  haendler: Haendler
  kategorien: Kategorie[]
  onClose: () => void
  onChanged: () => void
}

// Alle Buchungen eines einzelnen Händlers, Einnahmen wie Ausgaben gemischt, tagesweise
// gruppiert wie in den Buchungen — mit Filter nach Kategorie, zum genaueren Hingucken.
export function HaendlerDetailModal({ haendler, kategorien, onClose, onChanged }: HaendlerDetailModalProps) {
  const [buchungen, setBuchungen] = useState<Buchung[]>([])
  const [loading, setLoading] = useState(true)
  const [kategorieFilter, setKategorieFilter] = useState('')
  const [modal, setModal] = useState<{ buchung: Buchung } | null>(null)

  const load = () =>
    haushaltsbuchService.listBuchungen({ haendlerId: haendler.id }).then(({ data }) => setBuchungen(data.buchungen))

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haendler.id])

  // Nur Kategorien, die bei diesem Händler überhaupt vorkommen — sonst wird die Liste unübersichtlich.
  const vorkommendeKategorien = useMemo(() => {
    const ids = new Set(buchungen.map((b) => b.kategorieId))
    return kategorien.filter((k) => ids.has(k.id)).sort((a, b) => a.pfad.localeCompare(b.pfad))
  }, [buchungen, kategorien])

  const gefiltert = kategorieFilter ? buchungen.filter((b) => b.kategorieId === kategorieFilter) : buchungen

  const summe = gefiltert.reduce(
    (acc, b) => (b.typ === 'EINNAHME' ? { ...acc, einnahmen: acc.einnahmen + b.betrag } : { ...acc, ausgaben: acc.ausgaben + b.betrag }),
    { einnahmen: 0, ausgaben: 0 },
  )

  const nachTag = useMemo(() => {
    const map = new Map<string, Buchung[]>()
    for (const b of gefiltert) {
      const liste = map.get(b.datum) ?? []
      liste.push(b)
      map.set(b.datum, liste)
    }
    return [...map.entries()].sort(([a], [b]) => (a < b ? 1 : -1)).map(([datum, liste]) => ({ key: datum, titel: formatDateWithWeekday(datum), liste }))
  }, [gefiltert])

  return (
    // Dieses Modal steckt im JSX innerhalb des Händler-Popups (dessen Backdrop bei Klick
    // schließt) — ohne stopPropagation würde ein Klick hier das darunterliegende Popup
    // mitschließen.
    <div className="farsi-modal-backdrop">
      <div
        className="farsi-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Buchungen von ${haendler.name}`}
      >
        <span className="farsi-modal__handle" aria-hidden="true" />
        <div className="trainingsplan-modal-body">
          <div className="trainingsplan-modal-header">
            <h3>{haendler.name}</h3>
            <button type="button" className="trainingsplan-modal-close" onClick={onClose} aria-label="Schließen">
              ×
            </button>
          </div>

          <div className="haushalt-monats-summen">
            <div className="haushalt-tile haushalt-tile--ausgaben">
              <span className="haushalt-tile__label">Ausgaben</span>
              <span className="haushalt-tile__value">{formatEuro(summe.ausgaben)}</span>
            </div>
            <div className="haushalt-tile haushalt-tile--einnahmen">
              <span className="haushalt-tile__label">Einnahmen</span>
              <span className="haushalt-tile__value">{formatEuro(summe.einnahmen)}</span>
            </div>
          </div>

          {vorkommendeKategorien.length > 1 && (
            <select className="input" value={kategorieFilter} onChange={(e) => setKategorieFilter(e.target.value)} aria-label="Nach Kategorie filtern">
              <option value="">Alle Kategorien</option>
              {vorkommendeKategorien.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.pfad}
                </option>
              ))}
            </select>
          )}

          {loading ? (
            <p>Lädt…</p>
          ) : gefiltert.length === 0 ? (
            <p className="admin-empty-state">Keine Buchungen gefunden.</p>
          ) : (
            <div className="haushalt-buchungen">
              {nachTag.map((gruppe) => (
                <section key={gruppe.key} className="haushalt-tag">
                  <div className="haushalt-tag__kopf">
                    <h4 className="haushalt-tag__datum">{gruppe.titel}</h4>
                  </div>
                  <ul className="haushalt-buchung-liste">
                    {gruppe.liste.map((b) => (
                      <li key={b.id}>
                        <button type="button" className="haushalt-buchung" onClick={() => setModal({ buchung: b })}>
                          <span className="haushalt-buchung__text">
                            <span className="haushalt-buchung__titel">{b.kategoriePfad}</span>
                            {b.notiz && <span className="haushalt-buchung__unter">{b.notiz}</span>}
                          </span>
                          <span className={`haushalt-buchung__betrag is-${b.typ === 'EINNAHME' ? 'einnahme' : 'ausgabe'}`}>
                            {b.typ === 'EINNAHME' ? '+' : '−'}
                            {formatEuro(b.betrag)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <BuchungModal
          kategorien={kategorien}
          buchung={modal.buchung}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            load()
            onChanged()
          }}
        />
      )}
    </div>
  )
}
