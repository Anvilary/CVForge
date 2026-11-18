import type { MetadataRoute } from 'next'
import { absoluteSiteUrl, siteConfig } from '@/shared/utils/siteConfig'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: absoluteSiteUrl('/sitemap.xml'),
    host: siteConfig.url,
  }
}
