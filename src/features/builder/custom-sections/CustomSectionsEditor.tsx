'use client'

import { useCV } from '@/features/cv/state/CVContext'
import { useAddFocusVersion } from '@/features/builder/context/BuilderAddFocusContext'
import { RepeatableSectionEditor } from '@/features/builder/components/sections/RepeatableSectionEditor'
import { CustomSectionItem } from './CustomSectionItem'

export function CustomSectionsEditor() {
  const { state } = useCV()
  const { customSections } = state.resume
  const focusLatestVersion = useAddFocusVersion('customSections')

  return (
    <RepeatableSectionEditor
      emptyLabel="No custom sections added yet"
      items={customSections}
      focusLatestVersion={focusLatestVersion}
      renderItem={({ item, isExpanded, onToggle, isFirst, isLast }) => (
        <CustomSectionItem
          item={item}
          isExpanded={isExpanded}
          onToggle={onToggle}
          isFirst={isFirst}
          isLast={isLast}
        />
      )}
    />
  )
}
