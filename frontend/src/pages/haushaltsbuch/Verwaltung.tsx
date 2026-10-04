import { useEffect, useState, FormEvent } from 'react'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { haushaltsbuchService } from '@services/haushaltsbuch.service'
import type { Kategorie, KategorieTyp, Kasse } from '@app-types/haushaltsbuch'
import { formatEuro, formatDateOnly, toDateOnlyLocal } from './format'
import { HaendlerModal } from './HaendlerModal'

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message
  return message ?? 'Das hat leider nicht geklappt.'
}

// Kinder je Elternkategorie (null = Hauptkategorien), alphabetisch sortiert.
function baueKinderMap(kategorien: Kategorie[]): Map<string | null, Kategorie[]> {
  const map = new Map<string | null, Kategorie[]>()
  for (const k of kategorien) {
    const liste = map.get(k.parentId) ?? []
    liste.push(k)
    map.set(k.parentId, liste)
  }
  for (const liste of map.values()) liste.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  return map
}

type Anlegen = { parentId: string | null; name: string } | null

export function Verwaltung() {
  const [kasse, setKasse] = useState<Kasse | null>(null)
  const [kategorien, setKategorien] = useState<Kategorie[]>([])
  const [fehler, setFehler] = useState<string | null>(null)
  const [typ, setTyp] = useState<KategorieTyp>('AUSGABE')
  const [anlegen, setAnlegen] = useState<Anlegen>(null)
  const [umbenennen, setUmbenennen] = useState<{ id: string; name: string } | null>(null)
  const [haendlerOffen, setHaendlerOffen] = useState(false)

  const submitUmbenennen = (event: FormEvent) => {
    event.preventDefault()
    if (!umbenennen || !umbenennen.name.trim()) return
    const { id, name } = umbenennen
    run(async () => {
      await haushaltsbuchService.updateKategorie(id, { name: name.trim() })
      setUmbenennen(null)
    })
  }

  // Kasse-Formular
  const [startbetrag, setStartbetrag] = useState('0')
  const [startdatum, setStartdatum] = useState(toDateOnlyLocal(new Date()))
  const [kasseGespeichert, setKasseGespeichert] = useState(false)

  const load = () =>
    Promise.all([
      haushaltsbuchService.getKasse().then(({ data }) => {
        setKasse(data.kasse)
        if (data.kasse) {
          setStartbetrag(String(data.kasse.startbetrag))
          setStartdatum(data.kasse.startdatum)
        }
      }),
      haushaltsbuchService.listKategorien().then(({ data }) => setKategorien(data.kategorien)),
    ])

  useEffect(() => {
    load()
  }, [])

  const run = async (action: () => Promise<unknown>) => {
    setFehler(null)
    try {
      await action()
      await load()
    } catch (err) {
      setFehler(errorMessage(err))
    }
  }

  const saveKasse = (event: FormEvent) => {
    event.preventDefault()
    setKasseGespeichert(false)
    run(async () => {
      await haushaltsbuchService.setKasse({
        startbetrag: Number(startbetrag.replace(',', '.')) || 0,
        startdatum,
      })
      setKasseGespeichert(true)
    })
  }

  const submitAnlegen = (event: FormEvent) => {
    event.preventDefault()
    if (!anlegen || !anlegen.name.trim()) return
    const { parentId, name } = anlegen
    run(async () => {
      await haushaltsbuchService.createKategorie({ name: name.trim(), typ, parentId })
      setAnlegen(null)
    })
  }

  const deleteKategorie = (k: Kategorie) => {
    if (!window.confirm(`"${k.name}" wirklich löschen?`)) return
    run(() => haushaltsbuchService.deleteKategorie(k.id))
  }

  const toggleStatistik = (k: Kategorie) => run(() => haushaltsbuchService.updateKategorie(k.id, { inStatistik: !k.inStatistik }))

  const typKategorien = kategorien.filter((k) => k.typ === typ)
  const kinderVon = baueKinderMap(typKategorien)
  const hauptkategorien = kinderVon.get(null) ?? []

  const istAnlegenHier = (parentId: string | null) => anlegen !== null && anlegen.parentId === parentId

  const anlegenFormular = (parentId: string | null) => (
    <form className="haushalt-tree__add" onSubmit={submitAnlegen}>
      <Input
        autoFocus
        placeholder={parentId ? 'Name der Unterkategorie' : 'Name der Hauptkategorie'}
        value={anlegen?.name ?? ''}
        onChange={(e) => setAnlegen({ parentId, name: e.target.value })}
      />
      <div className="haushalt-tree__add-actions">
        <Button type="button" variant="secondary" onClick={() => setAnlegen(null)}>
          Abbrechen
        </Button>
        <Button type="submit" disabled={!anlegen?.name.trim()}>
          Hinzufügen
        </Button>
      </div>
    </form>
  )

  // Reihenfolge innerhalb einer Ebene: Ziehen mit der Maus oder Pfeile (auch am Handy).
  const [ziehen, setZiehen] = useState<string | null>(null)
  const [ablage, setAblage] = useState<{ id: string; pos: 'vor' | 'nach' } | null>(null)

  const geschwisterIds = (k: Kategorie) => (kinderVon.get(k.parentId) ?? []).map((x) => x.id)

  const sortieren = (ids: string[]) => run(() => haushaltsbuchService.sortiereKategorien(ids))

  const verschiebeImStapel = (k: Kategorie, richtung: -1 | 1) => {
    const ids = geschwisterIds(k)
    const idx = ids.indexOf(k.id)
    const ziel = idx + richtung
    if (idx < 0 || ziel < 0 || ziel >= ids.length) return
    const neu = [...ids]
    ;[neu[idx], neu[ziel]] = [neu[ziel], neu[idx]]
    sortieren(neu)
  }

  const renderKnoten = (k: Kategorie, tiefe: number) => {
    const kinder = kinderVon.get(k.id) ?? []
    const offen = istAnlegenHier(k.id)
    const ids = geschwisterIds(k)
    const position = ids.indexOf(k.id)
    const sortierbar = ids.length > 1
    const markiert = ablage?.id === k.id ? (ablage.pos === 'vor' ? 'is-drop-vor' : 'is-drop-nach') : ''
    return (
      <li key={k.id} className={tiefe === 0 ? 'haushalt-tree__node' : 'haushalt-tree__sub'}>
        <div
          className={`haushalt-tree__row ${tiefe === 0 ? '' : 'haushalt-tree__row--kind'} ${ziehen === k.id ? 'is-ziehen' : ''} ${markiert}`.trim()}
          data-kat-id={k.id}
          data-parent-id={k.parentId ?? ''}
        >
          <span
            className={`haushalt-tree__ziehgriff ${sortierbar ? '' : 'is-leer'}`.trim()}
            aria-hidden="true"
            onPointerDown={(e) => {
              if (!sortierbar) return
              e.currentTarget.setPointerCapture(e.pointerId)
              setZiehen(k.id)
            }}
            onPointerMove={(e) => {
              if (ziehen !== k.id) return
              const ziel = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-kat-id]') as HTMLElement | null
              if (!ziel || ziel.dataset.katId === k.id || ziel.dataset.parentId !== (k.parentId ?? '')) {
                setAblage(null)
                return
              }
              const rect = ziel.getBoundingClientRect()
              setAblage({ id: ziel.dataset.katId as string, pos: e.clientY < rect.top + rect.height / 2 ? 'vor' : 'nach' })
            }}
            onPointerUp={() => {
              if (ziehen !== k.id || !ablage) {
                setZiehen(null)
                setAblage(null)
                return
              }
              const neu = geschwisterIds(k).filter((x) => x !== k.id)
              const idx = neu.indexOf(ablage.id)
              neu.splice(ablage.pos === 'vor' ? idx : idx + 1, 0, k.id)
              setZiehen(null)
              setAblage(null)
              sortieren(neu)
            }}
            onPointerCancel={() => {
              setZiehen(null)
              setAblage(null)
            }}
          >
            ⠿
          </span>
          <span className={`haushalt-tree__name ${k.inStatistik ? '' : 'is-aus'}`.trim()}>{k.name}</span>
          <div className="haushalt-tree__actions">
            {position > 0 && (
            <button
              type="button"
              className="haushalt-icon-action"
              title="Nach oben"
              aria-label={`${k.name} nach oben`}
              disabled={position <= 0}
              onClick={() => verschiebeImStapel(k, -1)}
            >
              ↑
            </button>
            )}
            {position >= 0 && position < ids.length - 1 && (
            <button
              type="button"
              className="haushalt-icon-action"
              title="Nach unten"
              aria-label={`${k.name} nach unten`}
              disabled={position < 0 || position >= ids.length - 1}
              onClick={() => verschiebeImStapel(k, 1)}
            >
              ↓
            </button>
            )}
            <button
              type="button"
              className={`haushalt-statistik-btn ${k.inStatistik ? 'is-an' : ''}`.trim()}
              title={k.inStatistik ? 'Zählt in der Statistik — klicken zum Ausschließen' : 'Zählt nicht in der Statistik — klicken zum Einbeziehen'}
              aria-pressed={k.inStatistik}
              onClick={() => toggleStatistik(k)}
            >
              {k.inStatistik ? 'Statistik' : 'Verschiebung'}
            </button>
            <button
              type="button"
              className="haushalt-icon-action"
              title="Umbenennen"
              aria-label={`${k.name} umbenennen`}
              onClick={() => {
                setFehler(null)
                setUmbenennen({ id: k.id, name: k.name })
              }}
            >
              ✏️
            </button>
            <button
              type="button"
              className="haushalt-icon-action"
              title="Unterkategorie hinzufügen"
              aria-label={`Unterkategorie zu ${k.name} hinzufügen`}
              onClick={() => setAnlegen({ parentId: k.id, name: '' })}
            >
              +
            </button>
            <button
              type="button"
              className="haushalt-icon-action haushalt-icon-action--delete"
              title={k.usageCount > 0 ? 'Wird noch in Buchungen verwendet' : kinder.length > 0 ? 'Hat Unterkategorien' : 'Löschen'}
              aria-label={`${k.name} löschen`}
              disabled={k.usageCount > 0 || kinder.length > 0}
              onClick={() => deleteKategorie(k)}
            >
              ×
            </button>
          </div>
        </div>
        {umbenennen?.id === k.id && (
          <form className="haushalt-tree__add haushalt-tree__umbenennen" onSubmit={submitUmbenennen}>
            <Input autoFocus value={umbenennen.name} onChange={(e) => setUmbenennen({ id: k.id, name: e.target.value })} />
            <div className="haushalt-tree__add-actions">
              <Button type="button" variant="secondary" onClick={() => setUmbenennen(null)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={!umbenennen.name.trim()}>
                Speichern
              </Button>
            </div>
          </form>
        )}
        {(kinder.length > 0 || offen) && (
          <ul className="haushalt-tree__kinder">
            {kinder.map((kind) => renderKnoten(kind, tiefe + 1))}
            {offen && <li className="haushalt-tree__row--form">{anlegenFormular(k.id)}</li>}
          </ul>
        )}
      </li>
    )
  }

  return (
    <div>
      {fehler && <p className="form-error">{fehler}</p>}

      <section className="kochbuch-detail__section">
        <h3>Haushaltskasse</h3>
        <p className="form-hint">
          Startbetrag am Startdatum. Alle Buchungen wirken darauf, auch Verschiebungen.
          {kasse && ` Aktuell: ${formatEuro(kasse.startbetrag)} ab ${formatDateOnly(kasse.startdatum)}.`}
        </p>
        <form className="trainingsplan-area-add" onSubmit={saveKasse}>
          <div className="haushalt-zwei-spalten">
            <input
              className="input"
              placeholder="Startbetrag €"
              inputMode="decimal"
              value={startbetrag}
              onChange={(e) => setStartbetrag(e.target.value)}
              aria-label="Startbetrag"
            />
            <input type="date" className="input" value={startdatum} onChange={(e) => setStartdatum(e.target.value)} aria-label="Startdatum" />
          </div>
          <Button type="submit">Speichern</Button>
          {kasseGespeichert && <p className="form-hint">Gespeichert.</p>}
        </form>
      </section>

      <section className="kochbuch-detail__section">
        <h3>Händler</h3>
        <p className="form-hint">Gespeicherte Händler werden beim Buchen als Vorschlag angeboten. So bleiben Schreibweisen einheitlich.</p>
        <button type="button" className="haushalt-add-btn" onClick={() => setHaendlerOffen(true)}>
          Händler verwalten
        </button>
        {haendlerOffen && (
          <HaendlerModal onClose={() => setHaendlerOffen(false)} onChanged={() => load()} />
        )}
      </section>

      <section className="kochbuch-detail__section">
        <h3>Kategorien</h3>
        <p className="form-hint">
          Schalter "Statistik" aus: Die Buchungen werden als Verschiebung gezeigt, zählen nicht in Einnahmen oder Ausgaben.
          Unterkategorien erben das, wenn eine Oberkategorie ausgeschaltet ist.
        </p>
        <div className="haushalt-kat-kopf">
          <div className="haushalt-typ-tabs" role="tablist">
            {(['AUSGABE', 'EINNAHME'] as KategorieTyp[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={typ === t}
                className={`haushalt-typ-tab haushalt-typ-tab--${t.toLowerCase()} ${typ === t ? 'is-active' : ''}`.trim()}
                onClick={() => {
                  setTyp(t)
                  setAnlegen(null)
                }}
              >
                {t === 'AUSGABE' ? 'Ausgaben' : 'Einnahmen'}
              </button>
            ))}
          </div>
          {!istAnlegenHier(null) && (
            <button type="button" className="haushalt-add-btn" onClick={() => setAnlegen({ parentId: null, name: '' })}>
              + Hauptkategorie
            </button>
          )}
        </div>

        {istAnlegenHier(null) && <div className="haushalt-tree__form-root">{anlegenFormular(null)}</div>}

        <div className="haushalt-tree-scroll">
          <ul className={`haushalt-tree haushalt-tree--${typ.toLowerCase()}`}>
            {hauptkategorien.map((k) => renderKnoten(k, 0))}
          </ul>
        </div>

        {hauptkategorien.length === 0 && !istAnlegenHier(null) && (
          <p className="admin-empty-state">Noch keine {typ === 'AUSGABE' ? 'Ausgabe' : 'Einnahme'}-Kategorie.</p>
        )}
      </section>
    </div>
  )
}
