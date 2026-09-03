import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { kochbuchService } from '@services/kochbuch.service'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { formatTime } from './format'
import { StarRating } from './StarRating'
import { WasKocheIchModal } from './WasKocheIchModal'
import type { Recipe } from '@app-types/kochbuch'

export function Rezepte() {
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Persönliches Kochbuch bleibt klein genug für Bulk-Laden + clientseitige
  // Suche/Filter (gleiches Muster wie Woerterbuch.tsx).
  const load = () =>
    Promise.all([kochbuchService.listRecipes(), kochbuchService.listTags()])
      .then(([recipesRes, tagsRes]) => {
        setRecipes(recipesRes.data.recipes)
        setAllTags(tagsRes.data.tags)
      })
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const toggleTag = (tag: string) =>
    setTagFilter((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]))

  const filteredRecipes = useMemo(() => {
    let result = recipes
    if (tagFilter.length > 0) {
      result = result.filter((recipe) => tagFilter.every((tag) => recipe.tags.includes(tag)))
    }
    const needle = search.trim().toLowerCase()
    if (needle) {
      result = result.filter((recipe) =>
        [recipe.title, recipe.subtitle ?? '', ...recipe.tags].join(' ').toLowerCase().includes(needle),
      )
    }
    return result
  }, [recipes, tagFilter, search])

  return (
    <div>
      <div className="farsi-toolbar">
        <Input
          id="kochbuch-search"
          placeholder="Rezept suchen…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="farsi-search-input"
        />
        <Button variant="secondary" onClick={() => setPickerOpen(true)} disabled={recipes.length === 0}>
          🎲 Was koche ich heute?
        </Button>
        <Button onClick={() => navigate('/kochbuch/neu')}>+ Neues Rezept</Button>
      </div>

      {allTags.length > 0 && (
        <div className="farsi-filters">
          <div className="farsi-filters__chips farsi-filters__chips--desktop">
            <button
              type="button"
              className={`tool-chip ${tagFilter.length === 0 ? 'is-active' : ''}`.trim()}
              onClick={() => setTagFilter([])}
            >
              Alle
            </button>
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
          <button type="button" className="farsi-filters__trigger" onClick={() => setTagPickerOpen(true)}>
            Tags{tagFilter.length > 0 ? ` (${tagFilter.length})` : ''} ▾
          </button>
        </div>
      )}

      {loading ? (
        <p>Lädt…</p>
      ) : filteredRecipes.length === 0 ? (
        <p className="admin-empty-state">
          {recipes.length === 0 ? 'Noch keine Rezepte angelegt.' : 'Keine Rezepte gefunden.'}
        </p>
      ) : (
        <div className="kochbuch-grid">
          {filteredRecipes.map((recipe) => (
            <Card
              key={recipe.id}
              className="kochbuch-recipe-card"
              onClick={() => navigate(`/kochbuch/rezept/${recipe.id}`)}
            >
              <div className="kochbuch-recipe-card__photo">
                {recipe.photoUrl ? (
                  <img src={recipe.photoUrl} alt="" />
                ) : (
                  <span className="kochbuch-recipe-card__photo-placeholder">🍽️</span>
                )}
              </div>
              <div className="kochbuch-recipe-card__body">
                <span className="kochbuch-recipe-card__title">{recipe.title}</span>
                {recipe.subtitle && <span className="kochbuch-recipe-card__subtitle">{recipe.subtitle}</span>}
                <StarRating value={recipe.averageRating} />
                <span className="kochbuch-recipe-card__meta">
                  {[formatTime(recipe.prepTimeMinMinutes, recipe.prepTimeMaxMinutes), recipe.kcal ? `${recipe.kcal} kcal` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {recipe.tags.length > 0 && (
                  <div className="kochbuch-recipe-card__tags">
                    {recipe.tags.map((tag) => (
                      <span key={tag} className="tool-card__badge">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tagPickerOpen && (
        <div className="farsi-modal-backdrop" onClick={() => setTagPickerOpen(false)}>
          <div
            className="farsi-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Tags auswählen"
          >
            <span className="farsi-modal__handle" aria-hidden="true" />
            <div className="farsi-filters__list-header">
              <span className="farsi-filters__list-title">Tags</span>
              <button
                type="button"
                className="farsi-filters__list-reset"
                onClick={() => setTagFilter([])}
                disabled={tagFilter.length === 0}
              >
                Zurücksetzen
              </button>
            </div>
            <div className="farsi-filters__list-body">
              {allTags.map((tag) => (
                <label key={tag} className="farsi-filters__list-item">
                  <input type="checkbox" checked={tagFilter.includes(tag)} onChange={() => toggleTag(tag)} />
                  <span>{tag}</span>
                </label>
              ))}
            </div>
            <Button style={{ width: '100%', marginTop: 'var(--space-3)' }} onClick={() => setTagPickerOpen(false)}>
              Fertig
            </Button>
          </div>
        </div>
      )}

      {pickerOpen && (
        <WasKocheIchModal recipes={recipes} allTags={allTags} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  )
}
