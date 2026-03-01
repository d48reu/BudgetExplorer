import type { MetadataRoute } from 'next'
import prisma from '@/lib/prisma'
import { CANONICAL_DOMAIN } from '@/lib/constants'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [departments, areas] = await Promise.all([
    prisma.departments.findMany({ select: { slug: true } }),
    prisma.strategic_areas.findMany({ select: { slug: true } }),
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

  const departmentPages: MetadataRoute.Sitemap = departments.map(
    (dept) => ({
      url: `${CANONICAL_DOMAIN}/department/${dept.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })
  )

  const areaPages: MetadataRoute.Sitemap = areas.map((area) => ({
    url: `${CANONICAL_DOMAIN}/explorer/${area.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [...staticPages, ...departmentPages, ...areaPages]
}
