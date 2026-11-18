'use client'

import { AppHeader } from '@/shared/components/layout/AppHeader'
import { EmberBackground } from '@/shared/components/ui/EmberBackground'
import { WorkbenchShell } from '@/shared/components/workbench/WorkbenchShell'
import { WorkbenchNotices } from '@/features/import-export/WorkbenchNotices'
import { useCV } from '@/features/cv/state/CVContext'
import { BuilderEditorPanel } from './BuilderEditorPanel'
import { BuilderPreviewPanel } from './BuilderPreviewPanel'

export function BuilderWorkbench() {
  const { state } = useCV()
  const { profile } = state.resume

  return (
    <div className="app-shell h-screen overflow-hidden">
      <EmberBackground subdued />
      <AppHeader title={profile.name || 'Untitled CV'} />
      <WorkbenchShell
        leftPanel={<BuilderEditorPanel />}
        rightPanel={<BuilderPreviewPanel state={state} />}
        leftLabel="Edit"
        rightLabel="Preview"
        variant="builder"
        notice={<WorkbenchNotices />}
      />
    </div>
  )
}
