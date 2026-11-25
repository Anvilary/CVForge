export const SITE_URL_ENV_VAR = 'NEXT_PUBLIC_SITE_URL'
export const DEVELOPMENT_SITE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000'
  : 'https://cvforge.anvilary.tools'

// Hostnames that served CVForge before the move to the current origin. Saved
// CVs live in each origin's own browser storage, so visitors there are shown
// how to move their CV instead of being redirected.
export const LEGACY_HOSTNAMES: readonly string[] = ['cvforge.alexandreteixeira.dev']

export const HOME_TITLE = 'CVForge | Free CV Builder & ATS-Style Resume Analyzer'
export const HOME_DESCRIPTION =
  'Build, preview, export, and analyze your CV locally. Free structured editor, live PDF preview, JSON backups, and ATS-style checks with no account required.'
export const BUILDER_TITLE = 'Free CV Builder with PDF Export & Live Preview | CVForge'
export const BUILDER_DESCRIPTION =
  'Build and edit a structured CV or resume with real-time live PDF preview, browser autosave, portable JSON backup, and PDF export without creating an account.'
export const ANALYZER_TITLE = 'ATS-Style CV Analyzer & Resume Checker | CVForge'
export const ANALYZER_DESCRIPTION =
  'Analyze your resume or CV PDF locally for ATS-style readability, text extraction, and structure with transparent scoring and actionable feedback.'

export const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)

export const siteConfig = {
  name: 'CVForge',
  applicationName: 'CVForge CV Builder and Analyzer',
  organizationName: 'Anvilary Tools',
  familyUrl: 'https://anvilary.tools',
  repositoryUrl: 'https://github.com/Anvilary/CVForge',
  url: siteUrl,
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
} as const

export function absoluteSiteUrl(pathname = '/') {
  return new URL(pathname, `${siteUrl}/`).toString()
}

function resolveSiteUrl(configuredUrl: string | undefined) {
  if (!configuredUrl?.trim()) return DEVELOPMENT_SITE_URL

  const parsed = new URL(configuredUrl)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${SITE_URL_ENV_VAR} must use http:// or https://`)
  }
  return parsed.origin
}
