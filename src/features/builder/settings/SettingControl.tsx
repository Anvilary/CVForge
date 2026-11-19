'use client'

import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'

interface SettingControlProps {
  label: string
  unit?: string
  // The one input or select this caption names. It receives the label's id.
  children: ReactNode
}

export function SettingControl({ label, unit, children }: SettingControlProps) {
  const controlId = useId()
  const control = isValidElement<{ id?: string }>(children)
    ? cloneElement(children as ReactElement<{ id?: string }>, { id: controlId })
    : children

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-1">
        <label
          htmlFor={controlId}
          className="text-[10px] font-semibold uppercase tracking-wider text-ink-2 leading-none"
        >
          {label}
          {unit && <span className="sr-only"> ({unit})</span>}
        </label>
        {unit && <span className="text-[9px] text-ink-4 leading-none" aria-hidden="true">{unit}</span>}
      </div>
      <div className="[&_input]:w-full [&_input]:py-1 [&_input]:px-2 [&_input]:text-[11px] [&_input]:rounded-md [&_select]:w-full [&_select]:py-1 [&_select]:px-2 [&_select]:text-[11px] [&_select]:rounded-md">
        {control}
      </div>
    </div>
  )
}
