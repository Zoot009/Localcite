import type { MetadataRoute } from 'next'
import { generateSitemaps } from './sitemap'
import { SITE } from '@/lib/site'

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    // Search and form pages are endless query-string variations: keep crawlers on the real pages. /admin is private.
    rules: { userAgent: '*', allow: '/', disallow: ['/search', '/write-a-review', '/admin'] },
    sitemap: (await generateSitemaps()).map(({ id }) => `${SITE.url}/sitemap/${id}.xml`),
  }
}
