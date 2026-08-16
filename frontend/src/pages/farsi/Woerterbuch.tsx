import { useEffect, useMemo, useState } from 'react'
import { farsiService } from '@services/farsi.service'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { FarsiEntryModal } from './FarsiEntryModal'
import { WORD_TYPE_META, WORD_TYPE_ORDER } from './wordType'
import type { FarsiEntry, FarsiEntryInput, FarsiWordType } from '@app-types/farsi'

export function Woerterbuch() {
  const [entries, setEntries] = useState<FarsiEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<FarsiWordType | null>(null)
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

  const filteredEntries = useMemo(() => {
    let result = entries
    if (typeFilter) result = result.filter((entry) => entry.type === typeFilter)
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
    return [...filteredEntries].sort((a, b) => {
      const aValue = (sortBy === 'german' ? a.german : a.persianLatin)[0] ?? ''
      const bValue = (sortBy === 'german' ? b.german : b.persianLatin)[0] ?? ''
      if (!aValue && !bValue) return 0
      if (!aValue) return 1
      if (!bValue) return -1
      return collator.compare(aValue, bValue)
    })
  }, [filteredEntries, sortBy])

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
          placeholder="Suche: Schrift, Lautschrift oder Deutsch…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="farsi-search-input"
        />
        <Button onClick={() => setCreating(true)}>+ Neuer Begriff</Button>
      </div>

      <div className="farsi-filters">
        <button
          type="button"
          className={`tool-chip ${typeFilter === null ? 'is-active' : ''}`.trim()}
          onClick={() => setTypeFilter(null)}
        >
          Alle
        </button>
        {WORD_TYPE_ORDER.map((option) => (
          <button
            key={option}
            type="button"
            className={`tool-chip ${typeFilter === option ? 'is-active' : ''}`.trim()}
            onClick={() => setTypeFilter((current) => (current === option ? null : option))}
          >
            <span>{WORD_TYPE_META[option].icon}</span> {WORD_TYPE_META[option].label}
          </button>
        ))}
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
                {entry.type && (
                  <span className="tool-card__badge">
                    {WORD_TYPE_META[entry.type].icon} {WORD_TYPE_META[entry.type].label}
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
    </div>
  )
}
