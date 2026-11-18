'use client'

import { useCV } from '@/features/cv/state/CVContext'
import { useAddFocusVersion } from '@/features/builder/context/BuilderAddFocusContext'
import { RepeatableSectionEditor } from '@/features/builder/components/sections/RepeatableSectionEditor'
import { LanguageItem } from './LanguageItem'

export function LanguagesEditor() {
  const { state } = useCV()
  const { languages } = state.resume
  const focusLatestVersion = useAddFocusVersion('languages')

  return (
    <RepeatableSectionEditor
      emptyLabel="No languages added yet"
      items={languages}
      focusLatestVersion={focusLatestVersion}
      renderItem={({ item, isExpanded, onToggle, isFirst, isLast }) => (
        <LanguageItem
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
