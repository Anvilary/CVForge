'use client'

import { MultilineListField } from '@/features/builder/components/form/MultilineListField'
import { DescriptionFormatToggle } from '@/features/builder/components/form/DescriptionFormatToggle'
import { type DescriptionMode } from '@/features/cv/model/types'

interface DescriptionFieldProps {
  label: string
  placeholder: string
  value: string[]
  mode: DescriptionMode
  onChange: (value: string[]) => void
  onToggleMode: () => void
}

export function DescriptionField({
  label,
  placeholder,
  value,
  mode,
  onChange,
  onToggleMode,
}: DescriptionFieldProps) {
  return (
    <MultilineListField
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      action={<DescriptionFormatToggle mode={mode} onToggle={onToggleMode} />}
    />
  )
}
