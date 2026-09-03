// Liest ein Bild aus einem Paste-Event — z.B. wenn man auf einer Webseite
// "Grafik kopieren" nutzt und dann mit Strg+V einfügt. Kein Treffer (kein
// Bild im Clipboard, z.B. nur Text kopiert) → null.
//
// Strukturell typisiert statt an React.ClipboardEvent gebunden, damit sowohl
// React-Paste-Handler als auch ein globaler window-"paste"-Listener (nativer
// ClipboardEvent) dieselbe Funktion nutzen können — beide haben ein
// clipboardData: DataTransfer | null.
interface ClipboardLike {
  clipboardData: DataTransfer | null
}

export function getImageFromClipboard(event: ClipboardLike): File | null {
  const item = Array.from(event.clipboardData?.items ?? []).find((entry) => entry.type.startsWith('image/'))
  return item?.getAsFile() ?? null
}
