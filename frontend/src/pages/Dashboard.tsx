import { useEffect, useMemo, useState, PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import type { ToolDefinition } from '@app-types/index'

// Wendet eine gespeicherte Reihenfolge (Tool-Keys) auf die aktuelle Tool-Liste an.
// Tools ohne gespeicherte Position (z.B. neu hinzugekommene) werden in ihrer
// ursprünglichen Registry-Reihenfolge ans Ende angehängt.
function applyOrder(tools: ToolDefinition[], order: string[]): ToolDefinition[] {
  const remaining = new Map(tools.map((tool) => [tool.key, tool]))
  const ordered: ToolDefinition[] = []
  for (const key of order) {
    const tool = remaining.get(key)
    if (tool) {
      ordered.push(tool)
      remaining.delete(key)
    }
  }
  ordered.push(...tools.filter((tool) => remaining.has(tool.key)))
  return ordered
}

export function Dashboard() {
  const { tools, dashboardPreferences, updateDashboardPreferences } = useAuth()
  const [editMode, setEditMode] = useState(false)
  const [order, setOrder] = useState<string[]>([])
  const [dragKey, setDragKey] = useState<string | null>(null)

  useEffect(() => {
    if (!editMode) {
      setOrder(dashboardPreferences.toolOrder)
    }
  }, [dashboardPreferences.toolOrder, editMode])

  const visibleTools = useMemo(() => {
    const ordered = applyOrder(tools, dashboardPreferences.toolOrder)
    return dashboardPreferences.hideComingSoonTools
      ? ordered.filter((tool) => !tool.comingSoon)
      : ordered
  }, [tools, dashboardPreferences])

  const editingTools = useMemo(() => applyOrder(tools, order), [tools, order])

  const handleToggleHideComingSoon = () => {
    updateDashboardPreferences({ hideComingSoonTools: !dashboardPreferences.hideComingSoonTools })
  }

  const startEditing = () => {
    setOrder(applyOrder(tools, dashboardPreferences.toolOrder).map((tool) => tool.key))
    setEditMode(true)
  }

  const finishEditing = async () => {
    setEditMode(false)
    await updateDashboardPreferences({ toolOrder: order })
  }

  const cancelEditing = () => {
    setEditMode(false)
    setOrder(dashboardPreferences.toolOrder)
  }

  const handlePointerDown = (key: string) => (event: ReactPointerEvent<HTMLElement>) => {
    setDragKey(key)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!dragKey) return
    const target = document.elementFromPoint(event.clientX, event.clientY)
    const overKey = target?.closest<HTMLElement>('[data-tool-key]')?.dataset.toolKey
    if (!overKey || overKey === dragKey) return
    setOrder((prev) => {
      const from = prev.indexOf(dragKey)
      const to = prev.indexOf(overKey)
      if (from === -1 || to === -1) return prev
      const next = [...prev]
      next.splice(from, 1)
      next.splice(to, 0, dragKey)
      return next
    })
  }

  const handlePointerUp = () => setDragKey(null)

  const displayedTools = editMode ? editingTools : visibleTools

  return (
    <div>
      <div className="dashboard-header">
        <h1>Übersicht</h1>
        <div className="dashboard-header__actions">
          <label className="dashboard-toggle">
            <input
              type="checkbox"
              checked={!dashboardPreferences.hideComingSoonTools}
              onChange={handleToggleHideComingSoon}
            />
            "Bald verfügbar" anzeigen
          </label>
          {editMode ? (
            <>
              <Button variant="secondary" className="btn-sm" onClick={cancelEditing}>
                Abbrechen
              </Button>
              <Button className="btn-sm" onClick={finishEditing}>
                Fertig
              </Button>
            </>
          ) : (
            <Button variant="secondary" className="btn-sm" onClick={startEditing}>
              ↕ Reihenfolge bearbeiten
            </Button>
          )}
        </div>
      </div>

      <div className="tool-grid">
        {displayedTools.map((tool) => {
          const usable = tool.hasAccess && !tool.comingSoon

          const tile = (
            <Card
              className={`tool-card ${usable ? '' : 'tool-card--disabled'} ${
                editMode ? 'tool-card--editing' : ''
              } ${dragKey === tool.key ? 'tool-card--dragging' : ''}`.trim()}
            >
              {editMode && (
                <span
                  className="tool-card__handle"
                  onPointerDown={handlePointerDown(tool.key)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  aria-label={`${tool.name} verschieben`}
                >
                  ⠿
                </span>
              )}
              <span className="tool-card__icon">{tool.icon}</span>
              <h3>{tool.name}</h3>
              <p>{tool.description}</p>
              {tool.comingSoon && <span className="tool-card__badge">Bald verfügbar</span>}
              {!tool.comingSoon && !tool.hasAccess && (
                <span className="tool-card__badge">Kein Zugriff</span>
              )}
            </Card>
          )

          if (editMode) {
            return (
              <div key={tool.key} data-tool-key={tool.key}>
                {tile}
              </div>
            )
          }

          return usable ? (
            <Link key={tool.key} to={tool.path} className="tool-card-link">
              {tile}
            </Link>
          ) : (
            <div key={tool.key}>{tile}</div>
          )
        })}
      </div>
    </div>
  )
}
