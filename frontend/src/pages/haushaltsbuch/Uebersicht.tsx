import { useEffect, useState } from 'react'
import { haushaltsbuchService } from '@services/haushaltsbuch.service'
import type { KategorieSumme, MonatsUebersicht } from '@app-types/haushaltsbuch'
import { MONATE, formatEuro, shiftMonth } from './format'

function today() {
  const now = new Date()
  return { jahr: now.getFullYear(), monat: now.getMonth() + 1 }
}

function Balken({ liste, groesste, typ }: { liste: KategorieSumme[]; groesste: number; typ: 'EINNAHME' | 'AUSGABE' }) {
  return (
    <ul className="haushalt-balken-liste">
      {liste.map((k) => (
        <li key={k.id} className="haushalt-balken">
          <div className="haushalt-balken__kopf">
            <span>{k.pfad}</span>
            <span>{formatEuro(k.summe)}</span>
          </div>
          <div className="haushalt-balken__spur">
            <div
              className={`haushalt-balken__fuellung is-${typ === 'EINNAHME' ? 'einnahme' : 'ausgabe'}`}
              style={{ width: `${(k.summe / groesste) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function Uebersicht() {
  const [{ jahr, monat }, setPeriode] = useState(today)
  const [uebersicht, setUebersicht] = useState<MonatsUebersicht | null>(null)
  const [loading, setLoading] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setFehler(null)
    haushaltsbuchService
      .monatsUebersicht(jahr, monat)
      .then(({ data }) => setUebersicht(data.uebersicht))
      .catch(() => setFehler('Die Übersicht konnte nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [jahr, monat])

  const schritt = (delta: number) => setPeriode((p) => shiftMonth(p.jahr, p.monat, delta))

  const ausgaben = uebersicht?.kategorien.filter((k) => k.typ === 'AUSGABE') ?? []
  const einnahmen = uebersicht?.kategorien.filter((k) => k.typ === 'EINNAHME') ?? []
  const groesste = Math.max(1, ...ausgaben.map((k) => k.summe), ...einnahmen.map((k) => k.summe))

  return (
    <div>
      <div className="haushalt-monat-nav">
        <button type="button" className="haushalt-icon-btn" onClick={() => schritt(-1)} aria-label="Vorheriger Monat">
          ‹
        </button>
        <h2>
          {MONATE[monat - 1]} {jahr}
        </h2>
        <button type="button" className="haushalt-icon-btn" onClick={() => schritt(1)} aria-label="Nächster Monat">
          ›
        </button>
      </div>

      {loading && <p>Lädt…</p>}
      {fehler && <p className="form-error">{fehler}</p>}

      {uebersicht && !loading && (
        <>
          <div className="haushalt-kasse">
            <span className="haushalt-tile__label">Haushaltskasse am Monatsende</span>
            <span className={`haushalt-kasse__wert ${uebersicht.kasse !== null && uebersicht.kasse < 0 ? 'is-negativ' : ''}`.trim()}>
              {uebersicht.kasse === null ? 'Noch kein Startbetrag' : formatEuro(uebersicht.kasse)}
            </span>
          </div>

          <div className="haushalt-tiles">
            <div className="haushalt-tile haushalt-tile--einnahmen">
              <span className="haushalt-tile__label">Einnahmen</span>
              <span className="haushalt-tile__value">{formatEuro(uebersicht.einnahmen)}</span>
            </div>
            <div className="haushalt-tile haushalt-tile--ausgaben">
              <span className="haushalt-tile__label">Ausgaben</span>
              <span className="haushalt-tile__value">{formatEuro(uebersicht.ausgaben)}</span>
            </div>
            <div className="haushalt-tile">
              <span className="haushalt-tile__label">Bilanz</span>
              <span className={`haushalt-tile__value ${uebersicht.bilanz < 0 ? 'is-negativ' : ''}`.trim()}>
                {formatEuro(uebersicht.bilanz)}
              </span>
              <span className="haushalt-tile__hint">Vormonat {formatEuro(uebersicht.vormonatBilanz)}</span>
            </div>
          </div>

          <section className="kochbuch-detail__section">
            <h3>Ausgaben nach Kategorie</h3>
            {ausgaben.length === 0 ? (
              <p className="admin-empty-state">Keine Ausgaben in diesem Monat.</p>
            ) : (
              <Balken liste={[...ausgaben].sort((a, b) => b.summe - a.summe)} groesste={groesste} typ="AUSGABE" />
            )}
          </section>

          {einnahmen.length > 0 && (
            <section className="kochbuch-detail__section">
              <h3>Einnahmen nach Kategorie</h3>
              <Balken liste={[...einnahmen].sort((a, b) => b.summe - a.summe)} groesste={groesste} typ="EINNAHME" />
            </section>
          )}

          <section className="kochbuch-detail__section">
            <h3>Verschiebungen</h3>
            <p className="form-hint">Verändern die Kasse, zählen aber nicht in Einnahmen und Ausgaben.</p>
            {uebersicht.verschiebungen.length === 0 ? (
              <p className="admin-empty-state">Keine Verschiebungen in diesem Monat.</p>
            ) : (
              <ul className="haushalt-konto-liste">
                {uebersicht.verschiebungen.map((v) => (
                  <li key={v.id}>
                    <span>{v.pfad}</span>
                    <span className={v.typ === 'EINNAHME' ? 'is-einnahme-text' : 'is-ausgabe-text'}>
                      {v.typ === 'EINNAHME' ? '+' : '−'}
                      {formatEuro(v.summe)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
