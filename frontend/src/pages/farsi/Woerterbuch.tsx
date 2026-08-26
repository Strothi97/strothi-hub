import { useEffect, useMemo, useState } from 'react'
import { farsiService } from '@services/farsi.service'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { FarsiEntryModal } from './FarsiEntryModal'
import { ALPHABETICAL_TYPE_ORDER, WORD_TYPE_META, WORD_TYPE_ORDER } from './wordType'
import type { FarsiEntry, FarsiEntryInput, FarsiWordType } from '@app-types/farsi'

// Relevanz einer Suche: exakte Treffer sollen vor "kommt nur irgendwo vor"-
// Treffern stehen (z.B. "man" als eigenes Wort vor "man" mitten in einem
// langen Satz). \b funktioniert für persische Schrift nicht zuverlässig
// (JS-Regex-Wortgrenzen basieren auf ASCII-\w), daher Wortgrenzen per
// Whitespace-Split statt Regex.
function matchScore(entry: FarsiEntry, needle: string): number {
  const values = [...entry.german, ...entry.persianLatin, entry.persianScript ?? ''].map((value) =>
    value.toLowerCase(),
  )
  let best = 0
  for (const value of values) {
    if (value === needle) return 3
    if (value.startsWith(needle)) best = Math.max(best, 2)
    else if (value.split(/\s+/).includes(needle)) best = Math.max(best, 1)
  }
  return best
}

export function Woerterbuch() {
  const [entries, setEntries] = useState<FarsiEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<FarsiWordType[]>([])
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false)
  const [onlyIncomplete, setOnlyIncomplete] = useState(false)
  const [sortBy, setSortBy] = useState<'german' | 'persianLatin'>('german')
  const [editingEntry, setEditingEntry] = useState<FarsiEntry | null>(null)
  const [creating, setCreating] = useState(false)

  // Die Wortliste ist klein (persönliches Vokabelheft) — einmal laden und
  // Suche/Filter komplett clientseitig, für sofortiges Feedback ohne
  // Netzwerk-Rundlauf bei jedem Tastendruck.
  const load = () =>
    farsiService
      .listEntries()
      .then(({ data }) => setEntries(data.entries))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const incompleteCount = useMemo(() => entries.filter((entry) => !entry.isComplete).length, [entries])

  const toggleType = (option: FarsiWordType) =>
    setTypeFilter((current) =>
      current.includes(option) ? current.filter((value) => value !== option) : [...current, option],
    )

  const filteredEntries = useMemo(() => {
    let result = entries
    if (typeFilter.length > 0) result = result.filter((entry) => entry.type && typeFilter.includes(entry.type))
    if (onlyIncomplete) result = result.filter((entry) => !entry.isComplete)

    const needle = search.trim().toLowerCase()
    if (needle) {
      result = result.filter((entry) =>
        [...entry.german, ...entry.persianLatin, entry.persianScript ?? '']
          .join(' ')
          .toLowerCase()
          .includes(needle),
      )
    }
    return result
  }, [entries, typeFilter, onlyIncomplete, search])

  const sortedEntries = useMemo(() => {
    const collator = new Intl.Collator('de', { sensitivity: 'base' })
    const needle = search.trim().toLowerCase()

    return [...filteredEntries].sort((a, b) => {
      if (needle) {
        const scoreDiff = matchScore(b, needle) - matchScore(a, needle)
        if (scoreDiff !== 0) return scoreDiff
      }
      const aValue = (sortBy === 'german' ? a.german : a.persianLatin)[0] ?? ''
      const bValue = (sortBy === 'german' ? b.german : b.persianLatin)[0] ?? ''
      if (!aValue && !bValue) return 0
      if (!aValue) return 1
      if (!bValue) return -1
      return collator.compare(aValue, bValue)
    })
  }, [filteredEntries, sortBy, search])

  const handleSave = async (input: Partial<FarsiEntryInput>) => {
    if (editingEntry) {
      await farsiService.updateEntry(editingEntry.id, input)
    } else {
      await farsiService.createEntry(input)
    }
    setEditingEntry(null)
    setCreating(false)
    await load()
  }

  const handleDelete = async () => {
    if (!editingEntry) return
    await farsiService.deleteEntry(editingEntry.id)
    setEditingEntry(null)
    await load()
  }

  return (
    <div>
      <div className="farsi-toolbar">
        <Input
          id="farsi-search"
          placeholder="Suche…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="farsi-search-input"
        />
        <Button onClick={() => setCreating(true)}>+ Neuer Begriff</Button>
      </div>

      <div className="farsi-filters">
        {/* Desktop: Chip-Leiste, mehrere gleichzeitig aktivierbar. */}
        <div className="farsi-filters__chips farsi-filters__chips--desktop">
          <button
            type="button"
            className={`tool-chip ${typeFilter.length === 0 ? 'is-active' : ''}`.trim()}
            onClick={() => setTypeFilter([])}
          >
            Alle
          </button>
          {WORD_TYPE_ORDER.map((option) => (
            <button
              key={option}
              type="button"
              className={`tool-chip ${typeFilter.includes(option) ? 'is-active' : ''}`.trim()}
              onClick={() => toggleType(option)}
            >
              <span>{WORD_TYPE_META[option].icon}</span> {WORD_TYPE_META[option].label}
            </button>
          ))}
        </div>

        {/* Mobil: kompakter Knopf statt Scroll-Leiste, öffnet die
            Kategorie-Auswahl als Popup (siehe unten). */}
        <button
          type="button"
          className="farsi-filters__trigger"
          onClick={() => setCategoryPickerOpen(true)}
        >
          Kategorie{typeFilter.length > 0 ? ` (${typeFilter.length})` : ''} ▾
        </button>

        <label className="farsi-incomplete-toggle">
          <input
            type="checkbox"
            checked={onlyIncomplete}
            onChange={(event) => setOnlyIncomplete(event.target.checked)}
          />
          Nur unvollständige{incompleteCount > 0 ? ` (${incompleteCount})` : ''}
        </label>
      </div>

      <div className="farsi-sort-toggle" role="group" aria-label="Sortierung">
        <span className="farsi-sort-toggle__label">Sortieren:</span>
        <button
          type="button"
          className={`tool-chip ${sortBy === 'german' ? 'is-active' : ''}`.trim()}
          onClick={() => setSortBy('german')}
        >
          Deutsch
        </button>
        <button
          type="button"
          className={`tool-chip ${sortBy === 'persianLatin' ? 'is-active' : ''}`.trim()}
          onClick={() => setSortBy('persianLatin')}
        >
          Lautschrift
        </button>
      </div>

      {loading ? (
        <p>Lädt…</p>
      ) : sortedEntries.length === 0 ? (
        <p className="admin-empty-state">Keine Einträge gefunden.</p>
      ) : (
        <div className="farsi-entry-list">
          {sortedEntries.map((entry) => (
            <Card
              key={entry.id}
              className={`farsi-entry-card ${!entry.isComplete ? 'farsi-entry-card--incomplete' : ''}`.trim()}
              onClick={() => setEditingEntry(entry)}
            >
              {entry.vocabBox !== null && (
                <span className="farsi-entry-card__box" title={`Karteikarten-Stufe ${entry.vocabBox}`}>
                  {entry.vocabBox}
                </span>
              )}
              <div className="farsi-entry-card__main">
                {entry.persianScript && (
                  <span className="farsi-entry-card__script" dir="rtl">
                    {entry.persianScript}
                  </span>
                )}
                <span className="farsi-entry-card__latin">{entry.persianLatin.join(' / ') || '—'}</span>
                <span className="farsi-entry-card__german">{entry.german.join(' / ') || '—'}</span>
              </div>
              <div className="farsi-entry-card__meta">
                {entry.priority && (
                  <span className="tool-card__badge" title="Priorität">
                    🎯 P{entry.priority}
                  </span>
                )}
                {entry.type && (
                  <span className="tool-card__badge">
                    {WORD_TYPE_META[entry.type].icon} {WORD_TYPE_META[entry.type].label}
                  </span>
                )}
                {(entry.verbStemLatin || entry.verbStemScript) && (
                  <span className="tool-card__badge" title="Präsensstamm">
                    🌱 {[entry.verbStemScript, entry.verbStemLatin].filter(Boolean).join(' / ')}
                  </span>
                )}
                {!entry.isComplete && (
                  <span
                    className="farsi-entry-card__warning"
                    title={`Fehlt: ${entry.missingFields.join(', ')}`}
                  >
                    ⚠️ unvollständig
                  </span>
                )}
              </div>
              {entry.meaning && <p className="farsi-entry-card__note">{entry.meaning}</p>}
            </Card>
          ))}
        </div>
      )}

      {(creating || editingEntry) && (
        <FarsiEntryModal
          entry={editingEntry}
          onSave={handleSave}
          onDelete={editingEntry ? handleDelete : undefined}
          onClose={() => {
            setCreating(false)
            setEditingEntry(null)
          }}
        />
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
                onClick={() => setTypeFilter([])}
                disabled={typeFilter.length === 0}
              >
                Zurücksetzen
              </button>
            </div>
            <div className="farsi-filters__list-body">
              {ALPHABETICAL_TYPE_ORDER.map((option) => (
                <label key={option} className="farsi-filters__list-item">
                  <input
                    type="checkbox"
                    checked={typeFilter.includes(option)}
                    onChange={() => toggleType(option)}
                  />
                  <span>
                    {WORD_TYPE_META[option].icon} {WORD_TYPE_META[option].label}
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
    </div>
  )
}
