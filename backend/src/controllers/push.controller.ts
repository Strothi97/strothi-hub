import { Request, Response } from 'express'
import * as pushService from '../services/push.service'

// Grober Geräte-/Browser-Hinweis aus dem User-Agent, rein für die
// Anzeige in der Konto-Seite ("welches Gerät ist das hier?").
function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Unbekanntes Gerät'

  let browser = 'Browser'
  if (userAgent.includes('Edg/')) browser = 'Edge'
  else if (userAgent.includes('Firefox/')) browser = 'Firefox'
  else if (userAgent.includes('Chrome/')) browser = 'Chrome'
  else if (userAgent.includes('Safari/')) browser = 'Safari'

  let os = ''
  if (userAgent.includes('Windows')) os = 'Windows'
  else if (userAgent.includes('Android')) os = 'Android'
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS'
  else if (userAgent.includes('Mac OS')) os = 'Mac'
  else if (userAgent.includes('Linux')) os = 'Linux'

  return os ? `${browser} · ${os}` : browser
}

export const getPublicKey = async (_req: Request, res: Response) => {
  const publicKey = pushService.getPublicKey()
  return res.json({ publicKey })
}

export const subscribe = async (req: Request, res: Response) => {
  await pushService.saveSubscription(req.user!.id, req.body, req.headers['user-agent'])
  return res.status(201).json({ ok: true })
}

export const unsubscribe = async (req: Request, res: Response) => {
  const { endpoint } = req.body as { endpoint?: string }
  if (endpoint) await pushService.removeSubscription(endpoint)
  return res.json({ ok: true })
}

export const listSubscriptions = async (req: Request, res: Response) => {
  const subscriptions = await pushService.listSubscriptions(req.user!.id)
  return res.json({
    subscriptions: subscriptions.map((sub) => ({
      id: sub.id,
      label: describeUserAgent(sub.userAgent),
      createdAt: sub.createdAt,
    })),
  })
}

export const deleteSubscription = async (req: Request, res: Response) => {
  const removed = await pushService.removeSubscriptionById(req.user!.id, req.params.id)
  if (!removed) return res.status(404).json({ message: 'Subscription nicht gefunden' })
  return res.status(204).send()
}
