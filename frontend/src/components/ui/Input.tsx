import { InputHTMLAttributes, forwardRef, useState } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
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
            {showPassword ? '🙈' : '👁️'}
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
