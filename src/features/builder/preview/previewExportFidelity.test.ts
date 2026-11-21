import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { embedCVStateAttachment } from '@/features/resume-pdf/embedCVStateAttachment'
import { buildFixtureState } from '@/features/resume-pdf/testing/pdfIntegrityFixtures'
import { renderResumePdf } from '@/features/resume-pdf/testing/renderPdfText'

// The download is the preview's own PDF plus the session attachment. These
// tests rasterize both with Poppler, an independent renderer, and require the
// pages to match pixel for pixel.

const hasPoppler = spawnSync('pdftoppm', ['-v']).status === 0
const FIXTURES = [
  { name: 'one page, sans', options: { jobs: 1 } },
  { name: 'several pages, serif, Letter', options: { jobs: 8, font: 'Times New Roman', size: 'Letter' } },
  { name: 'several pages, mono', options: { jobs: 6, font: 'Courier New' } },
] as const

async function rasterize(directory: string, name: string, bytes: Uint8Array) {
  const file = path.join(directory, `${name}.pdf`)
  await writeFile(file, bytes)
  const run = spawnSync('pdftoppm', ['-r', '110', '-png', file, path.join(directory, name)])
  expect(run.status, run.stderr.toString()).toBe(0)
  const pages = spawnSync('ls', [directory]).stdout.toString().split('\n').filter((entry) => entry.startsWith(`${name}-`) && entry.endsWith('.png')).sort()
  return Promise.all(pages.map(async (entry) => sharp(path.join(directory, entry)).raw().toBuffer({ resolveWithObject: true })))
}

describe.skipIf(!hasPoppler)('preview and download fidelity', () => {
  for (const fixture of FIXTURES) {
    it(`renders the exported PDF like the previewed PDF: ${fixture.name}`, async () => {
      const directory = await mkdtemp(path.join(tmpdir(), 'cvforge-fidelity-'))
      try {
        const state = buildFixtureState(fixture.options)
        const previewed = await renderResumePdf(state)
        const blob = await embedCVStateAttachment(new Blob([previewed as unknown as BlobPart], { type: 'application/pdf' }), state)
        const exported = new Uint8Array(await blob.arrayBuffer())

        const previewPages = await rasterize(directory, 'preview', previewed)
        const exportPages = await rasterize(directory, 'export', exported)
        expect(exportPages).toHaveLength(previewPages.length)
        expect(previewPages.length).toBeGreaterThan(0)
        previewPages.forEach((page, index) => {
          expect(exportPages[index].info.width).toBe(page.info.width)
          expect(exportPages[index].info.height).toBe(page.info.height)
          expect(Buffer.compare(exportPages[index].data, page.data), `page ${index + 1} differs`).toBe(0)
        })
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    })
  }

  it('keeps the exported text identical to the previewed text', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'cvforge-fidelity-'))
    try {
      const state = buildFixtureState({ jobs: 4 })
      const previewed = await renderResumePdf(state)
      const blob = await embedCVStateAttachment(new Blob([previewed as unknown as BlobPart], { type: 'application/pdf' }), state)
      await writeFile(path.join(directory, 'a.pdf'), previewed)
      await writeFile(path.join(directory, 'b.pdf'), new Uint8Array(await blob.arrayBuffer()))
      const text = (name: string) => spawnSync('pdftotext', ['-layout', path.join(directory, name), '-']).stdout.toString()
      expect(text('b.pdf')).toBe(text('a.pdf'))
      expect(await readFile(path.join(directory, 'b.pdf'))).not.toEqual(await readFile(path.join(directory, 'a.pdf')))
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
