import { useCallback, useEffect, useMemo, useState } from 'react'
import { trainingsplanService } from '@services/trainingsplan.service'
import type { FocusArea } from '@app-types/trainingsplan'

// Trainingsbereiche des Nutzers. metaFor fällt bei unbekanntem Schlüssel auf
// diesen selbst zurück, damit eine Übung nie ohne Anzeige bleibt.
export function useFocusAreas() {
  const [areas, setAreas] = useState<FocusArea[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(
    () => trainingsplanService.listFocusAreas().then(({ data }) => setAreas(data.focusAreas)),
    [],
  )

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [reload])

  const byKey = useMemo(() => new Map(areas.map((area) => [area.key, area])), [areas])

  const metaFor = useCallback(
    (key: string) => {
      const area = byKey.get(key)
      return { name: area?.name ?? key, icon: area?.icon ?? '🏷️' }
    },
    [byKey],
  )

  return { areas, loading, reload, metaFor }
}
