// Suche ohne Rücksicht auf Sonderzeichen: "ā" findet "a", "ğ"/"ġ" finden "g",
// "č" findet "c", "š" findet "s", "ž" findet "z". NFD zerlegt jeden dieser Buchstaben
// in Grundbuchstabe plus Akzent, danach fallen die Akzente (Unicode-Kategorie Mn) weg.
export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase()
}
