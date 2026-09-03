import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { kochbuchService } from '@services/kochbuch.service'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import {
  CATEGORY_META,
  formatTime,
  getCompleteness,
  MEAL_TYPE_META,
  ratingBucket,
  RECIPE_CATEGORIES,
  RECIPE_MEAL_TYPES,
  RECIPE_RATING_BUCKETS,
  searchHaystack,
} from './format'
import { StarRating } from './StarRating'
import { WasKocheIchModal } from './WasKocheIchModal'
import type { Recipe, RecipeCategory, RecipeMealType } from '@app-types/kochbuch'

export function Rezepte() {
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  // Mehrfachauswahl (Wunsch), anders als das Feld am Rezept selbst (das
  // bleibt ein Einzelwert) — ein Rezept passt, wenn seine Kategorie/
  // Essensart IRGENDEINER der ausgewählten entspricht (ODER-Verknüpfung;
  // anders als beim Tag-Filter, der UND-verknüpft, weil ein Rezept mehrere
  // Tags gleichzeitig haben kann, aber immer nur eine Kategorie/Essensart).
  const [categoryFilter, setCategoryFilter] = useState<RecipeCategory[]>([])
  const [mealTypeFilter, setMealTypeFilter] = useState<RecipeMealType[]>([])
  // Bucket aus dem gerundeten Durchschnitt (siehe ratingBucket in format.ts)
  // — ebenfalls Mehrfachauswahl/ODER-verknüpft.
  const [ratingFilter, setRatingFilter] = useState<number[]>([])
  const [incompleteOnly, setIncompleteOnly] = useState(false)
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const [mealTypePickerOpen, setMealTypePickerOpen] = useState(false)
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false)
  const [ratingPickerOpen, setRatingPickerOpen] = useState(false)
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
  const toggleCategoryFilter = (option: RecipeCategory) =>
    setCategoryFilter((current) => (current.includes(option) ? current.filter((c) => c !== option) : [...current, option]))
  const toggleMealTypeFilter = (option: RecipeMealType) =>
    setMealTypeFilter((current) => (current.includes(option) ? current.filter((m) => m !== option) : [...current, option]))
  const toggleRatingFilter = (option: number) =>
    setRatingFilter((current) => (current.includes(option) ? current.filter((r) => r !== option) : [...current, option]))

  // "Unfertig" = fehlt Kategorie und/oder Hauptbild (siehe getCompleteness
  // in format.ts) — Wunsch: solche Rezepte schnell finden können, um sie zu
  // vervollständigen.
  const incompleteCount = useMemo(
    () => recipes.filter((recipe) => !getCompleteness(recipe).isComplete).length,
    [recipes],
  )

  const filteredRecipes = useMemo(() => {
    let result = recipes
    if (tagFilter.length > 0) {
      result = result.filter((recipe) => tagFilter.every((tag) => recipe.tags.includes(tag)))
    }
    if (categoryFilter.length > 0) {
      result = result.filter((recipe) => recipe.category !== null && categoryFilter.includes(recipe.category))
    }
    if (mealTypeFilter.length > 0) {
      result = result.filter((recipe) => recipe.mealType !== null && mealTypeFilter.includes(recipe.mealType))
    }
    if (ratingFilter.length > 0) {
      result = result.filter((recipe) => {
        const bucket = ratingBucket(recipe.averageRating)
        return bucket !== null && ratingFilter.includes(bucket)
      })
    }
    if (incompleteOnly) {
      result = result.filter((recipe) => !getCompleteness(recipe).isComplete)
    }
    const needle = search.trim().toLowerCase()
    if (needle) {
      result = result.filter((recipe) => searchHaystack(recipe).includes(needle))
    }
    return result
  }, [recipes, tagFilter, categoryFilter, mealTypeFilter, ratingFilter, incompleteOnly, search])

  return (
    <div>
      <div className="farsi-toolbar">
        <Input
          id="kochbuch-search"
          placeholder="Suche, z.B. Titel oder Zutat…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="farsi-search-input"
        />
        <Button variant="secondary" onClick={() => setPickerOpen(true)} disabled={recipes.length === 0}>
          🎲 Was koche ich heute?
        </Button>
        <Button onClick={() => navigate('/kochbuch/neu')}>+ Neues Rezept</Button>
      </div>

      {/* Wie der Tag-Filter unten: auf dem Handy als kompakter Auslöse-Knopf
          statt einer vollen Chip-Zeile — drei/vier volle Zeilen (Essensart,
          Kategorie, Unfertig, Tags) übereinander wurden auf dem Handy zu
          überfüllt (Feedback). kochbuch-filter-bar fasst die einzelnen
          Auslöse-Knöpfe auf dem Handy zusätzlich zu einer gemeinsamen,
          umbrechenden Zeile zusammen statt jeden in seinem eigenen vollen
          Block untereinander zu zeigen (siehe kochbuch.css). */}
      <div className="kochbuch-filter-bar">
        <div className="farsi-filters">
          <div className="farsi-filters__chips farsi-filters__chips--desktop">
            <button
              type="button"
              className={`tool-chip ${mealTypeFilter.length === 0 ? 'is-active' : ''}`.trim()}
              onClick={() => setMealTypeFilter([])}
            >
              Alle
            </button>
            {RECIPE_MEAL_TYPES.map((option) => (
              <button
                key={option}
                type="button"
                className={`tool-chip ${mealTypeFilter.includes(option) ? 'is-active' : ''}`.trim()}
                onClick={() => toggleMealTypeFilter(option)}
              >
                {MEAL_TYPE_META[option].icon} {MEAL_TYPE_META[option].label}
              </button>
            ))}
          </div>
          <button type="button" className="farsi-filters__trigger" onClick={() => setMealTypePickerOpen(true)}>
            Essensart{mealTypeFilter.length > 0 ? ` (${mealTypeFilter.length})` : ''} ▾
          </button>
        </div>

        <div className="farsi-filters">
          <div className="farsi-filters__chips farsi-filters__chips--desktop">
            <button
              type="button"
              className={`tool-chip ${categoryFilter.length === 0 ? 'is-active' : ''}`.trim()}
              onClick={() => setCategoryFilter([])}
            >
              Alle
            </button>
            {RECIPE_CATEGORIES.map((option) => (
              <button
                key={option}
                type="button"
                className={`tool-chip ${categoryFilter.includes(option) ? 'is-active' : ''}`.trim()}
                onClick={() => toggleCategoryFilter(option)}
              >
                {CATEGORY_META[option].icon} {CATEGORY_META[option].label}
              </button>
            ))}
          </div>
          <button type="button" className="farsi-filters__trigger" onClick={() => setCategoryPickerOpen(true)}>
            Kategorie{categoryFilter.length > 0 ? ` (${categoryFilter.length})` : ''} ▾
          </button>
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

        <div className="farsi-filters">
          <div className="farsi-filters__chips farsi-filters__chips--desktop">
            <button
              type="button"
              className={`tool-chip ${ratingFilter.length === 0 ? 'is-active' : ''}`.trim()}
              onClick={() => setRatingFilter([])}
            >
              Alle
            </button>
            {RECIPE_RATING_BUCKETS.map((option) => (
              <button
                key={option}
                type="button"
                className={`tool-chip ${ratingFilter.includes(option) ? 'is-active' : ''}`.trim()}
                onClick={() => toggleRatingFilter(option)}
              >
                {option}★
              </button>
            ))}
          </div>
          <button type="button" className="farsi-filters__trigger" onClick={() => setRatingPickerOpen(true)}>
            Sterne{ratingFilter.length > 0 ? ` (${ratingFilter.length})` : ''} ▾
          </button>
        </div>

        {/* Eigenständiger Schnellzugriff statt Teil einer der Listen — auf
            dem Handy genauso wichtig wie auf dem Desktop, daher kein
            Popover, sondern immer als ein einzelner Knopf sichtbar. */}
        {incompleteCount > 0 && (
          <div className="kochbuch-category-filter">
            <button
              type="button"
              className={`tool-chip kochbuch-incomplete-chip ${incompleteOnly ? 'is-active' : ''}`.trim()}
              onClick={() => setIncompleteOnly((current) => !current)}
            >
              ⚠️ ({incompleteCount})
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p>Lädt…</p>
      ) : filteredRecipes.length === 0 ? (
        <p className="admin-empty-state">
          {recipes.length === 0 ? 'Noch keine Rezepte angelegt.' : 'Keine Rezepte gefunden.'}
        </p>
      ) : (
        <div className="kochbuch-grid">
          {filteredRecipes.map((recipe) => {
            const completeness = getCompleteness(recipe)
            return (
              <Card
                key={recipe.id}
                className="kochbuch-recipe-card"
                onClick={() => navigate(`/kochbuch/rezept/${recipe.id}`)}
              >
                {!completeness.isComplete && (
                  <span
                    className="kochbuch-recipe-card__incomplete"
                    title={`Fehlt noch: ${completeness.missing.join(', ')}`}
                  >
                    ⚠️ Unfertig
                  </span>
                )}
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
                    {[
                      formatTime(recipe.prepTimeMinMinutes, recipe.prepTimeMaxMinutes),
                      recipe.kcal ? `${recipe.kcal} kcal` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {(recipe.mealType || recipe.category || recipe.tags.length > 0) && (
                    <div className="kochbuch-recipe-card__tags">
                      {recipe.mealType && (
                        <span className="tool-card__badge kochbuch-detail__category-badge">
                          {MEAL_TYPE_META[recipe.mealType].icon} {MEAL_TYPE_META[recipe.mealType].label}
                        </span>
                      )}
                      {recipe.category && (
                        <span className="tool-card__badge kochbuch-detail__category-badge">
                          {CATEGORY_META[recipe.category].icon} {CATEGORY_META[recipe.category].label}
                        </span>
                      )}
                      {recipe.tags.map((tag) => (
                        <span key={tag} className="tool-card__badge">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
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

      {mealTypePickerOpen && (
        <div className="farsi-modal-backdrop" onClick={() => setMealTypePickerOpen(false)}>
          <div
            className="farsi-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Essensart auswählen"
          >
            <span className="farsi-modal__handle" aria-hidden="true" />
            <div className="farsi-filters__list-header">
              <span className="farsi-filters__list-title">Essensart</span>
              <button
                type="button"
                className="farsi-filters__list-reset"
                onClick={() => setMealTypeFilter([])}
                disabled={mealTypeFilter.length === 0}
              >
                Zurücksetzen
              </button>
            </div>
            <div className="farsi-filters__list-body">
              {RECIPE_MEAL_TYPES.map((option) => (
                <label key={option} className="farsi-filters__list-item">
                  <input
                    type="checkbox"
                    checked={mealTypeFilter.includes(option)}
                    onChange={() => toggleMealTypeFilter(option)}
                  />
                  <span>
                    {MEAL_TYPE_META[option].icon} {MEAL_TYPE_META[option].label}
                  </span>
                </label>
              ))}
            </div>
            <Button style={{ width: '100%', marginTop: 'var(--space-3)' }} onClick={() => setMealTypePickerOpen(false)}>
              Fertig
            </Button>
          </div>
        </div>
      )}

      {categoryPickerOpen && (
        <div className="farsi-modal-backdrop" onClick={() => setCategoryPickerOpen(false)}>
          <div
            className="farsi-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Kategorie auswählen"
          >
            <span className="farsi-modal__handle" aria-hidden="true" />
            <div className="farsi-filters__list-header">
              <span className="farsi-filters__list-title">Kategorie</span>
              <button
                type="button"
                className="farsi-filters__list-reset"
                onClick={() => setCategoryFilter([])}
                disabled={categoryFilter.length === 0}
              >
                Zurücksetzen
              </button>
            </div>
            <div className="farsi-filters__list-body">
              {RECIPE_CATEGORIES.map((option) => (
                <label key={option} className="farsi-filters__list-item">
                  <input
                    type="checkbox"
                    checked={categoryFilter.includes(option)}
                    onChange={() => toggleCategoryFilter(option)}
                  />
                  <span>
                    {CATEGORY_META[option].icon} {CATEGORY_META[option].label}
                  </span>
                </label>
              ))}
            </div>
            <Button style={{ width: '100%', marginTop: 'var(--space-3)' }} onClick={() => setCategoryPickerOpen(false)}>
              Fertig
            </Button>
          </div>
        </div>
      )}

      {ratingPickerOpen && (
        <div className="farsi-modal-backdrop" onClick={() => setRatingPickerOpen(false)}>
          <div
            className="farsi-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Sterne auswählen"
          >
            <span className="farsi-modal__handle" aria-hidden="true" />
            <div className="farsi-filters__list-header">
              <span className="farsi-filters__list-title">Sterne</span>
              <button
                type="button"
                className="farsi-filters__list-reset"
                onClick={() => setRatingFilter([])}
                disabled={ratingFilter.length === 0}
              >
                Zurücksetzen
              </button>
            </div>
            <div className="farsi-filters__list-body">
              {RECIPE_RATING_BUCKETS.map((option) => (
                <label key={option} className="farsi-filters__list-item">
                  <input
                    type="checkbox"
                    checked={ratingFilter.includes(option)}
                    onChange={() => toggleRatingFilter(option)}
                  />
                  <span>{option}★</span>
                </label>
              ))}
            </div>
            <Button style={{ width: '100%', marginTop: 'var(--space-3)' }} onClick={() => setRatingPickerOpen(false)}>
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
