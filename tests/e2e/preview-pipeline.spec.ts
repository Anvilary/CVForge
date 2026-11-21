import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRawStream, decodePDFRawStream } from 'pdf-lib'
import sharp from 'sharp'
import { extractPdf } from './support/pdfText'
import {
  cvPayload,
  documentSignature,
  expectContinuous,
  firstPageSignature,
  openBuilderWithCV,
  previewCanvases,
  showEditPanel,
  showPreviewPanel,
  startFrameSampler,
  stopFrameSampler,
  waitForFirstPreview,
} from './support/previewFixtures'

// Pipeline behaviour: one generation per content revision, stable page
// canvases, scale changes that never regenerate, and a download that is always
// the document that was on screen.

function stageCount(page: Page, name: string) {
  return page.evaluate((measure) => performance.getEntriesByName(`pv:${measure}`).length, name)
}

function lastRaster(page: Page) {
  return page.evaluate(() => {
    const entries = performance.getEntriesByName('pv:raster') as PerformanceMeasure[]
    const detail = entries[entries.length - 1]?.detail as { pages: number, skipped: number } | undefined
    return detail ?? null
  })
}

async function settleSignature(page: Page) {
  let previous = await firstPageSignature(page)
  for (let stable = 0; stable < 6;) {
    await page.waitForTimeout(120)
    const current = await firstPageSignature(page)
    stable = current === previous ? stable + 1 : 0
    previous = current
  }
  return previous
}

async function embeddedState(buffer: Buffer) {
  const document = await PDFDocument.load(buffer)
  const names = document.catalog.lookup(PDFName.of('Names'), PDFDict)
  const entries = names.lookup(PDFName.of('EmbeddedFiles'), PDFDict).lookup(PDFName.of('Names'), PDFArray)
  const file = entries.lookup(1, PDFDict).lookup(PDFName.of('EF'), PDFDict).lookup(PDFName.of('F'))
  if (!(file instanceof PDFRawStream)) throw new Error('attachment is not a stream')
  return JSON.parse(new TextDecoder().decode(decodePDFRawStream(file).decode()))
}

async function pageFontNames(buffer: Buffer) {
  const document = await PDFDocument.load(buffer)
  const fonts = document.getPages()[0].node.Resources()?.lookup(PDFName.of('Font'), PDFDict)
  if (!fonts) return []
  return fonts.keys().map((key) => fonts.lookup(key, PDFDict).lookup(PDFName.of('BaseFont'), PDFName).decodeText())
}

async function downloadNow(page: Page) {
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download' }).click()
  return readFile((await (await download).path())!)
}

test('edits, zoom, and resizing reuse the same page canvases', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openBuilderWithCV(page, cvPayload({ pages: 'many' }))
  await waitForFirstPreview(page)
  await page.evaluate(() => document.querySelectorAll('.canvas canvas').forEach((canvas, index) => canvas.setAttribute('data-probe', String(index))))
  const count = await previewCanvases(page).count()

  const summary = page.getByLabel('Professional Summary')
  await summary.fill('Engineer focused on reliable, accessible, and scalable systems.')
  const toolbar = page.getByRole('toolbar', { name: 'PDF preview controls' })
  await toolbar.getByRole('button', { name: 'Zoom in PDF preview' }).click()
  await page.setViewportSize({ width: 1200, height: 900 })
  await settleSignature(page)

  expect(await previewCanvases(page).count()).toBe(count)
  expect(await page.locator('.canvas canvas[data-probe]').count()).toBe(count)
})

test('zoom, Fit, and panel resizing repaint the retained PDF without regenerating it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openBuilderWithCV(page, cvPayload({ pages: 'many' }))
  await waitForFirstPreview(page)
  await settleSignature(page)
  const generations = await stageCount(page, 'generate')
  const loads = await stageCount(page, 'load')
  const toolbar = page.getByRole('toolbar', { name: 'PDF preview controls' })

  await startFrameSampler(page)
  await toolbar.getByRole('button', { name: 'Zoom in PDF preview' }).click()
  await toolbar.getByRole('button', { name: 'Zoom out PDF preview' }).click()
  await toolbar.getByRole('button', { name: 'Fit PDF preview to panel' }).click()
  await page.setViewportSize({ width: 1100, height: 900 })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.waitForTimeout(1500)
  const frames = await stopFrameSampler(page)

  expect(await stageCount(page, 'generate')).toBe(generations)
  expect(await stageCount(page, 'load')).toBe(loads)
  expectContinuous(frames)
})

test('an edit that keeps the pagination repaints only the page that changed', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openBuilderWithCV(page, cvPayload({ pages: 'many' }))
  await waitForFirstPreview(page)
  await settleSignature(page)
  const pages = await previewCanvases(page).count()
  const before = await firstPageSignature(page)

  await page.getByLabel('Professional Summary').fill('Engineer focused on reliable, accessible, and scalable systems.')
  await expect.poll(() => firstPageSignature(page), { timeout: 15_000 }).not.toBe(before)
  await settleSignature(page)

  const raster = await lastRaster(page)
  expect(await previewCanvases(page).count()).toBe(pages)
  expect(raster, JSON.stringify(raster)).toMatchObject({ pages: 1, skipped: pages - 1 })
})

test('a download right after an edit contains that edit and the matching session', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openBuilderWithCV(page)
  await waitForFirstPreview(page)
  const text = 'Exported immediately after typing this exact sentence.'

  await page.getByLabel('Professional Summary').fill(text)
  const file = await downloadNow(page)

  const extracted = await extractPdf(file)
  expect(extracted.lines.join('').replace(/-$/gm, '')).toContain('Exported immediately after typing')
  const session = await embeddedState(file)
  expect(session.resume.profile.summary).toBe(text)
  // The preview settles on the same document that was exported.
  await settleSignature(page)
  expect(await page.getByLabel('Professional Summary').inputValue()).toBe(text)
})

test('a download during rapid typing is a complete revision and never a mix', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openBuilderWithCV(page, cvPayload({ pages: 'many' }))
  await waitForFirstPreview(page)
  const summary = page.getByLabel('Professional Summary')
  await summary.click()
  await summary.press('End')

  const typing = summary.pressSequentially(' abcdefghijklmnopqrstuvwxyz', { delay: 15 })
  await page.waitForTimeout(120)
  const file = await downloadNow(page)
  await typing

  const session = await embeddedState(file)
  const exportedSummary: string = session.resume.profile.summary
  const extracted = await extractPdf(file)
  const flat = extracted.lines.join('').replace(/-$/gm, '')
  // The file text and the file's own session agree on one revision.
  expect(flat).toContain(exportedSummary.slice(0, 40))
  expect(exportedSummary.startsWith('Engineer focused')).toBe(true)
  const pdf = await PDFDocument.load(file)
  expect(pdf.getPageCount()).toBe(extracted.textItems.reduce((max, item) => Math.max(max, item.pageNumber), 0))
})

test('a download right after a typography change uses the new font', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openBuilderWithCV(page)
  await waitForFirstPreview(page)
  const heading = page.getByRole('heading', { name: 'Builder Settings' })
  await heading.locator('xpath=ancestor::*[.//button[@aria-label="Expand section"]][1]').getByRole('button', { name: 'Expand section' }).click()

  await page.getByRole('button', { name: 'Times (Serif)' }).click()
  const file = await downloadNow(page)

  expect((await embeddedState(file)).settings.fontFamily).toBe('Times New Roman')
  expect(await pageFontNames(file)).toContain('Times-Roman')
})

// Compares at a coarse resolution so rasterizer differences in anti-aliasing
// vanish while any change in layout (moved, missing, or extra text) does not.
async function coarse(input: string | Buffer) {
  return sharp(input).flatten({ background: '#ffffff' }).greyscale().resize(96, 136, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer()
}

function meanError(a: Buffer, b: Buffer) {
  let total = 0
  for (let index = 0; index < a.length; index += 1) total += Math.abs(a[index] - b[index])
  return total / a.length
}

test('the downloaded PDF looks like the preview', async ({ page }) => {
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const { mkdtemp, writeFile } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const path = await import('node:path')
  await page.setViewportSize({ width: 1440, height: 900 })
  await openBuilderWithCV(page, cvPayload({ pages: 'many' }))
  await waitForFirstPreview(page)
  await settleSignature(page)
  const previews = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLCanvasElement>('.canvas canvas')).slice(0, 2).map((canvas) => canvas.toDataURL('image/png')))
  const file = await downloadNow(page)
  expect(await PDFDocument.load(file).then((pdf) => pdf.getPageCount())).toBe(await previewCanvases(page).count())

  const directory = await mkdtemp(path.join(tmpdir(), 'cvforge-preview-'))
  await writeFile(path.join(directory, 'download.pdf'), file)
  await promisify(execFile)('pdftoppm', ['-f', '1', '-l', '2', '-r', '110', '-png', path.join(directory, 'download.pdf'), path.join(directory, 'page')])
  const [first, second] = await Promise.all(previews.map((url) => coarse(Buffer.from(url.split(',')[1], 'base64'))))
  const [referenceFirst, referenceSecond] = await Promise.all([1, 2].map((number) => coarse(path.join(directory, `page-${number}.png`))))

  const same = [meanError(first, referenceFirst), meanError(second, referenceSecond)]
  expect(same[0], `page 1 error ${same[0]}`).toBeLessThan(6)
  expect(same[1], `page 2 error ${same[1]}`).toBeLessThan(6)
  // The comparison is sensitive: the same page moved down by about one line
  // is clearly further away.
  const png = path.join(directory, 'page-1.png')
  const { width = 0, height = 0 } = await sharp(png).metadata()
  const moved = await coarse(await sharp(png).extend({ top: 14, background: '#ffffff' }).extract({ left: 0, top: 0, width, height }).toBuffer())
  expect(meanError(first, moved)).toBeGreaterThan(same[0] + 5)
})

test('leaving the Builder releases its workers', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openBuilderWithCV(page)
  await waitForFirstPreview(page)
  expect(page.workers().length).toBe(2)

  await page.locator('a[href="/"]').first().click()
  await expect(page).toHaveURL(/\/$/)
  await expect.poll(() => page.workers().length, { timeout: 10_000 }).toBe(0)
})

test('typing while the preview is hidden does no work and the preview catches up when shown', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openBuilderWithCV(page)
  await showPreviewPanel(page)
  await waitForFirstPreview(page)
  await showEditPanel(page)
  const generations = await stageCount(page, 'generate')

  await page.getByLabel('Professional Summary').fill('Edited while the preview was hidden.')
  await page.waitForTimeout(800)
  expect(await stageCount(page, 'generate')).toBe(generations)

  const before = await firstPageSignature(page)
  await showPreviewPanel(page)
  await expect.poll(() => firstPageSignature(page), { timeout: 5_000 }).not.toBe(before)
})

test('the preview pipeline makes no external requests and logs no CV text', async ({ page }) => {
  const origin = new URL(test.info().project.use.baseURL ?? 'http://127.0.0.1:4317').origin
  const external: string[] = []
  const logs: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (!url.startsWith(origin) && !url.startsWith('blob:') && !url.startsWith('data:')) external.push(url)
  })
  page.on('console', (message) => logs.push(message.text()))
  await page.setViewportSize({ width: 1440, height: 900 })
  await openBuilderWithCV(page)
  await waitForFirstPreview(page)
  await page.getByLabel('Professional Summary').fill('Private sentence that must never appear in logs.')
  await settleSignature(page)
  await downloadNow(page)

  expect(external).toEqual([])
  expect(logs.filter((line) => line.includes('Private sentence'))).toEqual([])
})

async function waitForSettledDocument(page: Page) {
  let previous = JSON.stringify(await documentSignature(page))
  for (let stable = 0; stable < 8;) {
    await page.waitForTimeout(150)
    const current = JSON.stringify(await documentSignature(page))
    stable = current === previous ? stable + 1 : 0
    previous = current
  }
  return JSON.parse(previous) as string[]
}

test('a burst of mixed edits settles on exactly the document a fresh load renders', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await openBuilderWithCV(page, cvPayload({ workItems: 6 }))
  await waitForFirstPreview(page)
  const summary = page.getByLabel('Professional Summary')
  const paragraph = 'Experienced engineer delivering reliable, accessible products with measurable outcomes across teams. '

  await startFrameSampler(page)
  await summary.fill(paragraph.repeat(6))
  for (let index = 0; index < 8; index += 1) await summary.fill(`Revision ${index}. ${paragraph.repeat(index % 3 + 1)}`)
  await page.getByRole('button', { name: 'Move section down' }).nth(1).click()
  await page.getByRole('button', { name: 'Hide section from PDF' }).first().click()
  await summary.fill(`Final summary after a burst of edits. ${paragraph}`)
  const incremental = await waitForSettledDocument(page)
  expectContinuous(await stopFrameSampler(page))

  await page.waitForTimeout(1200)
  await page.reload()
  await waitForFirstPreview(page)
  const fresh = await waitForSettledDocument(page)
  expect(incremental).toEqual(fresh)
})

test('content crossing a page break updates the page list without blank frames', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await openBuilderWithCV(page, cvPayload({ workItems: 5 }))
  await waitForFirstPreview(page)
  await waitForSettledDocument(page)
  const startPages = await previewCanvases(page).count()
  const summary = page.getByLabel('Professional Summary')
  const longText = 'A long professional summary sentence that keeps adding lines to the first page of the document. '.repeat(40)

  await startFrameSampler(page)
  await summary.fill(longText)
  await expect.poll(() => previewCanvases(page).count(), { timeout: 15_000 }).toBeGreaterThan(startPages)
  const grown = await waitForSettledDocument(page)
  await summary.fill('Short again.')
  await expect.poll(() => previewCanvases(page).count(), { timeout: 15_000 }).toBe(startPages)
  const shrunk = await waitForSettledDocument(page)
  expectContinuous(await stopFrameSampler(page))

  expect(grown.length).toBeGreaterThan(shrunk.length)
  await page.waitForTimeout(1200)
  await page.reload()
  await waitForFirstPreview(page)
  expect(await waitForSettledDocument(page)).toEqual(shrunk)
})

test('a device pixel ratio change sharpens the retained PDF without regenerating it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openBuilderWithCV(page)
  await waitForFirstPreview(page)
  await settleSignature(page)
  const generations = await stageCount(page, 'generate')
  const bitmapBefore = await previewCanvases(page).first().evaluate((canvas) => (canvas as HTMLCanvasElement).width)

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false })
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  await expect.poll(() => previewCanvases(page).first().evaluate((canvas) => (canvas as HTMLCanvasElement).width), { timeout: 10_000 })
    .toBeGreaterThan(bitmapBefore * 1.8)
  expect(await stageCount(page, 'generate')).toBe(generations)
})

test('navigating away while an update is in flight leaves no errors or workers', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await openBuilderWithCV(page, cvPayload({ pages: 'many' }))
  await waitForFirstPreview(page)

  await page.getByLabel('Professional Summary').fill('An edit that is still being laid out when the page is left.')
  await page.locator('a[href="/"]').first().click()
  await expect(page).toHaveURL(/\/$/)
  await expect.poll(() => page.workers().length, { timeout: 10_000 }).toBe(0)
  await page.waitForTimeout(1500)
  expect(errors).toEqual([])
})
