'use client'

import { useCV } from '@/features/cv/state/CVContext'
import { useAddFocusVersion } from '@/features/builder/context/BuilderAddFocusContext'
import { RepeatableSectionEditor } from '@/features/builder/components/sections/RepeatableSectionEditor'
import { ProjectItem } from './ProjectItem'

export function ProjectsEditor() {
  const { state } = useCV()
  const { projects } = state.resume
  const focusLatestVersion = useAddFocusVersion('projects')

  return (
    <RepeatableSectionEditor
      emptyLabel="No projects added yet"
      items={projects}
      focusLatestVersion={focusLatestVersion}
      renderItem={({ item, isExpanded, onToggle, isFirst, isLast }) => (
        <ProjectItem
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
