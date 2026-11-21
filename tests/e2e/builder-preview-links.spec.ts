import { expect, test } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'
import {
  openBuilderWithCV,
  previewCanvases,
  showEditPanel,
  showPreviewPanel,
  startFrameSampler,
  stopFrameSampler,
  waitForFirstPreview,
} from './support/previewFixtures'

function cvWithWorkLink(companyLink = 'https://github.com/odysseus-dev/odysseus') {
  return JSON.stringify({
    schemaVersion: '1.0.0',
    updatedAt: '2026-09-26T00:00:00.000Z',
    resume: {
      profile: {
        name: 'Alex Morgan',
        email: 'alex@example.org',
        phone: '+44 20 7946 0000',
        location: 'London',
        summary: 'Lead systems maintainer.',
      },
      workExperience: [
        {
          id: 'work-1',
          role: 'Lead Maintainer',
          company: 'Odysseus · Self-Hosted AI Workspace',
          companyLink,
          location: 'Remote',
          startDate: '2024-01',
          endDate: '',
          isCurrent: true,
          bullets: ['Maintained decentralized workspace runtime.'],
        },
      ],
      skills: { technical: ['TypeScript', 'Rust'], soft: [] },
    },
    settings: {
      documentSize: 'A4',
      visibleSections: {},
      bulletVisibility: {},
    },
  })
}

function previewToolbar(page: import('@playwright/test').Page) {
  return page.getByRole('toolbar', { name: 'PDF preview controls' })
}

test.describe('Builder live preview PDF hyperlinks', () => {
  test('renders clickable link over company name at normal zoom with correct attributes', async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openBuilderWithCV(page, cvWithWorkLink())
    await waitForFirstPreview(page)

    const overlay = page.locator('[data-preview-annotation-layer]')
    await expect(overlay).toBeVisible()

    const link = overlay.locator('a[href="https://github.com/odysseus-dev/odysseus"]')
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    await expect(link).toHaveAttribute('aria-label', /Odysseus.*https:\/\/github\.com\/odysseus-dev\/odysseus/)

    // Verify positioning: the link must be within the page canvas bounds and have positive dimensions
    const canvas = previewCanvases(page).first()
    const canvasBox = (await canvas.boundingBox())!
    const linkBox = (await link.boundingBox())!

    expect(linkBox.width).toBeGreaterThan(50)
    expect(linkBox.height).toBeGreaterThan(10)
    expect(linkBox.x).toBeGreaterThan(canvasBox.x)
    expect(linkBox.x + linkBox.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width + 2)
    expect(linkBox.y).toBeGreaterThan(canvasBox.y)
    expect(linkBox.y + linkBox.height).toBeLessThan(canvasBox.y + canvasBox.height)

    // Test clicking the link safely triggers popup or target
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 5000 }).catch(() => null),
      link.click(),
    ])
    if (popup) {
      expect(popup.url()).toContain('github.com/odysseus-dev/odysseus')
      await popup.close()
    }
  })

  test('preserves link alignment after zooming in and out', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openBuilderWithCV(page, cvWithWorkLink())
    await waitForFirstPreview(page)

    const toolbar = previewToolbar(page)
    const overlay = page.locator('[data-preview-annotation-layer]')
    const link = overlay.locator('a[href="https://github.com/odysseus-dev/odysseus"]')
    await expect(link).toBeVisible()

    const initialBox = (await link.boundingBox())!

    // Zoom in twice
    await toolbar.getByRole('button', { name: 'Zoom in PDF preview' }).click()
    await toolbar.getByRole('button', { name: 'Zoom in PDF preview' }).click()
    await page.waitForTimeout(300)

    const zoomedBox = (await link.boundingBox())!
    expect(zoomedBox.width).toBeGreaterThan(initialBox.width)
    expect(zoomedBox.height).toBeGreaterThan(initialBox.height)

    // Zoom out back
    await toolbar.getByRole('button', { name: 'Fit PDF preview to panel' }).click()
    await page.waitForTimeout(300)

    const fitBox = (await link.boundingBox())!
    expect(fitBox.width).toBeCloseTo(initialBox.width, 0)
  })

  test('updates link destination when company URL input changes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openBuilderWithCV(page, cvWithWorkLink())
    await waitForFirstPreview(page)

    const overlay = page.locator('[data-preview-annotation-layer]')
    const initialLink = overlay.locator('a[href="https://github.com/odysseus-dev/odysseus"]')
    await expect(initialLink).toBeVisible()

    // Expand Work Experience section
    const expCard = page.locator('.group').filter({ hasText: 'Work Experience' })
    await expCard.getByRole('button', { name: /Expand section/i }).click()

    // Change URL in form
    const linkInput = page.getByLabel('Company Link', { exact: true })
    await linkInput.fill('https://github.com/odysseus-dev/cvforge')

    // Expect preview overlay to update to new URL
    const updatedLink = overlay.locator('a[href="https://github.com/odysseus-dev/cvforge"]')
    await expect(updatedLink).toBeVisible({ timeout: 15_000 })
    await expect(initialLink).toHaveCount(0)
  })

  test('removes link when company URL input is cleared', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openBuilderWithCV(page, cvWithWorkLink())
    await waitForFirstPreview(page)

    const overlay = page.locator('[data-preview-annotation-layer]')
    const link = overlay.locator('a[href="https://github.com/odysseus-dev/odysseus"]')
    await expect(link).toBeVisible()

    // Expand Work Experience section
    const expCard = page.locator('.group').filter({ hasText: 'Work Experience' })
    await expCard.getByRole('button', { name: /Expand section/i }).click()

    // Clear Company Link input
    const linkInput = page.getByLabel('Company Link', { exact: true })
    await linkInput.fill('')

    // Link should disappear
    await expect(link).toHaveCount(0, { timeout: 15_000 })
  })

  test('supports keyboard navigation with visible focus indicator', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openBuilderWithCV(page, cvWithWorkLink())
    await waitForFirstPreview(page)

    const link = page.locator('[data-preview-annotation-layer] a').first()
    await expect(link).toBeVisible()

    await link.focus()
    await expect(link).toBeFocused()

    // Focus style check
    const outline = await link.evaluate((el) => {
      const style = window.getComputedStyle(el)
      return {
        outlineStyle: style.outlineStyle,
        outlineColor: style.outlineColor,
      }
    })
    expect(outline.outlineStyle).not.toBe('none')
  })

  test('maintains alignment in mobile preview and panel switching without blank frames', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openBuilderWithCV(page, cvWithWorkLink())

    await showPreviewPanel(page)
    await waitForFirstPreview(page)

    const overlay = page.locator('[data-preview-annotation-layer]')
    const link = overlay.locator('a[href="https://github.com/odysseus-dev/odysseus"]')
    await expect(link).toBeVisible()

    const canvas = previewCanvases(page).first()
    const canvasBox = (await canvas.boundingBox())!
    const linkBox = (await link.boundingBox())!

    expect(linkBox.width).toBeGreaterThan(0)
    expect(linkBox.height).toBeGreaterThan(0)
    expect(linkBox.x).toBeGreaterThanOrEqual(canvasBox.x - 1)
    expect(linkBox.x + linkBox.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width + 2)

    // Switch to edit panel, update summary, switch back to preview
    await showEditPanel(page)
    const summaryInput = page.getByLabel('Professional Summary')
    await summaryInput.fill('Updated summary text.')

    await startFrameSampler(page)
    await showPreviewPanel(page)
    await expect(link).toBeVisible()
    await page.waitForTimeout(1200)
    const frames = await stopFrameSampler(page)
    expect(frames.framesWithBlankPage).toBe(0)
    expect(frames.framesWithLoader).toBe(0)
  })

  test('downloaded PDF preserves the same link destination as live preview', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openBuilderWithCV(page, cvWithWorkLink('https://github.com/odysseus-dev/odysseus'))
    await waitForFirstPreview(page)

    const previewLink = page.locator('[data-preview-annotation-layer] a[href="https://github.com/odysseus-dev/odysseus"]')
    await expect(previewLink).toBeVisible()

    const downloadButton = page.getByRole('button', { name: 'Download' })
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadButton.click(),
    ])

    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(Buffer.from(chunk))
    const pdfBuffer = Buffer.concat(chunks)

    const doc = await PDFDocument.load(pdfBuffer)
    expect(doc.getPageCount()).toBeGreaterThan(0)

    // Inspect annotations using pdfjs
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const task = pdfjs.getDocument({ data: new Uint8Array(pdfBuffer), verbosity: 0, useWorkerFetch: false })
    const parsedPdf = await task.promise
    const firstPage = await parsedPdf.getPage(1)
    const annotations = await firstPage.getAnnotations()
    const matchingLink = annotations.find(
      (a: { url?: string; unsafeUrl?: string }) => (a.url || a.unsafeUrl)?.includes('odysseus-dev/odysseus'),
    )
    expect(matchingLink).toBeDefined()
    await task.destroy()
  })
})
