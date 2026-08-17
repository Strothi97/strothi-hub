import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'
import { authService } from '@services/auth.service'
import { pushService } from '@services/push.service'
import type { PushSubscriptionInfo } from '@services/push.service'
import { getPushStatus, enablePush, disablePush } from '@utils/push'
import type { PushStatus } from '@utils/push'
import { Button } from '@components/ui/Button'
import { Card } from '@components/ui/Card'
import { Input } from '@components/ui/Input'

const STATUS_LABEL: Record<PushStatus, string> = {
  unsupported: 'Push wird von diesem Browser nicht unterstützt',
  denied: 'Benachrichtigungen blockiert — in den Browser-Einstellungen erlauben',
  inactive: 'Für dieses Gerät aktivieren',
  active: 'Für dieses Gerät aktiv ✅',
}

const emptyPasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' }

export function Konto() {
  return (
    <div>
      <h1>Mein Konto</h1>
      <p className="page-subtitle">Passwort ändern und Push-Benachrichtigungen verwalten.</p>

      <PasswordCard />
      <PushCard />
      <DangerZoneCard />
    </div>
  )
}

function PasswordCard() {
  const [form, setForm] = useState(emptyPasswordForm)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (form.newPassword.length < 8) {
      setError('Neues Passwort muss mindestens 8 Zeichen lang sein')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Die Passwörter stimmen nicht überein')
      return
    }

    setSubmitting(true)
    try {
      await authService.changePassword(form.currentPassword, form.newPassword)
      setForm(emptyPasswordForm)
      setNotice('Passwort geändert.')
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(message || 'Passwort konnte nicht geändert werden')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="admin-form-card">
      <h2>Passwort ändern</h2>
      <form onSubmit={handleSubmit}>
        <Input
          id="current-password"
          label="Aktuelles Passwort"
          type="password"
          value={form.currentPassword}
          onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
          required
        />
        <Input
          id="new-password"
          label="Neues Passwort"
          type="password"
          value={form.newPassword}
          onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
          required
        />
        <Input
          id="confirm-password"
          label="Neues Passwort bestätigen"
          type="password"
          value={form.confirmPassword}
          onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
          required
        />
        {error && <p className="form-error">{error}</p>}
        {notice && <p className="form-notice">{notice}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Speichert…' : 'Passwort ändern'}
        </Button>
      </form>
    </Card>
  )
}

function PushCard() {
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [subscriptions, setSubscriptions] = useState<PushSubscriptionInfo[]>([])

  const loadSubscriptions = () =>
    pushService.listSubscriptions().then(({ data }) => setSubscriptions(data.subscriptions))

  useEffect(() => {
    getPushStatus().then(setStatus)
    loadSubscriptions()
  }, [])

  const handleToggle = async () => {
    if (status !== 'inactive' && status !== 'active') return
    setBusy(true)
    try {
      const next = status === 'active' ? await disablePush() : await enablePush()
      setStatus(next)
      await loadSubscriptions()
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (id: string) => {
    await pushService.deleteSubscription(id)
    await loadSubscriptions()
    setStatus(await getPushStatus())
  }

  return (
    <Card className="admin-form-card">
      <h2>Push-Benachrichtigungen</h2>
      <p className="page-subtitle">Erinnerungen und Geburtstags-Hinweise als Benachrichtigung erhalten.</p>

      {status !== null && (
        <button
          type="button"
          className={`push-toggle ${status === 'active' ? 'is-active' : ''}`.trim()}
          onClick={handleToggle}
          disabled={busy || status === 'unsupported' || status === 'denied'}
        >
          {STATUS_LABEL[status]}
        </button>
      )}

      {subscriptions.length > 0 && (
        <div className="konto-push-list">
          <span className="konto-push-list__label">Registrierte Geräte</span>
          {subscriptions.map((sub) => (
            <div key={sub.id} className="konto-push-list__item">
              <span>{sub.label}</span>
              <span className="konto-push-list__date">
                seit {new Date(sub.createdAt).toLocaleDateString('de-DE')}
              </span>
              <button type="button" className="user-card__resend" onClick={() => handleRemove(sub.id)}>
                Entfernen
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function DangerZoneCard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    const confirmed = window.confirm(
      'Konto wirklich unwiderruflich löschen? Alle Daten (Erinnerungen, Geburtstage, Fortschritt, ...) gehen dabei verloren.',
    )
    if (!confirmed) return

    setSubmitting(true)
    try {
      await authService.deleteAccount(password)
      logout()
      navigate('/login', { replace: true })
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(message || 'Konto konnte nicht gelöscht werden')
      setSubmitting(false)
    }
  }

  return (
    <Card className="admin-form-card konto-danger-zone">
      <h2>Konto löschen</h2>
      <p className="page-subtitle">
        Löscht dein Konto und alle damit verbundenen Daten unwiderruflich. Das kann nicht rückgängig gemacht werden.
      </p>
      <form onSubmit={handleSubmit}>
        <Input
          id="delete-account-password"
          label="Passwort zur Bestätigung"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && <p className="form-error">{error}</p>}
        <Button type="submit" variant="danger" disabled={submitting}>
          {submitting ? 'Wird gelöscht…' : 'Konto endgültig löschen'}
        </Button>
      </form>
    </Card>
  )
}
