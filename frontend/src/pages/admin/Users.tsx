import { FormEvent, useEffect, useMemo, useState } from 'react'
import { adminService } from '@services/admin.service'
import { toolsService } from '@services/tools.service'
import { Button } from '@components/ui/Button'
import { Card } from '@components/ui/Card'
import { Input } from '@components/ui/Input'
import type { AdminUser, ToolDefinition } from '@app-types/index'

const emptyForm = { name: '', email: '' }

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [tools, setTools] = useState<ToolDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [formNotice, setFormNotice] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const loadUsers = () => adminService.listUsers().then(({ data }) => setUsers(data.users))

  useEffect(() => {
    Promise.all([loadUsers(), toolsService.list().then(({ data }) => setTools(data.tools))]).finally(() =>
      setLoading(false),
    )
  }, [])

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    setFormNotice(null)
    try {
      const { data } = await adminService.inviteUser(form)
      setForm(emptyForm)
      setFormNotice(
        data.emailSent
          ? `Einladung an ${data.user.email} verschickt.`
          : `Nutzer angelegt, aber E-Mail-Versand ist fehlgeschlagen — bitte "Erneut senden" nutzen.`,
      )
      await loadUsers()
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setFormError(message || 'Einladung konnte nicht versendet werden')
    }
  }

  const handleResendInvite = async (user: AdminUser) => {
    const { data } = await adminService.resendInvite(user.id)
    setFormNotice(
      data.emailSent ? `Einladung an ${user.email} erneut verschickt.` : `E-Mail-Versand fehlgeschlagen.`,
    )
  }

  const toggleActive = async (user: AdminUser) => {
    await adminService.updateUser(user.id, { isActive: !user.isActive })
    loadUsers()
  }

  const toggleTool = async (user: AdminUser, toolKey: string) => {
    const next = user.toolAccess.includes(toolKey)
      ? user.toolAccess.filter((key) => key !== toolKey)
      : [...user.toolAccess, toolKey]
    await adminService.setToolAccess(user.id, next)
    loadUsers()
  }

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (user) => user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q),
    )
  }, [users, query])

  if (loading) return <p>Lädt…</p>

  return (
    <div>
      <h1>Nutzerverwaltung</h1>
      <p className="page-subtitle">Nutzer anlegen, Rollen verwalten und Tool-Zugriffe freigeben.</p>

      <Card className="admin-form-card">
        <h2>Nutzer einladen</h2>
        <p className="page-subtitle">
          Die Person erhält eine E-Mail mit einem Link, über den sie ihr eigenes Passwort festlegt.
        </p>
        <form onSubmit={handleInvite}>
          <Input
            id="new-user-name"
            label="Name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <Input
            id="new-user-email"
            label="E-Mail"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
          {formError && <p className="form-error">{formError}</p>}
          {formNotice && <p className="form-notice">{formNotice}</p>}
          <Button type="submit">Einladung versenden</Button>
        </form>
      </Card>

      <div className="admin-users-list-header">
        <h2>Bestehende Nutzer ({users.length})</h2>
        <Input
          placeholder="Suche nach..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="admin-search-input"
        />
      </div>

      {filteredUsers.length === 0 && <p className="admin-empty-state">Keine Nutzer gefunden.</p>}

      <div className="user-card-list">
        {filteredUsers.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            tools={tools}
            onToggleActive={() => toggleActive(user)}
            onToggleTool={(toolKey) => toggleTool(user, toolKey)}
            onResendInvite={() => handleResendInvite(user)}
          />
        ))}
      </div>
    </div>
  )
}

function UserCard({
  user,
  tools,
  onToggleActive,
  onToggleTool,
  onResendInvite,
}: {
  user: AdminUser
  tools: ToolDefinition[]
  onToggleActive: () => void
  onToggleTool: (toolKey: string) => void
  onResendInvite: () => void
}) {
  const isAdmin = user.role === 'ADMIN'

  return (
    <Card className="user-card">
      <div className="user-card__header">
        <div className="user-card__identity">
          <span className="user-card__name">{user.name}</span>
          <span className="user-card__email">{user.email}</span>
          {user.pendingInvite && (
            <span className="user-card__pending">
              Einladung ausstehend ·{' '}
              <button type="button" className="user-card__resend" onClick={onResendInvite}>
                Erneut senden
              </button>
            </span>
          )}
        </div>

        <div className="user-card__meta">
          <span className={`role-badge ${isAdmin ? 'role-badge--admin' : 'role-badge--user'}`}>
            {user.role}
          </span>
          <label className="switch" title={user.isActive ? 'Konto aktiv' : 'Konto deaktiviert'}>
            <input
              type="checkbox"
              checked={user.isActive}
              disabled={isAdmin}
              onChange={onToggleActive}
            />
            <span className="switch__track">
              <span className="switch__thumb" />
            </span>
            <span className="switch__label">{user.isActive ? 'Aktiv' : 'Inaktiv'}</span>
          </label>
        </div>
      </div>

      <div className="user-card__tools">
        <span className="user-card__tools-label">Tool-Zugriffe</span>
        {isAdmin ? (
          <p className="user-card__admin-note">Admin hat automatisch Zugriff auf alle Tools.</p>
        ) : (
          <div className="tool-chip-list">
            {tools.map((tool) => {
              const active = user.toolAccess.includes(tool.key)
              return (
                <button
                  key={tool.key}
                  type="button"
                  className={`tool-chip ${active ? 'is-active' : ''}`.trim()}
                  onClick={() => onToggleTool(tool.key)}
                >
                  <span>{tool.icon}</span> {tool.name}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}
