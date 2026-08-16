// Persisches Alphabet (32 Buchstaben, traditionelle Reihenfolge).
// Namen, Lautschrift und Verbindungsverhalten 1:1 aus dem Lehrbuch des
// Nutzers übernommen (nicht aus allgemeinem Wissen geraten).
//
// Positionsformen (isoliert/Anfang/Mitte/Ende) werden NICHT als eigene
// Sonderzeichen gespeichert, sondern zur Laufzeit über den Tatweel-
// Verbindungsstrich (ـ, U+0640) zusammengesetzt — der Browser übernimmt
// dann automatisch die korrekte Verbindungsform der arabisch-persischen
// Schrift. Siehe buildForms() unten.
//
// leftJoining = false bei den 7 Buchstaben, die sich nicht mit dem
// nachfolgenden Buchstaben verbinden (ا د ذ ر ز ژ و) — für diese ist die
// Anfangsform identisch mit der isolierten Form und die Mittelform
// identisch mit der Endform.

export interface AlphabetLetter {
  char: string
  name: string
  sound: string
  leftJoining: boolean
}

export const PERSIAN_ALPHABET: AlphabetLetter[] = [
  { char: 'ا', name: 'alef', sound: 'ā, a, e, o', leftJoining: false },
  { char: 'ب', name: 'be', sound: 'b', leftJoining: true },
  { char: 'پ', name: 'pe', sound: 'p', leftJoining: true },
  { char: 'ت', name: 'te', sound: 't', leftJoining: true },
  { char: 'ث', name: 'se', sound: 's', leftJoining: true },
  { char: 'ج', name: 'ğim', sound: 'ğ', leftJoining: true },
  { char: 'چ', name: 'če', sound: 'č', leftJoining: true },
  { char: 'ح', name: 'he', sound: 'h', leftJoining: true },
  { char: 'خ', name: 'xe', sound: 'x', leftJoining: true },
  { char: 'د', name: 'dāl', sound: 'd', leftJoining: false },
  { char: 'ذ', name: 'zāl', sound: 'z', leftJoining: false },
  { char: 'ر', name: 're', sound: 'r', leftJoining: false },
  { char: 'ز', name: 'ze', sound: 'z', leftJoining: false },
  { char: 'ژ', name: 'že', sound: 'ž', leftJoining: false },
  { char: 'س', name: 'sin', sound: 's', leftJoining: true },
  { char: 'ش', name: 'šīn', sound: 'š', leftJoining: true },
  { char: 'ص', name: 'sād', sound: 's', leftJoining: true },
  { char: 'ض', name: 'zād', sound: 'z', leftJoining: true },
  { char: 'ط', name: 'tā', sound: 't', leftJoining: true },
  { char: 'ظ', name: 'zā', sound: 'z', leftJoining: true },
  { char: 'ع', name: 'ejn', sound: "a, e, o, '", leftJoining: true },
  { char: 'غ', name: 'ġejn', sound: 'ġ', leftJoining: true },
  { char: 'ف', name: 'fe', sound: 'f', leftJoining: true },
  { char: 'ق', name: 'ġāf', sound: 'ġ', leftJoining: true },
  { char: 'ک', name: 'kāf', sound: 'k', leftJoining: true },
  { char: 'گ', name: 'gāf', sound: 'g', leftJoining: true },
  { char: 'ل', name: 'lām', sound: 'l', leftJoining: true },
  { char: 'م', name: 'mim', sound: 'm', leftJoining: true },
  { char: 'ن', name: 'nun', sound: 'n', leftJoining: true },
  { char: 'و', name: 'wāw', sound: 'o, u, w', leftJoining: false },
  { char: 'ه', name: "hā'", sound: 'h', leftJoining: true },
  { char: 'ی', name: 'je', sound: 'j, i, ej', leftJoining: true },
]

const TATWEEL = 'ـ'

export interface LetterForms {
  isolated: string
  initial: string
  medial: string
  final: string
}

export function buildForms(letter: AlphabetLetter): LetterForms {
  const { char, leftJoining } = letter
  return {
    isolated: char,
    initial: leftJoining ? char + TATWEEL : char,
    medial: leftJoining ? TATWEEL + char + TATWEEL : TATWEEL + char,
    final: TATWEEL + char,
  }
}
