'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { isEmptyCV } from '@/features/cv/model/isEmptyCV'
import type { CVState } from '@/features/cv/model/types'
import { PageCanvasElements } from './pageCanvasStore'
import { PdfGenerationClient } from './pdfGenerationClient'
import { PdfJsRasterizer } from './pdfRasterizer'
import { PreviewEngine } from './previewEngine'
import type { PreviewExport } from './previewTypes'

function createPreviewPipeline() {
  const canvases = new PageCanvasElements()
  const engine = new PreviewEngine({
    generator: new PdfGenerationClient(),
    rasterizer: new PdfJsRasterizer(),
    canvases,
  })
  return { engine, canvases }
}

// Binds one preview pipeline to the Builder. The engine is created without
// side effects (the page is server rendered first); workers start with the
// first update and are released when the Builder unmounts.
export function usePdfPreview(state: CVState, renderScale: number) {
  const [{ engine, canvases }] = useState(createPreviewPipeline)
  const view = useSyncExternalStore(engine.subscribe, engine.getView, engine.getView)

  useEffect(() => () => engine.release(), [engine])
  useEffect(() => {
    if (isEmptyCV(state)) engine.clear()
    else engine.submit(state)
  }, [engine, state])
  useEffect(() => {
    engine.setScale(renderScale)
  }, [engine, renderScale])

  const retry = useCallback(() => engine.retry(), [engine])
  const exportCurrent = useCallback((): Promise<PreviewExport> => engine.exportCurrent(), [engine])
  const canvasAt = useCallback((index: number) => canvases.canvasAt(index), [canvases])

  return { view, canvasAt, retry, exportCurrent }
}
