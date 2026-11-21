import type { GenerationResponse, GenerateRequest } from './pdfGenerationProtocol'
import { PreviewError, type GeneratedPdf, type PdfGenerator, type PreviewSnapshot } from './previewTypes'

// A worker that dies without an error event (for example a closed or killed
// worker) never answers; the job must fail instead of hanging.
const JOB_TIMEOUT_MS = 12_000

interface PendingJob {
  id: number
  revision: number
  resolve: (result: GeneratedPdf) => void
  reject: (error: PreviewError) => void
  timer: ReturnType<typeof setTimeout>
}

export interface WorkerPort {
  postMessage(message: GenerateRequest): void
  terminate(): void
  onmessage: ((event: MessageEvent<GenerationResponse>) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  onmessageerror: ((event: MessageEvent) => void) | null
}

export type WorkerFactory = () => WorkerPort

function createGenerationWorker(): WorkerPort {
  return new Worker(new URL('./pdfGenerationWorker.tsx', import.meta.url), { type: 'module' })
}

// Owns at most one worker and at most one running job. A worker that crashed,
// timed out, or was disposed is terminated and replaced on the next request, so
// a failure can never leave a half-dead worker behind.
export class PdfGenerationClient implements PdfGenerator {
  private worker: WorkerPort | null = null
  private pending: PendingJob | null = null
  private nextJobId = 1
  private readonly createWorker: WorkerFactory
  private readonly timeoutMs: number

  constructor(createWorker: WorkerFactory = createGenerationWorker, timeoutMs = JOB_TIMEOUT_MS) {
    this.createWorker = createWorker
    this.timeoutMs = timeoutMs
  }

  generate(snapshot: PreviewSnapshot): Promise<GeneratedPdf> {
    this.abandonPending()
    return new Promise<GeneratedPdf>((resolve, reject) => {
      const worker = this.ensureWorker()
      const id = this.nextJobId++
      const timer = setTimeout(() => this.fail('timeout', 'PDF generation did not respond.'), this.timeoutMs)
      this.pending = { id, revision: snapshot.revision, resolve, reject, timer }
      worker.postMessage({ type: 'generate', id, state: snapshot.state })
    })
  }

  dispose() {
    this.fail('aborted', 'PDF generation was stopped.')
  }

  // A newer request replaces the one that is waiting. The worker still finishes
  // the older job, but its result is ignored; at most one job is ever queued
  // behind the running one because the engine runs one cycle at a time.
  private abandonPending() {
    const job = this.pending
    if (!job) return
    this.pending = null
    clearTimeout(job.timer)
    job.reject(new PreviewError('aborted', 'PDF generation was superseded.'))
  }

  private ensureWorker(): WorkerPort {
    if (this.worker) return this.worker
    const worker = this.createWorker()
    worker.onmessage = (event) => this.handleMessage(worker, event.data)
    worker.onerror = () => this.failWorker(worker, 'crash', 'The PDF generation worker crashed.')
    worker.onmessageerror = () => this.failWorker(worker, 'crash', 'The PDF generation worker sent an unreadable message.')
    this.worker = worker
    return worker
  }

  private handleMessage(worker: WorkerPort, message: GenerationResponse) {
    if (worker !== this.worker || message.type === 'ready') return
    const job = this.pending
    if (!job || job.id !== message.id) return
    this.pending = null
    clearTimeout(job.timer)
    if (message.type === 'failed') {
      job.reject(new PreviewError('failed', message.message))
      return
    }
    job.resolve({
      revision: job.revision,
      bytes: new Uint8Array(message.bytes),
      pageKeys: message.pageKeys,
      generateMs: message.generateMs,
      fingerprintMs: message.fingerprintMs,
    })
  }

  private failWorker(worker: WorkerPort, kind: 'crash' | 'timeout', message: string) {
    if (worker === this.worker) this.fail(kind, message)
  }

  private fail(kind: 'crash' | 'timeout' | 'aborted', message: string) {
    const worker = this.worker
    this.worker = null
    if (worker) {
      worker.onmessage = null
      worker.onerror = null
      worker.onmessageerror = null
      worker.terminate()
    }
    const job = this.pending
    this.pending = null
    if (!job) return
    clearTimeout(job.timer)
    job.reject(new PreviewError(kind, message))
  }
}
