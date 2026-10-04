import { useEffect, useMemo, useState, KeyboardEvent } from 'react'
import { haushaltsbuchService } from '@services/haushaltsbuch.service'
import type { Haendler } from '@app-types/haushaltsbuch'

interface HaendlerComboboxProps {
  value: string
  onChange: (name: string) => void
  id?: string
  ariaLabel?: string
  placeholder?: string
}

// Händlerfeld mit gespeicherten Vorschlägen. Freier Text ist erlaubt: ein neuer
// Name wird beim Speichern angelegt. Enter übernimmt den ersten Vorschlag.
export function HaendlerCombobox({ value, onChange, id, ariaLabel, placeholder }: HaendlerComboboxProps) {
  const [haendler, setHaendler] = useState<Haendler[]>([])
  const [offen, setOffen] = useState(false)
  // Enter übernimmt nur einen Vorschlag, wenn in diesem Feld getippt wurde
  const [getippt, setGetippt] = useState(false)
  // Mit Pfeiltasten markierter Vorschlag, -1 = keiner
  const [aktiv, setAktiv] = useState(-1)

  useEffect(() => {
    haushaltsbuchService.listHaendler().then(({ data }) => setHaendler(data.haendler))
  }, [])

  const vorschlaege = useMemo(() => {
    const needle = value.trim().toLowerCase()
    const treffer = needle ? haendler.filter((h) => h.name.toLowerCase().includes(needle)) : haendler
    return treffer.filter((h) => h.name !== value).slice(0, 8)
  }, [haendler, value])

  const uebernehmen = (name: string) => {
    onChange(name)
    setGetippt(false)
    setAktiv(-1)
    setOffen(false)
  }

  // Enter: markierter Vorschlag, sonst nach dem Tippen der erste Vorschlag.
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && vorschlaege.length > 0) {
      event.preventDefault()
      setOffen(true)
      setAktiv((i) => Math.min(i + 1, vorschlaege.length - 1))
    } else if (event.key === 'ArrowUp' && offen && vorschlaege.length > 0) {
      event.preventDefault()
      setAktiv((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' && offen && vorschlaege.length > 0 && (aktiv >= 0 || getippt)) {
      event.preventDefault()
      uebernehmen(vorschlaege[aktiv >= 0 ? aktiv : 0].name)
    } else if (event.key === 'Escape') {
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
        placeholder={placeholder ?? 'Händler'}
        autoComplete="off"
        value={value}
        onFocus={(e) => {
          e.currentTarget.select()
          setOffen(true)
        }}
        onBlur={() => {
          setOffen(false)
          setGetippt(false)
          setAktiv(-1)
        }}
        onChange={(e) => {
          onChange(e.target.value)
          setGetippt(true)
          setAktiv(-1)
          setOffen(true)
        }}
        onKeyDown={handleKeyDown}
      />
      {offen && vorschlaege.length > 0 && (
        <ul className="haushalt-combo__liste" role="listbox">
          {vorschlaege.map((h, index) => (
            <li key={h.id} role="option" aria-selected={index === aktiv}>
              <button
                type="button"
                className={`haushalt-combo__option ${index === aktiv ? 'is-active' : ''}`.trim()}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setAktiv(index)}
                onClick={() => uebernehmen(h.name)}
              >
                {h.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
