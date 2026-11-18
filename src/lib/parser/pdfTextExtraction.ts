import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import { findPhantomJoins, isReactPdfProducer, repairPhantomSpaces } from './phantomSpaces'
import {
  analyzeExtractionEvidence,
  type PdfExtractionDiagnostics,
  type PdfPageEvidence,
} from './extractionDiagnostics'

export interface PdfMetadata {
  creator?: string
  producer?: string
  subject?: string
  keywords?: string
  [key: string]: unknown
}

export interface PdfExtractionResult {
  pageCount: number
  text: string
  pageTexts: string[]
  pages: PdfPageEvidence[]
  metadata: PdfMetadata
  diagnostics: PdfExtractionDiagnostics
  warnings: string[]
}

export async function extractPdfText(
  pdf: PDFDocumentProxy,
  ops: PdfOps,
  signal?: AbortSignal,
): Promise<PdfExtractionResult> {
  const { info } = await pdf.getMetadata()
  const repairPhantoms = isReactPdfProducer(info) ? ops : null
  const pages = await extractPagesSequentially(pdf, repairPhantoms, signal)
  signal?.throwIfAborted()
  const pageTexts = pages.map((page) => page.text)
  const diagnostics = analyzeExtractionEvidence(pages)

  return {
    pageCount: pdf.numPages,
    text: pageTexts.join('\n\n'),
    pageTexts,
    pages,
    metadata: (info || {}) as PdfMetadata,
    diagnostics,
    warnings: diagnostics.signals
      .filter((item) => item.status !== 'pass')
      .map((item) => item.detected),
  }
}

type PdfOps = typeof import('pdfjs-dist').OPS

// `phantomOps` is set only for react-pdf and CVForge documents, whose older
// exports contain phantom spaces inside words (see phantomSpaces.ts).
async function extractPagesSequentially(pdf: PDFDocumentProxy, phantomOps: PdfOps | null, signal?: AbortSignal) {
  const pages: PdfPageEvidence[] = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    signal?.throwIfAborted()
    const page = await pdf.getPage(pageNumber)
    try {
      const content = await page.getTextContent()
      signal?.throwIfAborted()
      const evidence = pageEvidence(content.items)
      if (phantomOps) evidence.text = repairPhantomSpaces(evidence.text, await phantomJoins(page, phantomOps))
      pages.push(evidence)
    } finally {
      page.cleanup?.()
    }
  }
  return pages
}

async function phantomJoins(page: PDFPageProxy, ops: PdfOps) {
  const list = await page.getOperatorList()
  const runs = list.fnArray.flatMap((fn, index) => (
    fn === ops.showText || fn === ops.showSpacedText ? [list.argsArray[index][0]] : []
  ))
  return findPhantomJoins(runs)
}

export function pageEvidence(items: unknown[]): PdfPageEvidence {
  const positioned = items.map(readTextItem).filter((item): item is TextItem => Boolean(item?.text))
  const lineGroups = new Map<number, TextItem[]>()
  positioned.forEach((item) => {
    const lineKey = Math.round(item.y / 3) * 3
    lineGroups.set(lineKey, [...(lineGroups.get(lineKey) ?? []), item])
  })
  const orderedLines = [...lineGroups.entries()]
    .sort(([left], [right]) => right - left)
    .map(([, lineItems]) => lineItems
      .sort((left, right) => left.x - right.x)
      .map((item) => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim())
    .filter(Boolean)
  const fragmentedLineRatio = orderedLines.length
    ? orderedLines.filter((line) => line.length < 20).length / orderedLines.length
    : 0
  const lineStarts = [...lineGroups.values()]
    .map((lineItems) => Math.min(...lineItems.map((item) => item.x)))
  const lowBand = lineStarts.filter((x) => x < 220).length
  const highBand = lineStarts.filter((x) => x >= 220).length
  const upwardJumps = positioned.slice(1).filter((item, index) => item.y > positioned[index].y + 8).length

  return {
    text: orderedLines.join('\n'),
    lineCount: orderedLines.length,
    itemCount: positioned.length,
    fragmentedLineRatio,
    possibleColumnOrder: (lowBand >= 3 && highBand >= 3) || upwardJumps >= 4,
  }
}

function readTextItem(item: unknown): TextItem | null {
  if (!item || typeof item !== 'object' || !('str' in item)) return null
  const candidate = item as { str: unknown; transform?: unknown }
  if (typeof candidate.str !== 'string' || !candidate.str.trim()) return null
  const transform = Array.isArray(candidate.transform) ? candidate.transform : []
  return {
    text: candidate.str.trim(),
    x: typeof transform[4] === 'number' ? transform[4] : 0,
    y: typeof transform[5] === 'number' ? transform[5] : 0,
  }
}

interface TextItem {
  text: string
  x: number
  y: number
}

