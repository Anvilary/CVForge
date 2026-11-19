import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { type CVState } from '@/features/cv/model/types'
import { ResumePdfDocument } from '../ResumePdfDocument'

// Renders the real export document without the embedded session (the browser
// download step attaches it afterwards), so every check here is independent of
// CVForge's own metadata.
export async function renderResumePdf(state: CVState): Promise<Uint8Array> {
  return new Uint8Array(await renderToBuffer(createElement(ResumePdfDocument, { state })))
}

export interface PdfjsText {
  lines: string[]
  pageWidth: number
  maxRight: number
  minLeft: number
}

// Text exactly as pdf.js reports it: items joined until it signals an end of
// line. pdf.js is the strictest extractor used here and the one CVForge's
// Analyzer is built on.
export async function extractPdfjsText(bytes: Uint8Array): Promise<PdfjsText> {
  const task = pdfjs.getDocument({ data: bytes.slice(), verbosity: 0, useWorkerFetch: false })
  const pdf = await task.promise
  const lines: string[] = []
  let pageWidth = 0
  let maxRight = 0
  let minLeft = Number.POSITIVE_INFINITY
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    pageWidth = page.getViewport({ scale: 1 }).width
    let line = ''
    for (const item of (await page.getTextContent()).items) {
      if (!('str' in item)) continue
      line += item.str
      if (item.str.trim()) {
        maxRight = Math.max(maxRight, item.transform[4] + item.width)
        minLeft = Math.min(minLeft, item.transform[4])
      }
      if (item.hasEOL) {
        if (line.trim()) lines.push(line.trim())
        line = ''
      }
    }
    if (line.trim()) lines.push(line.trim())
  }
  await task.destroy()
  return { lines, pageWidth, maxRight, minLeft }
}
