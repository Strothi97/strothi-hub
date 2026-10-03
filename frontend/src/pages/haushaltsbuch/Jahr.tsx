import { useEffect, useState } from 'react'
import { haushaltsbuchService } from '@services/haushaltsbuch.service'
import type { JahresMonat } from '@app-types/haushaltsbuch'
import { MONATE, formatEuro } from './format'

export function Jahr() {
  const [jahr, setJahr] = useState(() => new Date().getFullYear())
  const [monate, setMonate] = useState<JahresMonat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    haushaltsbuchService
      .jahresUebersicht(jahr)
      .then(({ data }) => setMonate(data.uebersicht.monate))
      .finally(() => setLoading(false))
  }, [jahr])

  const summe = monate.reduce(
    (acc, m) => ({ einnahmen: acc.einnahmen + m.einnahmen, ausgaben: acc.ausgaben + m.ausgaben, bilanz: acc.bilanz + m.bilanz }),
    { einnahmen: 0, ausgaben: 0, bilanz: 0 },
  )

  return (
    <div>
      <div className="haushalt-monat-nav">
        <button type="button" className="haushalt-icon-btn" onClick={() => setJahr((j) => j - 1)} aria-label="Vorheriges Jahr">
          ‹
        </button>
        <h2>{jahr}</h2>
        <button type="button" className="haushalt-icon-btn" onClick={() => setJahr((j) => j + 1)} aria-label="Nächstes Jahr">
          ›
        </button>
      </div>

      {loading ? (
        <p>Lädt…</p>
      ) : (
        <div className="haushalt-jahr-tabelle-wrap">
          <table className="haushalt-jahr-tabelle">
            <thead>
              <tr>
                <th>Monat</th>
                <th>Einnahmen</th>
                <th>Ausgaben</th>
                <th>Bilanz</th>
                <th>Kasse</th>
              </tr>
            </thead>
            <tbody>
              {monate.map((m) => (
                <tr key={m.monat}>
                  <td>{MONATE[m.monat - 1]}</td>
                  <td>{formatEuro(m.einnahmen)}</td>
                  <td>{formatEuro(m.ausgaben)}</td>
                  <td className={m.bilanz < 0 ? 'is-negativ' : ''}>{formatEuro(m.bilanz)}</td>
                  <td>{m.kasse === null ? '–' : formatEuro(m.kasse)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th>Summe</th>
                <th>{formatEuro(summe.einnahmen)}</th>
                <th>{formatEuro(summe.ausgaben)}</th>
                <th className={summe.bilanz < 0 ? 'is-negativ' : ''}>{formatEuro(summe.bilanz)}</th>
                <th>{monate.length > 0 && monate[monate.length - 1].kasse !== null ? formatEuro(monate[monate.length - 1].kasse as number) : ''}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="form-hint">
        Einnahmen und Ausgaben zählen nur Kategorien mit Statistik. Die Kasse berücksichtigt alle Buchungen.
      </p>
    </div>
  )
}
