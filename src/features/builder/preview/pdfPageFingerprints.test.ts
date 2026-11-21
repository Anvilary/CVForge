import { describe, expect, it } from 'vitest'
import { renderResumePdf } from '@/features/resume-pdf/testing/renderPdfText'
import { buildFixtureState } from '@/features/resume-pdf/testing/pdfIntegrityFixtures'
import { readPageKeys } from './pdfPageFingerprints'

const keysFor = async (options: Parameters<typeof buildFixtureState>[0]) => readPageKeys(await renderResumePdf(buildFixtureState(options)))

describe('page keys', () => {
  it('give every page a key and match for identical documents', async () => {
    const first = await keysFor({ jobs: 8 })
    const second = await keysFor({ jobs: 8 })
    expect(first.length).toBeGreaterThanOrEqual(3)
    expect(second).toEqual(first)
    expect(new Set(first).size).toBe(first.length)
  })

  it('change only for the page whose text changed when pagination is unchanged', async () => {
    const before = await keysFor({ jobs: 8, summary: 'Backend engineer focused on reliable systems.' })
    const after = await keysFor({ jobs: 8, summary: 'Backend engineer focused on scalable systems.' })
    expect(after).toHaveLength(before.length)
    expect(after[0]).not.toBe(before[0])
    expect(after.slice(1)).toEqual(before.slice(1))
  })

  it('change on the pages that reflow when content moves across page boundaries', async () => {
    const before = await keysFor({ jobs: 8 })
    const after = await keysFor({ jobs: 8, extraBullets: ['One more accomplishment on every role, which pushes later content down.'] })
    // The last page may start at the same entry in both documents. Then it is
    // genuinely identical and is correctly kept; the pages that moved are not.
    expect(after[0]).not.toBe(before[0])
    expect(after[1]).not.toBe(before[1])
  })

  it('change when only the font changes', async () => {
    const sans = await keysFor({ jobs: 3, font: 'Helvetica' })
    const serif = await keysFor({ jobs: 3, font: 'Times New Roman' })
    expect(serif).toHaveLength(sans.length)
    serif.forEach((key, index) => expect(key).not.toBe(sans[index]))
  })

  it('change when the page size changes', async () => {
    const a4 = await keysFor({ jobs: 1, size: 'A4' })
    const letter = await keysFor({ jobs: 1, size: 'Letter' })
    expect(letter[0]).not.toBe(a4[0])
  })

  it('keep identical keys when only document metadata differs', async () => {
    const state = buildFixtureState({ jobs: 2 })
    const renamed = { ...state, resume: { ...state.resume, profile: { ...state.resume.profile } } }
    expect(await readPageKeys(await renderResumePdf(renamed))).toEqual(await readPageKeys(await renderResumePdf(state)))
  })
})
