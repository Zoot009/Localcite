import { cacheLife } from 'next/cache'
import { headers } from 'next/headers'

export type Geo = { country?: string; city?: string }

// The visitor's country/city from the hosting platform's geo headers (Vercel, Cloudflare, CloudFront).
// No third-party lookups in production: the visitor's IP never leaves your host.
export async function visitorGeo(): Promise<Geo> {
  const h = await headers()
  const country = h.get('x-vercel-ip-country') ?? h.get('cf-ipcountry') ?? h.get('cloudfront-viewer-country')
  const city = h.get('x-vercel-ip-city') ?? h.get('cf-ipcity') ?? h.get('cloudfront-viewer-city')
  if (country && country !== 'XX') return { country: country.toLowerCase(), city: city ? decodeURIComponent(city) : undefined }
  // localhost has no geo headers: in development only, look up this machine's location so "near you" can be tried out.
  return process.env.NODE_ENV === 'development' ? devGeo() : {}
}

async function devGeo(): Promise<Geo> {
  'use cache'
  cacheLife('hours')
  try {
    const res = await fetch('https://get.geojs.io/v1/ip/geo.json', { signal: AbortSignal.timeout(3000) })
    const j = (await res.json()) as { country_code?: string; city?: string }
    return { country: j.country_code?.toLowerCase(), city: j.city }
  } catch {
    return {}
  }
}
