import { pdf } from '@react-pdf/renderer'
import { ResumePdfDocument } from '@/features/resume-pdf/ResumePdfDocument'
import type { GenerateRequest, GenerationResponse } from './pdfGenerationProtocol'
import { readPageKeys } from './pdfPageFingerprints'

// Lays out and serializes the resume off the main thread. The worker holds no
// state between requests: each message carries a complete CV state, so a
// restarted worker needs no recovery. The preview and the download both use
// the bytes produced here.

interface WorkerScope {
  postMessage(message: GenerationResponse, transfer?: Transferable[]): void
  addEventListener(type: 'message', listener: (event: MessageEvent<GenerateRequest>) => void): void
}

const scope = self as unknown as WorkerScope

async function generate({ id, state }: GenerateRequest) {
  try {
    const startedAt = performance.now()
    const blob = await pdf(<ResumePdfDocument state={state} />).toBlob()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const generatedAt = performance.now()
    const pageKeys = await readPageKeys(bytes)
    const fingerprintMs = performance.now() - generatedAt
    scope.postMessage(
      { type: 'generated', id, bytes: bytes.buffer as ArrayBuffer, pageKeys, generateMs: generatedAt - startedAt, fingerprintMs },
      [bytes.buffer as ArrayBuffer],
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PDF generation failed.'
    scope.postMessage({ type: 'failed', id, message })
  }
}

scope.addEventListener('message', (event) => {
  if (event.data.type === 'generate') void generate(event.data)
})
scope.postMessage({ type: 'ready' })
