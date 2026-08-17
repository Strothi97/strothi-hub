import { useEffect, useState } from 'react'
import { getPushStatus, enablePush, disablePush } from './push'
import type { PushStatus } from './push'

const STATUS_LABEL: Record<PushStatus, string> = {
  unsupported: 'Push wird von diesem Browser nicht unterstützt',
  denied: 'Benachrichtigungen blockiert — in den Browser-Einstellungen erlauben',
  inactive: 'Benachrichtigungen aktivieren',
  active: 'Benachrichtigungen aktiv ✅',
}

export function PushToggle() {
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getPushStatus().then(setStatus)
  }, [])

  const handleClick = async () => {
    if (status !== 'inactive' && status !== 'active') return
    setBusy(true)
    try {
      const next = status === 'active' ? await disablePush() : await enablePush()
      setStatus(next)
    } finally {
      setBusy(false)
    }
  }

  if (status === null) return null

  return (
    <button
      type="button"
      className={`erinnerungen-push-toggle ${status === 'active' ? 'is-active' : ''}`.trim()}
      onClick={handleClick}
      disabled={busy || status === 'unsupported' || status === 'denied'}
    >
      {STATUS_LABEL[status]}
    </button>
  )
}
