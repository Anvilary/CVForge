'use client'

import { useCV } from '@/features/cv/state/CVContext'
import { type RepeatableSectionKey } from '@/features/cv/state/cvActions'

export function useRepeatableItemUpdate<TField extends string>(sectionKey: RepeatableSectionKey, itemId: string) {
  const { updateSectionItem } = useCV()

  return (field: TField, value: unknown) => {
    updateSectionItem(sectionKey, itemId, field, value)
  }
}
