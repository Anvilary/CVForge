import type { PDFDocumentProxy } from 'pdfjs-dist'
import { type CVState } from '@/features/cv/model/types'
import { parseCVState } from '@/features/cv/model/parse'
import { isNewerSchemaVersion, migrateCVState } from '@/features/cv/persistence/cvMigrations'

export const CVFORGE_ATTACHMENT_NAME = 'cvforge-state.json'

type AttachmentSource = Pick<PDFDocumentProxy, 'getAttachments' | 'getAttachmentContent'>

type CVForgeAttachment =
  | { status: 'restored'; state: CVState }
  | { status: 'absent' | 'unsupported' | 'malformed' | 'failed' }

export async function extractCVForgeAttachment(
  pdf: AttachmentSource,
  signal?: AbortSignal,
): Promise<CVForgeAttachment> {
  let content: Uint8Array | null
  try {
    signal?.throwIfAborted()
    content = await readCVForgeAttachment(pdf, signal)
    signal?.throwIfAborted()
  } catch {
    signal?.throwIfAborted()
    return { status: 'failed' }
  }
  if (!content) return { status: 'absent' }

  let input: unknown
  try {
    input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(content))
  } catch {
    return { status: 'malformed' }
  }
  if (isNewerSchemaVersion(input)) return { status: 'unsupported' }

  const state = parseCVState(migrateCVState(input))
  return state ? { status: 'restored', state } : { status: 'malformed' }
}

// PDF.js 6 usually omits the bytes from its attachment Map.
async function readCVForgeAttachment(pdf: AttachmentSource, signal?: AbortSignal): Promise<Uint8Array | null> {
  const attachments = await pdf.getAttachments()
  signal?.throwIfAborted()
  if (!attachments) return null

  for (const [id, attachment] of attachments) {
    if (id !== CVFORGE_ATTACHMENT_NAME && attachment.filename !== CVFORGE_ATTACHMENT_NAME) continue
    const content = attachment.content ?? await pdf.getAttachmentContent(id)
    if (!content) throw new Error('CVForge attachment content is unavailable.')
    return content
  }
  return null
}
