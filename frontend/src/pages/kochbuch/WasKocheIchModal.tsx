import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@components/ui/Button'
import { formatTime } from './format'
import { StarRating } from './StarRating'
import type { Recipe } from '@app-types/kochbuch'

interface WasKocheIchModalProps {
  recipes: Recipe[]
  allTags: string[]
  onClose: () => void
}

const TIME_OPTIONS = [
  { label: 'egal', value: null },
  { label: '≤ 20 Min', value: 20 },
  { label: '≤ 30 Min', value: 30 },
  { label: '≤ 45 Min', value: 45 },
]

const RATING_OPTIONS = [
  { label: 'egal', value: null },
  { label: '≥ 3 ★', value: 3 },
  { label: '≥ 4 ★', value: 4 },
]

// Effektive Zeit eines Rezepts fürs Filtern: die obere Grenze, falls
// angegeben, sonst die untere — konservativ (nimmt den längeren Wert).
function effectiveTime(recipe: Recipe): number | null {
  return recipe.prepTimeMaxMinutes ?? recipe.prepTimeMinMinutes
}

export function WasKocheIchModal({ recipes, allTags, onClose }: WasKocheIchModalProps) {
  const [maxTime, setMaxTime] = useState<number | null>(null)
  const [minRating, setMinRating] = useState<number | null>(null)
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [suggestion, setSuggestion] = useState<Recipe | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const pool = useMemo(() => {
    return recipes.filter((recipe) => {
      if (maxTime !== null) {
        const time = effectiveTime(recipe)
        if (time === null || time > maxTime) return false
      }
      if (minRating !== null && (recipe.averageRating === null || recipe.averageRating < minRating)) return false
      if (tagFilter.length > 0 && !tagFilter.every((tag) => recipe.tags.includes(tag))) return false
      return true
    })
  }, [recipes, maxTime, minRating, tagFilter])

  // Bei Filteränderung verliert ein Vorschlag, der nicht mehr zum Pool
  // passt, seine Gültigkeit — sonst zeigt die UI einen Vorschlag, der die
  // gerade gewählten Kriterien gar nicht erfüllt.
  useEffect(() => {
    if (suggestion && !pool.some((r) => r.id === suggestion.id)) setSuggestion(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool])

  const toggleTag = (tag: string) =>
    setTagFilter((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]))

  const draw = () => {
    if (pool.length === 0) return
    // Bei mehr als einem Treffer nicht denselben Vorschlag zweimal
    // hintereinander würfeln.
    const candidates = pool.length > 1 && suggestion ? pool.filter((r) => r.id !== suggestion.id) : pool
    setSuggestion(candidates[Math.floor(Math.random() * candidates.length)])
  }

  return (
    <div className="farsi-modal-backdrop" onClick={onClose}>
      <div
        className="farsi-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Was koche ich heute?"
      >
        <span className="farsi-modal__handle" aria-hidden="true" />
        <h3>🎲 Was koche ich heute?</h3>

        <div className="form-group">
          <span className="form-label">Zeit</span>
          <div className="farsi-filters__chips">
            {TIME_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                className={`tool-chip ${maxTime === option.value ? 'is-active' : ''}`.trim()}
                onClick={() => setMaxTime(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <span className="form-label">Bewertung</span>
          <div className="farsi-filters__chips">
            {RATING_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                className={`tool-chip ${minRating === option.value ? 'is-active' : ''}`.trim()}
                onClick={() => setMinRating(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="form-group">
            <span className="form-label">Tags</span>
            <div className="farsi-filters__chips">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tool-chip ${tagFilter.includes(tag) ? 'is-active' : ''}`.trim()}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="form-hint">{pool.length} passende Rezept{pool.length === 1 ? '' : 'e'}</p>

        {suggestion ? (
          <div className="kochbuch-suggestion">
            {suggestion.photoUrl && (
              <div className="kochbuch-suggestion__photo">
                <img src={suggestion.photoUrl} alt="" />
              </div>
            )}
            <span className="kochbuch-suggestion__title">{suggestion.title}</span>
            <StarRating value={suggestion.averageRating} />
            <span className="kochbuch-suggestion__meta">
              {[formatTime(suggestion.prepTimeMinMinutes, suggestion.prepTimeMaxMinutes), suggestion.kcal ? `${suggestion.kcal} kcal` : null]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
        ) : (
          <p className="admin-empty-state">
            {pool.length === 0 ? 'Keine Rezepte passen zu diesen Kriterien.' : 'Klick auf "Würfeln", um ein Rezept vorzuschlagen.'}
          </p>
        )}

        <div className="farsi-modal__actions">
          <div className="farsi-modal__actions-right" style={{ width: '100%' }}>
            <Button type="button" variant="secondary" onClick={draw} disabled={pool.length === 0}>
              🎲 {suggestion ? 'Nochmal würfeln' : 'Würfeln'}
            </Button>
            {suggestion && (
              <Button type="button" onClick={() => navigate(`/kochbuch/rezept/${suggestion.id}`)}>
                Ansehen
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
