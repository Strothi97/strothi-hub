import { useEffect, useState, KeyboardEvent } from 'react'
import { formatDateOnly, parseDatumEingabe } from './format'

interface DatumInputProps {
  value: string
  onChange: (iso: string) => void
  id?: string
  ariaLabel?: string
  required?: boolean
}

function anzeige(iso: string): string {
  return iso ? formatDateOnly(iso) : ''
}

// Textfeld für Datum. Man kann kurz tippen ("0410" = 04.10. dieses Jahr), übernommen wird beim
// Verlassen des Feldes (Tab). Unverständliche Eingaben setzen den letzten gültigen Wert zurück.
export function DatumInput({ value, onChange, id, ariaLabel, required }: DatumInputProps) {
  const [text, setText] = useState(() => anzeige(value))

  useEffect(() => {
    setText(anzeige(value))
  }, [value])

  const uebernehmen = () => {
    const iso = parseDatumEingabe(text)
    if (!iso) {
      setText(anzeige(value))
      return
    }
    setText(anzeige(iso))
    if (iso !== value) onChange(iso)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    // Enter übernimmt das Datum, löst aber kein Formular-Absenden aus.
    event.preventDefault()
    uebernehmen()
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      className="input"
      placeholder="TT.MM.JJJJ"
      aria-label={ariaLabel}
      required={required}
      value={text}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setText(event.target.value)}
      onBlur={uebernehmen}
      onKeyDown={handleKeyDown}
    />
  )
}
