import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SettingControl } from './SettingControl'

describe('SettingControl', () => {
  it('associates its caption with the control it wraps', () => {
    const html = renderToStaticMarkup(
      <SettingControl label="Base Size" unit="pt"><input type="number" /></SettingControl>,
    )
    const labelFor = /<label for="([^"]+)"/.exec(html)?.[1]
    const inputId = /<input[^>]* id="([^"]+)"/.exec(html)?.[1]
    expect(labelFor).toBeTruthy()
    expect(labelFor).toBe(inputId)
    expect(html).toContain('Base Size<span class="sr-only"> (pt)</span>')
  })

  it('gives each control its own id', () => {
    const html = renderToStaticMarkup(
      <div>
        <SettingControl label="A"><select /></SettingControl>
        <SettingControl label="B"><select /></SettingControl>
      </div>,
    )
    const ids = [...html.matchAll(/<select[^>]* id="([^"]+)"/g)].map((match) => match[1])
    expect(new Set(ids).size).toBe(2)
  })
})
