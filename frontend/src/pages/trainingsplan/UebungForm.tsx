import { useEffect, useRef, useState, FormEvent, ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Card } from '@components/ui/Card'
import { trainingsplanService } from '@services/trainingsplan.service'
import { getImageFromClipboard } from './clipboard'
import { EXERCISE_UNITS, UNIT_META } from './format'
import { useFocusAreas } from './useFocusAreas'
import { useEquipment } from './useEquipment'
import type { Exercise, ExerciseInfoSection, ExerciseUnit } from '@app-types/trainingsplan'

// Wird ein Abschnitt entfernt, rutschen alle folgenden Indizes um eins nach
// unten — die per Index geführten "ausstehendes Foto"-Maps müssen mitziehen
// (gleiches Muster wie reindexAfterRemoval in RezeptForm.tsx).
function reindexAfterRemoval<T>(map: Record<number, T>, removedIndex: number): Record<number, T> {
  const result: Record<number, T> = {}
  for (const [key, value] of Object.entries(map)) {
    const k = Number(key)
    if (k === removedIndex) continue
    result[k > removedIndex ? k - 1 : k] = value
  }
  return result
}

export function UebungForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(isEdit)
  const [exercise, setExercise] = useState<Exercise | null>(null)

  const [name, setName] = useState('')
  const [focusAreas, setFocusAreas] = useState<string[]>([])
  const { areas } = useFocusAreas()
  const [unit, setUnit] = useState<ExerciseUnit | null>(null)
  const [secondaryUnit, setSecondaryUnit] = useState<ExerciseUnit | null>(null)
  const [equipmentKey, setEquipmentKey] = useState<string | null>(null)
  const { items: equipmentItems } = useEquipment()
  const [infoSections, setInfoSections] = useState<ExerciseInfoSection[]>([])
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)
  const [pendingSectionPhotos, setPendingSectionPhotos] = useState<Record<number, File>>({})
  const [sectionPhotoPreviews, setSectionPhotoPreviews] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Welcher Bild-Picker gerade unter der Maus liegt — Strg+V ohne vorheriges
  // Klicken/Fokussieren geht sonst nicht sinnvoll auf, wenn es mehrere
  // Bild-Ziele gibt (Hauptbild + je ein Bild pro Abschnitt). Gleiches Muster
  // wie RezeptForm.tsx.
  const [hoveredPhotoTarget, setHoveredPhotoTarget] = useState<'main' | number | null>(null)

  useEffect(() => {
    if (!id) return
    trainingsplanService
      .getExercise(id)
      .then(({ data }) => {
        setExercise(data.exercise)
        setName(data.exercise.name)
        setFocusAreas(data.exercise.focusAreas)
        setUnit(data.exercise.unit)
        setSecondaryUnit(data.exercise.secondaryUnit)
        setEquipmentKey(data.exercise.equipmentKey)
        setInfoSections(data.exercise.infoSections)
        setPhotoPreview(data.exercise.imageUrl)
      })
      .finally(() => setLoading(false))
  }, [id])

  const toggleFocusArea = (option: string) =>
    setFocusAreas((current) => (current.includes(option) ? current.filter((f) => f !== option) : [...current, option]))

  // Wechselt der Nutzer die Haupteinheit, muss eine nicht mehr passende
  // Zweiteinheit mit zurückgesetzt werden: "Körpergewicht" erlaubt gar keine
  // Zweiteinheit, und die Zweiteinheit darf nie mit der Haupteinheit
  // übereinstimmen (siehe assertValidSecondaryUnit im Backend).
  const selectUnit = (option: ExerciseUnit) => {
    setUnit(option)
    setSecondaryUnit((current) => (option === 'BODYWEIGHT' || current === option ? null : current))
  }

  const addSection = () =>
    setInfoSections((current) => [...current, { title: '', text: '', imageUrl: null }])
  const removeSection = (index: number) => {
    setInfoSections((current) => current.filter((_, i) => i !== index))
    setPendingSectionPhotos((current) => reindexAfterRemoval(current, index))
    setSectionPhotoPreviews((current) => reindexAfterRemoval(current, index))
  }
  const updateSectionTitle = (index: number, title: string) =>
    setInfoSections((current) => current.map((s, i) => (i === index ? { ...s, title } : s)))
  const updateSectionText = (index: number, text: string) =>
    setInfoSections((current) => current.map((s, i) => (i === index ? { ...s, text } : s)))

  const applyPhoto = (file: File) => {
    setPendingPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }
  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) applyPhoto(file)
  }

  const applySectionPhoto = (index: number, file: File) => {
    setPendingSectionPhotos((current) => ({ ...current, [index]: file }))
    setSectionPhotoPreviews((current) => ({ ...current, [index]: URL.createObjectURL(file) }))
  }
  const handleSectionPhotoChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) applySectionPhoto(index, file)
  }

  // Strg+V funktioniert überall auf der Seite, sobald die Maus über einem
  // Bild-Picker steht (kein Klick/Fokus nötig) — ohne Hover fällt es auf das
  // Hauptbild zurück.
  useEffect(() => {
    const handleGlobalPaste = (event: globalThis.ClipboardEvent) => {
      const file = getImageFromClipboard(event)
      if (!file) return
      event.preventDefault()
      const target = hoveredPhotoTarget ?? 'main'
      if (target === 'main') applyPhoto(file)
      else applySectionPhoto(target, file)
    }
    window.addEventListener('paste', handleGlobalPaste)
    return () => window.removeEventListener('paste', handleGlobalPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredPhotoTarget])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Bitte einen Namen angeben.')
      return
    }
    if (focusAreas.length === 0) {
      setError('Bitte mindestens einen Trainingsfokus wählen.')
      return
    }
    if (!unit) {
      setError('Bitte eine Einheit wählen.')
      return
    }

    setSaving(true)
    try {
      const input = {
        name: name.trim(),
        focusAreas,
        unit,
        secondaryUnit,
        equipmentKey,
        infoSections: infoSections.map((s) => ({ ...s, title: s.title.trim(), text: s.text.trim() })),
      }

      const saved = isEdit && id
        ? (await trainingsplanService.updateExercise(id, input)).data.exercise
        : (await trainingsplanService.createExercise(input)).data.exercise

      if (pendingPhoto) {
        await trainingsplanService.uploadExercisePhoto(saved.id, pendingPhoto)
      }
      for (const [indexStr, file] of Object.entries(pendingSectionPhotos)) {
        await trainingsplanService.uploadExerciseSectionPhoto(saved.id, Number(indexStr), file)
      }
      navigate(`/trainingsplan/uebungen/${saved.id}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    if (!window.confirm(`"${name}" wirklich löschen?`)) return
    await trainingsplanService.deleteExercise(id)
    navigate('/trainingsplan/uebungen')
  }

  const handleToggleArchived = async () => {
    if (!id || !exercise) return
    setArchiving(true)
    try {
      const { data } = await trainingsplanService.updateExercise(id, { archived: !exercise.isArchived })
      setExercise(data.exercise)
    } finally {
      setArchiving(false)
    }
  }

  if (loading) return <p>Lädt…</p>
  if (isEdit && !exercise) return <p className="admin-empty-state">Übung nicht gefunden.</p>

  return (
    <form onSubmit={handleSubmit} className="trainingsplan-form">
      <div
        className="kochbuch-photo-picker trainingsplan-photo-picker"
        title="Klicken zum Auswählen, oder Maus hier drüber halten und Strg+V"
        onClick={() => fileInputRef.current?.click()}
        onMouseEnter={() => setHoveredPhotoTarget('main')}
        onMouseLeave={() => setHoveredPhotoTarget((current) => (current === 'main' ? null : current))}
      >
        {photoPreview ? (
          <img src={photoPreview} alt="" onError={() => setPhotoPreview(null)} />
        ) : (
          <span className="kochbuch-photo-picker__placeholder">📷 Foto hinzufügen oder einfügen (Strg+V)</span>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
      </div>

      <Input id="uebung-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} />

      <div className="form-group">
        <span className="form-label">Trainingsfokus *</span>
        <div className="farsi-filters__chips">
          {areas.map(({ key: option, name, icon }) => (
            <button
              key={option}
              type="button"
              className={`tool-chip ${focusAreas.includes(option) ? 'is-active' : ''}`.trim()}
              onClick={() => toggleFocusArea(option)}
            >
              {icon} {name}
            </button>
          ))}
        </div>
        <p className="form-hint">Mehrfachauswahl möglich, z.B. Kreuzheben = Rücken + Beine.</p>
      </div>

      <div className="form-group">
        <span className="form-label">Trainingsgerät (optional)</span>
        <div className="farsi-filters__chips">
          <button
            type="button"
            className={`tool-chip ${equipmentKey === null ? 'is-active' : ''}`.trim()}
            onClick={() => setEquipmentKey(null)}
          >
            Kein Gerät
          </button>
          {equipmentItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`tool-chip ${equipmentKey === item.key ? 'is-active' : ''}`.trim()}
              onClick={() => setEquipmentKey(item.key)}
            >
              {item.name}
            </button>
          ))}
        </div>
        {equipmentItems.length === 0 && (
          <p className="form-hint">Noch keine Geräte angelegt — in der Übungsliste unter "Geräte verwalten".</p>
        )}
      </div>

      <div className="form-group">
        <span className="form-label">Einheit *</span>
        <div className="farsi-filters__chips">
          {EXERCISE_UNITS.map((option) => (
            <button
              key={option}
              type="button"
              className={`tool-chip ${unit === option ? 'is-active' : ''}`.trim()}
              onClick={() => selectUnit(option)}
            >
              {UNIT_META[option].label}
            </button>
          ))}
        </div>
        <p className="form-hint">
          "Körpergewicht" blendet das Gewichtsfeld beim Loggen komplett aus (nur Wiederholungen zählen), z.B. für
          Klimmzüge. Bei anderen reinen Wiederholungsübungen einfach eine passende Einheit wählen und den Wert
          später beim Loggen leer lassen.
        </p>
      </div>

      {unit && unit !== 'BODYWEIGHT' && (
        <div className="form-group">
          <span className="form-label">Zweite Einheit (optional)</span>
          <div className="farsi-filters__chips">
            <button
              type="button"
              className={`tool-chip ${secondaryUnit === null ? 'is-active' : ''}`.trim()}
              onClick={() => setSecondaryUnit(null)}
            >
              Keine
            </button>
            {EXERCISE_UNITS.filter((option) => option !== 'BODYWEIGHT' && option !== unit).map((option) => (
              <button
                key={option}
                type="button"
                className={`tool-chip ${secondaryUnit === option ? 'is-active' : ''}`.trim()}
                onClick={() => setSecondaryUnit(option)}
              >
                {UNIT_META[option].label}
              </button>
            ))}
          </div>
          <p className="form-hint">
            Für Übungen mit zwei Kennzahlen, z.B. Laufen = km (Einheit) + min (zweite Einheit).
          </p>
        </div>
      )}

      <div className="form-group">
        <span className="form-label">So geht's (optional)</span>
        <div className="kochbuch-step-list">
          {infoSections.map((section, index) => (
            <Card key={index} className="kochbuch-step-edit">
              <div className="kochbuch-step-edit__header">
                <span className="kochbuch-step-edit__number">{index + 1}</span>
                <input
                  type="text"
                  className="input"
                  placeholder="Abschnittstitel, z.B. Ausgangsposition"
                  value={section.title}
                  onChange={(e) => updateSectionTitle(index, e.target.value)}
                />
                <button
                  type="button"
                  className="erinnerungen-lead-row__remove"
                  onClick={() => removeSection(index)}
                  aria-label="Abschnitt entfernen"
                >
                  ×
                </button>
              </div>
              <div className="kochbuch-step-edit__body">
                <label
                  className="kochbuch-step-edit__photo-picker"
                  title="Klicken zum Auswählen, oder Maus hier drüber halten und Strg+V"
                  onMouseEnter={() => setHoveredPhotoTarget(index)}
                  onMouseLeave={() => setHoveredPhotoTarget((current) => (current === index ? null : current))}
                >
                  {sectionPhotoPreviews[index] ?? section.imageUrl ? (
                    <img src={sectionPhotoPreviews[index] ?? section.imageUrl ?? undefined} alt="" />
                  ) : (
                    <span>📷</span>
                  )}
                  <input type="file" accept="image/*" hidden onChange={(e) => handleSectionPhotoChange(index, e)} />
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Beschreibung dieses Abschnitts"
                  value={section.text}
                  onChange={(e) => updateSectionText(index, e.target.value)}
                />
              </div>
            </Card>
          ))}
        </div>
        <button type="button" className="erinnerungen-time-add" onClick={addSection}>
          + Abschnitt hinzufügen
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="farsi-modal__actions">
        {isEdit && exercise && exercise.usageCount === 0 && (
          <button type="button" className="farsi-modal__delete" onClick={handleDelete}>
            Löschen
          </button>
        )}
        {isEdit && exercise && exercise.usageCount > 0 && (
          <button type="button" className="farsi-modal__delete" onClick={handleToggleArchived} disabled={archiving}>
            {exercise.isArchived ? 'Reaktivieren' : 'Archivieren'}
          </button>
        )}
        <div className="farsi-modal__actions-right">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Speichern…' : 'Speichern'}
          </Button>
        </div>
      </div>
    </form>
  )
}
