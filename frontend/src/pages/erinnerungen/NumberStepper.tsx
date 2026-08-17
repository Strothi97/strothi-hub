interface NumberStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
}

// Ersetzt das native <input type="number"> samt seiner unpassend
// gestylten Browser-Pfeile durch eine zum restlichen Chip-Look passende
// Stepper-Pille mit eigenen −/+ Tasten.
export function NumberStepper({ value, onChange, min = 1 }: NumberStepperProps) {
  const clamp = (next: number) => Math.max(min, next)

  return (
    <div className="erinnerungen-stepper">
      <button type="button" onClick={() => onChange(clamp(value - 1))} aria-label="Verringern">
        −
      </button>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(clamp(Number(event.target.value) || min))}
      />
      <button type="button" onClick={() => onChange(clamp(value + 1))} aria-label="Erhöhen">
        +
      </button>
    </div>
  )
}
