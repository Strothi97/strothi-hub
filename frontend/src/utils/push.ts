import { pushService } from '@services/push.service'

export type PushStatus = 'unsupported' | 'denied' | 'inactive' | 'active'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function isSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!isSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return subscription ? 'active' : 'inactive'
}

export async function enablePush(): Promise<PushStatus> {
  if (!isSupported()) return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const { data } = await pushService.getPublicKey()
  if (!data.publicKey) return 'inactive'

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.publicKey) as BufferSource,
  })
  await pushService.subscribe(subscription.toJSON())
  return 'active'
}

export async function disablePush(): Promise<PushStatus> {
  if (!isSupported()) return 'unsupported'
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await pushService.unsubscribe(subscription.endpoint)
    await subscription.unsubscribe()
  }
  return 'inactive'
}
