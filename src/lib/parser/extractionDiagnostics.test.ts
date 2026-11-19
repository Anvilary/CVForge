import { describe, expect, it } from 'vitest'
import { analyzeExtractionEvidence, type PdfPageEvidence } from './extractionDiagnostics'
import { pageEvidence } from './pdfTextExtraction'

describe('PDF extraction diagnostics', () => {
  it('reports image-only and garbled extraction signals', () => {
    const diagnostics = analyzeExtractionEvidence([
      page(''),
      page('��☠'),
    ])
    expect(diagnostics.emptyPageCount).toBe(2)
    expect(signal(diagnostics, 'selectable-text')).toBe('fail')
    expect(signal(diagnostics, 'replacement-characters')).not.toBe('pass')
  })

  it('detects repeated page edges, fragmentation, and possible column order', () => {
    const diagnostics = analyzeExtractionEvidence([
      page('Alex Morgan\nA\nB\nC\nD\nE\nF\nG\nH\nI\nJ\nK\nPage 1', 0.9, true),
      page('Alex Morgan\nA\nB\nC\nD\nE\nF\nG\nH\nI\nJ\nK\nPage 2', 0.9, true),
    ])
    expect(signal(diagnostics, 'repeated-edges')).toBe('warn')
    expect(signal(diagnostics, 'line-fragmentation')).toBe('warn')
    expect(signal(diagnostics, 'reading-order')).toBe('warn')
  })

  it('normalizes positioned PDF text into deterministic lines', () => {
    const evidence = pageEvidence([
      { str: 'Experience', transform: [1, 0, 0, 1, 40, 700] },
      { str: 'Engineer', transform: [1, 0, 0, 1, 40, 660] },
      { str: 'Anvilary', transform: [1, 0, 0, 1, 160, 660] },
    ])
    expect(evidence.text).toBe('Experience\nEngineer Anvilary')
    expect(evidence.lineCount).toBe(2)
  })
})

function page(
  text: string,
  fragmentedLineRatio = 0,
  possibleColumnOrder = false,
): PdfPageEvidence {
  return {
    text,
    lineCount: text.split('\n').filter(Boolean).length,
    itemCount: text.split(/\s+/).filter(Boolean).length,
    fragmentedLineRatio,
    possibleColumnOrder,
  }
}

function signal(result: ReturnType<typeof analyzeExtractionEvidence>, id: string) {
  return result.signals.find((item) => item.id === id)?.status
}

describe('letter-spaced text signal', () => {
  it('fails when headings were split into single letters', () => {
    const diagnostics = analyzeExtractionEvidence([
      page('Alex Morgan\nE X P E R I E N C E\nEngineer at Acme\nE D U C AT I O N\nBSc Computing\nS K I L L S\nTypeScript'),
    ])
    expect(signal(diagnostics, 'letter-spaced-text')).toBe('fail')
  })

  it('warns for a single spaced line and passes ordinary text, initials and acronyms', () => {
    expect(signal(analyzeExtractionEvidence([page('Alex Morgan\nS K I L L S\nTypeScript')]), 'letter-spaced-text')).toBe('warn')
    expect(signal(analyzeExtractionEvidence([page('J. R. R. Tolkien\nAWS GCP IBM SAP\nA B C\nEXPERIENCE\nEngineer')]), 'letter-spaced-text')).toBe('pass')
  })
})
