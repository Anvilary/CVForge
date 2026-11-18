import { beforeEach, expect, it, vi } from 'vitest'
import { getDocument } from 'pdfjs-dist'
import { defaultCVState } from '@/features/cv/model/defaults'
import { CVFORGE_ATTACHMENT_NAME } from './extractCVForgeAttachment'
import { analyzePdfImport } from './pdfImport'

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: {},
  OPS: {},
}))

const getDocumentMock = vi.mocked(getDocument)
const file = () => new File(['%PDF-1.7'], 'sample.pdf', { type: 'application/pdf' })

function loadPdf() {
  const lines = ['Casey Morgan', 'casey@example.org', 'EXPERIENCE', 'Senior Engineer | Example Co']
  const pdf = {
    numPages: 1,
    getMetadata: async () => ({ info: {} }),
    getPage: async () => ({
      getTextContent: async () => ({
        items: lines.map((str, index) => ({ str, transform: [1, 0, 0, 1, 48, 790 - index * 20] })),
      }),
    }),
    getAttachments: vi.fn().mockResolvedValue(null),
    getAttachmentContent: vi.fn(),
  }
  const destroy = vi.fn().mockResolvedValue(undefined)
  getDocumentMock.mockReturnValue({ promise: Promise.resolve(pdf), destroy } as unknown as ReturnType<typeof getDocument>)
  return { pdf, destroy }
}

beforeEach(() => getDocumentMock.mockReset())

it('uses one document for extraction and heuristic fallback when the attachment is absent', async () => {
  const { destroy } = loadPdf()
  const input = file()
  const read = vi.spyOn(input, 'arrayBuffer')
  const result = await analyzePdfImport(input)
  expect(result).toMatchObject({
    success: true,
    analysis: { heuristic: { draft: { resume: { profile: { name: 'Casey Morgan' } } } } },
  })
  expect(read).toHaveBeenCalledTimes(1)
  expect(getDocumentMock).toHaveBeenCalledTimes(1)
  expect(destroy).toHaveBeenCalledTimes(1)
})

it.each([
  [JSON.stringify({ ...defaultCVState, schemaVersion: '2.0.0' }), 'newer version'],
  ['{invalid', 'damaged or invalid'],
  [undefined, 'could not read'],
])('retains text diagnostics without offering an import draft (%#)', async (json, message) => {
  const { pdf, destroy } = loadPdf()
  if (json === undefined) {
    pdf.getAttachments.mockRejectedValue(new Error('lookup failed'))
  } else {
    pdf.getAttachments.mockResolvedValue(new Map([[CVFORGE_ATTACHMENT_NAME, {
      filename: CVFORGE_ATTACHMENT_NAME,
      content: new TextEncoder().encode(json),
    }]]))
  }
  const result = await analyzePdfImport(file())
  expect(result).toMatchObject({
    success: true,
    analysis: { extraction: { text: expect.stringContaining('Casey Morgan') }, sessionError: expect.stringContaining(message) },
  })
  if (!result.success) throw new Error(result.error)
  expect(result.analysis.heuristic).toBeUndefined()
  expect(result.analysis.embeddedState).toBeUndefined()
  expect(destroy).toHaveBeenCalledTimes(1)
})

it('does not start a worker when cancelled during the file read', async () => {
  const controller = new AbortController()
  const input = file()
  const started = Promise.withResolvers<void>()
  const bytes = Promise.withResolvers<ArrayBuffer>()
  vi.spyOn(input, 'arrayBuffer').mockImplementation(() => {
    started.resolve()
    return bytes.promise
  })
  const analysis = analyzePdfImport(input, { signal: controller.signal })
  await started.promise
  controller.abort()
  bytes.resolve(new ArrayBuffer(0))
  await expect(analysis).resolves.toEqual({ success: false, error: 'PDF analysis was cancelled.' })
  expect(getDocumentMock).not.toHaveBeenCalled()
})

it('destroys the loading task once when cancelled during a pending attachment lookup', async () => {
  const controller = new AbortController()
  const { pdf, destroy } = loadPdf()
  const started = Promise.withResolvers<void>()
  const lookup = Promise.withResolvers<null>()
  pdf.getAttachments.mockImplementation(() => {
    started.resolve()
    return lookup.promise
  })
  const analysis = analyzePdfImport(file(), { signal: controller.signal })
  await started.promise
  controller.abort()
  await expect(analysis).resolves.toEqual({ success: false, error: 'PDF analysis was cancelled.' })
  expect(destroy).toHaveBeenCalledTimes(1)
  lookup.resolve(null)
})
