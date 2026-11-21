import {
  PDFArray,
  PDFContext,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFObject,
  PDFRawStream,
  PDFRef,
  PDFStream,
} from 'pdf-lib'

// Page identity for the preview. A key is the exact serialization of everything
// that decides how a page is painted: page boxes, rotation, the content stream
// bytes, the resources (fonts are resolved down to their dictionaries, so a
// font swap changes the key even when object numbers stay the same), and
// annotations. It is not a hash, so equal keys can never hide different pages.
// A page whose key matches the one on screen needs no new bitmap.

const MAX_REFERENCE_DEPTH = 4
// Pdf-lib dictionary keys that lead away from the page and would only add noise.
const SKIPPED_KEYS = new Set(['Parent', 'P'])
const LATIN1_CHUNK = 8192

export async function readPageKeys(bytes: Uint8Array): Promise<string[]> {
  const document = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: true })
  const context = document.context
  return document.getPages().map((page) => {
    const node = page.node
    return [
      describe(node.MediaBox(), context, MAX_REFERENCE_DEPTH),
      describe(node.CropBox(), context, MAX_REFERENCE_DEPTH),
      describe(node.Rotate(), context, MAX_REFERENCE_DEPTH),
      describe(node.get(PDFName.of('Contents')), context, MAX_REFERENCE_DEPTH),
      describe(node.Resources(), context, MAX_REFERENCE_DEPTH),
      describe(node.Annots(), context, MAX_REFERENCE_DEPTH),
    ].join('\u0000')
  })
}

function describe(object: PDFObject | undefined, context: PDFContext, depth: number): string {
  if (object === undefined) return '-'
  if (object instanceof PDFRef) {
    // Out of depth: the reference number is kept, which can only make keys differ.
    return depth <= 0 ? object.toString() : describe(context.lookup(object), context, depth - 1)
  }
  if (object instanceof PDFStream) return describeStream(object, context, depth)
  if (object instanceof PDFDict) return describeDict(object, context, depth)
  if (object instanceof PDFArray) return `[${object.asArray().map((item) => describe(item, context, depth)).join(' ')}]`
  return object.toString()
}

function describeDict(dict: PDFDict, context: PDFContext, depth: number): string {
  const entries = dict.entries()
    .filter(([name]) => !SKIPPED_KEYS.has(name.asString().slice(1)))
    .map(([name, value]) => `${name.toString()} ${describe(value, context, depth)}`)
    .sort()
  return `<<${entries.join(' ')}>>`
}

function describeStream(stream: PDFStream, context: PDFContext, depth: number): string {
  const contents = stream instanceof PDFRawStream ? stream.contents : stream.getContents()
  return `${describeDict(stream.dict, context, depth)}stream(${toLatin1(contents)})`
}

// A string compares by value and keeps every byte, so no information is lost.
function toLatin1(bytes: Uint8Array): string {
  let text = ''
  for (let offset = 0; offset < bytes.length; offset += LATIN1_CHUNK) {
    text += String.fromCharCode(...bytes.subarray(offset, offset + LATIN1_CHUNK))
  }
  return text
}
