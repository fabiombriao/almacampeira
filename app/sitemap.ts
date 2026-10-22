import type { MetadataRoute } from 'next'
import { getAllSlugs } from '@/lib/data/catalog'
import { siteBaseUrl } from '@/lib/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBaseUrl().origin
  const slugs = await getAllSlugs()
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/produtos`, changeFrequency: 'daily', priority: 0.9 },
    ...slugs.categories.map((slug) => ({ url: `${base}/categoria/${slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...slugs.products.map((slug) => ({ url: `${base}/produto/${slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
  ]
}
