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

  useEffect(() => {
    haushaltsbuchService.listHaendler().then(({ data }) => setHaendler(data.haendler))
  }, [])

  const vorschlaege = useMemo(() => {
    const needle = value.trim().toLowerCase()
    const treffer = needle ? haendler.filter((h) => h.name.toLowerCase().includes(needle)) : haendler
    return treffer.filter((h) => h.name !== value).slice(0, 8)
  }, [haendler, value])

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && offen && vorschlaege.length > 0) {
      event.preventDefault()
      onChange(vorschlaege[0].name)
      setOffen(false)
    } else if (event.key === 'Escape') {
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
        onFocus={() => setOffen(true)}
        onBlur={() => setOffen(false)}
        onChange={(e) => {
          onChange(e.target.value)
          setOffen(true)
        }}
        onKeyDown={handleKeyDown}
      />
      {offen && vorschlaege.length > 0 && (
        <ul className="haushalt-combo__liste" role="listbox">
          {vorschlaege.map((h) => (
            <li key={h.id} role="option" aria-selected={false}>
              <button
                type="button"
                className="haushalt-combo__option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(h.name)
                  setOffen(false)
                }}
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
