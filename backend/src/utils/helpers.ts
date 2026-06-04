/**
 * Erstellt ein Pagination-Objekt
 */
export function paginate(page = 1, limit = 10) {
  const skip = (page - 1) * limit
  return { skip, take: limit }
}

/**
 * Entfernt das Passwort-Feld aus einem Objekt
 */
export function excludePassword<T extends Record<string, unknown>>(
  obj: T
): Omit<T, 'password'> {
  const { password: _, ...rest } = obj
  return rest as Omit<T, 'password'>
}
