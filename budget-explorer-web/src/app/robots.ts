import type { MetadataRoute } from 'next'
import { CANONICAL_DOMAIN } from '@/lib/constants'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${CANONICAL_DOMAIN}/sitemap.xml`,
  }
}
