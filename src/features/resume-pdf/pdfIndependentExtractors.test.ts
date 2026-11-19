import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildFixtureState, fixtureContent, type FixtureFont, type FixtureLanguage } from './testing/pdfIntegrityFixtures'
import { renderResumePdf } from './testing/renderPdfText'

// Independent-extractor check: the same exports read by Poppler (two modes) and
// Ghostscript, engines that share no code with pdf.js. They run where the binaries
// exist; `make release-check` sets REQUIRE_INDEPENDENT_EXTRACTORS=1 so a missing
// binary fails the release instead of skipping it.

const REQUIRED = process.env.REQUIRE_INDEPENDENT_EXTRACTORS === '1'

function available(command: string, args: string[]) {
  return spawnSync(command, args, { encoding: 'utf8' }).error === undefined
}

const HAS_POPPLER = available('pdftotext', ['-v'])
const HAS_GHOSTSCRIPT = available('gs', ['-v'])

// Poppler's raw mode drops a tightened space between words ("FORMAÇÃOACADÉMICA",
// "Docker,Terraform"), which its default mode and the other engines keep. Words are
// still intact, so that engine is compared with spaces ignored.
const ENGINES: Array<{ name: string, ready: boolean, spacesUnreliable?: boolean, run: (file: string) => string }> = [
  { name: 'poppler', ready: HAS_POPPLER, run: (file) => text('pdftotext', [file, '-']) },
  { name: 'poppler -raw', ready: HAS_POPPLER, spacesUnreliable: true, run: (file) => text('pdftotext', ['-raw', file, '-']) },
  { name: 'ghostscript', ready: HAS_GHOSTSCRIPT, run: (file) => text('gs', ['-q', '-dNOPAUSE', '-dBATCH', '-sDEVICE=txtwrite', '-sOutputFile=-', file]) },
]

function text(command: string, args: string[]) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr}`)
  return result.stdout
}

const SPACED_LETTERS = /(?<![\p{L}])(?:\p{Lu} ){2,}\p{Lu}(?![\p{L}])/u
const FALSE_HYPHEN_AT_LINE_END = /[\p{L}\p{N}/]-$/u

const DOCUMENTS: Array<{ size: 'A4' | 'Letter', font: FixtureFont, language: FixtureLanguage }> = [
  { size: 'A4', font: 'Helvetica', language: 'en' },
  { size: 'Letter', font: 'Times New Roman', language: 'pt' },
  { size: 'A4', font: 'Courier New', language: 'en' },
]

describe('independent extractors', () => {
  it('are installed when the release gate requires them', () => {
    if (REQUIRED) expect({ poppler: HAS_POPPLER, ghostscript: HAS_GHOSTSCRIPT }).toEqual({ poppler: true, ghostscript: true })
  })

  const directory = mkdtempSync(join(tmpdir(), 'cvforge-pdf-'))
  afterAll(() => rmSync(directory, { recursive: true, force: true }))

  describe.each(DOCUMENTS)('export ($size, $font, $language)', ({ size, font, language }) => {
    const content = fixtureContent(language)
    const file = join(directory, `${size}-${font.split(' ')[0]}-${language}.pdf`)
    beforeAll(async () => { writeFileSync(file, await renderResumePdf(buildFixtureState({ size, font, language, jobs: 4 }))) })

    describe.each(ENGINES)('read by $name', ({ ready, run, spacesUnreliable }) => {
      it.skipIf(!ready)('keeps headings, keywords and contact details intact', () => {
        const output = run(file)
        const lines = output.split(/[\n\f]/).map((line) => line.trim().replace(/\s+/g, ' ')).filter(Boolean)
        const flat = lines.join(' ')
        const comparable = (value: string) => (spacesUnreliable ? value.replace(/\s/g, '') : value)
        for (const title of Object.values(content.titles)) {
          const wanted = comparable(title.toUpperCase())
          // Raw mode also glues a page's first line onto the previous page's last line.
          const found = lines.map(comparable).some((line) => (spacesUnreliable ? line.endsWith(wanted) : line === wanted))
          expect(found, title).toBe(true)
        }
        expect(lines.filter((line) => SPACED_LETTERS.test(line))).toEqual([])
        expect(lines.filter((line) => FALSE_HYPHEN_AT_LINE_END.test(line))).toEqual([])
        for (const keyword of [...content.technicalSkills, content.profile.name, content.profile.email, content.profile.phone]) {
          expect(comparable(flat), keyword).toContain(comparable(keyword))
        }
      })
    })
  })
})
