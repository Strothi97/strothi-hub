import { useState } from 'react'

interface RatingStarsProps {
  value: number | null // eigene Bewertung, 1-5, null = noch nicht bewertet
  onChange: (value: number | null) => void
}

// Interaktive Sterne für die EIGENE Bewertung (im Gegensatz zu StarRating.tsx,
// das nur den — evtl. gemittelten — Wert anzeigt). Bewusst nur ganze Zahlen:
// die gewünschten Nachkommawerte (3,5 / 3,3) entstehen automatisch aus dem
// Durchschnitt mehrerer ganzzahliger Personen-Bewertungen, nicht durch
// Klick-Genauigkeit auf halbe Sterne. Klick auf den bereits aktiven Stern
// setzt die eigene Bewertung wieder zurück. Beim Überfahren mit der Maus
// füllen sich Stern 1 bis zum gerade angesteuerten Stern als Vorschau
// (nicht nur der einzelne Stern unter dem Zeiger) — der geklickte Wert
// selbst füllt ohnehin schon 1 bis N, siehe RezeptDetail/Kochbuch-Tests.
export function RatingStars({ value, onChange }: RatingStarsProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const displayValue = hovered ?? value

  return (
    <div className="kochbuch-rating-stars" role="group" aria-label="Deine Bewertung" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`kochbuch-rating-stars__star ${displayValue !== null && star <= displayValue ? 'is-filled' : ''}`.trim()}
          onMouseEnter={() => setHovered(star)}
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
