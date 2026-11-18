import { describe, expect, it, vi } from 'vitest'
import { defaultCVState } from '@/features/cv/model/defaults'
import { CVFORGE_ATTACHMENT_NAME, extractCVForgeAttachment } from './extractCVForgeAttachment'

const bytes = (text: string) => new TextEncoder().encode(text)

function attachment(filename: string, content?: Uint8Array) {
  return { filename, rawFilename: filename, description: '', content }
}

function withAttachment(content?: Uint8Array) {
  return {
    getAttachments: async () => new Map([[CVFORGE_ATTACHMENT_NAME, attachment(CVFORGE_ATTACHMENT_NAME, content)]]),
    getAttachmentContent: vi.fn(),
  }
}

describe('CVForge attachment extraction (PDF.js 6 Map API)', () => {
  it('restores inline content without a second lookup', async () => {
    const pdf = withAttachment(bytes(JSON.stringify(defaultCVState)))
    expect(await extractCVForgeAttachment(pdf)).toEqual({ status: 'restored', state: defaultCVState })
    expect(pdf.getAttachmentContent).not.toHaveBeenCalled()
  })

  it('restores a historical session with omitted version and passthrough fields', async () => {
    const { schemaVersion, ...legacy } = defaultCVState
    const contents = { ...legacy, extension: { source: 'historical' } }
    const pdf = {
      getAttachments: async () => new Map([['alternate-key', attachment(CVFORGE_ATTACHMENT_NAME)]]),
      getAttachmentContent: vi.fn(async () => bytes(JSON.stringify(contents))),
    }
    expect(await extractCVForgeAttachment(pdf)).toEqual({
      status: 'restored', state: { ...contents, schemaVersion },
    })
    expect(pdf.getAttachmentContent).toHaveBeenCalledWith('alternate-key')
  })

  it('reports absence only when no CVForge attachment exists', async () => {
    const none = { getAttachments: async () => null, getAttachmentContent: vi.fn() }
    const other = {
      getAttachments: async () => new Map([['invoice.xml', attachment('invoice.xml', bytes('<invoice/>'))]]),
      getAttachmentContent: vi.fn(),
    }
    expect(await extractCVForgeAttachment(none)).toEqual({ status: 'absent' })
    expect(await extractCVForgeAttachment(other)).toEqual({ status: 'absent' })
    expect(other.getAttachmentContent).not.toHaveBeenCalled()
  })

  it.each([
    [JSON.stringify({ ...defaultCVState, schemaVersion: '2.0.0' }), 'unsupported'],
    ['{broken', 'malformed'],
    [JSON.stringify({ ...defaultCVState, resume: null }), 'malformed'],
  ])('classifies an unreadable session (%#)', async (json, status) => {
    expect(await extractCVForgeAttachment(withAttachment(bytes(json)))).toEqual({ status })
  })

  it('reports missing bytes and lookup rejection as failures', async () => {
    const pdf = withAttachment()
    pdf.getAttachmentContent.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('lookup failed'))
    expect(await extractCVForgeAttachment(pdf)).toEqual({ status: 'failed' })
    expect(await extractCVForgeAttachment(pdf)).toEqual({ status: 'failed' })
  })
})
