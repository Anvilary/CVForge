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

it('scores the Builder CV when no extraction is available and fromBuilder is true', () => {
  const result = resolveParserAnalysisTarget(builder, null, true)
  expect(result.target.label).toBe('Current Builder CV')
  expect(result.target.description).toContain('No PDF was uploaded')
  expect(result.score).toEqual(scoreCV(builder))
  expect(result.isEmpty).toBe(false)
})

it('does not score the Builder CV when no PDF is uploaded and fromBuilder is false', () => {
  const result = resolveParserAnalysisTarget(builder, null, false)
  expect(result.score).toBeNull()
  expect(result.isEmpty).toBe(true)
  expect(result.target.label).toBe('No PDF selected')
  expect(result.target.description).toBe('Upload a PDF to view its analysis.')
})

it('does not score an empty Builder CV even when fromBuilder is true', () => {
  const result = resolveParserAnalysisTarget(defaultCVState, null, true)
  expect(result.score).toBeNull()
  expect(result.isEmpty).toBe(true)
  expect(result.target.label).toBe('Current Builder CV')
  expect(result.target.description).toContain('empty')
})

it('reports analysis failure on invalid PDF without scoring Builder CV', () => {
  const badDoc = { fileName: 'corrupt.pdf', objectUrl: '', error: 'Corrupt PDF file' }
  const result = resolveParserAnalysisTarget(builder, badDoc, false)
  expect(result.score).toBeNull()
  expect(result.isEmpty).toBe(true)
  expect(result.target.label).toBe('Analysis Failed')
  expect(result.target.description).toBe('Corrupt PDF file')
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
