import { useEffect, useState, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@components/ui/Button'
import { kochbuchService } from '@services/kochbuch.service'

interface PhotoSlotProps {
  label: string
  file: File | null
  onChange: (file: File) => void
}

function PhotoSlot({ label, file, onChange }: PhotoSlotProps) {
  const preview = file ? URL.createObjectURL(file) : null
  return (
    <label className="kochbuch-photo-picker kochbuch-import-photos__slot">
      {preview ? (
        <img src={preview} alt="" />
      ) : (
        <span className="kochbuch-photo-picker__placeholder">📷 {label}</span>
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

// Foto-Import: zwei Kartenfotos (Vorder-/Rückseite) hochladen, Claude liest
// die Rezeptdaten strukturiert aus. Landet NICHT direkt in der Datenbank —
// das Ergebnis geht als Vorbelegung ins normale Formular, wo Felix (oder
// wer auch immer) es vor dem Speichern prüft/korrigiert.
export function Import() {
  const navigate = useNavigate()
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [front, setFront] = useState<File | null>(null)
  const [back, setBack] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    kochbuchService
      .importStatus()
      .then(({ data }) => setConfigured(data.configured))
      .catch(() => setConfigured(false))
  }, [])

  const handleAnalyze = async () => {
    if (!front || !back) return
    setAnalyzing(true)
    setError(null)
    try {
      const { data } = await kochbuchService.analyzeImport(front, back)
      navigate('/kochbuch/neu', { state: { imported: data.recipe, usage: data.usage } })
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Die Fotos konnten nicht analysiert werden.'
      setError(message)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="kochbuch-import">
      <p className="form-hint">
        Fotografiere Vorder- und Rückseite einer Rezeptkarte — Claude liest Titel, Zutaten und Schritte aus. Das
        Ergebnis landet zur Prüfung im Formular, bevor irgendetwas gespeichert wird.
      </p>

      {configured === false && (
        <p className="form-error">
          Noch kein Anthropic-API-Key hinterlegt (ANTHROPIC_API_KEY fehlt in der Server-.env) — der Import ist
          eingerichtet, aber noch nicht aktiv.
        </p>
      )}

      <div className="kochbuch-import-photos">
        <PhotoSlot label="Vorderseite" file={front} onChange={setFront} />
        <PhotoSlot label="Rückseite" file={back} onChange={setBack} />
      </div>

      {error && <p className="form-error">{error}</p>}

      <Button onClick={handleAnalyze} disabled={!front || !back || analyzing || configured !== true}>
        {analyzing ? (
          <>
            <span className="kochbuch-spinner" aria-hidden="true" /> Analysiere…
          </>
        ) : (
          '✨ Analysieren'
        )}
      </Button>
      {analyzing && (
        <p className="form-hint">Claude liest die Karte aus — kann bis zu 30 Sekunden dauern.</p>
      )}
    </div>
  )
}
