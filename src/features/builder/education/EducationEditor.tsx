'use client'

import { useCV } from '@/features/cv/state/CVContext'
import { useAddFocusVersion } from '@/features/builder/context/BuilderAddFocusContext'
import { RepeatableSectionEditor } from '@/features/builder/components/sections/RepeatableSectionEditor'
import { EducationItem } from './EducationItem'

export function EducationEditor() {
  const { state } = useCV()
  const { education } = state.resume
  const focusLatestVersion = useAddFocusVersion('education')

  return (
    <RepeatableSectionEditor
      emptyLabel="No education added yet"
      items={education}
      focusLatestVersion={focusLatestVersion}
      renderItem={({ item, isExpanded, onToggle, isFirst, isLast }) => (
        <EducationItem
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
