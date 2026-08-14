import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toolsService } from '@services/tools.service'
import { Card } from '@components/ui/Card'
import type { ToolDefinition } from '@app-types/index'

export function Dashboard() {
  const [tools, setTools] = useState<ToolDefinition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    toolsService
      .list()
      .then(({ data }) => setTools(data.tools))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Lädt…</p>

  return (
    <div>
      <h1>Übersicht</h1>
      <div className="tool-grid">
        {tools.map((tool) => {
          const usable = tool.hasAccess && !tool.comingSoon
          const tile = (
            <Card className={`tool-card ${usable ? '' : 'tool-card--disabled'}`.trim()}>
              <span className="tool-card__icon">{tool.icon}</span>
              <h3>{tool.name}</h3>
              <p>{tool.description}</p>
              {tool.comingSoon && <span className="tool-card__badge">Bald verfügbar</span>}
              {!tool.comingSoon && !tool.hasAccess && (
                <span className="tool-card__badge">Kein Zugriff</span>
              )}
            </Card>
          )

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
