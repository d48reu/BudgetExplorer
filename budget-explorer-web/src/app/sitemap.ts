import type { MetadataRoute } from 'next'
import { CANONICAL_DOMAIN } from '@/lib/constants'
import {
  getAdoptedDepartmentSlugs,
  getAdoptedStrategicAreaSlugs,
} from '@/lib/db/queries'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [departmentSlugs, areaSlugs] = await Promise.all([
    getAdoptedDepartmentSlugs(),
    getAdoptedStrategicAreaSlugs(),
  ])

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: CANONICAL_DOMAIN,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1.0,
    },
    {
      url: `${CANONICAL_DOMAIN}/explorer`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${CANONICAL_DOMAIN}/proposed`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${CANONICAL_DOMAIN}/compare`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${CANONICAL_DOMAIN}/calculator`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.7,
    },
    {
      url: `${CANONICAL_DOMAIN}/glossary`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${CANONICAL_DOMAIN}/search`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ]

  const departmentPages: MetadataRoute.Sitemap = departmentSlugs.map(
    (slug) => ({
      url: `${CANONICAL_DOMAIN}/department/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })
  )

  const areaPages: MetadataRoute.Sitemap = areaSlugs.map((slug) => ({
    url: `${CANONICAL_DOMAIN}/explorer/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [...staticPages, ...departmentPages, ...areaPages]
}
