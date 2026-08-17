import { useState } from 'react'

interface TimesInputProps {
  value: string[]
  onChange: (value: string[]) => void
}

// Mehrfach-Uhrzeiten-Eingabe für eine Erinnerung — gleiches Chip-Muster
// wie TagInput.tsx im Farsi-Tool, aber mit <input type="time"> + Button
// statt Freitext+Enter (Uhrzeiten lassen sich schlecht "eintippen").
export function TimesInput({ value, onChange }: TimesInputProps) {
  const [draft, setDraft] = useState('09:00')

  const addTime = () => {
    if (draft && !value.includes(draft)) {
      onChange([...value, draft].sort())
    }
  }

  const removeTime = (time: string) => {
    onChange(value.filter((entry) => entry !== time))
  }

  return (
    <div className="tag-input">
      {value.map((time) => (
        <span key={time} className="tag-input__chip">
          {time}
          <button type="button" onClick={() => removeTime(time)} aria-label={`${time} entfernen`}>
            ×
          </button>
        </span>
      ))}
      <input
        type="time"
        className="erinnerungen-time-field"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button type="button" className="erinnerungen-time-add" onClick={addTime}>
        + Hinzufügen
      </button>
    </div>
  )
}
