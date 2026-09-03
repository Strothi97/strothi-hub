import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@components/ui/Button'
import { kochbuchService } from '@services/kochbuch.service'
import type { Recipe } from '@app-types/kochbuch'

export function Kochen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [stepIndex, setStepIndex] = useState(0)
  const [ingredientsOpen, setIngredientsOpen] = useState(false)
  const [activeServings, setActiveServings] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    kochbuchService
      .listRecipes()
      .then(({ data }) => {
        const found = data.recipes.find((r) => r.id === id) ?? null
        setRecipe(found)
        setActiveServings(found?.servingSizes[0] ?? null)
      })
      .finally(() => setLoading(false))
  }, [id])

  // Schnelles Vor-/Zurückblättern per Pfeiltasten, zusätzlich zu den Buttons.
  useEffect(() => {
    if (!recipe) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setStepIndex((i) => Math.min(i + 1, recipe.steps.length - 1))
      if (event.key === 'ArrowLeft') setStepIndex((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [recipe])

  if (loading) return <p>Lädt…</p>
  if (!recipe) return <p className="admin-empty-state">Rezept nicht gefunden.</p>
  if (recipe.steps.length === 0) {
    return <p className="admin-empty-state">Für dieses Rezept sind noch keine Schritte hinterlegt.</p>
  }

  const step = recipe.steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === recipe.steps.length - 1

  return (
    <div className="kochbuch-kochen">
      <div className="kochbuch-kochen__header">
        <button type="button" className="farsi-study-cancel" onClick={() => navigate(`/kochbuch/rezept/${recipe.id}`)}>
          Beenden
        </button>
        <p className="farsi-study-progress">
          Schritt {stepIndex + 1} / {recipe.steps.length}
        </p>
        <button type="button" className="kochbuch-kochen__ingredients-btn" onClick={() => setIngredientsOpen(true)}>
          🥕 Zutaten
        </button>
      </div>

      {/* Eigenes Foto des Schritts hat Vorrang, sonst das Titelbild als
          allgemeine Referenz (siehe RezeptForm — Fotos sind pro Schritt optional). */}
      {(step.photoUrl ?? recipe.photoUrl) && (
        <div className="kochbuch-kochen__photo">
          <img src={step.photoUrl ?? recipe.photoUrl ?? undefined} alt={recipe.title} />
        </div>
      )}

      <div className="kochbuch-kochen__step">
        <span className="kochbuch-kochen__step-number">{step.stepNumber}</span>
        {step.title && <h2>{step.title}</h2>}
        <ul>
          {step.instructions.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="kochbuch-kochen__nav">
        <Button variant="secondary" onClick={() => setStepIndex((i) => i - 1)} disabled={isFirst}>
          ← Zurück
        </Button>
        {isLast ? (
          <Button onClick={() => navigate(`/kochbuch/rezept/${recipe.id}`)}>Fertig 🎉</Button>
        ) : (
          <Button onClick={() => setStepIndex((i) => i + 1)}>Weiter →</Button>
        )}
      </div>

      {ingredientsOpen && (
        <div className="farsi-modal-backdrop" onClick={() => setIngredientsOpen(false)}>
          <div
            className="farsi-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Zutaten"
          >
            <span className="farsi-modal__handle" aria-hidden="true" />
            <div className="kochbuch-detail__section-header">
              <h3>Zutaten</h3>
              {recipe.servingSizes.length > 1 && (
                <div className="farsi-filters__chips">
                  {recipe.servingSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`tool-chip ${activeServings === size ? 'is-active' : ''}`.trim()}
                      onClick={() => setActiveServings(size)}
                    >
                      {size}P
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ul className="kochbuch-ingredient-view-list">
              {recipe.ingredients.map((ingredient, index) => {
                const amount = ingredient.amounts.find((a) => a.servings === activeServings)?.amount
                return (
                  <li key={index}>
                    <span>{ingredient.name}</span>
                    {amount && <span className="kochbuch-ingredient-view-list__amount">{amount}</span>}
                  </li>
                )
              })}
            </ul>
            {recipe.pantryStaples.length > 0 && (
              <p className="kochbuch-detail__pantry">Aus eigener Küche: {recipe.pantryStaples.join(', ')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
