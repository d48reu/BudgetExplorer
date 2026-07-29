'use client'

import { useState, useCallback } from 'react'
import clsx from 'clsx'

type PropertyValueInputProps = {
  value: number
  onChange: (value: number) => void
}

const PRESETS = [
  { label: '$150K', value: 150_000 },
  { label: '$300K', value: 300_000 },
  { label: '$500K', value: 500_000 },
  { label: '$750K', value: 750_000 },
] as const

/**
 * Dollar-formatted property value input with preset quick-pick buttons.
 * Format on blur pattern to avoid cursor-jumping issues.
 */
export function PropertyValueInput({ value, onChange }: PropertyValueInputProps) {
  const [displayValue, setDisplayValue] = useState(
    value > 0 ? value.toLocaleString('en-US') : ''
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Strip non-numeric characters
      const raw = e.target.value.replace(/[^0-9]/g, '')
      setDisplayValue(raw)
      onChange(Number(raw) || 0)
    },
    [onChange]
  )

  const handleBlur = useCallback(() => {
    const num = Number(displayValue.replace(/[^0-9]/g, '')) || 0
    setDisplayValue(num > 0 ? num.toLocaleString('en-US') : '')
  }, [displayValue])

  const handlePreset = useCallback(
    (presetValue: number) => {
      setDisplayValue(presetValue.toLocaleString('en-US'))
      onChange(presetValue)
    },
    [onChange]
  )

  // Soft guardrails for unusual values
  const guardrailMessage = getGuardrailMessage(value)

  return (
    <div>
      <label
        htmlFor="property-value"
        className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-text-secondary"
      >
        Assessed property value
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg font-medium pointer-events-none">
          $
        </span>
        <input
          id="property-value"
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Assessed value"
          className="w-full border border-text-primary bg-white py-3 pl-7 pr-3 text-lg text-text-primary focus:border-mdc-blue focus:outline-none"
        />
      </div>

      {guardrailMessage && (
        <p className="text-text-muted text-xs mt-1">{guardrailMessage}</p>
      )}

      <div className="grid grid-cols-4 gap-2 mt-3">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => handlePreset(preset.value)}
            className={clsx(
              'cursor-pointer border px-2 py-2 text-sm font-bold transition-colors',
              value === preset.value
                ? 'border-mdc-blue bg-mdc-blue text-white'
                : 'border-text-primary text-text-secondary hover:bg-text-primary hover:text-white'
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function getGuardrailMessage(value: number): string | null {
  if (value > 0 && value < 50_000) {
    return 'At this value, the homestead exemption may reduce some taxes to zero.'
  }
  if (value > 2_000_000) {
    return 'Check that you entered the assessed value, not the market value.'
  }
  return null
}
