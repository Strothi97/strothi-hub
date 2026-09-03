import { InputHTMLAttributes, forwardRef, useState } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

// Einfache, einfarbige Strichzeichnungen statt Emoji (🙈/👁️ sahen je nach
// Betriebssystem-Emoji-Font unpassend/zu bunt in dem kleinen Knopf aus) —
// erben ihre Farbe über currentColor von .input-password__toggle, damit sie
// sich ins übrige Design einfügen.
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-7-11-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

// Passwort-Felder (type="password") bekommen automatisch einen Anzeigen/
// Verbergen-Knopf — betrifft dadurch alle Stellen im Hub (Login, Konto,
// Einladung annehmen, Konto löschen), ohne dass jede Seite das einzeln
// nachbauen muss (Wunsch: man kann sonst nicht prüfen, was man eingetippt
// hat). Für alle anderen Feldtypen ändert sich nichts.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, className = '', type, ...props },
  ref,
) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="form-group">
      {label && (
        <label className="form-label" htmlFor={id}>
          {label}
        </label>
      )}
      {isPassword ? (
        <div className="input-password">
          <input
            ref={ref}
            id={id}
            type={showPassword ? 'text' : 'password'}
            className={`input input-password__field ${error ? 'input-error' : ''} ${className}`.trim()}
            {...props}
          />
          <button
            type="button"
            className="input-password__toggle"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
            title={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      ) : (
        <input
          ref={ref}
          id={id}
          type={type}
          className={`input ${error ? 'input-error' : ''} ${className}`.trim()}
          {...props}
        />
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
})
