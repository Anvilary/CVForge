// Only the PDF core fonts are offered, because the exported PDF does not
// embed font files. Each option is exactly the family the PDF uses.
export const FONT_FAMILY_OPTIONS = [
  { value: 'Helvetica', display: 'Helvetica', category: 'Sans' },
  { value: 'Times New Roman', display: 'Times', category: 'Serif' },
  { value: 'Courier New', display: 'Courier', category: 'Mono' },
] as const

export function resolveDateFont(_fontFamily: string) {
  return 'Courier'
}

export type PdfCoreFont = 'Helvetica' | 'Times-Roman' | 'Courier'

// The PDF uses the three standard core fonts only (no embedded font files).
// Any stored name, including legacy picker values, maps to one of them.
export function resolvePdfFont(fontFamily: string): PdfCoreFont {
  const font = fontFamily.toLowerCase()

  if (font.includes('mono') || font.includes('courier')) return 'Courier'
  if (font.includes('sans')) return 'Helvetica'
  if (font.includes('serif') || font.includes('times') || font.includes('georgia')) return 'Times-Roman'
  return 'Helvetica'
}
