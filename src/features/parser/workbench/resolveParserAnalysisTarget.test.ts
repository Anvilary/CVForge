import { expect, it } from 'vitest'
import { defaultCVState } from '@/features/cv/model/defaults'
import { scoreCV } from '@/features/scoring/scoreCV'
import { analyzeExtractionEvidence } from '@/lib/parser/extractionDiagnostics'
import { parseHeuristicResume } from '@/lib/parser/heuristicResumeParser'
import { type PdfExtractionResult } from '@/lib/parser/pdfTextExtraction'
import { resolveParserAnalysisTarget } from './resolveParserAnalysisTarget'

const text = 'Jordan Taylor\njordan@example.org\nExperience\nSoftware Engineer\nBuilt three internal reporting tools.'
const pages = [{ text, lineCount: 5, itemCount: 5, fragmentedLineRatio: 0, possibleColumnOrder: false }]
const extraction: PdfExtractionResult = {
  pageCount: 1,
  text,
  pageTexts: [text],
  pages,
  metadata: {},
  diagnostics: analyzeExtractionEvidence(pages),
  warnings: [],
}
const source = { fileName: 'resume.pdf', objectUrl: 'blob:local', extraction }
const builder = {
  ...defaultCVState,
  resume: {
    ...defaultCVState.resume,
    profile: { ...defaultCVState.resume.profile, name: 'Builder Owner' },
  },
}

it('scores the Builder CV when no extraction is available', () => {
  const result = resolveParserAnalysisTarget(builder, null, true)
  expect(result.target.label).toBe('Current Builder CV')
  expect(result.target.description).toContain('No PDF was uploaded')
  expect(result.score).toEqual(scoreCV(builder))
  expect(result.isEmpty).toBe(false)
  expect(resolveParserAnalysisTarget(defaultCVState, null, false).isEmpty).toBe(true)
})

it('prefers the embedded session over the heuristic draft and Builder state', () => {
  const result = resolveParserAnalysisTarget(builder, {
    ...source,
    embeddedState: defaultCVState,
    heuristic: parseHeuristicResume(text)!,
  }, false)
  expect(result.target.label).toBe('CVForge Embedded Session')
  expect(result.score).toEqual(scoreCV(defaultCVState, text, { includeExtraction: true, extraction }))
})

it('scores the heuristic draft when no embedded session is available', () => {
  const heuristic = parseHeuristicResume(text)!
  const result = resolveParserAnalysisTarget(builder, { ...source, heuristic }, false)
  expect(result.target.label).toBe('Best-Effort External PDF Draft')
  expect(result.score).toEqual(scoreCV(heuristic.draft, text, { includeExtraction: true, extraction }))
})

it.each([
  [{}, 'Raw PDF Extraction Only'],
  [{ creator: 'CVForge' }, 'CVForge PDF Extraction Only'],
])('does not score a different CV as a proxy for extraction-only PDFs', (metadata, label) => {
  const result = resolveParserAnalysisTarget(builder, { ...source, extraction: { ...extraction, metadata } }, false)
  expect(result.target.label).toBe(label)
  expect(result.score).toBeNull()
  expect(result.isEmpty).toBe(false)
})
