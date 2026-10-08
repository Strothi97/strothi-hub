import { NumberStepper } from './NumberStepper'
import { INTERVAL_UNIT_LABELS, INTERVAL_UNIT_ORDER } from './recurrence'
import type { LeadReminder } from '@app-types/erinnerungen'

interface LeadRemindersInputProps {
  value: LeadReminder[]
  onChange: (value: LeadReminder[]) => void
}

const NEW_ROW: LeadReminder = { offsetN: 1, offsetUnit: 'WEEK', time: '09:00' }

// Zusätzliche, frühere Erinnerungspunkte vor dem eigentlichen Termin (z.B.
// "6 Monate vorher: Hotel buchen", oder bei einer jährlichen Erinnerung
// "1 Monat vorher" + "2 Wochen vorher") — unabhängig von den normalen
// "Uhrzeiten" oben, die den Termin selbst markieren. Funktioniert für jede
// Wiederholungsart: bei wiederkehrenden Terminen feuert jede Vorab-
// Erinnerung vor jedem Vorkommen erneut.
export function LeadRemindersInput({ value, onChange }: LeadRemindersInputProps) {
  const updateRow = (index: number, patch: Partial<LeadReminder>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="erinnerungen-lead-list">
      {value.map((row, index) => (
        <div key={index} className="erinnerungen-lead-card">
          <button
            type="button"
            className="erinnerungen-lead-card__remove"
            onClick={() => removeRow(index)}
            aria-label="Vorab-Erinnerung entfernen"
          >
            ×
          </button>
          <div className="erinnerungen-lead-card__row">
            <NumberStepper value={row.offsetN} onChange={(n) => updateRow(index, { offsetN: n })} min={0} />
            <div className="erinnerungen-lead-row__units">
              {INTERVAL_UNIT_ORDER.map((unit) => (
                <button
                  key={unit}
                  type="button"
                  className={`tool-chip ${row.offsetUnit === unit ? 'is-active' : ''}`.trim()}
                  onClick={() => updateRow(index, { offsetUnit: unit })}
                >
                  {INTERVAL_UNIT_LABELS[unit]}
                </button>
              ))}
            </div>
          </div>
          <div className="erinnerungen-lead-card__row">
            <span className="erinnerungen-lead-row__label">vorher, um</span>
            <input
              type="time"
              className="input erinnerungen-lead-row__time"
              value={row.time}
              onChange={(event) => updateRow(index, { time: event.target.value })}
            />
          </div>
        </div>
      ))}
      <button type="button" className="erinnerungen-time-add" onClick={() => onChange([...value, { ...NEW_ROW }])}>
        + Vorab-Erinnerung hinzufügen
      </button>
    </div>
  )
}
