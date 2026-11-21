import type { PageCanvasStore } from './previewTypes'

// Page canvases keep their identity for the life of the preview: page N is
// always the same element, so React never remounts it and an update only
// replaces its pixels. Resizing a canvas clears it, so size and pixels are set
// together in one synchronous step and the browser never paints in between.
export class PageCanvasElements implements PageCanvasStore {
  private readonly canvases: HTMLCanvasElement[] = []

  canvasAt(index: number): HTMLCanvasElement {
    while (this.canvases.length <= index) this.canvases.push(createPageCanvas())
    return this.canvases[index]
  }

  resize(count: number) {
    while (this.canvases.length > count) {
      const removed = this.canvases.pop()
      if (removed) releaseCanvas(removed)
    }
    for (let index = 0; index < count; index += 1) this.canvasAt(index)
  }

  paint(index: number, bitmap: ImageBitmap) {
    const canvas = this.canvasAt(index)
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0)
    bitmap.close()
  }

  clear() {
    this.resize(0)
  }
}

function createPageCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.style.display = 'block'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  return canvas
}

function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0
  canvas.height = 0
  canvas.remove()
}
