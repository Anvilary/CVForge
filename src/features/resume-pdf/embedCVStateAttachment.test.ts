import assert from 'node:assert/strict'
import { expect, it } from 'vitest'
import { decodePDFRawStream, PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFRawStream } from 'pdf-lib'
import { defaultCVState } from '@/features/cv/model/defaults'
import { CVFORGE_ATTACHMENT_NAME } from '@/lib/parser/extractCVForgeAttachment'
import { embedCVStateAttachment } from './embedCVStateAttachment'

it('embeds the complete UTF-8 session under the parser attachment name and JSON media type', async () => {
  const source = await PDFDocument.create()
  source.addPage()
  const pdf = new Blob([Uint8Array.from(await source.save()).buffer], { type: 'application/pdf' })
  const state = {
    ...defaultCVState,
    resume: {
      ...defaultCVState.resume,
      profile: { ...defaultCVState.resume.profile, name: 'Zoë Brontë' },
    },
    settings: { ...defaultCVState.settings, themeColor: '#124563' },
    extensionData: { label: 'Préférences' },
  }

  const result = await embedCVStateAttachment(pdf, state)
  expect(result.type).toBe('application/pdf')
  const document = await PDFDocument.load(await result.arrayBuffer())
  expect(document.getPageCount()).toBe(1)
  const names = document.catalog.lookup(PDFName.of('Names'), PDFDict)
  const embeddedFiles = names.lookup(PDFName.of('EmbeddedFiles'), PDFDict)
  const entries = embeddedFiles.lookup(PDFName.of('Names'), PDFArray)
  expect(entries.lookup(0, PDFHexString).decodeText()).toBe(CVFORGE_ATTACHMENT_NAME)
  expect(CVFORGE_ATTACHMENT_NAME).toBe('cvforge-state.json')
  const file = entries.lookup(1, PDFDict).lookup(PDFName.of('EF'), PDFDict)
  const contents = file.lookup(PDFName.of('F'))
  assert(contents instanceof PDFRawStream)
  expect(contents.dict.lookup(PDFName.of('Subtype'), PDFName).decodeText()).toBe('application/json')
  expect(JSON.parse(new TextDecoder().decode(decodePDFRawStream(contents).decode()))).toEqual(state)
})
