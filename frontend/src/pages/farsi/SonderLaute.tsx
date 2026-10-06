import { SONDERLAUTE, buchstabenMitLaut } from './alphabet'

// Die Sonderbuchstaben der Lautschrift (ā, č, ğ, ġ, š, ž) mit den Buchstaben, zu denen
// sie gehören — damit man sie nicht jedes Mal im Alphabet suchen muss.
export function SonderLaute() {
  return (
    <div className="farsi-sonder" role="list" aria-label="Sonderlaute">
      {SONDERLAUTE.map((laut) => (
        <span key={laut} role="listitem" className="farsi-sonder__chip">
          <span className="farsi-sonder__laut">{laut}</span>
          {buchstabenMitLaut(laut).map((letter) => (
            <span key={letter.char} className="farsi-sonder__buchstabe">
              <span className="farsi-sonder__glyph" dir="rtl">
                {letter.char}
              </span>
              <span className="farsi-sonder__name">{letter.name}</span>
            </span>
          ))}
        </span>
      ))}
    </div>
  )
}
