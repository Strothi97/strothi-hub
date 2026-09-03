import { useState, KeyboardEvent, FocusEvent } from 'react'

interface TagInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}

// Gleiches Muster wie farsi/TagInput.tsx bzw. erinnerungen/TimesInput.tsx —
// Enter/Komma fügt einen Chip hinzu, Backspace bei leerem Feld entfernt den
// letzten, X entfernt gezielt.
export function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState('')

  const addTag = () => {
    const trimmed = draft.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setDraft('')
  }

  const removeTag = (tag: string) => {
    onChange(value.filter((entry) => entry !== tag))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag()
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  const handleBlur = (_event: FocusEvent<HTMLInputElement>) => {
    addTag()
  }

  return (
    <div className="tag-input">
      {value.map((tag) => (
        <span key={tag} className="tag-input__chip">
          {tag}
          <button type="button" onClick={() => removeTag(tag)} aria-label={`${tag} entfernen`}>
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        className="tag-input__field"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? placeholder : ''}
      />
    </div>
  )
}
