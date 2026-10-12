import type { MetadataRoute } from 'next'
import { getBusinessCount, getBusinessSlugs, getSitemapPages, SITEMAP_SIZE } from '@/lib/data'
import { SITE } from '@/lib/site'

// Google reads at most 50,000 URLs per file: sitemap 0 holds the city, category and area pages,
// the rest hold businesses in batches. Served at /sitemap/0.xml, /sitemap/1.xml, ...
export async function generateSitemaps() {
  const files = 1 + Math.ceil((await getBusinessCount()) / SITEMAP_SIZE)
  return Array.from({ length: files }, (_, id) => ({ id }))
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const n = Number(await id)
  const paths = n === 0
    ? ['/', '/cities', '/categories', '/for-business', '/add-business', '/about', ...(await getSitemapPages())]
    : (await getBusinessSlugs((n - 1) * SITEMAP_SIZE, SITEMAP_SIZE)).map(slug => `/biz/${slug}`)
  return paths.map(p => ({ url: `${SITE.url}${p}` }))
}
