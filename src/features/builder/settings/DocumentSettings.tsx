'use client'

import { useCV } from '@/features/cv/state/CVContext'
import { SelectInput } from '@/features/builder/components/form/SelectInput'
import { FieldLabel } from '@/features/builder/components/form/FieldLabel'
import { ThemeColorPicker } from './ThemeColorPicker'
import { FontFamilyPicker } from './FontFamilyPicker'
import { SettingControl } from './SettingControl'
import { type DocumentSize } from '@/features/cv/model/types'

export function DocumentSettings() {
  const { state, updateSettingsField } = useCV()
  const { documentSize, themeColor, fontFamily } = state.settings

  return (
    <div className="py-2 space-y-3">
      <div>
        <FieldLabel className="mb-1 text-[11px]">Theme Color</FieldLabel>
        <ThemeColorPicker
          value={themeColor}
          onChange={(val) => updateSettingsField('themeColor', val)}
        />
      </div>

      <div>
        <FieldLabel className="mb-1.5 text-[11px]">Font Family</FieldLabel>
        <FontFamilyPicker
          value={fontFamily}
          onChange={(val) => updateSettingsField('fontFamily', val)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SettingControl label="Page Size">
          <SelectInput
            value={documentSize}
            options={[
              { label: 'A4 (EU)', value: 'A4' },
              { label: 'Letter (US)', value: 'Letter' },
            ]}
            onChange={(e) => updateSettingsField('documentSize', e.target.value as DocumentSize)}
          />
        </SettingControl>
      </div>
    </div>
  )
}
