import type { CVState } from '@/features/cv/model/types'

/** One immutable CV state together with the revision the preview gave it. */
export interface PreviewSnapshot {
  revision: number
  state: CVState
}

/** A hyperlink annotation discovered on a PDF page. */
export interface PdfLinkAnnotation {
  url: string
  text?: string
  left: number
  top: number
  width: number
  height: number
}

/** Page size in PDF points, as the PDF reports it. */
export interface PageGeometry {
  width: number
  height: number
  links?: readonly PdfLinkAnnotation[]
}

/** What the generation worker returns for one revision. */
export interface GeneratedPdf {
  revision: number
  bytes: Uint8Array
  /**
   * One exact serialization per page of everything that decides its pixels
   * (page boxes, content stream, resources, annotations). Two pages with the
   * same key paint identically at any scale.
   */
  pageKeys: string[]
  generateMs: number
  fingerprintMs: number
}

/** A parsed PDF that can paint its pages. Owned and destroyed by the engine. */
export interface RasterDocument {
  readonly pages: readonly PageGeometry[]
  /** True once the document or the worker behind it was released. */
  readonly destroyed: boolean
  /** Paints one page into a bitmap. Rejects with an AbortError when aborted. */
  renderPage(index: number, scale: number, signal: AbortSignal): Promise<ImageBitmap>
  destroy(): void
}

export interface PdfRasterizer {
  /** Starts loading PDF.js and its worker while the first PDF is generated. */
  warmUp?(): void
  open(bytes: Uint8Array): Promise<RasterDocument>
  /** Releases the PDF.js worker. The rasterizer can be used again afterwards. */
  dispose(): void
}

export interface PdfGenerator {
  generate(snapshot: PreviewSnapshot): Promise<GeneratedPdf>
  /** Stops a running job by terminating the worker. Usable again afterwards. */
  dispose(): void
}

/** Where painted pages live. The engine draws; the view only lays them out. */
export interface PageCanvasStore {
  /** Keeps exactly `count` page canvases and releases the rest. */
  resize(count: number): void
  /** Replaces the page bitmap in one synchronous step and closes the bitmap. */
  paint(index: number, bitmap: ImageBitmap): void
  clear(): void
}

export type RenderStage = 'preparing' | 'rendering'

export interface RenderProgress {
  stage: RenderStage
  pagesDone: number
  pagesTotal: number
}

export interface PreviewPageView extends PageGeometry {
  index: number
  links: readonly PdfLinkAnnotation[]
}

export interface PreviewView {
  pages: readonly PreviewPageView[]
  /** Revision shown on screen, or null before the first render. */
  displayedRevision: number | null
  /** Newest revision of the CV state. */
  latestRevision: number
  /** A newer revision is waiting, generating, or painting. */
  isUpdating: boolean
  error: string
  /** Only reported while nothing is displayed yet. */
  progress: RenderProgress | null
}

/** The exact document that is on screen, ready to be exported. */
export interface PreviewExport {
  revision: number
  state: CVState
  bytes: Uint8Array
}

export type PreviewFailureKind = 'crash' | 'timeout' | 'failed' | 'aborted'

export class PreviewError extends Error {
  readonly kind: PreviewFailureKind

  constructor(kind: PreviewFailureKind, message: string) {
    super(message)
    this.name = 'PreviewError'
    this.kind = kind
  }
}
