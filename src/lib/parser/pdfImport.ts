import type { PDFDocumentProxy } from 'pdfjs-dist'
import { type CVState } from '@/features/cv/model/types'
import { type PdfExtractionResult, extractPdfText } from './pdfTextExtraction'
import { type HeuristicResult, parseHeuristicResume } from './heuristicResumeParser'
import { extractCVForgeAttachment } from './extractCVForgeAttachment'
import { validateAnalysisFile, validateAnalysisPageCount } from './analysisFileValidation'

export interface PdfImportAnalysis {
  extraction: PdfExtractionResult
  embeddedState?: CVState
  heuristic?: HeuristicResult
  sessionError?: string
}

export type PdfImportResult =
  | { success: true; analysis: PdfImportAnalysis }
  | { success: false; error: string }

const sessionErrors = {
  unsupported: 'This PDF contains a session from a newer version of CVForge. Open it using a newer version to restore the session.',
  malformed: 'This PDF contains a damaged or invalid CVForge session. Restore from a JSON backup or the original PDF.',
  failed: 'CVForge could not read this PDF’s embedded session information. Try the original PDF or a JSON backup.',
}

export async function analyzePdfImport(
  file: File,
  { signal }: { signal?: AbortSignal } = {},
): Promise<PdfImportResult> {
  try {
    signal?.throwIfAborted()
    const validationError = await validateAnalysisFile(file)
    signal?.throwIfAborted()
    if (validationError) return { success: false, error: validationError }

    const pdfjs = await import('pdfjs-dist')
    signal?.throwIfAborted()
    const data = new Uint8Array(await file.arrayBuffer())
    signal?.throwIfAborted()

    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
    const loadingTask = pdfjs.getDocument({ data, stopAtErrors: true })

    let onAbort: (() => void) | undefined
    let result: PdfImportResult
    try {
      const cancelled = new Promise<never>((_, reject) => {
        onAbort = () => reject(signal?.reason)
        signal?.addEventListener('abort', onAbort, { once: true })
      })
      result = await Promise.race([
        analyzeDocument(loadingTask.promise, pdfjs.OPS, signal),
        cancelled,
      ])
    } finally {
      if (onAbort) signal?.removeEventListener('abort', onAbort)
      // PDF.js 6 ties the document and worker lifetime to the loading task.
      await loadingTask.destroy().catch(() => {
        // Cleanup is best effort after a load or worker failure.
      })
    }
    signal?.throwIfAborted()
    return result
  } catch (error) {
    return {
      success: false,
      error: signal?.aborted ? 'PDF analysis was cancelled.' : pdfErrorMessage(error),
    }
  }
}

async function analyzeDocument(
  loading: Promise<PDFDocumentProxy>,
  ops: typeof import('pdfjs-dist').OPS,
  signal?: AbortSignal,
): Promise<PdfImportResult> {
  const pdf = await loading
  signal?.throwIfAborted()
  const pageCountError = validateAnalysisPageCount(pdf.numPages)
  if (pageCountError) return { success: false, error: pageCountError }

  const extraction = await extractPdfText(pdf, ops, signal)
  const attachment = await extractCVForgeAttachment(pdf, signal)

  if (attachment.status === 'restored') {
    return { success: true, analysis: { extraction, embeddedState: attachment.state } }
  }
  if (attachment.status === 'absent') {
    const heuristic = parseHeuristicResume(extraction.text) ?? undefined
    return { success: true, analysis: { extraction, heuristic } }
  }
  return { success: true, analysis: { extraction, sessionError: sessionErrors[attachment.status] } }
}

function pdfErrorMessage(error: unknown) {
  const detail = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  if (/password|encrypted/i.test(detail)) {
    return 'This PDF is encrypted or password-protected. Remove the password and export an unprotected copy before analysis.'
  }
  if (/invalid pdf|missing pdf|unexpected response|xref|truncated|format/i.test(detail)) {
    return 'CVForge could not read this PDF. It may be malformed, incomplete, or truncated.'
  }
  return 'CVForge could not analyze this PDF. Re-export it as a standard, unprotected PDF and try again.'
}
