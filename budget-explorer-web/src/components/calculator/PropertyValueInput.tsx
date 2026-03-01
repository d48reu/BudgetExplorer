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
        className="block text-sm font-medium text-text-primary mb-1"
      >
        Assessed Property Value
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
          placeholder="Enter assessed value"
          className="w-full pl-7 pr-3 py-2.5 border border-border rounded-md bg-surface text-text-primary text-lg focus:outline-none focus:ring-2 focus:ring-mdc-blue focus:border-mdc-blue"
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
              'py-1.5 px-2 text-sm rounded-md border transition-colors cursor-pointer',
              value === preset.value
                ? 'border-mdc-blue bg-mdc-blue/10 text-mdc-blue font-medium'
                : 'border-border text-text-secondary hover:border-border-strong hover:text-text-primary'
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
    return 'This seems low for Miami-Dade -- you may owe no tax with homestead exemption.'
  }
  if (value > 2_000_000) {
    return 'This is in the top range for Miami-Dade properties.'
  }
  return null
}
