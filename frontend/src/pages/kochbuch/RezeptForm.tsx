import { useEffect, useRef, useState, FormEvent, ChangeEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Card } from '@components/ui/Card'
import { kochbuchService } from '@services/kochbuch.service'
import { TagInput } from './TagInput'
import { getImageFromClipboard } from './clipboard'
import { CATEGORY_META, MEAL_TYPE_META, RECIPE_CATEGORIES, RECIPE_MEAL_TYPES } from './format'
import type {
  ImportedRecipe,
  ImportUsage,
  Recipe,
  RecipeCategory,
  RecipeIngredient,
  RecipeMealType,
  RecipeStep,
} from '@app-types/kochbuch'

const SERVING_SIZE_OPTIONS = [2, 3, 4, 5, 6]

function emptyIngredient(servingSizes: number[]): RecipeIngredient {
  return { name: '', amounts: servingSizes.map((servings) => ({ servings, amount: '' })) }
}

// Ingredient-Mengen an eine geänderte servingSizes-Auswahl anpassen: fehlende
// Personenzahlen ergänzen (leerer Wert). Bewusst NICHT destruktiv — Mengen zu
// gerade abgewählten Personenzahlen bleiben im Hintergrund erhalten statt
// gelöscht zu werden (Wunsch: P5 abwählen, P2 ausfüllen, wieder zu P5
// wechseln soll den vorher eingetragenen P5-Wert nicht verlieren). Welche
// Spalten sichtbar sind, steuert allein das Rendering (effectiveServingSizes)
// — beim Speichern werden nicht mehr aktive Mengen ohnehin rausgefiltert
// (siehe handleSubmit), sie sind also nur eine Zwischenspeicherung fürs
// Formular, nicht Teil der gespeicherten Daten.
function syncIngredientAmounts(ingredients: RecipeIngredient[], servingSizes: number[]): RecipeIngredient[] {
  return ingredients.map((ingredient) => {
    const missing = servingSizes
      .filter((servings) => !ingredient.amounts.some((a) => a.servings === servings))
      .map((servings) => ({ servings, amount: '' }))
    return missing.length > 0 ? { ...ingredient, amounts: [...ingredient.amounts, ...missing] } : ingredient
  })
}

// Wird ein Schritt entfernt, rutschen alle folgenden Indizes um eins nach
// unten — die per Index geführten "ausstehendes Foto"-Maps müssen mitziehen.
function reindexAfterRemoval<T>(map: Record<number, T>, removedIndex: number): Record<number, T> {
  const result: Record<number, T> = {}
  for (const [key, value] of Object.entries(map)) {
    const k = Number(key)
    if (k === removedIndex) continue
    result[k > removedIndex ? k - 1 : k] = value
  }
  return result
}

export function RezeptForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  // Vom Foto-Import (Import.tsx) übergebene, noch ungeprüfte Vorbelegung —
  // nur relevant beim Neuanlegen, nie beim Bearbeiten (dort lädt der Effekt
  // unten die echten, gespeicherten Werte).
  const locationState = !isEdit ? (location.state as { imported?: ImportedRecipe; usage?: ImportUsage } | null) : null
  const imported = locationState?.imported ?? null
  const importUsage = locationState?.usage ?? null

  const [loading, setLoading] = useState(isEdit)
  const [recipe, setRecipe] = useState<Recipe | null>(null)

  const [title, setTitle] = useState(imported?.title ?? '')
  const [subtitle, setSubtitle] = useState(imported?.subtitle ?? '')
  const [source, setSource] = useState('HelloFresh')
  const [tags, setTags] = useState<string[]>(imported?.tags ?? [])
  const [allergens, setAllergens] = useState<string[]>(imported?.allergens ?? [])
  const [prepTimeMin, setPrepTimeMin] = useState<string>(imported?.prepTimeMinMinutes?.toString() ?? '')
  const [prepTimeMax, setPrepTimeMax] = useState<string>(imported?.prepTimeMaxMinutes?.toString() ?? '')
  const [kcal, setKcal] = useState<string>(imported?.kcal?.toString() ?? '')
  const [category, setCategory] = useState<RecipeCategory | null>(imported?.category ?? null)
  const [categoryNote, setCategoryNote] = useState('')
  const [mealType, setMealType] = useState<RecipeMealType | null>(imported?.mealType ?? null)
  const [servingSizes, setServingSizes] = useState<number[]>(imported?.servingSizes ?? [2, 4])
  const [pantryStaples, setPantryStaples] = useState<string[]>(imported?.pantryStaples ?? [])
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(imported?.ingredients ?? [])
  const [steps, setSteps] = useState<RecipeStep[]>(
    imported?.steps.map((step) => ({ ...step, photoUrl: null })) ?? [],
  )
  const [note, setNote] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)
  const [pendingStepPhotos, setPendingStepPhotos] = useState<Record<number, File>>({})
  const [stepPhotoPreviews, setStepPhotoPreviews] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Welcher Bild-Picker gerade unter der Maus liegt — Strg+V ohne vorheriges
  // Klicken/Fokussieren geht sonst nicht sinnvoll auf, wenn es mehrere
  // Bild-Ziele gibt (Hauptbild + je ein Bild pro Schritt). Kein Klick nötig,
  // nur Maus drüber halten und einfügen (siehe Gespräch: Klicken öffnete
  // vorher zusätzlich ungewollt den Datei-Dialog).
  const [hoveredPhotoTarget, setHoveredPhotoTarget] = useState<'main' | number | null>(null)

  useEffect(() => {
    if (!id) return
    kochbuchService
      .listRecipes()
      .then(({ data }) => {
        const existing = data.recipes.find((r) => r.id === id)
        if (!existing) return
        setRecipe(existing)
        setTitle(existing.title)
        setSubtitle(existing.subtitle ?? '')
        setSource(existing.source ?? '')
        setTags(existing.tags)
        setAllergens(existing.allergens)
        setPrepTimeMin(existing.prepTimeMinMinutes?.toString() ?? '')
        setPrepTimeMax(existing.prepTimeMaxMinutes?.toString() ?? '')
        setKcal(existing.kcal?.toString() ?? '')
        setCategory(existing.category)
        setCategoryNote(existing.categoryNote ?? '')
        setMealType(existing.mealType)
        setServingSizes(existing.servingSizes)
        setPantryStaples(existing.pantryStaples)
        setIngredients(existing.ingredients)
        setSteps(existing.steps)
        setNote(existing.note ?? '')
        setPhotoPreview(existing.photoUrl)
      })
      .finally(() => setLoading(false))
  }, [id])

  // Personenzahlen sind optional (Wunsch: manche Rezepte, z.B. ein Kuchen,
  // werden nicht "pro Person" skaliert) — ist keine ausgewählt, braucht die
  // Zutaten-Mengen-Eingabe trotzdem eine Spalte, dafür fällt sie intern auf
  // eine einzelne implizite "Menge" zurück (servings: 1, nie als "1P"
  // auswählbar), ohne das in der UI als Personenzahl zu beschriften. Prüft
  // gezielt gegen SERVING_SIZE_OPTIONS (nicht nur "Array nicht leer"), damit
  // ein zuvor ohne Auswahl gespeichertes Rezept (servingSizes: [1] aus der
  // DB) beim erneuten Bearbeiten wieder korrekt als "keine Auswahl" erkannt
  // wird statt fälschlich als "1P ausgewählt".
  const hasExplicitServingSizes = servingSizes.some((size) => SERVING_SIZE_OPTIONS.includes(size))
  const effectiveServingSizes = hasExplicitServingSizes ? servingSizes : [1]

  const toggleServingSize = (size: number) => {
    setServingSizes((current) => {
      const next = current.includes(size)
        ? current.filter((s) => s !== size)
        : [...current, size].sort((a, b) => a - b)
      setIngredients((ing) => syncIngredientAmounts(ing, next.length > 0 ? next : [1]))
      return next
    })
  }

  const addIngredient = () => setIngredients((current) => [...current, emptyIngredient(effectiveServingSizes)])
  const removeIngredient = (index: number) => setIngredients((current) => current.filter((_, i) => i !== index))
  const updateIngredientName = (index: number, name: string) =>
    setIngredients((current) => current.map((ing, i) => (i === index ? { ...ing, name } : ing)))
  const updateIngredientAmount = (index: number, servings: number, amount: string) =>
    setIngredients((current) =>
      current.map((ing, i) =>
        i === index
          ? { ...ing, amounts: ing.amounts.map((a) => (a.servings === servings ? { ...a, amount } : a)) }
          : ing,
      ),
    )

  const addStep = () =>
    setSteps((current) => [...current, { stepNumber: current.length + 1, title: '', instructions: [], photoUrl: null }])
  const removeStep = (index: number) => {
    setSteps((current) => current.filter((_, i) => i !== index).map((step, i) => ({ ...step, stepNumber: i + 1 })))
    setPendingStepPhotos((current) => reindexAfterRemoval(current, index))
    setStepPhotoPreviews((current) => reindexAfterRemoval(current, index))
  }
  const updateStepTitle = (index: number, stepTitle: string) =>
    setSteps((current) => current.map((step, i) => (i === index ? { ...step, title: stepTitle || null } : step)))
  const updateStepInstructions = (index: number, text: string) =>
    setSteps((current) =>
      current.map((step, i) =>
        i === index ? { ...step, instructions: text.split('\n').map((line) => line.trim()).filter(Boolean) } : step,
      ),
    )

  const applyPhoto = (file: File) => {
    setPendingPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }
  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) applyPhoto(file)
  }

  const applyStepPhoto = (index: number, file: File) => {
    setPendingStepPhotos((current) => ({ ...current, [index]: file }))
    setStepPhotoPreviews((current) => ({ ...current, [index]: URL.createObjectURL(file) }))
  }
  const handleStepPhotoChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) applyStepPhoto(index, file)
  }

  // Strg+V funktioniert überall auf der Seite, sobald die Maus über einem
  // Bild-Picker steht (kein Klick/Fokus nötig) — ohne Hover fällt es auf
  // das Hauptbild zurück, damit Einfügen nie einfach folgenlos bleibt.
  useEffect(() => {
    const handleGlobalPaste = (event: globalThis.ClipboardEvent) => {
      const file = getImageFromClipboard(event)
      if (!file) return
      event.preventDefault()
      const target = hoveredPhotoTarget ?? 'main'
      if (target === 'main') applyPhoto(file)
      else applyStepPhoto(target, file)
    }
    window.addEventListener('paste', handleGlobalPaste)
    return () => window.removeEventListener('paste', handleGlobalPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredPhotoTarget])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError('Bitte einen Titel angeben.')
      return
    }
    if (!mealType) {
      setError('Bitte eine Essensart wählen.')
      return
    }

    setSaving(true)
    try {
      const input = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        source: source.trim() || null,
        tags,
        allergens,
        prepTimeMinMinutes: prepTimeMin ? Number(prepTimeMin) : null,
        prepTimeMaxMinutes: prepTimeMax ? Number(prepTimeMax) : null,
        kcal: kcal ? Number(kcal) : null,
        category,
        categoryNote: categoryNote.trim() || null,
        mealType,
        // Rezepte ohne Personen-Skalierung (z.B. ein Kuchen, der als Ganzes
        // gebacken wird) brauchen keine echte Personenzahl — ohne Auswahl
        // wird intern eine einzelne Menge pro Zutat gespeichert (siehe
        // effectiveServingSizes), damit Zutatenmengen trotzdem einen
        // Platz zum Eintragen haben.
        servingSizes: effectiveServingSizes,
        pantryStaples,
        // syncIngredientAmounts hält Mengen zu zwischenzeitlich abgewählten
        // Personenzahlen im Formular zurück (siehe dortiger Kommentar) —
        // beim Speichern werden nur die aktuell aktiven Spalten übernommen,
        // damit keine "toten" Mengen für nicht mehr gewählte Personenzahlen
        // in der DB landen.
        ingredients: ingredients
          .filter((ing) => ing.name.trim())
          .map((ing) => ({
            ...ing,
            amounts: ing.amounts.filter((a) => effectiveServingSizes.includes(a.servings)),
          })),
        steps,
        note: note.trim() || null,
      }

      const saved = isEdit && id
        ? (await kochbuchService.updateRecipe(id, input)).data.recipe
        : (await kochbuchService.createRecipe(input)).data.recipe

      if (pendingPhoto) {
        await kochbuchService.uploadRecipePhoto(saved.id, pendingPhoto)
      }
      for (const [indexStr, file] of Object.entries(pendingStepPhotos)) {
        await kochbuchService.uploadStepPhoto(saved.id, Number(indexStr), file)
      }
      navigate(`/kochbuch/rezept/${saved.id}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    if (!window.confirm(`"${title}" wirklich löschen?`)) return
    await kochbuchService.deleteRecipe(id)
    navigate('/kochbuch')
  }

  if (loading) return <p>Lädt…</p>
  if (isEdit && !recipe) return <p className="admin-empty-state">Rezept nicht gefunden.</p>

  return (
    <form onSubmit={handleSubmit} className="kochbuch-form">
      {imported && (
        <p className="kochbuch-import-banner">
          ✨ Per KI importiert — bitte alle Felder prüfen, bevor du speicherst.
          {importUsage && (
            <span className="kochbuch-import-banner__cost">
              {importUsage.inputTokens.toLocaleString('de-DE')} Input- / {importUsage.outputTokens.toLocaleString('de-DE')}{' '}
              Output-Tokens · geschätzt ${importUsage.estimatedCostUsd.toFixed(3)}
            </span>
          )}
        </p>
      )}
      <div
        className="kochbuch-photo-picker"
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

      <Input id="rezept-title" label="Titel" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input
        id="rezept-subtitle"
        label="Untertitel (optional)"
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        placeholder="z.B. dazu frischer Salat"
      />
      <Input id="rezept-source" label="Quelle (optional)" value={source} onChange={(e) => setSource(e.target.value)} />

      <div className="form-group">
        <span className="form-label">Essensart *</span>
        <div className="farsi-filters__chips">
          {RECIPE_MEAL_TYPES.map((option) => (
            <button
              key={option}
              type="button"
              className={`tool-chip ${mealType === option ? 'is-active' : ''}`.trim()}
              onClick={() => setMealType((current) => (current === option ? null : option))}
            >
              {MEAL_TYPE_META[option].icon} {MEAL_TYPE_META[option].label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <span className="form-label">Tags</span>
        <TagInput value={tags} onChange={setTags} placeholder="z.B. Vegetarisch, Viel Gemüse" />
      </div>

      <div className="form-group">
        <span className="form-label">Kategorie (optional)</span>
        <div className="farsi-filters__chips">
          {RECIPE_CATEGORIES.map((option) => (
            <button
              key={option}
              type="button"
              className={`tool-chip ${category === option ? 'is-active' : ''}`.trim()}
              onClick={() => setCategory((current) => (current === option ? null : option))}
            >
              {CATEGORY_META[option].icon} {CATEGORY_META[option].label}
            </button>
          ))}
        </div>
        <input
          type="text"
          className="input"
          placeholder='Hinweis/Alternative, z.B. "geht auch vegetarisch, wenn man Hähnchen durch Tofu ersetzt"'
          value={categoryNote}
          onChange={(e) => setCategoryNote(e.target.value)}
        />
      </div>

      <div className="kochbuch-form__row">
        <Input
          id="rezept-time-min"
          type="number"
          label="Zeit von (Min.)"
          value={prepTimeMin}
          onChange={(e) => setPrepTimeMin(e.target.value)}
        />
        <Input
          id="rezept-time-max"
          type="number"
          label="Zeit bis (Min.)"
          value={prepTimeMax}
          onChange={(e) => setPrepTimeMax(e.target.value)}
        />
        <Input id="rezept-kcal" type="number" label="kcal" value={kcal} onChange={(e) => setKcal(e.target.value)} />
      </div>

      <div className="form-group">
        <span className="form-label">Personenzahlen (optional)</span>
        <div className="farsi-filters">
          {SERVING_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              className={`tool-chip ${servingSizes.includes(size) ? 'is-active' : ''}`.trim()}
              onClick={() => toggleServingSize(size)}
            >
              {size}P
            </button>
          ))}
        </div>
        <p className="form-hint">
          Nichts auswählen bei Rezepten ohne Portionsskalierung (z.B. ein Kuchen) — Zutaten bekommen dann eine
          einzelne Menge statt einer Menge pro Personenzahl.
        </p>
      </div>

      <div className="form-group">
        <span className="form-label">Allergene (optional)</span>
        <TagInput value={allergens} onChange={setAllergens} placeholder="z.B. Milch, Sellerie" />
      </div>

      <div className="form-group">
        <span className="form-label">Basiszutaten aus eigener Küche (optional)</span>
        <TagInput value={pantryStaples} onChange={setPantryStaples} placeholder="z.B. Salz, Olivenöl, Pfeffer" />
      </div>

      <div className="form-group">
        <span className="form-label">Zutaten</span>
        <div className="kochbuch-ingredient-list">
          {ingredients.map((ingredient, index) => (
            <div
              key={index}
              className={`kochbuch-ingredient-row ${effectiveServingSizes.length <= 1 ? 'kochbuch-ingredient-row--single-amount' : ''}`.trim()}
            >
              <input
                type="text"
                className="input"
                placeholder="Zutat"
                value={ingredient.name}
                onChange={(e) => updateIngredientName(index, e.target.value)}
              />
              {effectiveServingSizes.map((size) => (
                <input
                  key={size}
                  type="text"
                  className="input kochbuch-ingredient-row__amount"
                  placeholder={hasExplicitServingSizes ? `${size}P` : 'Menge'}
                  value={ingredient.amounts.find((a) => a.servings === size)?.amount ?? ''}
                  onChange={(e) => updateIngredientAmount(index, size, e.target.value)}
                />
              ))}
              <button
                type="button"
                className="erinnerungen-lead-row__remove"
                onClick={() => removeIngredient(index)}
                aria-label="Zutat entfernen"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="erinnerungen-time-add" onClick={addIngredient}>
          + Zutat hinzufügen
        </button>
      </div>

      <div className="form-group">
        <span className="form-label">Zubereitungsschritte</span>
        <div className="kochbuch-step-list">
          {steps.map((step, index) => (
            <Card key={index} className="kochbuch-step-edit">
              <div className="kochbuch-step-edit__header">
                <span className="kochbuch-step-edit__number">{step.stepNumber}</span>
                <input
                  type="text"
                  className="input"
                  placeholder="Überschrift (optional)"
                  value={step.title ?? ''}
                  onChange={(e) => updateStepTitle(index, e.target.value)}
                />
                <button
                  type="button"
                  className="erinnerungen-lead-row__remove"
                  onClick={() => removeStep(index)}
                  aria-label="Schritt entfernen"
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
                  {stepPhotoPreviews[index] ?? step.photoUrl ? (
                    <img src={stepPhotoPreviews[index] ?? step.photoUrl ?? undefined} alt="" />
                  ) : (
                    <span>📷</span>
                  )}
                  <input type="file" accept="image/*" hidden onChange={(e) => handleStepPhotoChange(index, e)} />
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Ein Satz pro Zeile"
                  value={step.instructions.join('\n')}
                  onChange={(e) => updateStepInstructions(index, e.target.value)}
                />
              </div>
            </Card>
          ))}
        </div>
        <button type="button" className="erinnerungen-time-add" onClick={addStep}>
          + Schritt hinzufügen
        </button>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="rezept-note">
          Notiz (optional)
        </label>
        <textarea id="rezept-note" className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="farsi-modal__actions">
        {isEdit && (
          <button type="button" className="farsi-modal__delete" onClick={handleDelete}>
            Löschen
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
