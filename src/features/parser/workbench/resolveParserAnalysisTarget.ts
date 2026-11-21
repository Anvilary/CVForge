import { scoreCV } from '@/features/scoring/scoreCV'
import { isEmptyCV } from '@/features/cv/model/isEmptyCV'
import { isCvForgeGenerated } from '@/lib/parser/cvForgeDetection'
import { type CVState } from '@/features/cv/model/types'
import { type ParserDocument } from '../upload/parserTypes'
import { type ParserAnalysisTarget } from './parserAnalysisTypes'

export function resolveParserAnalysisTarget(
  state: CVState,
  document: ParserDocument | null,
  fromBuilder: boolean
): ParserAnalysisTarget {
  if (document?.error) {
    return {
      score: null,
      isEmpty: true,
      target: {
        label: 'Analysis Failed',
        description: document.error,
        caveat: 'The uploaded file could not be analyzed.',
      },
    }
  }

  if (!document?.extraction) {
    if (!fromBuilder) {
      return {
        score: null,
        isEmpty: true,
        target: {
          label: 'No PDF selected',
          description: 'Upload a PDF to view its analysis.',
          caveat: 'No document is currently being analyzed.',
        },
      }
    }

    const isEmpty = isEmptyCV(state)
    return {
      score: isEmpty ? null : scoreCV(state),
      isEmpty,
      target: {
        label: 'Current Builder CV',
        description: isEmpty
          ? 'The current Builder CV is empty. Add profile details or a section in Builder, then return here for analysis.'
          : 'These checks evaluate the active CV from Builder. No PDF was uploaded and no server storage is used.',
        caveat: 'Upload a PDF to analyze an exported document instead.',
      },
    }
  }

  const extractedText = document.extraction.text
  const isForge = isCvForgeGenerated(document.extraction.metadata)

  if (document.embeddedState) {
    return {
      score: scoreCV(document.embeddedState, extractedText, {
        includeExtraction: true,
        extraction: document.extraction,
      }),
      isEmpty: false,
      target: {
        label: 'CVForge Embedded Session',
        description: 'These checks use the structured session embedded inside the uploaded CVForge PDF.',
        caveat: 'Extraction confidence remains separate from these CV content checks.',
      },
    }
  }

  if (document.heuristic) {
    return {
      score: scoreCV(document.heuristic.draft, extractedText, {
        includeExtraction: true,
        extraction: document.extraction,
      }),
      isEmpty: false,
      target: {
        label: 'Best-Effort External PDF Draft',
        description: 'These checks use the conservative draft parsed from the uploaded external PDF.',
        caveat: 'The draft may be incomplete or wrong. Review imported fields before using them.',
      },
    }
  }

  return {
    score: null,
    isEmpty: false,
    target: {
      label: isForge ? 'CVForge PDF Extraction Only' : 'Raw PDF Extraction Only',
      description: 'CVForge extracted text from this PDF, but there is no structured CV draft to score.',
      caveat: 'The current Builder CV is intentionally not scored as a proxy for this upload.',
    },
  }
}
