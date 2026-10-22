import type { MetadataRoute } from 'next'
import { siteBaseUrl } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  const base = siteBaseUrl().origin
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/pedido/', '/checkout'] },
    sitemap: `${base}/sitemap.xml`,
  }
}
