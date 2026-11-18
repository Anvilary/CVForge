'use client'

import { Icon } from '@/shared/components/ui/Icon'
import { type DescriptionMode } from '@/features/cv/model/types'

interface DescriptionFormatToggleProps {
  mode: DescriptionMode
  onToggle: () => void
}

export function DescriptionFormatToggle({ mode, onToggle }: DescriptionFormatToggleProps) {
  const isBullets = mode === 'bullets'
  return (
    <button
      type="button"
      onClick={onToggle}
      className="iconbtn sm"
      title={isBullets ? 'Switch to paragraph mode' : 'Switch to bullet mode'}
    >
      <Icon name={isBullets ? 'list' : 'align-left'} size={12} />
    </button>
  )
}
