import { type PdfExtractionResult } from '@/lib/parser/pdfTextExtraction'
import { type HeuristicResult as ParserHeuristicResult } from '@/lib/parser/heuristicResumeParser'
import { type CVState } from '@/features/cv/model/types'

export type HeuristicResult = ParserHeuristicResult

export interface ParserDocument {
  fileName: string
  objectUrl: string
  extraction?: PdfExtractionResult
  embeddedState?: CVState
  heuristic?: HeuristicResult
  error?: string
}
