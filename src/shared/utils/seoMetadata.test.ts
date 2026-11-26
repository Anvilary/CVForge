import { describe, expect, it } from 'vitest'
import robots from '@/app/robots'
import sitemap from '@/app/sitemap'
import { cvForgeStructuredData } from '@/features/home/StructuredData'
import {
  ANALYZER_DESCRIPTION,
  ANALYZER_TITLE,
  BUILDER_DESCRIPTION,
  BUILDER_TITLE,
  HOME_DESCRIPTION,
  HOME_TITLE,
  siteConfig,
} from './siteConfig'

describe('SEO metadata and configuration', () => {
  it('defines consistent Anvilary Tools umbrella branding and repository identity', () => {
    expect(siteConfig.name).toBe('CVForge')
    expect(siteConfig.organizationName).toBe('Anvilary Tools')
    expect(siteConfig.familyUrl).toBe('https://anvilary.tools')
    expect(siteConfig.repositoryUrl).toBe('https://github.com/Anvilary/CVForge')
  })

  it('provides distinct, human-readable titles and descriptions without em-dashes', () => {
    const titles = [HOME_TITLE, BUILDER_TITLE, ANALYZER_TITLE]
    const descriptions = [HOME_DESCRIPTION, BUILDER_DESCRIPTION, ANALYZER_DESCRIPTION]

    // Distinct titles and descriptions
    expect(new Set(titles).size).toBe(3)
    expect(new Set(descriptions).size).toBe(3)

    // Length and character bounds
    for (const title of titles) {
      expect(title.length).toBeGreaterThan(30)
      expect(title.length).toBeLessThanOrEqual(65)
      expect(title).not.toContain('\u2014')
    }

    for (const desc of descriptions) {
      expect(desc.length).toBeGreaterThan(100)
      expect(desc.length).toBeLessThanOrEqual(165)
      expect(desc).not.toContain('\u2014')
    }
  })

  it('aligns titles and descriptions with genuine capabilities and search intents', () => {
    expect(HOME_TITLE).toContain('Free CV Builder')
    expect(HOME_TITLE).toContain('ATS-Style Resume Analyzer')
    expect(HOME_DESCRIPTION).toContain('no account required')

    expect(BUILDER_TITLE).toContain('Free CV Builder')
    expect(BUILDER_TITLE).toContain('Live Preview')
    expect(BUILDER_DESCRIPTION).toContain('live PDF preview')
    expect(BUILDER_DESCRIPTION).toContain('JSON backup')

    expect(ANALYZER_TITLE).toContain('ATS-Style CV Analyzer')
    expect(ANALYZER_TITLE).toContain('Resume Checker')
    expect(ANALYZER_DESCRIPTION).toContain('transparent scoring')
  })

  it('produces valid Schema.org structured data referencing AGPL-3.0-or-later license', () => {
    expect(cvForgeStructuredData['@context']).toBe('https://schema.org')
    const graph = cvForgeStructuredData['@graph']
    expect(graph.map((node) => node['@type'])).toEqual([
      'Organization',
      'WebSite',
      'SoftwareApplication',
    ])

    const org = graph.find((node) => node['@type'] === 'Organization')!
    expect(org.name).toBe('Anvilary Tools')
    expect(org.url).toBe('https://anvilary.tools')
    expect(org.sameAs).toContain('https://github.com/Anvilary')

    const software = graph.find((node) => node['@type'] === 'SoftwareApplication') as {
      '@type': string
      name: string
      applicationCategory: string
      isAccessibleForFree: boolean
      license: string
      sameAs: string[]
      offers: { '@type': string; price: string; priceCurrency: string }
      featureList: string[]
    }
    expect(software.name).toBe('CVForge')
    expect(software.applicationCategory).toBe('BusinessApplication')
    expect(software.isAccessibleForFree).toBe(true)
    expect(software.license).toBe('https://www.gnu.org/licenses/agpl-3.0.html')
    expect(software.sameAs).toContain('https://github.com/Anvilary/CVForge')
    expect(software.offers).toEqual({
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    })
    expect(software.featureList.length).toBeGreaterThanOrEqual(6)
  })

  it('generates a clean sitemap without obsolete changeFrequency or priority tags', () => {
    const entries = sitemap()
    expect(entries).toHaveLength(3)

    const urls = entries.map((entry) => entry.url)
    expect(urls[0]).toMatch(/\/$/)
    expect(urls[1]).toMatch(/\/builder$/)
    expect(urls[2]).toMatch(/\/analyzer$/)

    for (const entry of entries) {
      expect(entry.changeFrequency).toBeUndefined()
      expect(entry.priority).toBeUndefined()
      expect(entry.lastModified).toBeUndefined()
      expect(entry.url).not.toContain('/parser')
      expect(entry.url).not.toContain('/resume-import')
    }
  })

  it('produces valid robots.txt directives pointing to sitemap.xml', () => {
    const config = robots()
    expect(config.rules).toEqual({
      userAgent: '*',
      allow: '/',
    })
    expect(config.sitemap).toMatch(/\/sitemap\.xml$/)
    expect(config.host).toBe(siteConfig.url)
  })
})
