import { type CVState } from '@/features/cv/model/types'

export function resumePdfFileName(state: CVState) {
  const name = state.resume.profile.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')

  return `${name || 'cvforge-resume'}.pdf`
}
