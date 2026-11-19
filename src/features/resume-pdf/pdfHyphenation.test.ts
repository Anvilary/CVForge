import { describe, expect, it } from 'vitest'
import { hyphenateForPdf } from './pdfHyphenation'

describe('PDF hyphenation', () => {
  it.each([
    'reliability',
    'Docker',
    'Terraform',
    'TypeScript',
    'PostgreSQL',
    'Kubernetes',
    'FastAPI',
    'Next.js',
    'REST/GraphQL',
    '(REST/GraphQL).',
    'CI/CD',
    'high-throughput',
    'alex.morgan@example.org',
    'https://example.org/team/reliability-2026',
  ])('never offers a break inside %s', (word) => {
    expect(hyphenateForPdf(word)).toEqual([word])
  })

  it('does not hyphenate Portuguese words with English patterns', () => {
    expect(hyphenateForPdf('distribuídos')).toEqual(['distribuídos'])
    expect(hyphenateForPdf('contínua,')).toEqual(['contínua,'])
  })

  it('breaks an oversized link after separators, never after a hyphen', () => {
    const url = 'https://example.org/portfolio/projects/distributed-systems/observability/final-report-2026?version=complete&section=technical-appendices'
    const parts = hyphenateForPdf(url)
    expect(parts.join('')).toBe(url)
    expect(parts.length).toBeGreaterThan(1)
    expect(parts.slice(0, -1).some((part) => part.endsWith('-'))).toBe(false)
  })

  it.each([
    'https://example.org/' + 'A1b2C3d4E5f6G7h8'.repeat(9),
    'x'.repeat(200),
    'alex.morgan.with.a.very.long.address.that.keeps.going@example-organization-name.org',
  ])('splits an oversized token into short runs and keeps the text intact', (token) => {
    const parts = hyphenateForPdf(token)
    expect(parts.join('')).toBe(token)
    expect(Math.max(...parts.map((part) => part.length))).toBeLessThanOrEqual(28)
  })
})
