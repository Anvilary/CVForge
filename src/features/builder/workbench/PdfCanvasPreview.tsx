'use client'

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PdfLinkAnnotation, PreviewPageView, RenderProgress } from '../preview/previewTypes'
import { useZoomControl } from './useZoomControl'
import { useDevicePixelRatio } from './useDevicePixelRatio'
import { PreviewDock } from './PreviewDock'
import { PreviewErrorState } from './PreviewErrorState'
import { PreviewLoadingState } from './PreviewLoadingState'

const MAX_RENDER_SCALE = 4
const WIDE_SIDE_PADDING = 20

interface PdfCanvasPreviewProps {
  pages: readonly PreviewPageView[]
  canvasAt: (index: number) => HTMLCanvasElement
  error: string
  progress: RenderProgress | null
  fallbackBaseWidth: number
  actionSlot: ReactNode
  onRetry: () => void
  onRenderScaleChange: (scale: number) => void
}

// Page containers are keyed by page number and sized from the PDF's own page
// geometry, so zoom, Fit, and resizing change their size immediately while the
// bitmaps already in them are scaled by CSS. The pipeline repaints for sharpness
// afterwards without regenerating the PDF. Pages are never replaced by a loader.
export function PdfCanvasPreview({
  pages,
  canvasAt,
  error,
  progress,
  fallbackBaseWidth,
  actionSlot,
  onRetry,
  onRenderScaleChange,
}: PdfCanvasPreviewProps) {
  const { zoom, fitMode, zoomOut, zoomIn, fit, reportContainerWidth } = useZoomControl(pages[0]?.width ?? null, fallbackBaseWidth)
  const containerWidth = useContainerWidth(reportContainerWidth)
  const dpr = useDevicePixelRatio()
  const containerRef = containerWidth.ref
  const hasPages = pages.length > 0

  // A hidden panel measures 0 px; a zero scale pauses the pipeline.
  const renderScale = containerWidth.value > 0 ? Math.min(zoom * dpr, MAX_RENDER_SCALE) : 0

  useEffect(() => {
    onRenderScaleChange(renderScale)
  }, [renderScale, onRenderScaleChange])

  const visualPageWidth = hasPages ? pages[0].width * zoom : 0
  // Sub-pixel tolerance: at Fit, width * zoom can exceed the container by a
  // rounding error, which must not switch to the wide (scrolling) layout.
  const isWider = hasPages && containerWidth.value > 0 && visualPageWidth > containerWidth.value + 0.5

  return (
    <div ref={containerRef} className={hasPages ? 'w-full min-w-0' : 'w-full min-w-0 h-full'}>
      {!hasPages && (error
        ? <PreviewErrorState message={error} onRetry={onRetry} />
        : <PreviewLoadingState progress={progress} />)}
      {hasPages && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            paddingBottom: '76px',
            alignItems: isWider ? 'flex-start' : 'center',
            paddingLeft: isWider ? WIDE_SIDE_PADDING : 0,
            paddingRight: isWider ? WIDE_SIDE_PADDING : 0,
          }}
        >
          {pages.map((page) => (
            <PreviewPage
              key={page.index}
              canvas={canvasAt(page.index)}
              width={page.width * zoom}
              height={page.height * zoom}
              pageWidth={page.width}
              pageHeight={page.height}
              links={page.links}
            />
          ))}
        </div>
      )}
      {hasPages && (
        <PreviewDock
          actionSlot={actionSlot}
          zoom={zoom}
          fitMode={fitMode}
          onZoomOut={zoomOut}
          onZoomIn={zoomIn}
          onFit={fit}
        />
      )}
    </div>
  )
}

function useContainerWidth(onWidth: (width: number) => void) {
  const ref = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const report = () => {
      const width = el.offsetWidth
      setValue(width)
      onWidth(width)
    }
    report()
    const observer = new ResizeObserver(report)
    observer.observe(el)
    return () => observer.disconnect()
  }, [onWidth])

  return { ref, value }
}

interface PreviewPageProps {
  canvas: HTMLCanvasElement
  width: number
  height: number
  pageWidth: number
  pageHeight: number
  links?: readonly PdfLinkAnnotation[]
}

// The canvas element belongs to the preview pipeline and keeps its identity
// across updates; this container only positions and sizes it.
function PreviewPage({ canvas, width, height, pageWidth, pageHeight, links }: PreviewPageProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.appendChild(canvas)
    return () => {
      if (canvas.parentNode === host) host.removeChild(canvas)
    }
  }, [canvas])

  const safePageWidth = pageWidth > 0 ? pageWidth : 1
  const safePageHeight = pageHeight > 0 ? pageHeight : 1

  return (
    <div
      className="relative bg-white border border-border shadow-lg rounded-sm overflow-hidden flex-shrink-0"
      style={{ width, height }}
      data-preview-page
    >
      <div ref={hostRef} className="w-full h-full" />
      {links && links.length > 0 && (
        <div className="absolute inset-0 pointer-events-none" data-preview-annotation-layer>
          {links.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.text ? `${link.text}: ${link.url}` : link.url}
              title={link.text ? `${link.text} - ${link.url}` : link.url}
              className="absolute pointer-events-auto rounded-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-1"
              style={{
                left: `${(link.left / safePageWidth) * 100}%`,
                top: `${(link.top / safePageHeight) * 100}%`,
                width: `${(link.width / safePageWidth) * 100}%`,
                height: `${(link.height / safePageHeight) * 100}%`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
