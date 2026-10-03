import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { haushaltsbuchService } from '@services/haushaltsbuch.service'
import type { Buchung, Kategorie } from '@app-types/haushaltsbuch'
import { BuchungModal } from './BuchungModal'
import { SchnellErfassung } from './SchnellErfassung'
import { MONATE, firstDayOfMonth, formatDateOnly, formatDateWithWeekday, formatEuro, lastDayOfMonth, shiftMonth } from './format'

type Sortierung = 'tag' | 'kategorie'

function today() {
  const now = new Date()
  return { jahr: now.getFullYear(), monat: now.getMonth() + 1 }
}

// Summen nur über Kategorien, die in der Statistik zählen (wie in der Übersicht).
function summenVon(liste: Buchung[]) {
  let einnahmen = 0
  let ausgaben = 0
  for (const b of liste) {
    if (!b.effektivInStatistik) continue
    if (b.typ === 'EINNAHME') einnahmen += b.betrag
    else ausgaben += b.betrag
  }
  return { einnahmen, ausgaben }
}

export function Buchungen() {
  const [{ jahr, monat }, setPeriode] = useState(today)
  const [sortierung, setSortierung] = useState<Sortierung>('tag')
  const [buchungen, setBuchungen] = useState<Buchung[]>([])
  const [kategorien, setKategorien] = useState<Kategorie[]>([])
  const [loading, setLoading] = useState(true)
  const [suche, setSuche] = useState('')
  const [modal, setModal] = useState<{ buchung?: Buchung } | null>(null)
  const [schnell, setSchnell] = useState(false)

  const load = useCallback(() => {
    return haushaltsbuchService
      .listBuchungen({
        von: firstDayOfMonth(jahr, monat),
        bis: lastDayOfMonth(jahr, monat),
        suche: suche.trim() || undefined,
      })
      .then(({ data }) => setBuchungen(data.buchungen))
  }, [jahr, monat, suche])

  useEffect(() => {
    haushaltsbuchService.listKategorien().then(({ data }) => setKategorien(data.kategorien)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      load()
    }, 200)
    return () => clearTimeout(timer)
  }, [load])

  const schritt = (delta: number) => setPeriode((p) => shiftMonth(p.jahr, p.monat, delta))
  const monatsSumme = useMemo(() => summenVon(buchungen), [buchungen])

  // Tagesgruppen: neueste Tage zuerst, Summe des Tages in der Kopfzeile.
  const nachTag = useMemo(() => {
    const map = new Map<string, Buchung[]>()
    for (const b of buchungen) {
      const liste = map.get(b.datum) ?? []
      liste.push(b)
      map.set(b.datum, liste)
    }
    return [...map.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([datum, liste]) => ({ key: datum, titel: formatDateWithWeekday(datum), liste, summe: summenVon(liste) }))
  }, [buchungen])

  // Kategoriegruppen: Ausgaben zuerst, dann Einnahmen; innerhalb nach Monatssumme.
  const nachKategorie = useMemo(() => {
    const map = new Map<string, Buchung[]>()
    for (const b of buchungen) {
      const liste = map.get(b.kategorieId) ?? []
      liste.push(b)
      map.set(b.kategorieId, liste)
    }
    return [...map.entries()]
      .map(([id, liste]) => {
        const summe = liste.reduce((acc, b) => acc + b.betrag, 0)
        return { key: id, titel: liste[0].kategoriePfad, typ: liste[0].typ, zaehlt: liste[0].effektivInStatistik, liste, summe }
      })
      .sort((a, b) => (a.typ === b.typ ? b.summe - a.summe : a.typ === 'AUSGABE' ? -1 : 1))
  }, [buchungen])

  const beschreibung = (b: Buchung) => b.haendler || b.kategoriePfad
  const unter = (b: Buchung) => [b.haendler ? b.kategoriePfad : null, b.notiz].filter(Boolean).join(' · ')

  const zeile = (b: Buchung, mitDatum: boolean) => (
    <li key={b.id}>
      <button type="button" className="haushalt-buchung" onClick={() => setModal({ buchung: b })}>
        <span className="haushalt-buchung__text">
          <span className="haushalt-buchung__titel">
            {mitDatum ? `${formatDateOnly(b.datum)} · ${beschreibung(b)}` : beschreibung(b)}
            {!b.effektivInStatistik && <span className="haushalt-chip-verschiebung">Verschiebung</span>}
          </span>
          {unter(b) && <span className="haushalt-buchung__unter">{unter(b)}</span>}
        </span>
        <span className={`haushalt-buchung__betrag is-${b.typ === 'EINNAHME' ? 'einnahme' : 'ausgabe'}`}>
          {b.typ === 'EINNAHME' ? '+' : '−'}
          {formatEuro(b.betrag)}
        </span>
      </button>
    </li>
  )

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

      <div className="haushalt-monats-summen">
        <div className="haushalt-tile haushalt-tile--einnahmen">
          <span className="haushalt-tile__label">Einnahmen im Monat</span>
          <span className="haushalt-tile__value">{formatEuro(monatsSumme.einnahmen)}</span>
        </div>
        <div className="haushalt-tile haushalt-tile--ausgaben">
          <span className="haushalt-tile__label">Ausgaben im Monat</span>
          <span className="haushalt-tile__value">{formatEuro(monatsSumme.ausgaben)}</span>
        </div>
      </div>

      <div className="farsi-toolbar haushalt-toolbar">
        <Input placeholder="Suchen (Händler, Notiz, Kategorie)…" value={suche} onChange={(e) => setSuche(e.target.value)} />
        <div className="haushalt-aktionen">
          <button type="button" className="haushalt-btn-mehrere" onClick={() => setSchnell(true)} disabled={kategorien.length === 0}>
            + Mehrere
          </button>
          <Button onClick={() => setModal({})} disabled={kategorien.length === 0}>
            + Buchung
          </Button>
        </div>
      </div>

      <div className="haushalt-typ-filter" role="radiogroup" aria-label="Sortierung">
        <button type="button" className={`tool-chip ${sortierung === 'tag' ? 'is-active' : ''}`.trim()} onClick={() => setSortierung('tag')}>
          Nach Tag
        </button>
        <button type="button" className={`tool-chip ${sortierung === 'kategorie' ? 'is-active' : ''}`.trim()} onClick={() => setSortierung('kategorie')}>
          Nach Kategorie
        </button>
      </div>

      {kategorien.length === 0 && !loading && (
        <p className="admin-empty-state">Lege zuerst unter "Verwaltung" eine Kategorie an.</p>
      )}

      {loading ? (
        <p>Lädt…</p>
      ) : buchungen.length === 0 ? (
        <p className="admin-empty-state">Keine Buchungen in diesem Monat.</p>
      ) : sortierung === 'tag' ? (
        <div className="haushalt-buchungen">
          {nachTag.map((gruppe) => (
            <section key={gruppe.key} className="haushalt-tag">
              <div className="haushalt-tag__kopf">
                <h4 className="haushalt-tag__datum">{gruppe.titel}</h4>
                <span className="haushalt-tag__summe">
                  {gruppe.summe.einnahmen > 0 && <span className="is-einnahme-text">+{formatEuro(gruppe.summe.einnahmen)}</span>}
                  {gruppe.summe.ausgaben > 0 && <span className="is-ausgabe-text">−{formatEuro(gruppe.summe.ausgaben)}</span>}
                </span>
              </div>
              <ul className="haushalt-buchung-liste">{gruppe.liste.map((b) => zeile(b, false))}</ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="haushalt-buchungen">
          {nachKategorie.map((gruppe) => (
            <section key={gruppe.key} className="haushalt-tag">
              <div className="haushalt-tag__kopf">
                <h4 className="haushalt-tag__datum haushalt-tag__datum--kat">
                  {gruppe.titel}
                  {!gruppe.zaehlt && <span className="haushalt-chip-verschiebung">Verschiebung</span>}
                </h4>
                <span className={`haushalt-tag__summe ${gruppe.typ === 'EINNAHME' ? 'is-einnahme-text' : 'is-ausgabe-text'}`}>
                  {gruppe.typ === 'EINNAHME' ? '+' : '−'}
                  {formatEuro(gruppe.summe)}
                </span>
              </div>
              <ul className="haushalt-buchung-liste">{gruppe.liste.map((b) => zeile(b, true))}</ul>
            </section>
          ))}
        </div>
      )}

      {schnell && (
        <SchnellErfassung
          kategorien={kategorien}
          onClose={() => setSchnell(false)}
          onSaved={() => {
            setSchnell(false)
            load()
          }}
        />
      )}

      {modal && (
        <BuchungModal
          kategorien={kategorien}
          buchung={modal.buchung}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            load()
          }}
        />
      )}
    </div>
  )
}
