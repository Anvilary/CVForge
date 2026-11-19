import { beforeAll, describe, expect, it } from 'vitest'
import { PAGE_PADDING_HORIZONTAL } from './resumePdfGeometry'
import { buildFixtureState, fixtureContent, type FixtureFont, type FixtureLanguage } from './testing/pdfIntegrityFixtures'
import { extractPdfjsText, renderResumePdf, type PdfjsText } from './testing/renderPdfText'

// Gate A: the exported PDF must keep its text intact for strict, gap-heuristic
// extractors. pdf.js is used because it is the strictest engine measured and is
// what CVForge's Analyzer uses. The independent-engine check lives in
// pdfIndependentExtractors.test.ts.

const SPACED_LETTERS = /(?<![\p{L}])(?:\p{Lu} ){2,}\p{Lu}(?![\p{L}])/u
const FALSE_HYPHEN_AT_LINE_END = /[\p{L}\p{N}/]-$/u
const BOUNDS_TOLERANCE_PT = 0.75
// react-pdf's line breaker lets a left-aligned line borrow the shrink budget of its
// spaces, which is widest in monospace text. Measured on the unmodified baseline: a full
// Courier line ends about 1.9 pt into the 50 pt margin, still far from the page edge.
const COURIER_BOUNDS_TOLERANCE_PT = 3

const MATRIX: Array<{ size: 'A4' | 'Letter', font: FixtureFont, language: FixtureLanguage }> = [
  { size: 'A4', font: 'Helvetica', language: 'en' },
  { size: 'Letter', font: 'Times New Roman', language: 'en' },
  { size: 'A4', font: 'Courier New', language: 'en' },
  { size: 'A4', font: 'Helvetica', language: 'pt' },
  { size: 'Letter', font: 'Times New Roman', language: 'pt' },
  { size: 'A4', font: 'Courier New', language: 'pt' },
]

function squash(lines: string[]) {
  return lines.join(' ').replace(/\s+/g, ' ')
}

describe.each(MATRIX)('exported PDF text ($size, $font, $language)', ({ size, font, language }) => {
  const content = fixtureContent(language)
  const state = buildFixtureState({ size, font, language, jobs: 5 })
  // Rendered one document at a time: concurrent react-pdf renders share layout state.
  let extraction: PdfjsText
  beforeAll(async () => { extraction = await extractPdfjsText(await renderResumePdf(state)) })

  it('extracts every section heading as one exact line, in the configured order', async () => {
    const { lines } = extraction
    const headings = Object.values(content.titles).map((title) => title.toUpperCase())
    const positions = headings.map((heading) => lines.indexOf(heading))
    expect(positions.every((position) => position >= 0), `missing headings in ${JSON.stringify(headings)}`).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    for (const heading of headings) expect(lines.filter((line) => line === heading)).toHaveLength(1)
  })

  it('has no letter-spaced words, replacement characters, or false hyphens', async () => {
    const { lines } = extraction
    expect(lines.filter((line) => SPACED_LETTERS.test(line))).toEqual([])
    expect(lines.filter((line) => line.includes('�'))).toEqual([])
    expect(lines.filter((line) => FALSE_HYPHEN_AT_LINE_END.test(line))).toEqual([])
  })

  it('keeps technical keywords, names, dates and contact details intact', async () => {
    const { lines } = extraction
    const text = squash(lines)
    const required = [
      ...content.technicalSkills,
      ...content.softSkills,
      content.profile.name,
      content.profile.email,
      content.profile.phone,
      content.profile.location,
      content.profile.website.replace('https://', ''),
      ...content.roles.slice(0, 3).map((role, index) => `${role} · ${content.companies[index]}`),
      ...content.bullets.slice(0, 4),
      content.summary,
      'Mar 2022 - Jan 2023',
    ]
    for (const expected of required) expect(text, expected).toContain(expected)
  })

  it('stays inside the printable width', async () => {
    const { maxRight, minLeft, pageWidth } = extraction
    const tolerance = font === 'Courier New' ? COURIER_BOUNDS_TOLERANCE_PT : BOUNDS_TOLERANCE_PT
    expect(minLeft).toBeGreaterThanOrEqual(PAGE_PADDING_HORIZONTAL - tolerance)
    expect(maxRight).toBeLessThanOrEqual(pageWidth - PAGE_PADDING_HORIZONTAL + tolerance)
  })
})

describe('pathological tokens', () => {
  const longUrl = 'https://example.org/portfolio/projects/distributed-systems/observability/final-performance-and-reliability-report-2026?version=complete&section=technical-appendices'
  const identifier = 'A1b2C3d4E5f6G7h8'.repeat(9)

  it('keeps long but line-sized tokens whole and everything inside the page', async () => {
    const mid = 'https://example.org/team/platform/reliability/2026-report'
    const state = buildFixtureState({ summary: `Portfolio ${mid} and mail alex.morgan.with.a.long.address@example-organization.org today.` })
    const { lines, maxRight, pageWidth } = await extractPdfjsText(await renderResumePdf(state))
    expect(squash(lines)).toContain(mid)
    expect(squash(lines)).toContain('alex.morgan.with.a.long.address@example-organization.org')
    expect(maxRight).toBeLessThanOrEqual(pageWidth - PAGE_PADDING_HORIZONTAL + BOUNDS_TOLERANCE_PT)
  })

  it('wraps tokens wider than a line inside the page without losing any characters', async () => {
    const state = buildFixtureState({ summary: `Portfolio ${longUrl} and ref ${identifier}` })
    const { lines, maxRight, pageWidth } = await extractPdfjsText(await renderResumePdf(state))
    expect(maxRight).toBeLessThanOrEqual(pageWidth - PAGE_PADDING_HORIZONTAL + BOUNDS_TOLERANCE_PT)
    // Known limitation: a token wider than one line gets react-pdf's wrap hyphen.
    const rejoined = lines.join('').replace(/-(?=\S)/g, '')
    expect(rejoined.replace(/-/g, '')).toContain(longUrl.replace(/-/g, ''))
    expect(rejoined.replace(/-/g, '')).toContain(identifier)
  })

  it('leaves user hyphens untouched', async () => {
    const state = buildFixtureState({ extraBullets: ['Built a well-documented, high-throughput, event-driven pipeline.'] })
    const { lines } = await extractPdfjsText(await renderResumePdf(state))
    expect(squash(lines)).toContain('well-documented, high-throughput, event-driven pipeline.')
  })
})

describe('character coverage', () => {
  it('round-trips Western European text and typographic punctuation exactly', async () => {
    const sample = 'Zoë Brontë, café, naïve, Ångström, Straße, “quotes”, ‘single’, • bullet, … and €'
    const { lines } = await extractPdfjsText(await renderResumePdf(buildFixtureState({ summary: sample })))
    expect(lines).toContain(sample)
  })
})

describe('bullets across page breaks', () => {
  it.each(['Helvetica', 'Times New Roman', 'Courier New'] as const)('never strands a bullet marker or splits a bullet from its text (%s)', async (font) => {
    for (const size of ['A4', 'Letter'] as const) {
      const state = buildFixtureState({ font, size, jobs: 14, extraBullets: ['Co-authored the internal API style guide: pagination, idempotency-keys, error-model, and deprecation-policy.'] })
      const { lines } = await extractPdfjsText(await renderResumePdf(state))
      expect(lines.filter((line) => line === '\u2022'), `${size} ${font}`).toEqual([])
      expect(lines.filter((line) => line.startsWith('\u2022')).every((line) => line.length > 3)).toBe(true)
    }
  })
})
