import { AlphabetTable } from './AlphabetTable'
import { SonderLaute } from './SonderLaute'

export function Alphabet() {
  return (
    <div className="farsi-alphabet-page">
      <SonderLaute />
      <AlphabetTable />
    </div>
  )
}
