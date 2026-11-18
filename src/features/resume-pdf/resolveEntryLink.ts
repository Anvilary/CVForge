// Accept absolute HTTP(S) URLs and bare domains with an optional port.
const absoluteWebUrl = /^https?:\/\/[^/?#]/i
const bareDomain = /^[^/?#:@.]+(?:\.[^/?#:@.]+)+(?::\d+)?(?:[/?#]|$)/

export function resolveEntryLink(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (!value || /[\s\\]/.test(value)) return null

  const absolute = absoluteWebUrl.test(value)
  if (!absolute && !bareDomain.test(value)) return null

  try {
    const url = new URL(absolute ? value : `https://${value}`)
    if (url.username || url.password) return null
    return url.href
  } catch {
    return null
  }
}
