import { useMemo, useState, KeyboardEvent } from 'react'
import type { Kategorie } from '@app-types/haushaltsbuch'

interface KategorieComboboxProps {
  kategorien: Kategorie[]
  value: string
  onChange: (kategorieId: string) => void
  id?: string
  ariaLabel?: string
  placeholder?: string
}

// Textfeld mit Vorschlagsliste: Tippen filtert, Enter übernimmt den ersten Treffer.
export function KategorieCombobox({ kategorien, value, onChange, id, ariaLabel, placeholder }: KategorieComboboxProps) {
  const [offen, setOffen] = useState(false)
  // null = nichts getippt, dann steht im Feld die aktuelle Auswahl
  const [suche, setSuche] = useState<string | null>(null)
  // Mit Pfeiltasten markierter Treffer, -1 = keiner (dann ist die bestehende Auswahl markiert)
  const [aktiv, setAktiv] = useState(-1)
  const ausgewaehlt = kategorien.find((k) => k.id === value)

  // Anzeige nur mit Namen. Kommt ein Name mehrfach vor (auch bei Einnahme und Ausgabe),
  // erscheinen Typ und Pfad, z.B. "Einnahme: Geschenk" und "Ausgabe: Geschenk".
  const namenMehrfach = useMemo(() => {
    const zaehler = new Map<string, number>()
    for (const k of kategorien) zaehler.set(k.name, (zaehler.get(k.name) ?? 0) + 1)
    return new Set([...zaehler].filter(([, n]) => n > 1).map(([name]) => name))
  }, [kategorien])

  const anzeige = (k: Kategorie) =>
    namenMehrfach.has(k.name) ? `${k.typ === 'EINNAHME' ? 'Einnahme' : 'Ausgabe'}: ${k.pfad}` : k.name

  const treffer = useMemo(() => {
    const needle = (suche ?? '').trim().toLowerCase()
    const sortiert = [...kategorien].sort((a, b) => a.pfad.localeCompare(b.pfad))
    return needle ? sortiert.filter((k) => k.name.toLowerCase().includes(needle)) : sortiert
  }, [kategorien, suche])

  const waehlen = (kategorie: Kategorie) => {
    onChange(kategorie.id)
    setSuche(null)
    setAktiv(-1)
    setOffen(false)
  }

  // Pfeiltasten gehen durch die Liste, Enter übernimmt den markierten Treffer. Ohne
  // Pfeiltaste übernimmt Enter nur, wenn getippt wurde — sonst bleibt die Auswahl erhalten.
  // Tab übernimmt genauso (ohne preventDefault, der Sprung zum nächsten Feld bleibt also
  // erhalten) — sonst springt Tab sonst nur in die noch offene Liste statt weiter zum Preis.
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && treffer.length > 0) {
      event.preventDefault()
      setOffen(true)
      setAktiv((i) => Math.min(i + 1, treffer.length - 1))
    } else if (event.key === 'ArrowUp' && offen && treffer.length > 0) {
      event.preventDefault()
      setAktiv((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' && offen && treffer.length > 0 && (aktiv >= 0 || suche !== null)) {
      event.preventDefault()
      waehlen(treffer[aktiv >= 0 ? aktiv : 0])
    } else if (event.key === 'Tab' && offen && treffer.length > 0 && (aktiv >= 0 || suche !== null)) {
      waehlen(treffer[aktiv >= 0 ? aktiv : 0])
    } else if (event.key === 'Escape') {
      setSuche(null)
      setAktiv(-1)
      setOffen(false)
    }
  }

  return (
    <div className="haushalt-combo">
      <input
        id={id}
        className="input haushalt-combo__input"
        aria-label={ariaLabel}
        placeholder={placeholder ?? 'Kategorie tippen…'}
        autoComplete="off"
        value={suche ?? (ausgewaehlt ? anzeige(ausgewaehlt) : '')}
        onFocus={(e) => {
          e.currentTarget.select()
          setOffen(true)
        }}
        onBlur={() => {
          setOffen(false)
          setSuche(null)
          setAktiv(-1)
        }}
        onChange={(e) => {
          setSuche(e.target.value)
          setAktiv(-1)
          setOffen(true)
        }}
        onKeyDown={handleKeyDown}
      />
      {offen && (
        <ul className="haushalt-combo__liste" role="listbox">
          {treffer.length === 0 ? (
            <li className="haushalt-combo__leer">Keine Kategorie gefunden</li>
          ) : (
            treffer.map((k, index) => {
              const istMarkiert = aktiv >= 0 ? index === aktiv : k.id === value
              return (
                <li key={k.id} role="option" aria-selected={istMarkiert}>
                  <button
                    type="button"
                    tabIndex={-1}
                    className={`haushalt-combo__option ${istMarkiert ? 'is-active' : ''}`.trim()}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => waehlen(k)}
                  >
                    {anzeige(k)}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}
