import webpush from 'web-push'
import { prisma } from '../../db'

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT

if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
} else {
  console.warn('⚠️  VAPID-Keys fehlen in der .env — Push-Benachrichtigungen sind deaktiviert.')
}

export function getPublicKey(): string | null {
  return vapidPublicKey || null
}

export interface PushSubscriptionInput {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function saveSubscription(userId: string, sub: PushSubscriptionInput) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  })
}

export async function removeSubscription(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } })
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

// Sendet an alle Geräte/Browser des Nutzers; abgelaufene Abos (410/404)
// werden automatisch entfernt, statt bei jedem Lauf erneut zu scheitern.
export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) return

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } })
  const body = JSON.stringify(payload)

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        )
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await removeSubscription(sub.endpoint)
        } else {
          console.error('Push-Versand fehlgeschlagen:', error)
        }
      }
    }),
  )
}
