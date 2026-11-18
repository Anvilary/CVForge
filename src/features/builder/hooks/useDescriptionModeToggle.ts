import { useCV } from '@/features/cv/state/CVContext'
import { type Settings, type DescriptionMode } from '@/features/cv/model/types'

type DescriptionSection = keyof Settings['descriptionMode']

export function useDescriptionModeToggle(section: DescriptionSection): {
  mode: DescriptionMode
  toggleMode: () => void
} {
  const { state, updateSettingsField } = useCV()
  const mode = state.settings.descriptionMode[section]

  const toggleMode = () => {
    updateSettingsField('descriptionMode', {
      ...state.settings.descriptionMode,
      [section]: mode === 'bullets' ? 'paragraph' : 'bullets',
    })
  }

  return { mode, toggleMode }
}
