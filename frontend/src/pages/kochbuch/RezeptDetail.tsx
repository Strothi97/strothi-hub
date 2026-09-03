import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Button } from '@components/ui/Button'
import { kochbuchService } from '@services/kochbuch.service'
import { useAuth } from '@context/AuthContext'
import { formatTime, slugify } from './format'
import { StarRating } from './StarRating'
import { RatingStars } from './RatingStars'
import type { Recipe } from '@app-types/kochbuch'

export function RezeptDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeServings, setActiveServings] = useState<number | null>(null)
  const [transferBusy, setTransferBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = () =>
    kochbuchService.listRecipes().then(({ data }) => {
      const found = data.recipes.find((r) => r.id === id) ?? null
      setRecipe(found)
      setActiveServings((current) => current ?? found?.servingSizes[0] ?? null)
    })

  useEffect(() => {
    if (!id) return
    load().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const myRating = recipe?.ratings.find((r) => r.userId === user?.id)?.value ?? null

  const handleRate = async (value: number | null) => {
    if (!recipe) return
    const { data } = await kochbuchService.rateRecipe(recipe.id, value)
    setRecipe(data.recipe)
  }

  // Download- und Kopieren-Button: beide holen dasselbe Export-JSON dieses
  // einen Rezepts (inkl. Foto als Base64) vom Backend — Download löst einen
  // Datei-Download aus, Kopieren legt denselben Text in die Zwischenablage.
  // Gegenstück ist das Einfüge-Feld auf der Import-Seite (TransferPanel.tsx),
  // das exakt dieses Format per Strg+V erwartet.
  const handleDownload = async () => {
    if (!recipe || transferBusy) return
    setTransferBusy(true)
    try {
      const { data } = await kochbuchService.exportRecipe(recipe.id)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${slugify(recipe.title)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } finally {
      setTransferBusy(false)
    }
  }

  const handleCopy = async () => {
    if (!recipe || transferBusy) return
    setTransferBusy(true)
    try {
      const { data } = await kochbuchService.exportRecipe(recipe.id)
      await navigator.clipboard.writeText(JSON.stringify(data))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } finally {
      setTransferBusy(false)
    }
  }

  if (loading) return <p>Lädt…</p>
  if (!recipe) return <p className="admin-empty-state">Rezept nicht gefunden.</p>

  return (
    <div className="kochbuch-detail">
      <div className="kochbuch-detail__header">
        <Link to="/kochbuch" className="kochbuch-detail__back">
          ← Zurück
        </Link>
        <div className="kochbuch-detail__header-actions">
          <Button variant="secondary" onClick={() => navigate(`/kochbuch/rezept/${recipe.id}/bearbeiten`)}>
            Bearbeiten
          </Button>
          <Button variant="secondary" onClick={handleDownload} disabled={transferBusy} title="Als Datei herunterladen">
            ⬇️ Herunterladen
          </Button>
          <Button
            variant="secondary"
            onClick={handleCopy}
            disabled={transferBusy}
            title="In Zwischenablage kopieren — zum Einfügen in einem anderen Kochbuch"
          >
            {copied ? '✅ Kopiert' : '📋 Kopieren'}
          </Button>
          <Button onClick={() => navigate(`/kochbuch/rezept/${recipe.id}/kochen`)}>▶️ Kochen starten</Button>
        </div>
      </div>

      {recipe.photoUrl && (
        <div className="kochbuch-detail__photo">
          <img src={recipe.photoUrl} alt={recipe.title} />
        </div>
      )}

      <h2 className="kochbuch-detail__title">{recipe.title}</h2>
      {recipe.subtitle && <p className="kochbuch-detail__subtitle">{recipe.subtitle}</p>}

      <div className="kochbuch-detail__rating-row">
        {recipe.averageRating !== null && (
          <span className="kochbuch-detail__average-rating">
            <StarRating value={recipe.averageRating} /> ({recipe.ratings.length}{' '}
            Bewertung{recipe.ratings.length > 1 ? 'en' : ''})
          </span>
        )}
        <span className="kochbuch-detail__my-rating">
          <span className="form-label">Deine Bewertung:</span>
          <RatingStars value={myRating} onChange={handleRate} />
        </span>
      </div>

      <p className="kochbuch-detail__meta">
        {[
          formatTime(recipe.prepTimeMinMinutes, recipe.prepTimeMaxMinutes),
          recipe.kcal ? `${recipe.kcal} kcal` : null,
          recipe.source,
          recipe.addedBy ? `hinzugefügt von ${recipe.addedBy}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>

      {recipe.tags.length > 0 && (
        <div className="kochbuch-detail__tags">
          {recipe.tags.map((tag) => (
            <span key={tag} className="tool-card__badge">
              {tag}
            </span>
          ))}
        </div>
      )}

      {recipe.allergens.length > 0 && (
        <p className="kochbuch-detail__allergens">⚠️ Enthält: {recipe.allergens.join(', ')}</p>
      )}

      <section className="kochbuch-detail__section">
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
      </section>

      <section className="kochbuch-detail__section">
        <h3>Zubereitung</h3>
        <ol className="kochbuch-step-view-list">
          {recipe.steps.map((step) => (
            <li key={step.stepNumber}>
              {step.title && <span className="kochbuch-step-view-list__title">{step.title}</span>}
              {step.photoUrl && (
                <img src={step.photoUrl} alt="" className="kochbuch-step-view-list__photo" />
              )}
              <ul>
                {step.instructions.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      {recipe.note && (
        <section className="kochbuch-detail__section">
          <h3>Notiz</h3>
          <p>{recipe.note}</p>
        </section>
      )}
    </div>
  )
}
