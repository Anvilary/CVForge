import { type CVState } from '@/features/cv/model/types'
import { isContactLine, isLikelyLocation, isLikelyName, normalizeUrl, preambleLines } from './sectionDetection'

export function extractProfile(
  text: string,
  lines: string[],
  draft: CVState,
  detectedFields: string[],
  profileFields: string[],
) {
  const nameCandidate = lines.find((line) => isLikelyName(line))
  if (nameCandidate) addProfileField('Name', profileFields, detectedFields, () => { draft.resume.profile.name = nameCandidate })

  const email = text.match(EMAIL_PATTERN)?.[0]
  if (email) addProfileField('Email', profileFields, detectedFields, () => { draft.resume.profile.email = email })

  const phone = findPhone(text, lines)
  if (phone) addProfileField('Phone', profileFields, detectedFields, () => { draft.resume.profile.phone = phone })

  const linkedin = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?/i)?.[0]
  if (linkedin) addProfileField('LinkedIn', profileFields, detectedFields, () => { draft.resume.profile.linkedin = normalizeUrl(linkedin) })

  const github = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9-]+\/?/i)?.[0]
  if (github) addProfileField('GitHub', profileFields, detectedFields, () => { draft.resume.profile.github = normalizeUrl(github) })

  const website = findWebsite(text, lines)
  if (website) addProfileField('Website', profileFields, detectedFields, () => { draft.resume.profile.website = website })

  const location = findHeaderLocation(preambleLines(text))
  if (location) addProfileField('Location', profileFields, detectedFields, () => { draft.resume.profile.location = location })
}

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
// Digits with spaces, dots, dashes and brackets between them: "+351 912 345 678",
// "+44 20 7946 0958", "(555) 123-4567". Candidates are filtered by digit count.
const PHONE_CANDIDATE = /(?<![\w@/])[+(]?\d[\d\s().-]{6,}\d(?![\w@/])/g
const MIN_PHONE_DIGITS = 9
const MAX_PHONE_DIGITS = 15
const POSTAL_CODE = /\b\d{4}-\d{3}\b/
const YEAR_RANGE = /(?:19|20)\d{2}\s*[-\u2013\u2014]\s*(?:(?:19|20)\d{2}|present|current)/i
// Any run of digits, spaces, and phone punctuation long enough to be a number.
const PHONE_LIKE = /\+?\d[\d\s().-]{6,}\d/g
const URL_PATTERN = /(?:https?:\/\/|www\.)\S+|(?:linkedin|github)\.com\/\S+/gi
const CONTACT_SEPARATORS = /\s*[|\u2022\u00b7]\s*|\s{2,}/

// The contact block comes first, so the header lines are searched before the rest
// of the document (a number inside a bullet is never a phone number).
function findPhone(text: string, lines: string[]) {
  const header = preambleLines(text)
  const headerLines = (header.length ? header : lines.slice(0, MAX_HEADER_LINES)).filter(isContactBlockLine)
  // A contact block below the first heading (sidebar or footer layouts) is the fallback.
  const unbulleted = text.split('\n').map((line) => line.trim()).filter((line) => !/^[\u2022*-]/.test(line))
  return firstPhone(headerLines) ?? firstPhone(unbulleted.filter(isContactBlockLine)) ?? ''
}

function firstPhone(lines: string[]) {
  for (const line of lines) {
    const candidates = line.replace(new RegExp(EMAIL_PATTERN, 'g'), ' ').match(PHONE_CANDIDATE) ?? []
    const phone = candidates.map((value) => value.trim()).find(isPhoneNumber)
    if (phone) return phone
  }
  return null
}

function isPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').length
  return digits >= MIN_PHONE_DIGITS && digits <= MAX_PHONE_DIGITS && !YEAR_RANGE.test(value) && !POSTAL_CODE.test(value)
}

// Header lines are short; a long prose line may mention "Node.js" or "ASP.NET".
const MAX_CONTACT_LINE_TOKENS = 8
const MAX_HEADER_LINES = 8
const DOMAIN_SUFFIXES = new Set([
  'com', 'org', 'net', 'io', 'dev', 'app', 'ai', 'co', 'me', 'info', 'biz', 'tech', 'xyz', 'site', 'online', 'page', 'blog',
  'design', 'cloud', 'tv', 'edu', 'gov', 'pt', 'uk', 'eu', 'us', 'de', 'fr', 'es', 'it', 'nl', 'be', 'ch', 'at', 'se', 'no',
  'dk', 'fi', 'ie', 'pl', 'cz', 'ro', 'gr', 'br', 'ca', 'au', 'nz', 'in', 'jp', 'cn', 'ru',
])
const DOMAIN_TOKEN = /^(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.([a-z]{2,24})(?:[/?#]\S*)?$/i
const BARE_DOMAIN_PATTERN = /(?<![\w@.-])(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.([a-z]{2,24})(?:[/?#]\S*)?(?![\w@])/gi

// Only the header is searched: a project or employer link further down is not the
// candidate's own website.
function findWebsite(text: string, lines: string[]) {
  const header = preambleLines(text)
  const headerLines = header.length ? header : lines.slice(0, MAX_HEADER_LINES)
  const explicit = headerLines.join('\n').match(/https?:\/\/(?!.*(?:linkedin|github))[^\s)]+/i)?.[0]
  if (explicit) return explicit
  const bare = headerLines
    .filter(isContactBlockLine)
    .flatMap((line) => line.split(' '))
    .find(isBareWebsite)
  return bare ? normalizeUrl(bare) : ''
}

// A short line, or a longer one that carries an email address or separators
// ("Lisbon | +351 912 345 678 | jane@doe.dev | janedoe.dev").
function isContactBlockLine(line: string) {
  return line.split(' ').length <= MAX_CONTACT_LINE_TOKENS || line.includes('@') || /[|\u2022\u00b7]/.test(line)
}

function isBareWebsite(token: string) {
  // Technology names are written in capitals or mixed case ("ASP.NET"); a site is not all capitals.
  if (token.includes('@') || /linkedin\.com|github\.com/i.test(token) || token === token.toUpperCase()) return false
  const suffix = DOMAIN_TOKEN.exec(token)?.[1]
  return suffix !== undefined && isDomainSuffix(suffix)
}

function isDomainSuffix(suffix: string) {
  return DOMAIN_SUFFIXES.has(suffix.toLowerCase())
}

// The location usually sits on the contact line ("email  phone  City, Country")
// or on its own line near the top. Only the header area is searched, so job
// locations further down are never used.
function findHeaderLocation(lines: string[]) {
  for (const line of lines.slice(0, 8)) {
    const residual = line
      .replace(new RegExp(EMAIL_PATTERN, 'g'), '  ')
      .replace(PHONE_LIKE, '  ')
      .replace(URL_PATTERN, '  ')
      .replace(BARE_DOMAIN_PATTERN, (token, suffix: string) => (isDomainSuffix(suffix) ? '  ' : token))
    const candidate = residual.split(CONTACT_SEPARATORS).map((part) => part.trim()).find(isLikelyLocation)
    if (candidate) return candidate
  }
  return ''
}

// An unheaded paragraph between the contact block and the first section is
// the summary in many templates, including CVForge's own PDF layout.
export function findUnheadedSummary(text: string, name: string) {
  const candidates = preambleLines(text).filter((line) => line !== name && !isContactLine(line) && !isLikelyLocation(line))
  const start = candidates.findIndex((line) => line.split(' ').length >= MIN_SUMMARY_WORDS)
  // Once the prose starts, a short wrapped last line ("GraphQL).") still belongs to it.
  const summary = start === -1 ? '' : candidates.slice(start).join(' ').trim()
  return summary.length >= 60 ? summary.slice(0, 1200) : ''
}

const MIN_SUMMARY_WORDS = 6

function addProfileField(label: string, profileFields: string[], detectedFields: string[], apply: () => void) {
  apply()
  profileFields.push(label)
  detectedFields.push(label)
}
