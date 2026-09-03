interface RatingStarsProps {
  value: number | null // eigene Bewertung, 1-5, null = noch nicht bewertet
  onChange: (value: number | null) => void
}

// Interaktive Sterne für die EIGENE Bewertung (im Gegensatz zu StarRating.tsx,
// das nur den — evtl. gemittelten — Wert anzeigt). Bewusst nur ganze Zahlen:
// die gewünschten Nachkommawerte (3,5 / 3,3) entstehen automatisch aus dem
// Durchschnitt mehrerer ganzzahliger Personen-Bewertungen, nicht durch
// Klick-Genauigkeit auf halbe Sterne. Klick auf den bereits aktiven Stern
// setzt die eigene Bewertung wieder zurück.
export function RatingStars({ value, onChange }: RatingStarsProps) {
  return (
    <div className="kochbuch-rating-stars" role="group" aria-label="Deine Bewertung">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`kochbuch-rating-stars__star ${value !== null && star <= value ? 'is-filled' : ''}`.trim()}
          onClick={() => onChange(value === star ? null : star)}
          aria-label={`${star} Stern${star > 1 ? 'e' : ''}`}
          aria-pressed={value === star}
        >
          ★
        </button>
      ))}
    </div>
  )
}
