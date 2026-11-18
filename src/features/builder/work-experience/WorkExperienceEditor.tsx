'use client'

import { useCV } from '@/features/cv/state/CVContext'
import { useAddFocusVersion } from '@/features/builder/context/BuilderAddFocusContext'
import { RepeatableSectionEditor } from '@/features/builder/components/sections/RepeatableSectionEditor'
import { WorkExperienceItem } from './WorkExperienceItem'

export function WorkExperienceEditor() {
  const { state } = useCV()
  const { workExperience } = state.resume
  const focusLatestVersion = useAddFocusVersion('workExperience')

  return (
    <RepeatableSectionEditor
      emptyLabel="No experience added yet"
      items={workExperience}
      focusLatestVersion={focusLatestVersion}
      renderItem={({ item, isExpanded, onToggle, isFirst, isLast }) => (
        <WorkExperienceItem
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
