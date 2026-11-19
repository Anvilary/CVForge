// react-pdf draws a real hyphen glyph at every break it makes inside a word, and
// that glyph is part of the text layer ("Dock-" / "er"). Keywords and link text
// therefore stay whole. Only a token that cannot fit on one line is split, so a
// false hyphen can only appear when the alternative is text running off the page.
//
// The narrowest column text can sit in is the entry title beside its dates
// (about 310 pt at the narrowest page) and the skill values (375 pt). At the
// largest supported size (12 pt Courier, 7.2 pt per character) 42 characters
// are 302 pt, so any token up to this length fits a line of its own.
const MAX_UNBROKEN_LENGTH = 42
const PIECE_LENGTH = 28
// A hyphen is not a break point: the glyph react-pdf adds would double it.
const LINK_SEPARATORS = '/?&=#._'

// The built-in English patterns are deliberately ignored: they hyphenate
// keywords ("Ter-raform") and mishyphenate other languages. The stored text is
// never changed; this only offers break points when a line cannot hold a token.
export function hyphenateForPdf(word: string): string[] {
  if (word.length <= MAX_UNBROKEN_LENGTH) return [word]
  return splitAfterSeparators(word).flatMap(splitLongPart).filter((part) => part.length > 0)
}

function splitAfterSeparators(word: string): string[] {
  const parts: string[] = []
  let current = ''
  for (const character of word) {
    current += character
    if (LINK_SEPARATORS.includes(character)) {
      parts.push(current)
      current = ''
    }
  }
  if (current) parts.push(current)
  return parts
}

function splitLongPart(part: string): string[] {
  if (part.length <= PIECE_LENGTH) return [part]
  const pieces: string[] = []
  for (let start = 0; start < part.length; start += PIECE_LENGTH) {
    pieces.push(part.slice(start, start + PIECE_LENGTH))
  }
  return pieces
}
