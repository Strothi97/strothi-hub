import { Link } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'
import { Card } from '@components/ui/Card'

export function Dashboard() {
  const { tools } = useAuth()

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
