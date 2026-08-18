import { useEffect, useMemo, useState } from 'react'
import { farsiService } from '@services/farsi.service'
import { Card } from '@components/ui/Card'
import { Input } from '@components/ui/Input'
import { FarsiEntryForm } from './FarsiEntryForm'
import { FarsiEntryModal } from './FarsiEntryModal'
import { AlphabetTable } from './AlphabetTable'
import { WORD_TYPE_META } from './wordType'
import type { FarsiEntry, FarsiEntryInput } from '@app-types/farsi'

type PanelKey = 'search' | 'new' | 'alphabet'

const PANEL_LABELS: Record<PanelKey, string> = {
  search: 'Suche',
  new: 'Neuer Begriff',
  alphabet: 'Alphabet',
}
const PANEL_ORDER: PanelKey[] = ['search', 'new', 'alphabet']

export function Arbeitsflaeche() {
  const [entries, setEntries] = useState<FarsiEntry[]>([])
  const [search, setSearch] = useState('')
  const [activePanels, setActivePanels] = useState<Set<PanelKey>>(new Set(PANEL_ORDER))
  const [editingEntry, setEditingEntry] = useState<FarsiEntry | null>(null)

  const load = () => farsiService.listEntries().then(({ data }) => setEntries(data.entries))

  useEffect(() => {
    load()
  }, [])

  const filteredEntries = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return entries
    return entries.filter((entry) =>
      [...entry.german, ...entry.persianLatin, entry.persianScript ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
  }, [entries, search])

  const togglePanel = (panel: PanelKey) => {
    setActivePanels((current) => {
      const next = new Set(current)
      if (next.has(panel)) next.delete(panel)
      else next.add(panel)
      return next
    })
  }

  const handleCreate = async (input: Partial<FarsiEntryInput>) => {
    await farsiService.createEntry(input)
    await load()
  }

  const handleUpdate = async (input: Partial<FarsiEntryInput>) => {
    if (!editingEntry) return
    await farsiService.updateEntry(editingEntry.id, input)
    setEditingEntry(null)
    await load()
  }

  const handleDelete = async () => {
    if (!editingEntry) return
    await farsiService.deleteEntry(editingEntry.id)
    setEditingEntry(null)
    await load()
  }

  const showNew = activePanels.has('new')
  const showSearch = activePanels.has('search')
  const showAlphabet = activePanels.has('alphabet')
  const hasLeft = showNew || showSearch
  const gridClass = hasLeft && showAlphabet ? 'farsi-workspace__grid farsi-workspace__grid--split' : 'farsi-workspace__grid'

  return (
    <div className="farsi-workspace">
      <div className="farsi-workspace__toggles">
        {PANEL_ORDER.map((panel) => (
          <button
            key={panel}
            type="button"
            className={`tool-chip ${activePanels.has(panel) ? 'is-active' : ''}`.trim()}
            onClick={() => togglePanel(panel)}
          >
            {PANEL_LABELS[panel]}
          </button>
        ))}
      </div>

      <div className={gridClass}>
        {hasLeft && (
          <div className="farsi-workspace__column">
            {showNew && (
              <Card className="farsi-workspace__panel">
                <h3>Neuer Begriff</h3>
                <FarsiEntryForm entry={null} onSave={handleCreate} />
              </Card>
            )}

            {showSearch && (
              <Card className="farsi-workspace__panel">
                <h3>Suche</h3>
                <Input
                  id="workspace-search"
                  placeholder="Suche…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="farsi-search-input"
                />
                <div className="farsi-workspace__result-list">
                  {filteredEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="farsi-workspace__result"
                      onClick={() => setEditingEntry(entry)}
                    >
                      {entry.persianScript && (
                        <span className="farsi-entry-card__script" dir="rtl">
                          {entry.persianScript}
                        </span>
                      )}
                      <span className="farsi-entry-card__latin">{entry.persianLatin.join(' / ') || '—'}</span>
                      <span className="farsi-entry-card__german">{entry.german.join(' / ') || '—'}</span>
                      {entry.type && <span className="tool-card__badge">{WORD_TYPE_META[entry.type].icon}</span>}
                    </div>
                  ))}
                  {filteredEntries.length === 0 && <p className="admin-empty-state">Keine Einträge gefunden.</p>}
                </div>
              </Card>
            )}
          </div>
        )}

        {showAlphabet && (
          <div className="farsi-workspace__column farsi-workspace__column--alphabet">
            <div className="farsi-workspace__panel farsi-workspace__panel--alphabet">
              {/* <h3>Alphabet</h3> */}
              <AlphabetTable />
            </div>
          </div>
        )}
      </div>

      {editingEntry && (
        <FarsiEntryModal
          entry={editingEntry}
          onSave={handleUpdate}
          onDelete={handleDelete}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </div>
  )
}
