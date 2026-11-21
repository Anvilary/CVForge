import type {
  GeneratedPdf,
  PageCanvasStore,
  PageGeometry,
  PdfGenerator,
  PdfRasterizer,
  PreviewSnapshot,
  RasterDocument,
} from '../previewTypes'
import { PreviewError } from '../previewTypes'
import type { SchedulerClock } from '../updateScheduler'

interface Timer { at: number, callback: () => void, id: number }

// Deterministic time for scheduler and engine tests.
export class FakeClock implements SchedulerClock {
  private time = 0
  private nextId = 1
  private timers: Timer[] = []

  now() { return this.time }

  setTimer(callback: () => void, delayMs: number) {
    const timer = { at: this.time + delayMs, callback, id: this.nextId++ }
    this.timers.push(timer)
    return timer.id
  }

  clearTimer(handle: unknown) {
    this.timers = this.timers.filter((timer) => timer.id !== handle)
  }

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => { this.setTimer(resolve, ms) })
  }

  async advance(ms: number) {
    const end = this.time + ms
    for (;;) {
      const due = this.timers.filter((timer) => timer.at <= end).sort((a, b) => a.at - b.at)[0]
      if (!due) break
      this.timers = this.timers.filter((timer) => timer !== due)
      this.time = due.at
      due.callback()
      await flush()
    }
    this.time = end
    await flush()
  }
}

export async function flush() {
  for (let i = 0; i < 12; i += 1) await Promise.resolve()
}

export interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

export function generated(revision: number, pageKeys: string[], label = `pdf-${revision}`): GeneratedPdf {
  return { revision, bytes: new TextEncoder().encode(label), pageKeys, generateMs: 1, fingerprintMs: 1 }
}

export class FakeGenerator implements PdfGenerator {
  calls: PreviewSnapshot[] = []
  disposed = 0
  private jobs: Array<{ snapshot: PreviewSnapshot, job: Deferred<GeneratedPdf> }> = []

  generate(snapshot: PreviewSnapshot) {
    const job = deferred<GeneratedPdf>()
    this.calls.push(snapshot)
    this.jobs.push({ snapshot, job })
    return job.promise
  }

  /** Completes the oldest waiting job with the given page keys. */
  async finish(pageKeys: string[]) {
    const next = this.jobs.shift()
    if (!next) throw new Error('no job is waiting')
    next.job.resolve(generated(next.snapshot.revision, pageKeys))
    await flush()
  }

  async fail(error: PreviewError) {
    const next = this.jobs.shift()
    if (!next) throw new Error('no job is waiting')
    next.job.reject(error)
    await flush()
  }

  dispose() {
    this.disposed += 1
    this.jobs.shift()?.job.reject(new PreviewError('aborted', 'stopped'))
  }
}

export class FakeDocument implements RasterDocument {
  destroyed = false
  readonly rendered: Array<{ index: number, scale: number }> = []

  constructor(readonly pages: readonly PageGeometry[]) {}

  async renderPage(index: number, scale: number, signal: AbortSignal) {
    if (signal.aborted) throw new PreviewError('aborted', 'stopped')
    this.rendered.push({ index, scale })
    return { width: Math.round(this.pages[index].width * scale), height: Math.round(this.pages[index].height * scale), close() {} } as unknown as ImageBitmap
  }

  destroy() { this.destroyed = true }
}

export class FakeRasterizer implements PdfRasterizer {
  opened: Array<{ label: string, doc: FakeDocument }> = []
  disposed = 0
  pageCount = 2
  failNextOpen: PreviewError | null = null
  nextPages: PageGeometry[] | null = null

  async open(bytes: Uint8Array) {
    if (this.failNextOpen) {
      const error = this.failNextOpen
      this.failNextOpen = null
      throw error
    }
    const pages = this.nextPages ?? Array.from({ length: this.pageCount }, () => ({ width: 595, height: 842 }))
    const doc = new FakeDocument(pages)
    this.opened.push({ label: new TextDecoder().decode(bytes), doc })
    return doc
  }

  dispose() {
    this.disposed += 1
    for (const { doc } of this.opened) doc.destroy()
  }
}

export class FakeCanvases implements PageCanvasStore {
  count = 0
  painted: Array<{ index: number, width: number }> = []
  cleared = 0

  resize(count: number) { this.count = count }
  paint(index: number, bitmap: ImageBitmap) { this.painted.push({ index, width: bitmap.width }) }
  clear() { this.count = 0; this.cleared += 1 }
}
