// Formatierungs-Helfer für das Kochbuch-Tool

export function formatTime(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null
  if (min !== null && max !== null && min !== max) return `${min}–${max} Min`
  return `${min ?? max} Min`
}
