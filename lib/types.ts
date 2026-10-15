// Shapes of scrape.do Google Maps data: https://scrape.do/documentation/google-scraper-api/maps/
// A Search result (local_results[]) is the minimum; Place / Reviews endpoint fields are optional extras.

export type Review = {
  review_id?: string
  rating: number
  date?: string
  iso_date?: string
  snippet?: string
  likes?: number
  images?: string[]
  source?: string
  user?: { name?: string; thumbnail?: string; local_guide?: boolean; reviews?: number; photos?: number }
  response?: { date?: string; iso_date?: string; snippet?: string }
}

export type Place = {
  title: string
  place_id?: string
  data_id?: string
  data_cid?: string
  gps_coordinates?: { latitude: number; longitude: number }
  rating?: number
  reviews?: number // total review count
  rating_summary?: { stars: number; amount: number }[]
  price?: string
  type?: string | string[] // string from Search, array from Place
  types?: string[]
  address?: string
  phone?: string
  website?: string
  description?: string
  summary?: string
  open_state?: string
  operating_hours?: Record<string, string>
  service_options?: Record<string, boolean>
  extensions?: Record<string, string[]>[] // e.g. [{ accessibility: ['Wheelchair-accessible entrance'] }, { payments: [...] }]
  thumbnail?: string
  images?: { title?: string; thumbnail: string }[]
  menu?: { link?: string; source?: string }
  order_online?: string
  reserve_a_table?: string
  book_online?: string
  user_review?: string
  unclaimed_listing?: boolean
  // Not from scrape.do: optional fields you can add yourself.
  area?: string // neighbourhood; otherwise guessed from the address
  review_items?: Review[] // reviews[] from the Reviews endpoint
}

export type Business = Place & {
  key: string
  slug: string
  city: string // "Tokyo, Japan"
  cityId: string
  citySlug: string
  area?: string
  areaSlug?: string
  niches: string[] // our categories this business is listed under
  nicheSlugs: string[]
  categories: string[] // Google's own types, for display
  score: number // rating weighted by review count, for "best of" ordering
  // Reviews written on this site (user_reviews, minus rejected ones): the count shown, not Google's.
  siteReviews: number
  siteRating?: number
}

export type Listing = { city: string; citySlug: string; niche: string; nicheSlug: string; items: Business[] }
export type AreaCount = { name: string; slug: string; count: number }
export type City = { id: string; name: string; label: string; slug: string; country: string; countryCode: string; count: number; categories: number; photo?: string; lat?: number; lng?: number }
export type CategoryCount = { name: string; slug: string; count: number; group: string; top?: string }
export type CategoryGroup = { name: string; slug: string; niches: CategoryCount[] }
