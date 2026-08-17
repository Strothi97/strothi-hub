import api from './api'
import { API_ENDPOINTS } from '@config/api'

export interface PushSubscriptionInfo {
  id: string
  label: string
  createdAt: string
}

export const pushService = {
  getPublicKey: () => api.get<{ publicKey: string | null }>(API_ENDPOINTS.push.publicKey),

  subscribe: (subscription: PushSubscriptionJSON) => api.post(API_ENDPOINTS.push.subscribe, subscription),

  unsubscribe: (endpoint: string) => api.post(API_ENDPOINTS.push.unsubscribe, { endpoint }),

  listSubscriptions: () =>
    api.get<{ subscriptions: PushSubscriptionInfo[] }>(API_ENDPOINTS.push.subscriptions),

  deleteSubscription: (id: string) => api.delete(API_ENDPOINTS.push.subscription(id)),
}
