import { useState, ChangeEvent } from 'react'
import { Button } from '@components/ui/Button'
import { kochbuchService } from '@services/kochbuch.service'

// Rezepte zwischen zwei getrennten Hub-Instanzen mitnehmen (z.B. lokal
// getestete Rezepte auf die Produktivinstanz übernehmen), ohne alles per
// Hand nochmal einzutragen. Zwei Wege: (1) ein einzelnes Rezept — auf der
// Rezeptkarte "📋 Kopieren" landet als JSON in der Zwischenablage, hier
// einfach mit Strg+V einfügen; (2) das ganze Kochbuch als Datei — Export
// lädt eine JSON-Datei herunter (Fotos als Base64 eingebettet, kein ZIP
// nötig), Import liest genau diese Datei wieder ein. Beide Wege landen
// direkt im Kochbuch (keine KI, keine Prüfung nötig, die Daten sind ja
// schon mal manuell geprüft gewesen). Bewertungen werden bewusst nicht
// mitgenommen (nutzergebunden, auf der Zielinstanz andere Nutzer-IDs) —
// dort einfach neu bewerten.
export function TransferPanel() {
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)

  // Gegenstück zum Kopieren-Button auf der Rezeptkarte (Rezepte.tsx): dort
  // wird ein einzelnes Rezept als JSON in die Zwischenablage gelegt, hier
  // wird es per Strg+V wieder eingefügt. Nutzt denselben Import-Endpunkt/
  // dieselbe Datei-Form wie der Datei-Upload oben, nur als Text statt Datei.
  const [pasteText, setPasteText] = useState('')
  const [pasting, setPasting] = useState(false)
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [pasteResult, setPasteResult] = useState<{ imported: number; skipped: number } | null>(null)

  const handleExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      const { data } = await kochbuchService.exportRecipes()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `kochbuch-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setExportError('Export fehlgeschlagen.')
    } finally {
      setExporting(false)
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null)
    setImportResult(null)
    setImportError(null)
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setImportError(null)
    setImportResult(null)
    try {
      const { data } = await kochbuchService.importRecipesFile(file)
      setImportResult(data)
      setFile(null)
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Import fehlgeschlagen.'
      setImportError(message)
    } finally {
      setImporting(false)
    }
  }

  const handlePasteImport = async () => {
    if (!pasteText.trim()) return
    setPasting(true)
    setPasteError(null)
    setPasteResult(null)
    try {
      const { data } = await kochbuchService.importRecipesText(pasteText)
      setPasteResult(data)
      setPasteText('')
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Import fehlgeschlagen.'
      setPasteError(message)
    } finally {
      setPasting(false)
    }
  }

  return (
    <div className="kochbuch-transfer">
      <section className="kochbuch-transfer__section">
        <h3>Einzelnes Rezept einfügen</h3>
        <p className="form-hint">
          Auf einer Rezeptkarte in einem anderen Kochbuch auf "📋 Kopieren" geklickt? Hier ins Feld klicken und
          Strg+V.
        </p>
        <textarea
          className="input kochbuch-import-textarea"
          rows={4}
          placeholder="Hier mit Strg+V einfügen…"
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <Button onClick={handlePasteImport} disabled={!pasteText.trim() || pasting}>
          {pasting ? 'Importiere…' : '📥 Einfügen & importieren'}
        </Button>
        {pasteError && <p className="form-error">{pasteError}</p>}
        {pasteResult && (
          <p className="form-hint">
            ✅ {pasteResult.imported} importiert, {pasteResult.skipped} übersprungen (bereits vorhanden).
          </p>
        )}
      </section>

      <section className="kochbuch-transfer__section">
        <h3>Ganzes Kochbuch exportieren</h3>
        <p className="form-hint">
          Lädt alle Rezepte dieses Kochbuchs (inkl. Fotos) als eine Datei herunter — zum Mitnehmen auf eine andere
          Hub-Instanz. Bewertungen sind nicht enthalten.
        </p>
        <Button variant="secondary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exportiere…' : '📦 Alle Rezepte exportieren'}
        </Button>
        {exportError && <p className="form-error">{exportError}</p>}
      </section>

      <section className="kochbuch-transfer__section">
        <h3>Ganzes Kochbuch importieren</h3>
        <p className="form-hint">
          Eine zuvor exportierte Datei einlesen — landet direkt im Kochbuch (keine Prüfung nötig). Rezepte mit
          bereits vorhandenem Titel werden übersprungen.
        </p>
        <input type="file" accept="application/json" onChange={handleFileChange} />
        <Button onClick={handleImport} disabled={!file || importing}>
          {importing ? 'Importiere…' : '📥 Importieren'}
        </Button>
        {importError && <p className="form-error">{importError}</p>}
        {importResult && (
          <p className="form-hint">
            ✅ {importResult.imported} importiert, {importResult.skipped} übersprungen (bereits vorhanden).
          </p>
        )}
      </section>
    </div>
  )
}
