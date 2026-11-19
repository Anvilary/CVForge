import { type DateRange } from './heuristicTypes'

const ENGLISH_MONTHS = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?'
const PORTUGUESE_MONTHS = 'Jan(?:eiro)?|Fev(?:ereiro)?|Mar(?:[c\u00e7]o)?|Abr(?:il)?|Mai(?:o)?|Jun(?:ho)?|Jul(?:ho)?|Ago(?:sto)?|Set(?:embro)?|Out(?:ubro)?|Nov(?:embro)?|Dez(?:embro)?'
const PRESENT_WORDS = 'Presente|Present|Current|Now|Atualidade|Atualmente|Actualidade|Atual'
const RANGE_SEPARATOR = String.raw`(?:-|\u2013|\u2014|to|until|at[\u00e9e])`

export function extractDateRange(line: string): DateRange | null {
  const datePart = String.raw`(?:(?:${ENGLISH_MONTHS}|${PORTUGUESE_MONTHS})\.?\s+(?:de\s+)?\d{4}|\d{1,2}\/\d{4}|\d{4}\/\d{1,2}|\d{4}-(?:0[1-9]|1[0-2])|\d{4}|${PRESENT_WORDS})`
  // Letter boundaries keep "Chicago 2019" from reading as "ago 2019" and "Atualmente" from stopping at "Atual".
  const range = new RegExp(`(?<!\\p{L})(${datePart})\\s*${RANGE_SEPARATOR}\\s*(${datePart})(?!\\p{L})`, 'iu').exec(line)
  if (range) return toDateRange(range[1], range[2], range[0])

  const single = new RegExp(`(?<!\\p{L})(${datePart})(?!\\p{L})`, 'iu').exec(line)
  if (!single) return null
  return toDateRange(single[1], '', single[0])
}

function toDateRange(start: string, end: string, raw: string): DateRange {
  const normalizedEnd = normalizePresent(end)
  return {
    startDate: normalizePresent(start),
    endDate: normalizedEnd,
    isCurrent: normalizedEnd === 'Present',
    raw,
  }
}

function normalizePresent(value: string) {
  return new RegExp(`^(${PRESENT_WORDS})$`, 'i').test(value.trim()) ? 'Present' : value.trim()
}

export function isOnlyDateLine(line: string, dateRaw?: string) {
  if (!dateRaw) return false
  return line.trim().toLowerCase() === dateRaw.trim().toLowerCase()
}

export function firstDate(lines: string[]) {
  return lines.map(extractDateRange).find(Boolean) ?? null
}
