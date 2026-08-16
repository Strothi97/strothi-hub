import { Card } from '@components/ui/Card'
import { PERSIAN_ALPHABET, buildForms } from './alphabet'

// Zwei Darstellungen im selben Component: eine Tabelle für Desktop, eine
// Karten-Liste fürs Handy — per CSS-Media-Query umgeschaltet (siehe
// .farsi-alphabet-table-wrap / .farsi-alphabet-list in farsi.css), damit
// kein JS-Viewport-Tracking nötig ist.
export function AlphabetTable() {
  return (
    <>
      <Card className="farsi-alphabet-table-wrap">
        <table className="farsi-alphabet-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Laut</th>
              <th>Ende</th>
              <th>Mitte</th>
              <th>Anfang</th>
              <th>Isoliert</th>
            </tr>
          </thead>
          <tbody>
            {PERSIAN_ALPHABET.map((letter) => {
              const forms = buildForms(letter)
              return (
                <tr key={letter.char}>
                  <td>{letter.name}</td>
                  <td className="farsi-alphabet-table__sound">{letter.sound}</td>
                  <td className="farsi-alphabet-table__glyph" dir="rtl">
                    {forms.final}
                  </td>
                  <td className="farsi-alphabet-table__glyph" dir="rtl">
                    {letter.leftJoining ? forms.medial : '–'}
                  </td>
                  <td className="farsi-alphabet-table__glyph" dir="rtl">
                    {letter.leftJoining ? forms.initial : '–'}
                  </td>
                  <td className="farsi-alphabet-table__glyph" dir="rtl">
                    {forms.isolated}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <div className="farsi-alphabet-list">
        {PERSIAN_ALPHABET.map((letter) => {
          const forms = buildForms(letter)
          return (
            <Card key={letter.char} className="farsi-alphabet-list__item">
              <span className="farsi-alphabet-list__isolated" dir="rtl">
                {forms.isolated}
              </span>
              <div className="farsi-alphabet-list__info">
                <span className="farsi-alphabet-list__name">{letter.name}</span>
                <span className="farsi-alphabet-list__sound">{letter.sound}</span>
              </div>
              <div className="farsi-alphabet-list__forms" dir="rtl">
                <span title="Anfang">{letter.leftJoining ? forms.initial : '–'}</span>
                <span title="Mitte">{letter.leftJoining ? forms.medial : '–'}</span>
                <span title="Ende">{forms.final}</span>
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
