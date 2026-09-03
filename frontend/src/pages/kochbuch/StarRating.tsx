interface StarRatingProps {
  value: number | null
  className?: string
}

// Reine Anzeige (Bearbeitung läuft über ein normales Zahlenfeld im Formular,
// da Nachkommawerte wie 3,3 per Sterne-Klick nicht sauber abbildbar wären).
// Technik: zwei übereinanderliegende ★★★★★-Zeilen — eine graue Hintergrund-
// und eine goldene Vordergrundzeile, deren Breite auf (value/5)*100% gesetzt
// und per overflow:hidden abgeschnitten wird, für stufenlose Teilfüllung.
export function StarRating({ value, className }: StarRatingProps) {
  if (value === null) return null
  const percent = Math.max(0, Math.min(100, (value / 5) * 100))

  return (
    <span className={`kochbuch-star-rating ${className ?? ''}`.trim()} title={`${value.toLocaleString('de-DE')} / 5`}>
      <span className="kochbuch-star-rating__track" aria-hidden="true">
        ★★★★★
        <span className="kochbuch-star-rating__fill" style={{ width: `${percent}%` }}>
          ★★★★★
        </span>
      </span>
      <span className="kochbuch-star-rating__value">{value.toLocaleString('de-DE')}</span>
    </span>
  )
}
