import { useCallback, useEffect, useMemo, useState } from 'react'
import { trainingsplanService } from '@services/trainingsplan.service'
import type { Equipment } from '@app-types/trainingsplan'

// Trainingsgeräte des Nutzers. metaFor fällt bei unbekanntem Schlüssel auf
// diesen selbst zurück, damit eine Übung nie ohne Anzeige bleibt.
export function useEquipment() {
  const [items, setItems] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(
    () => trainingsplanService.listEquipment().then(({ data }) => setItems(data.equipment)),
    [],
  )

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [reload])

  const byKey = useMemo(() => new Map(items.map((item) => [item.key, item])), [items])

  const nameFor = useCallback((key: string) => byKey.get(key)?.name ?? key, [byKey])

  return { items, loading, reload, nameFor }
}
