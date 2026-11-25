import type { MetadataRoute } from 'next'
import { absoluteSiteUrl } from '@/shared/utils/siteConfig'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteSiteUrl('/'),
    },
    {
      url: absoluteSiteUrl('/builder'),
    },
    {
      url: absoluteSiteUrl('/analyzer'),
    },
  ]
}
