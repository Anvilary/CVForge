import { absoluteSiteUrl, siteConfig } from '@/shared/utils/siteConfig'

export const cvForgeStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteConfig.url}/#organization`,
      name: siteConfig.organizationName,
      url: siteConfig.familyUrl,
      sameAs: [
        'https://github.com/Anvilary',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${siteConfig.url}/#website`,
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
      inLanguage: 'en',
      publisher: {
        '@id': `${siteConfig.url}/#organization`,
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${siteConfig.url}/#software`,
      name: siteConfig.name,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any',
      url: siteConfig.url,
      sameAs: [
        siteConfig.repositoryUrl,
      ],
      license: 'https://www.gnu.org/licenses/agpl-3.0.html',
      image: absoluteSiteUrl('/opengraph-image'),
      description: siteConfig.description,
      isAccessibleForFree: true,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      creator: {
        '@id': `${siteConfig.url}/#organization`,
      },
      publisher: {
        '@id': `${siteConfig.url}/#organization`,
      },
      featureList: [
        'Structured browser-based CV and resume editing',
        'Local browser autosave without an account',
        'Real-time live PDF canvas preview',
        'PDF export with optional embedded session restoration',
        'Reliable portable JSON backup',
        'Local ATS-style PDF extraction and transparent score breakdown',
        'Review-first best-effort external PDF import',
      ],
    },
  ],
}

export function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(cvForgeStructuredData).replace(/</g, '\\u003c'),
      }}
    />
  )
}
