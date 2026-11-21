import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFWorker } from 'pdfjs-dist'
import { resolveEntryLink } from '@/features/resume-pdf/resolveEntryLink'
import {
  PreviewError,
  type PageGeometry,
  type PdfLinkAnnotation,
  type PdfRasterizer,
  type RasterDocument,
} from './previewTypes'

type PdfJs = typeof import('pdfjs-dist')

// A worker that crashed or was closed never answers; fail instead of hanging.
const WORKER_READY_TIMEOUT_MS = 15_000
const DOCUMENT_LOAD_TIMEOUT_MS = 10_000
const PAGE_RENDER_TIMEOUT_MS = 10_000

// PDF.js does not terminate a Worker it was handed, so both are kept: the
// PDFWorker that PDF.js talks to and the raw Worker we must terminate.
interface PdfJsWorker {
  port: Worker
  worker: PDFWorker
}

interface RenderSurface {
  canvas: OffscreenCanvas | HTMLCanvasElement
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
}

// Paints pages for the preview with PDF.js. It owns the PDF.js worker, every
// document it opened, and one scratch canvas reused for all pages, so nothing
// outlives dispose() and a render never allocates a canvas of its own. PDF.js
// parses and lays out in its own worker; only the final canvas drawing runs on
// the main thread.
export class PdfJsRasterizer implements PdfRasterizer {
  private pdfjs: Promise<PdfJs> | null = null
  private worker: Promise<PdfJsWorker> | null = null
  private surface: RenderSurface | null = null
  private readonly documents = new Set<PdfJsDocument>()

  warmUp() {
    void this.loadPdfJs()
      .then((pdfjs) => this.acquireWorker(pdfjs))
      .catch(() => undefined)
  }

  async open(bytes: Uint8Array): Promise<RasterDocument> {
    const pdfjs = await this.loadPdfJs()
    const { worker } = await this.acquireWorker(pdfjs)
    // PDF.js takes ownership of the buffer it is given; keep ours intact.
    const task = pdfjs.getDocument({ data: bytes.slice(), worker })
    try {
      const proxy = await withTimeout(task.promise, DOCUMENT_LOAD_TIMEOUT_MS, 'The PDF preview worker did not respond.')
      const pages = await readGeometry(proxy)
      const document = new PdfJsDocument(proxy, task, pages, (scale, pageWidth, pageHeight) => this.surfaceFor(scale, pageWidth, pageHeight), (doc) => this.documents.delete(doc))
      this.documents.add(document)
      return document
    } catch (error) {
      void task.destroy()
      this.resetWorker()
      throw toPreviewError(error)
    }
  }

  dispose() {
    for (const document of this.documents) document.destroy()
    this.documents.clear()
    this.resetWorker()
    this.surface = null
  }

  private loadPdfJs(): Promise<PdfJs> {
    this.pdfjs ??= import('pdfjs-dist')
    return this.pdfjs
  }

  // Created from our own module Worker so a failed load surfaces as an error
  // that can be retried, instead of PDF.js falling back to a main-thread import
  // whose failure the browser caches for the lifetime of the page.
  private acquireWorker(pdfjs: PdfJs): Promise<PdfJsWorker> {
    if (!this.worker) {
      const started = startWorker(pdfjs)
      this.worker = started
      started.catch(() => {
        if (this.worker === started) this.worker = null
      })
    }
    return this.worker
  }

  private resetWorker() {
    const current = this.worker
    this.worker = null
    void current?.then(({ port, worker }) => {
      worker.destroy()
      port.terminate()
    }).catch(() => undefined)
  }

  private surfaceFor(scale: number, pageWidth: number, pageHeight: number): RenderSurface & { width: number, height: number } {
    const width = Math.max(1, Math.floor(pageWidth * scale))
    const height = Math.max(1, Math.floor(pageHeight * scale))
    if (!this.surface) this.surface = createSurface(width, height)
    this.surface.canvas.width = width
    this.surface.canvas.height = height
    return { ...this.surface, width, height }
  }
}

class PdfJsDocument implements RasterDocument {
  readonly pages: readonly PageGeometry[]
  private readonly proxy: PDFDocumentProxy
  private readonly task: PDFDocumentLoadingTask
  private readonly surfaceFor: (scale: number, width: number, height: number) => RenderSurface & { width: number, height: number }
  private readonly onDestroy: (document: PdfJsDocument) => void
  private released = false

  get destroyed() {
    return this.released
  }

  constructor(
    proxy: PDFDocumentProxy,
    task: PDFDocumentLoadingTask,
    pages: readonly PageGeometry[],
    surfaceFor: PdfJsDocument['surfaceFor'],
    onDestroy: (document: PdfJsDocument) => void,
  ) {
    this.proxy = proxy
    this.task = task
    this.pages = pages
    this.surfaceFor = surfaceFor
    this.onDestroy = onDestroy
  }

  async renderPage(index: number, scale: number, signal: AbortSignal): Promise<ImageBitmap> {
    if (signal.aborted || this.released) throw new PreviewError('aborted', 'Rendering was stopped.')
    const page = await this.proxy.getPage(index + 1)
    try {
      const geometry = this.pages[index]
      const surface = this.surfaceFor(scale, geometry.width, geometry.height)
      const viewport = page.getViewport({ scale: surface.width / geometry.width })
      const task = page.render({ canvas: null, canvasContext: surface.context as CanvasRenderingContext2D, viewport })
      const stop = () => task.cancel()
      signal.addEventListener('abort', stop, { once: true })
      try {
        await withTimeout(task.promise, PAGE_RENDER_TIMEOUT_MS, 'Rendering a PDF page took too long.')
      } catch (error) {
        task.cancel()
        throw signal.aborted ? new PreviewError('aborted', 'Rendering was stopped.') : toPreviewError(error)
      } finally {
        signal.removeEventListener('abort', stop)
      }
      return await toBitmap(surface.canvas)
    } finally {
      page.cleanup()
    }
  }

  destroy() {
    if (this.released) return
    this.released = true
    this.onDestroy(this)
    void this.task.destroy()
  }
}

async function readGeometry(proxy: PDFDocumentProxy): Promise<PageGeometry[]> {
  const pages: PageGeometry[] = []
  for (let number = 1; number <= proxy.numPages; number += 1) {
    const page = await proxy.getPage(number)
    const viewport = page.getViewport({ scale: 1 })
    const { width, height } = viewport
    const rawAnnotations = await page.getAnnotations()
    const links = extractPageLinks(rawAnnotations, viewport)
    pages.push({ width, height, links })
    page.cleanup()
  }
  return pages
}

interface RawPdfAnnotation {
  subtype?: string
  annotationType?: number
  url?: string
  unsafeUrl?: string
  rect?: number[]
  overlaidText?: string
  contentsObj?: { str?: string }
}

function extractPageLinks(
  annotations: readonly RawPdfAnnotation[],
  viewport: { convertToViewportPoint: (x: number, y: number) => number[] },
): PdfLinkAnnotation[] {
  const links: PdfLinkAnnotation[] = []
  for (const annot of annotations) {
    if (annot.subtype !== 'Link' && annot.annotationType !== 2) continue
    const rawUrl = typeof annot.url === 'string' && annot.url
      ? annot.url
      : (typeof annot.unsafeUrl === 'string' ? annot.unsafeUrl : null)
    const validUrl = resolveEntryLink(rawUrl)
    if (!validUrl) continue
    if (!Array.isArray(annot.rect) || annot.rect.length < 4) continue

    const [p1x, p1y] = viewport.convertToViewportPoint(annot.rect[0], annot.rect[3])
    const [p2x, p2y] = viewport.convertToViewportPoint(annot.rect[2], annot.rect[1])

    const left = Math.min(p1x, p2x)
    const top = Math.min(p1y, p2y)
    const width = Math.abs(p2x - p1x)
    const height = Math.abs(p2y - p1y)

    if (width <= 0 || height <= 0) continue

    const text = typeof annot.overlaidText === 'string' && annot.overlaidText.trim()
      ? annot.overlaidText.trim()
      : (typeof annot.contentsObj?.str === 'string' && annot.contentsObj.str.trim()
        ? annot.contentsObj.str.trim()
        : undefined)

    links.push({
      url: validUrl,
      text,
      left,
      top,
      width,
      height,
    })
  }
  return links
}

function createSurface(width: number, height: number): RenderSurface {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (context) return { canvas, context }
  }
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new PreviewError('failed', 'This browser cannot draw the PDF preview.')
  return { canvas, context }
}

function toBitmap(canvas: OffscreenCanvas | HTMLCanvasElement): Promise<ImageBitmap> {
  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    // Moves the pixels without a copy and leaves the scratch canvas empty.
    return Promise.resolve(canvas.transferToImageBitmap())
  }
  return createImageBitmap(canvas)
}

async function startWorker(pdfjs: PdfJs): Promise<PdfJsWorker> {
  const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  const port = new Worker(workerUrl, { type: 'module' })
  await waitForReady(port)
  return { port, worker: pdfjs.PDFWorker.create({ port }) }
}

function waitForReady(port: Worker): Promise<void> {
  return new Promise((resolve, reject) => {
    const fail = (reason: string) => {
      cleanup()
      port.terminate()
      reject(new PreviewError('crash', reason))
    }
    const onMessage = (event: MessageEvent) => {
      if (event.data?.action !== 'ready') return
      cleanup()
      resolve()
    }
    const onError = () => fail('The PDF preview worker failed to load.')
    const timer = setTimeout(() => fail('The PDF preview worker did not start.'), WORKER_READY_TIMEOUT_MS)
    const cleanup = () => {
      clearTimeout(timer)
      port.removeEventListener('message', onMessage)
      port.removeEventListener('error', onError)
    }
    port.addEventListener('message', onMessage)
    port.addEventListener('error', onError)
  })
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new PreviewError('timeout', message)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function toPreviewError(error: unknown): PreviewError {
  if (error instanceof PreviewError) return error
  const message = error instanceof Error ? error.message : 'The PDF preview could not be rendered.'
  return new PreviewError('failed', message)
}
