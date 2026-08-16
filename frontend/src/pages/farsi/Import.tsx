import { useState, ChangeEvent } from 'react'
import { farsiService } from '@services/farsi.service'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import type { FarsiImportResult } from '@app-types/farsi'

export function Import() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsedEntries, setParsedEntries] = useState<unknown[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<FarsiImportResult | null>(null)

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setFileName(file.name)
    setResult(null)
    setParseError(null)
    setParsedEntries(null)

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!Array.isArray(parsed)) {
          setParseError('Die Datei muss ein JSON-Array von Einträgen enthalten.')
          return
        }
        setParsedEntries(parsed)
      } catch {
        setParseError('Datei konnte nicht als JSON gelesen werden.')
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleImport = async () => {
    if (!parsedEntries) return
    setImporting(true)
    try {
      const { data } = await farsiService.importEntries(parsedEntries)
      setResult(data)
      setParsedEntries(null)
      setFileName(null)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <Card className="farsi-import-card">
        <h2>JSON-Datei importieren</h2>
        <p className="page-subtitle">
          Erwartet wird das bisherige Format mit den Feldern „deutsch", „persich" (Lautschrift) und optional
          „bedeutung". Kategorie und persische Schrift fehlen danach noch — importierte Einträge erscheinen
          deshalb zunächst als „unvollständig" im Wörterbuch und lassen sich dort ergänzen.
        </p>
        <input
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          className="farsi-file-input"
        />

        {parseError && <p className="form-error">{parseError}</p>}

        {parsedEntries && (
          <div className="farsi-import-preview">
            <p>
              <strong>{fileName}</strong> — {parsedEntries.length} Einträge gefunden.
            </p>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? 'Importiere…' : `${parsedEntries.length} Einträge importieren`}
            </Button>
          </div>
        )}

        {result && (
          <div className="farsi-import-result">
            <p>✅ {result.imported} Einträge importiert.</p>
            {result.errors.length > 0 && (
              <>
                <p>⚠️ {result.errors.length} übersprungen:</p>
                <ul className="farsi-import-errors">
                  {result.errors.map((error) => (
                    <li key={error.index}>
                      Zeile {error.index + 1}: {error.reason}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
