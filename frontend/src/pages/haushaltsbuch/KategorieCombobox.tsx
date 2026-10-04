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
  const [suche, setSuche] = useState('')
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
    const needle = suche.trim().toLowerCase()
    const sortiert = [...kategorien].sort((a, b) => a.pfad.localeCompare(b.pfad))
    return needle ? sortiert.filter((k) => k.name.toLowerCase().includes(needle)) : sortiert
  }, [kategorien, suche])

  const waehlen = (kategorie: Kategorie) => {
    onChange(kategorie.id)
    setSuche('')
    setOffen(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && offen && treffer.length > 0) {
      event.preventDefault()
      waehlen(treffer[0])
    } else if (event.key === 'Escape') {
      setSuche('')
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
        value={offen ? suche : ausgewaehlt ? anzeige(ausgewaehlt) : ''}
        onFocus={() => {
          setSuche('')
          setOffen(true)
        }}
        onBlur={() => setOffen(false)}
        onChange={(e) => {
          setSuche(e.target.value)
          setOffen(true)
        }}
        onKeyDown={handleKeyDown}
      />
      {offen && (
        <ul className="haushalt-combo__liste" role="listbox">
          {treffer.length === 0 ? (
            <li className="haushalt-combo__leer">Keine Kategorie gefunden</li>
          ) : (
            treffer.map((k) => (
              <li key={k.id} role="option" aria-selected={k.id === value}>
                <button
                  type="button"
                  className={`haushalt-combo__option ${k.id === value ? 'is-active' : ''}`.trim()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => waehlen(k)}
                >
                  {anzeige(k)}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
