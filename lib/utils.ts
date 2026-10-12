import type { Business } from './types'

export const slugify = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ'’]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// "dentist" → "dentists", "pizza restaurant" → "pizza restaurants", for "Best ___ in Pune" headings.
// Title-cased custom labels ("Vacation Rentals", "Personal Injury Law") and service nouns stay as they are.
export const plural = (s: string) =>
  /\s/.test(s) && s.split(/\s+/).every(w => /^[A-Z&]/.test(w)) ? s
  : /(s|repair|cleaning|care|law|massage|control|laundry)$/i.test(s) ? s
  : /(sh|ch|x)$/i.test(s) ? `${s}es`
  : /[^aeiou]y$/i.test(s) ? `${s.slice(0, -1)}ies`
  : `${s}s`

export const cityName = (city: string) => city.split(',')[0].trim()

// searchParams values can be string | string[] | undefined; we only ever want one string.
export const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined)

// Scraped data is untrusted: only ever emit http(s) links.
export const safeUrl = (url?: string) => (url && /^https?:\/\//i.test(url) ? url : undefined)

// Google photo URLs end in a size such as "=w163-h92-k-no"; ask for the size we actually display.
export const photoSize = (url: string, w: number, h: number) => url.replace(/=w\d+-h\d+[^/=]*$/, `=w${w}-h${h}-k-no`)

export const hostname = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/.*$/, '')

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

export const featureLabel = (key: string) => cap(key.replace(/_/g, ' '))

export const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : ''

export const directionsUrl = (address: string, placeId?: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}${
    placeId ? `&destination_place_id=${encodeURIComponent(placeId)}` : ''
  }`

// Map pins for a list of businesses; `firstRank` numbers them like the list (leave it out for a plain dot).
export const mapPoints = (items: Business[], firstRank?: number) =>
  items.flatMap((b, i) =>
    b.gps_coordinates
      ? [{
          id: b.key,
          lat: b.gps_coordinates.latitude,
          lng: b.gps_coordinates.longitude,
          title: b.title,
          address: b.address,
          href: `/biz/${b.slug}`,
          rating: b.rating,
          label: firstRank ? String(firstRank + i) : '',
        }]
      : [],
  )
