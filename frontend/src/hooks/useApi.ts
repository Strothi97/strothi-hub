import { useState, useCallback } from 'react'
import type { ApiError } from '@app-types/index'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(async (promise: Promise<{ data: T }>) => {
    setState({ data: null, loading: true, error: null })
    try {
      const response = await promise
      setState({ data: response.data, loading: false, error: null })
      return response.data
    } catch (err) {
      const error = err as { response?: { data?: ApiError } }
      const message = error.response?.data?.message || 'Ein Fehler ist aufgetreten'
      setState({ data: null, loading: false, error: message })
      throw err
    }
  }, [])

  return { ...state, execute }
}
