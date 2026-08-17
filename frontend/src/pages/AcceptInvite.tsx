import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'
import { authService } from '@services/auth.service'
import { Button } from '@components/ui/Button'
import { Card } from '@components/ui/Card'
import { Input } from '@components/ui/Input'
import { ThemeToggle } from '@components/ui/ThemeToggle'

export function AcceptInvite() {
  const { token } = useParams<{ token: string }>()
  const { login } = useAuth()
  const navigate = useNavigate()

  const [invite, setInvite] = useState<{ name: string; email: string } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return
    authService
      .getInvite(token)
      .then(({ data }) => setInvite(data))
      .catch((err) => {
        const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message
        setLoadError(message || 'Link ungültig oder abgelaufen')
      })
  }, [token])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || !invite) return
    setError(null)

    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein')
      return
    }
    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein')
      return
    }

    setSubmitting(true)
    try {
      await authService.acceptInvite(token, password)
      await login(invite.email, password)
      navigate('/', { replace: true })
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(message || 'Konto konnte nicht eingerichtet werden')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__theme-toggle">
        <ThemeToggle />
      </div>
      <Card className="login-card">
        <h1 className="brand-gradient">Strothi's Hub</h1>

        {loadError && <p className="form-error">{loadError}</p>}

        {!loadError && !invite && <p>Lädt…</p>}

        {invite && (
          <>
            <p className="page-subtitle">
              Willkommen, {invite.name}! Lege dein Passwort fest, um loszulegen.
            </p>
            <form onSubmit={handleSubmit}>
              <Input
                id="invite-password"
                label="Passwort"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoFocus
              />
              <Input
                id="invite-confirm-password"
                label="Passwort bestätigen"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
              {error && <p className="form-error">{error}</p>}
              <Button type="submit" disabled={submitting} style={{ width: '100%' }}>
                {submitting ? 'Wird eingerichtet…' : 'Konto einrichten'}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  )
}
