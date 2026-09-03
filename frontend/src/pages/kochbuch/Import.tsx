import { useEffect, useState, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@components/ui/Button'
import { kochbuchService } from '@services/kochbuch.service'
import { getImageFromClipboard } from './clipboard'
import { TransferPanel } from './TransferPanel'

interface PhotoSlotProps {
  label: string
  file: File | null
  onChange: (file: File) => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

function PhotoSlot({ label, file, onChange, onMouseEnter, onMouseLeave }: PhotoSlotProps) {
  const preview = file ? URL.createObjectURL(file) : null
  return (
    <label
      className="kochbuch-photo-picker kochbuch-import-photos__slot"
      title="Klicken zum Auswählen, oder Maus hier drüber halten und Strg+V"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {preview ? (
        <img src={preview} alt="" />
      ) : (
        <span className="kochbuch-photo-picker__placeholder">📷 {label} (oder Strg+V)</span>
      )}
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const selected = event.target.files?.[0]
          if (selected) onChange(selected)
        }}
      />
    </label>
  )
}

type ImportMode = 'photo' | 'text' | 'transfer'
type PhotoSlotKey = 'front' | 'back'

// Zwei Wege, ein Rezept per KI einzulesen: Kartenfotos (Vorder-/Rückseite)
// oder Text/HTML-Quelltext einer Rezept-Webseite (z.B. hellofresh.de) — der
// Text-Weg ist meist günstiger (reine Text- statt Bild-Tokens) und genauer
// (exakter Quelltext statt aus einem Foto gelesener Text). Beide landen NICHT
// direkt in der Datenbank — das Ergebnis geht als Vorbelegung ins normale
// Formular, wo vor dem Speichern geprüft/korrigiert wird.
export function Import() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<ImportMode>('photo')
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [front, setFront] = useState<File | null>(null)
  const [back, setBack] = useState<File | null>(null)
  const [html, setHtml] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Wie in RezeptForm.tsx: Strg+V ohne vorheriges Klicken/Fokussieren folgt
  // dem gerade gehoverten Slot, ohne Hover fällt es auf "front" (bzw.
  // "back", falls front schon belegt ist) zurück.
  const [hoveredSlot, setHoveredSlot] = useState<PhotoSlotKey | null>(null)

  useEffect(() => {
    kochbuchService
      .importStatus()
      .then(({ data }) => setConfigured(data.configured))
      .catch(() => setConfigured(false))
  }, [])

  useEffect(() => {
    if (mode !== 'photo') return
    const handleGlobalPaste = (event: globalThis.ClipboardEvent) => {
      const file = getImageFromClipboard(event)
      if (!file) return
      event.preventDefault()
      const target = hoveredSlot ?? (front === null ? 'front' : back === null ? 'back' : null)
      if (target === 'front') setFront(file)
      else if (target === 'back') setBack(file)
    }
    window.addEventListener('paste', handleGlobalPaste)
    return () => window.removeEventListener('paste', handleGlobalPaste)
  }, [mode, hoveredSlot, front, back])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setError(null)
    try {
      const { data } =
        mode === 'photo'
          ? await kochbuchService.analyzeImport(front!, back!)
          : await kochbuchService.analyzeTextImport(html)
      navigate('/kochbuch/neu', { state: { imported: data.recipe, usage: data.usage } })
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Die Eingabe konnte nicht analysiert werden.'
      setError(message)
    } finally {
      setAnalyzing(false)
    }
  }

  const canAnalyze = mode === 'photo' ? Boolean(front && back) : Boolean(html.trim())

  return (
    <div className={`kochbuch-import ${mode !== 'photo' ? 'kochbuch-import--text' : ''}`.trim()}>
      <div className="farsi-filters__chips">
        <button
          type="button"
          className={`tool-chip ${mode === 'photo' ? 'is-active' : ''}`.trim()}
          onClick={() => setMode('photo')}
        >
          📷 Fotos
        </button>
        <button
          type="button"
          className={`tool-chip ${mode === 'text' ? 'is-active' : ''}`.trim()}
          onClick={() => setMode('text')}
        >
          📄 Text/HTML
        </button>
        <button
          type="button"
          className={`tool-chip ${mode === 'transfer' ? 'is-active' : ''}`.trim()}
          onClick={() => setMode('transfer')}
        >
          📦 Anderes Kochbuch
        </button>
      </div>

      {mode === 'transfer' ? (
        <TransferPanel />
      ) : (
        <>
          {mode === 'photo' ? (
            <p className="form-hint">
              Fotografiere Vorder- und Rückseite einer Rezeptkarte — Claude liest Titel, Zutaten und Schritte aus.
            </p>
          ) : (
            <p className="form-hint">
              Quelltext einer Rezept-Webseite einfügen (z.B. Rechtsklick → "Seitenquelltext anzeigen"/"Element
              untersuchen" auf hellofresh.de, dann den relevanten Ausschnitt kopieren). Reiner sichtbarer Text
              funktioniert genauso.
            </p>
          )}
          <p className="form-hint">Das Ergebnis landet zur Prüfung im Formular, bevor irgendetwas gespeichert wird.</p>

          {configured === false && (
            <p className="form-error">
              Noch kein Anthropic-API-Key hinterlegt (ANTHROPIC_API_KEY fehlt in der Server-.env) — der Import ist
              eingerichtet, aber noch nicht aktiv.
            </p>
          )}

          {mode === 'photo' ? (
            <div className="kochbuch-import-photos">
              <PhotoSlot
                label="Vorderseite"
                file={front}
                onChange={setFront}
                onMouseEnter={() => setHoveredSlot('front')}
                onMouseLeave={() => setHoveredSlot((current) => (current === 'front' ? null : current))}
              />
              <PhotoSlot
                label="Rückseite"
                file={back}
                onChange={setBack}
                onMouseEnter={() => setHoveredSlot('back')}
                onMouseLeave={() => setHoveredSlot((current) => (current === 'back' ? null : current))}
              />
            </div>
          ) : (
            <textarea
              className="input kochbuch-import-textarea"
              rows={10}
              placeholder="HTML-Quelltext oder Seitentext hier einfügen…"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
            />
          )}

          {error && <p className="form-error">{error}</p>}

          <Button onClick={handleAnalyze} disabled={!canAnalyze || analyzing || configured !== true}>
            {analyzing ? (
              <>
                <span className="kochbuch-spinner" aria-hidden="true" /> Analysiere…
              </>
            ) : (
              '✨ Analysieren'
            )}
          </Button>
          {analyzing && <p className="form-hint">Claude liest das Rezept aus — kann bis zu 30 Sekunden dauern.</p>}
        </>
      )}
    </div>
  )
}
