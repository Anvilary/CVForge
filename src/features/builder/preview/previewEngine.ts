import type { CVState } from '@/features/cv/model/types'
import { measurePreviewStage, previewNow } from './previewMetrics'
import {
  PreviewError,
  type GeneratedPdf,
  type PageCanvasStore,
  type PageGeometry,
  type PdfGenerator,
  type PdfLinkAnnotation,
  type PdfRasterizer,
  type PreviewExport,
  type PreviewSnapshot,
  type PreviewView,
  type RasterDocument,
  type RenderProgress,
} from './previewTypes'
import { UpdateScheduler, type SchedulerClock } from './updateScheduler'

// Zoom, Fit, panel width, and device pixel ratio only change how sharply an
// existing PDF is painted. They wait for the value to settle, then repaint the
// retained document; they never regenerate it.
const RESCALE_SETTLE_MS = 150
const RESCALE_TOLERANCE = 0.05
// A crashed or hung worker is replaced and the update retried once on its own.
const MAX_AUTOMATIC_RETRIES = 1
const UPDATE_FAILED_MESSAGE = 'Preview could not be updated.'

interface PageRecord {
  key: string
  scale: number
  geometry: PageGeometry
}

// The one PDF on screen: its revision, the exact state it was generated from,
// the bytes the download will use, and the parsed document kept for repainting.
interface DisplayedDocument {
  revision: number
  state: CVState
  bytes: Uint8Array
  doc: RasterDocument
  pages: PageRecord[]
}

interface ExportWaiter {
  revision: number
  resolve: (document: PreviewExport) => void
  reject: (error: PreviewError) => void
}

interface PaintedPage {
  index: number
  bitmap: ImageBitmap
}

export interface PreviewEnginePorts {
  generator: PdfGenerator
  rasterizer: PdfRasterizer
  canvases: PageCanvasStore
  clock?: SchedulerClock
}

const EMPTY_VIEW: PreviewView = {
  pages: [],
  displayedRevision: null,
  latestRevision: 0,
  isUpdating: false,
  error: '',
  progress: null,
}

// Owns the preview pipeline and its revisions:
//
//   CV state -> revision N -> generated PDF N -> painted pages -> displayed N
//
// Revisions only move forward. A result is published only if it is newer than
// what is on screen, all changed pages of a revision are painted in one
// synchronous step, and the download takes the displayed revision's own bytes,
// so what is exported is exactly what was shown.
export class PreviewEngine {
  private readonly ports: PreviewEnginePorts
  private readonly clock: SchedulerClock
  private scheduler: UpdateScheduler
  private latest: PreviewSnapshot | null = null
  private displayed: DisplayedDocument | null = null
  private revision = 0
  private scale = 0
  private lastScale = 0
  private epoch = 0
  private retries = 0
  private error = ''
  private progress: RenderProgress | null = null
  private requestedAt: number | null = null
  private abort = new AbortController()
  private settleTimer: unknown = null
  private waiters: ExportWaiter[] = []
  private listeners = new Set<() => void>()
  private view: PreviewView = EMPTY_VIEW

  constructor(ports: PreviewEnginePorts) {
    this.ports = ports
    this.clock = ports.clock ?? { now: previewNow, setTimer: (fn, ms) => setTimeout(fn, ms), clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) }
    this.scheduler = this.createScheduler()
  }

  // Store contract for useSyncExternalStore.
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getView = () => this.view

  /** Offers the current CV state. Unchanged content is ignored. */
  submit(state: CVState) {
    const latest = this.latest
    if (latest && latest.state.resume === state.resume && latest.state.settings === state.settings) {
      latest.state = state
      if (this.displayed?.revision === latest.revision) this.displayed.state = state
      return
    }
    this.latest = { revision: ++this.revision, state }
    this.retries = 0
    this.requestedAt ??= this.clock.now()
    this.publishView()
    this.scheduler.request()
  }

  /** The CV is empty: nothing is generated or shown. Idle workers stay warm. */
  clear() {
    if (!this.latest && !this.displayed) return
    this.reset({ keepIdleWorkers: true })
    this.publishView()
  }

  /** Painting scale (zoom times pixel ratio). Zero means hidden: pause. */
  setScale(scale: number) {
    const wasHidden = this.scale <= 0
    this.scale = scale
    if (scale > 0) this.lastScale = scale
    this.syncPause()
    if (scale <= 0 || !this.displayed || !this.needsRepaint(this.displayed.pages, scale)) return
    this.requestRepaint(wasHidden)
  }

  retry() {
    this.error = ''
    this.retries = 0
    this.publishView()
    this.scheduler.request({ immediate: true })
  }

  /**
   * Resolves with the displayed document once it is at least as new as the CV
   * state was when this was called. Rejects if that update fails.
   */
  exportCurrent(): Promise<PreviewExport> {
    const target = this.latest
    if (!target) return Promise.reject(new PreviewError('failed', 'There is no CV to export.'))
    if (this.displayed && this.displayed.revision >= target.revision) return Promise.resolve(toExport(this.displayed))
    return new Promise<PreviewExport>((resolve, reject) => {
      this.waiters.push({ revision: target.revision, resolve, reject })
      this.syncPause()
      this.scheduler.request({ immediate: true })
    })
  }

  /** Stops all work and releases every worker, document, and canvas. Reusable. */
  release() {
    this.reset()
    this.publishView()
  }

  private reset(options: { keepIdleWorkers?: boolean } = {}) {
    const wasBusy = this.scheduler.isBusy
    this.epoch += 1
    this.abort.abort()
    this.abort = new AbortController()
    this.clearSettleTimer()
    this.scheduler.dispose()
    this.scheduler = this.createScheduler()
    if (!options.keepIdleWorkers || wasBusy) {
      this.ports.generator.dispose()
      this.ports.rasterizer.dispose()
    }
    this.displayed?.doc.destroy()
    this.ports.canvases.clear()
    this.rejectWaiters(new PreviewError('aborted', 'The preview was closed.'))
    this.latest = null
    this.displayed = null
    this.error = ''
    this.progress = null
    this.retries = 0
    this.requestedAt = null
  }

  private createScheduler() {
    const scheduler = new UpdateScheduler(() => this.runCycle(), this.clock)
    scheduler.setPaused(this.scale <= 0 && this.waiters.length === 0)
    return scheduler
  }

  private syncPause() {
    this.scheduler.setPaused(this.scale <= 0 && this.waiters.length === 0)
  }

  private targetScale() {
    return this.scale > 0 ? this.scale : this.lastScale || 1
  }

  // Resolves with the main-thread milliseconds the cycle used, which is what
  // the scheduler spaces cycles by.
  private async runCycle(): Promise<number> {
    const epoch = this.epoch
    const snapshot = this.latest
    if (!snapshot) return 0
    const { signal } = this.abort
    const requestedAt = this.requestedAt ?? this.clock.now()
    this.requestedAt = null
    measurePreviewStage('schedule', requestedAt)
    try {
      return await this.updateTo(snapshot, this.targetScale(), requestedAt, signal, epoch)
    } catch (error) {
      if (epoch === this.epoch) this.handleFailure(error)
      return 0
    }
  }

  private async updateTo(snapshot: PreviewSnapshot, scale: number, requestedAt: number, signal: AbortSignal, epoch: number) {
    const current = this.displayed
    const hasNewContent = !current || current.revision < snapshot.revision
    const generated = hasNewContent ? await this.generate(snapshot, epoch) : null
    // Generation ran in a worker; from here on the main thread is in use.
    const mainStartedAt = this.clock.now()
    const doc = generated ? await this.openDocument(generated, epoch) : await this.liveDocument(current as DisplayedDocument, epoch)
    const keys = generated ? generated.pageKeys : (current as DisplayedDocument).pages.map((page) => page.key)
    try {
      const indices = pagesToPaint(doc, keys, current?.pages ?? [], scale)
      const painted = await this.paintPages(doc, indices, scale, signal, epoch)
      this.assertCurrent(epoch)
      if (generated || indices.length > 0) {
        this.publish({ snapshot, generated, doc, keys, scale, painted, indices, requestedAt })
      }
    } catch (error) {
      if (generated) doc.destroy()
      throw error
    }
    return this.clock.now() - mainStartedAt
  }

  private async generate(snapshot: PreviewSnapshot, epoch: number): Promise<GeneratedPdf> {
    this.setProgress({ stage: 'preparing', pagesDone: 0, pagesTotal: 0 })
    // The first PDF is laid out in one worker while PDF.js starts in the other.
    if (!this.displayed) this.ports.rasterizer.warmUp?.()
    const startedAt = this.clock.now()
    const generated = await this.ports.generator.generate(snapshot)
    measurePreviewStage('generate', startedAt, { worker: generated.generateMs, fingerprint: generated.fingerprintMs })
    this.assertCurrent(epoch)
    return generated
  }

  private async openDocument(generated: GeneratedPdf, epoch: number): Promise<RasterDocument> {
    const startedAt = this.clock.now()
    const doc = await this.ports.rasterizer.open(generated.bytes)
    measurePreviewStage('load', startedAt)
    if (epoch !== this.epoch) {
      doc.destroy()
      throw new PreviewError('aborted', 'The preview was closed.')
    }
    return doc
  }

  // After a worker failure the retained document is gone; reopen it from the
  // exact bytes that are on screen.
  private async liveDocument(displayed: DisplayedDocument, epoch: number): Promise<RasterDocument> {
    if (!displayed.doc.destroyed) return displayed.doc
    const doc = await this.ports.rasterizer.open(displayed.bytes)
    if (epoch !== this.epoch) {
      doc.destroy()
      throw new PreviewError('aborted', 'The preview was closed.')
    }
    displayed.doc = doc
    return doc
  }

  private async paintPages(doc: RasterDocument, indices: number[], scale: number, signal: AbortSignal, epoch: number) {
    const painted: PaintedPage[] = []
    const startedAt = this.clock.now()
    try {
      for (const index of indices) {
        painted.push({ index, bitmap: await doc.renderPage(index, scale, signal) })
        this.assertCurrent(epoch)
        if (!this.displayed) this.setProgress({ stage: 'rendering', pagesDone: painted.length, pagesTotal: indices.length })
      }
    } catch (error) {
      for (const page of painted) page.bitmap.close()
      throw error
    }
    measurePreviewStage('raster', startedAt, { pages: indices.length, skipped: doc.pages.length - indices.length, scale })
    return painted
  }

  // Everything below runs synchronously, so the browser never paints a state
  // that mixes two revisions.
  private publish(update: PublishUpdate) {
    const { doc, painted, requestedAt } = update
    const previous = this.displayed
    this.ports.canvases.resize(doc.pages.length)
    for (const page of painted) this.ports.canvases.paint(page.index, page.bitmap)
    this.displayed = nextDisplayed(update, previous)
    if (previous && previous.doc !== doc) previous.doc.destroy()
    this.error = ''
    this.progress = null
    this.retries = 0
    this.resolveWaiters()
    measurePreviewStage('published', requestedAt)
    this.publishView()
    this.followUp()
  }

  // Content that arrived while a cycle ran, or a zoom that changed meanwhile,
  // is handled by the next cycle.
  private followUp() {
    const displayed = this.displayed
    if (!displayed) return
    if (this.latest && this.latest.revision > displayed.revision) this.scheduler.request()
    else if (this.scale > 0 && this.needsRepaint(displayed.pages, this.scale)) this.requestRepaint(false)
  }

  private handleFailure(error: unknown) {
    const kind = error instanceof PreviewError ? error.kind : 'failed'
    if (kind === 'aborted') return
    console.error(`PDF preview update failed (${kind}).`)
    if ((kind === 'crash' || kind === 'timeout') && this.retries < MAX_AUTOMATIC_RETRIES) {
      this.retries += 1
      this.ports.rasterizer.dispose()
      this.scheduler.request({ immediate: true })
      return
    }
    this.error = UPDATE_FAILED_MESSAGE
    this.progress = null
    this.rejectWaiters(new PreviewError(kind, UPDATE_FAILED_MESSAGE))
    this.publishView()
  }

  private needsRepaint(pages: PageRecord[], scale: number) {
    return pages.some((page) => scaleDiffers(page.scale, scale))
  }

  private requestRepaint(immediate: boolean) {
    this.clearSettleTimer()
    if (immediate) {
      this.scheduler.request({ immediate: true })
      return
    }
    this.settleTimer = this.clock.setTimer(() => {
      this.settleTimer = null
      this.scheduler.request({ immediate: true })
    }, RESCALE_SETTLE_MS)
  }

  private clearSettleTimer() {
    if (this.settleTimer === null) return
    this.clock.clearTimer(this.settleTimer)
    this.settleTimer = null
  }

  private resolveWaiters() {
    const displayed = this.displayed
    if (!displayed) return
    const remaining: ExportWaiter[] = []
    for (const waiter of this.waiters) {
      if (displayed.revision >= waiter.revision) waiter.resolve(toExport(displayed))
      else remaining.push(waiter)
    }
    this.waiters = remaining
    this.syncPause()
  }

  private rejectWaiters(error: PreviewError) {
    const waiters = this.waiters
    this.waiters = []
    for (const waiter of waiters) waiter.reject(error)
    this.syncPause()
  }

  private setProgress(progress: RenderProgress) {
    if (this.displayed) return
    this.progress = progress
    this.publishView()
  }

  private assertCurrent(epoch: number) {
    if (epoch !== this.epoch) throw new PreviewError('aborted', 'The preview was closed.')
  }

  private publishView() {
    const next = this.buildView()
    if (sameView(this.view, next)) return
    this.view = next
    for (const listener of this.listeners) listener()
  }

  private buildView(): PreviewView {
    const displayed = this.displayed
    const latestRevision = this.latest?.revision ?? 0
    const pages = displayed
      ? this.reuseOrBuildPages(displayed.pages)
      : EMPTY_VIEW.pages
    return {
      pages,
      displayedRevision: displayed?.revision ?? null,
      latestRevision,
      isUpdating: this.latest !== null && !this.error && (!displayed || displayed.revision < latestRevision),
      error: this.error,
      progress: displayed ? null : this.progress,
    }
  }

  private reuseOrBuildPages(records: PageRecord[]) {
    const previous = this.view.pages
    const unchanged = previous.length === records.length
      && records.every((record, index) => (
        previous[index].width === record.geometry.width
        && previous[index].height === record.geometry.height
        && sameLinks(previous[index].links, record.geometry.links ?? [])
      ))
    return unchanged ? previous : records.map((record, index) => ({
      index,
      ...record.geometry,
      links: record.geometry.links ?? [],
    }))
  }
}

function sameLinks(a: readonly PdfLinkAnnotation[] | undefined, b: readonly PdfLinkAnnotation[] | undefined): boolean {
  if (a === b) return true
  const listA = a ?? []
  const listB = b ?? []
  if (listA.length !== listB.length) return false
  return listA.every((link, i) => {
    const other = listB[i]
    return Boolean(
      other
      && link.url === other.url
      && link.left === other.left
      && link.top === other.top
      && link.width === other.width
      && link.height === other.height,
    )
  })
}

interface PublishUpdate {
  snapshot: PreviewSnapshot
  generated: GeneratedPdf | null
  doc: RasterDocument
  keys: string[]
  scale: number
  painted: PaintedPage[]
  indices: number[]
  requestedAt: number
}

function nextDisplayed(update: PublishUpdate, previous: DisplayedDocument | null): DisplayedDocument {
  const { snapshot, generated, doc, keys, scale, indices } = update
  const painting = new Set(indices)
  const pages = doc.pages.map((geometry, index): PageRecord => (
    painting.has(index) || !previous?.pages[index]
      ? { key: keys[index] ?? '', scale, geometry }
      : previous.pages[index]
  ))
  if (generated) return { revision: snapshot.revision, state: snapshot.state, bytes: generated.bytes, doc, pages }
  if (!previous) throw new PreviewError('failed', 'A repaint needs a displayed document.')
  return { ...previous, doc, pages }
}

function pagesToPaint(doc: RasterDocument, keys: string[], previous: PageRecord[], scale: number): number[] {
  const indices: number[] = []
  doc.pages.forEach((geometry, index) => {
    const record = previous[index]
    const unchanged = record
      && record.key === keys[index]
      && record.geometry.width === geometry.width
      && record.geometry.height === geometry.height
      && !scaleDiffers(record.scale, scale)
    if (!unchanged) indices.push(index)
  })
  return indices
}

function scaleDiffers(painted: number, target: number) {
  return Math.abs(painted - target) > painted * RESCALE_TOLERANCE
}

function toExport(displayed: DisplayedDocument): PreviewExport {
  return { revision: displayed.revision, state: displayed.state, bytes: displayed.bytes }
}

function sameView(a: PreviewView, b: PreviewView) {
  return a.pages === b.pages
    && a.displayedRevision === b.displayedRevision
    && a.latestRevision === b.latestRevision
    && a.isUpdating === b.isUpdating
    && a.error === b.error
    && a.progress?.stage === b.progress?.stage
    && a.progress?.pagesDone === b.progress?.pagesDone
    && a.progress?.pagesTotal === b.progress?.pagesTotal
}
