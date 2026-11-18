import { type CVState } from '@/features/cv/model/types'
import { announce } from '@/shared/utils/announce'
import { downloadBlob } from '@/shared/utils/downloadBlob'

export function exportCVState(state: CVState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  downloadBlob(blob, createBackupFileName(state))
  announce('JSON backup export completed.')
}

function createBackupFileName(state: CVState) {
  const name = state.resume.profile.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const prefix = name || 'cvforge'

  return `${prefix}-backup.json`
}
