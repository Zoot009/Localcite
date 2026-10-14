// All directory data comes from Supabase (tables filled by the scrape.do pipeline).
// Every read is cached for a day with 'use cache': the data only changes when the scraper runs, or when the admin
// panel adds, edits or deletes a business, which clears every read tagged DIRECTORY so no page keeps the old version.
import { cacheLife, cacheTag } from 'next/cache'
import { sql } from './db'
import { MIN_AREA_LISTINGS, MIN_CATEGORY_LISTINGS, PAGE_SIZE } from './site'
import type { AreaCount, Business, CategoryCount, CategoryGroup, City, Listing, Review } from './types'
import { cap, slugify } from './utils'

export const DIRECTORY = 'directory'

// ---------- businesses ----------

const BIZ = `b.id, b.slug, b.title, b.place_id, b.data_cid, b.city_id, ci.name city_name, ci.state city_state, ci.slug city_slug,
  b.area, b.area_slug, b.address, b.phone, b.website, b.rating, b.review_count, b.score, b.price, b.primary_type, b.types,
  b.description, b.user_review, b.operating_hours, b.service_options, b.extensions, b.latitude, b.longitude, b.thumbnail,
  b.unclaimed_on_google`

type Row = {
  id: string; slug: string; title: string; place_id: string | null; data_cid: string | null; city_id: string
  city_name: string; city_state: string | null; city_slug: string; area: string | null; area_slug: string | null
  address: string; phone: string | null; website: string | null; rating: string | null; review_count: number; score: string
  price: string | null; primary_type: string | null; types: string[] | null; description: string | null; user_review: string | null
  operating_hours: Record<string, string> | null; service_options: Record<string, boolean> | null
  extensions: Record<string, string[]>[] | null; latitude: number | null; longitude: number | null; thumbnail: string | null
  unclaimed_on_google: boolean | null; niches?: string[]; niche_slugs?: string[]
}

const u = <T,>(v: T | null) => v ?? undefined
// The scraped price column mixes real prices ("€10–20", "₹2,000+", "$$") with stray text ("Brunch", "CLOSED").
const cleanPrice = (p: string | null) =>
  p && ((/\d/.test(p) && p.length <= 16 && !/\p{L}{4,}/u.test(p)) || /^[$₹€£¥]{1,4}$/.test(p)) ? p : undefined
const cityLabel = (name: string, state: string | null) => (state ? `${name}, ${state}` : name)
const regions = new Intl.DisplayNames(['en'], { type: 'region' })
const countryName = (code: string) => { try { return regions.of(code.toUpperCase()) ?? code } catch { return code.toUpperCase() } }

function toBusiness(r: Row): Business {
  return {
    key: r.id,
    slug: r.slug,
    title: r.title,
    place_id: u(r.place_id),
    data_cid: u(r.data_cid),
    city: cityLabel(r.city_name, r.city_state),
    cityId: r.city_id,
    citySlug: r.city_slug,
    area: u(r.area),
    areaSlug: u(r.area_slug),
    address: r.address,
    phone: u(r.phone),
    website: u(r.website),
    rating: r.rating ? Number(r.rating) : undefined,
    reviews: r.review_count,
    score: Number(r.score),
    price: cleanPrice(r.price),
    type: u(r.primary_type),
    types: u(r.types),
    categories: [...new Set([r.primary_type, ...(r.types ?? [])].filter((t): t is string => !!t))],
    description: u(r.description),
    user_review: u(r.user_review),
    operating_hours: u(r.operating_hours),
    service_options: u(r.service_options),
    extensions: u(r.extensions),
    gps_coordinates: r.latitude != null && r.longitude != null ? { latitude: r.latitude, longitude: r.longitude } : undefined,
    thumbnail: u(r.thumbnail),
    unclaimed_listing: u(r.unclaimed_on_google),
    niches: r.niches ?? [],
    nicheSlugs: r.niche_slugs ?? [],
  }
}

export async function getBusiness(slug: string) {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  const [r] = await sql<Row>(
    `select ${BIZ}, coalesce(n.names, '{}') niches, coalesce(n.slugs, '{}') niche_slugs
     from businesses b join cities ci on ci.id = b.city_id
     left join lateral (select array_agg(c.name order by c.sort_order) names, array_agg(c.slug order by c.sort_order) slugs
       from business_categories bc join categories c on c.id = bc.category_id where bc.business_id = b.id) n on true
     where b.slug = $1`,
    [slug],
  )
  return r ? toBusiness(r) : undefined
}

export async function getTopRated(n: number, citySlug?: string, categorySlugs?: string[]) {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  const rows = await sql<Row>(
    `select ${BIZ} from businesses b join cities ci on ci.id = b.city_id
     where ($1::text is null or ci.slug = $1) and b.review_count >= 20 and b.thumbnail is not null
       and ($3::text[] is null or b.id in (select bc.business_id from business_categories bc
         join categories c on c.id = bc.category_id where c.slug = any($3)))
     order by b.score desc limit $2`,
    [citySlug ?? null, n, categorySlugs ?? null],
  )
  return rows.map(toBusiness)
}

// Same category and city, same neighbourhood first.
export const getSimilar = (b: Business, n = 4) => similar(b.cityId, b.niches[0] ?? '', b.key, b.areaSlug ?? null, n)

async function similar(cityId: string, niche: string, id: string, areaSlug: string | null, n: number) {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  const rows = await sql<Row>(
    `select ${BIZ} from business_categories bc join businesses b on b.id = bc.business_id
     join cities ci on ci.id = b.city_id join categories c on c.id = bc.category_id
     where bc.city_id = $1 and c.name = $2 and b.id <> $3
     order by (b.area_slug is not distinct from $4) desc, b.score desc limit $5`,
    [cityId, niche, id, areaSlug, n],
  )
  return rows.map(toBusiness)
}

// "What customers are saying": Google's featured review snippet for well-rated businesses.
export async function getHighlights(n: number, citySlug?: string, categorySlugs?: string[]) {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  const rows = await sql<Row>(
    `select ${BIZ} from businesses b join cities ci on ci.id = b.city_id
     where ($1::text is null or ci.slug = $1) and b.user_review is not null and b.thumbnail is not null and b.review_count >= 20
       and ($3::text[] is null or b.id in (select bc.business_id from business_categories bc
         join categories c on c.id = bc.category_id where c.slug = any($3)))
     order by b.score desc limit $2`,
    [citySlug ?? null, n, categorySlugs ?? null],
  )
  return rows.map(toBusiness).map(business => ({
    business,
    review: { rating: business.rating ?? 0, snippet: business.user_review!.replace(/^"|"$/g, ''), source: 'Google' },
  }))
}

// Hero photos "near you": the visitor's city first, then their country, else worldwide.
const HERO_CATEGORIES = ['restaurant', 'cafe', 'coffee-shop', 'bakery', 'hotel', 'bar']

export async function getHeroPicks(country?: string, city?: string): Promise<{ picks: Business[]; place?: string }> {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  if (country) {
    const rows = await sql<Row & { city_match: boolean }>(
      `select ${BIZ}, (lower(ci.name) = lower($2) or lower($2) = any(select lower(a) from unnest(coalesce(ci.aliases, '{}')) a)) city_match
       from businesses b join cities ci on ci.id = b.city_id
       where ci.country_code = $1 and b.thumbnail is not null and b.review_count >= 20
         and b.id in (select bc.business_id from business_categories bc join categories c on c.id = bc.category_id where c.slug = any($3))
       order by city_match desc, b.score desc limit 12`,
      [country, city ?? '', HERO_CATEGORIES],
    )
    if (rows.length >= 6) return { picks: rows.map(toBusiness), place: rows[0].city_match ? rows[0].city_name : countryName(country) }
  }
  return { picks: await getTopRated(12, undefined, HERO_CATEGORIES) }
}

// Per-star counts when the data has them (Place / Reviews endpoints); all zeros otherwise.
export function ratingBreakdown(b: Business) {
  if (b.rating_summary?.length) return [5, 4, 3, 2, 1].map(s => b.rating_summary!.find(r => r.stars === s)?.amount ?? 0)
  return [5, 4, 3, 2, 1].map(s => (b.review_items ?? []).filter(r => Math.round(r.rating) === s).length)
}

// ---------- cities ----------

export async function getCities(): Promise<City[]> {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  const rows = await sql<{ id: string; name: string; state: string | null; country_code: string; slug: string; count: number; categories: number; photo: string | null; lat: number | null; lng: number | null }>(
    `select ci.id, ci.name, ci.state, ci.country_code, ci.slug, b.lat, b.lng, coalesce(b.n, 0)::int count, coalesce(l.n, 0)::int categories, p.thumbnail photo
     from cities ci
     left join (select city_id, count(*) n, sum(review_count) reviews, avg(latitude)::float8 lat, avg(longitude)::float8 lng
                from businesses group by 1) b on b.city_id = ci.id
     left join (select city_id, count(*) n from city_category_counts where businesses >= $1 group by 1) l on l.city_id = ci.id
     -- cover photo: a top hotel or restaurant, they photograph well. One pass for all cities: a per-city lateral took 25-45s.
     left join (select distinct on (x.city_id) x.city_id, x.thumbnail from businesses x
       join business_categories bc on bc.business_id = x.id join categories c on c.id = bc.category_id
       where c.slug in ('hotel', 'restaurant', 'cafe') and x.thumbnail is not null and x.review_count >= 50
       order by x.city_id, (c.slug = 'hotel') desc, x.score desc) p on p.city_id = ci.id
     order by coalesce(b.reviews, 0) desc, ci.name -- busiest first: every city has ~450 places, but review totals tell Paris from Toulouse
    `,
    [MIN_CATEGORY_LISTINGS],
  )
  return rows.map(r => ({ id: r.id, name: r.name, label: cityLabel(r.name, r.state), slug: r.slug, country: countryName(r.country_code), countryCode: r.country_code, count: r.count, categories: r.categories, photo: u(r.photo), lat: u(r.lat), lng: u(r.lng) }))
}

export async function getCity(slug: string) {
  return (await getCities()).find(c => c.slug === slug)
}

// Categories with a published "best of" page in this city, biggest first.
export async function getCityCategories(citySlug: string): Promise<CategoryCount[]> {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  const rows = await sql<{ name: string; slug: string; group_name: string; count: number; top: string | null }>(
    `select c.name, c.slug, c.group_name, cc.businesses::int count,
       (select b.title from business_categories bc join businesses b on b.id = bc.business_id
        where bc.city_id = cc.city_id and bc.category_id = cc.category_id order by b.score desc limit 1) top
     from city_category_counts cc join categories c on c.id = cc.category_id join cities ci on ci.id = cc.city_id
     where ci.slug = $1 and cc.businesses >= $2
     order by cc.businesses desc, c.id`, // ids run popular-first (restaurant, hotel, cafe…); sort_order is the scrape order
    [citySlug, MIN_CATEGORY_LISTINGS],
  )
  return rows.map(r => ({ name: r.name, slug: r.slug, count: r.count, group: r.group_name, top: u(r.top) }))
}

export async function getCityAreas(citySlug: string): Promise<AreaCount[]> {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  return sql<AreaCount>(
    `select min(b.area) name, b.area_slug slug, count(*)::int count
     from businesses b join cities ci on ci.id = b.city_id
     where ci.slug = $1 and b.area_slug is not null
     group by b.area_slug having count(*) >= $2 order by count desc, name limit 60`,
    [citySlug, MIN_AREA_LISTINGS],
  )
}

// ---------- listings ("best dentists in Tokyo", "... in Shibuya, Tokyo") ----------

export async function getListing(citySlug: string, nicheSlug: string): Promise<Listing | undefined> {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  const rows = await sql<Row & { niche: string }>(
    `select ${BIZ}, c.name niche from business_categories bc join businesses b on b.id = bc.business_id
     join cities ci on ci.id = bc.city_id join categories c on c.id = bc.category_id
     where ci.slug = $1 and c.slug = $2 order by b.score desc`,
    [citySlug, nicheSlug],
  )
  if (rows.length < MIN_CATEGORY_LISTINGS) return undefined // thin pages aren't published
  const r = rows[0]
  return { city: cityLabel(r.city_name, r.city_state), citySlug, niche: r.niche, nicheSlug, items: rows.map(toBusiness) }
}

export async function getListingAreas(citySlug: string, nicheSlug: string): Promise<AreaCount[]> {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  return sql<AreaCount>(
    `select la.area name, la.area_slug slug, la.businesses::int count
     from listing_areas la join cities ci on ci.id = la.city_id join categories c on c.id = la.category_id
     where ci.slug = $1 and c.slug = $2 and la.businesses >= $3 order by count desc, name`,
    [citySlug, nicheSlug, MIN_AREA_LISTINGS],
  )
}

export async function getAreaListing(citySlug: string, nicheSlug: string, areaSlug: string) {
  const [listing, areas] = await Promise.all([getListing(citySlug, nicheSlug), getListingAreas(citySlug, nicheSlug)])
  const area = areas.find(a => a.slug === areaSlug)
  return listing && area ? { listing, area, areas, items: listing.items.filter(b => b.areaSlug === areaSlug) } : undefined
}

// The biggest pages get built ahead of time; every other page is rendered on its first visit, then cached.
export async function getTopListings(n: number) {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  return sql<{ city: string; category: string }>(
    `select ci.slug city, c.slug category from city_category_counts cc
     join cities ci on ci.id = cc.city_id join categories c on c.id = cc.category_id
     where cc.businesses >= $1 order by cc.businesses desc, ci.id, c.sort_order limit $2`,
    [MIN_CATEGORY_LISTINGS, n],
  )
}

export async function getTopAreaListings(n: number) {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  return sql<{ city: string; category: string; area: string }>(
    `select ci.slug city, c.slug category, la.area_slug area from listing_areas la
     join cities ci on ci.id = la.city_id join categories c on c.id = la.category_id
     where la.businesses >= $1 order by la.businesses desc, ci.id, c.sort_order limit $2`,
    [MIN_AREA_LISTINGS, n],
  )
}

// ---------- categories ----------

// Categories by group, with how many places each has. Categories with no places yet (never scraped) are left out of
// menus, the categories page and search suggestions; the add-a-business form asks for them all.
export async function getCategoryGroups({ includeEmpty = false } = {}): Promise<CategoryGroup[]> {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  const rows = await sql<{ name: string; slug: string; group_name: string; count: number }>(
    `select c.name, c.slug, c.group_name, coalesce(sum(cc.businesses), 0)::int count
     from categories c left join city_category_counts cc on cc.category_id = c.id
     group by c.id order by c.sort_order`,
  )
  const groups = new Map<string, CategoryGroup>()
  for (const r of rows) {
    if (!r.count && !includeEmpty) continue
    const g = groups.get(r.group_name) ?? { name: r.group_name, slug: slugify(r.group_name), niches: [] }
    g.niches.push({ name: r.name, slug: r.slug, count: r.count, group: r.group_name })
    groups.set(r.group_name, g)
  }
  // Biggest groups first, so the header menus show what we actually have.
  const total = (g: CategoryGroup) => g.niches.reduce((s, n) => s + n.count, 0)
  return [...groups.values()].sort((a, b) => total(b) - total(a))
}

export async function getPopularNiches(n: number) {
  return (await getCategoryGroups()).flatMap(g => g.niches).sort((a, b) => b.count - a.count).slice(0, n)
}

// Home page photo tiles, in the order given: each category's place count and a photo of its most-reviewed place whose
// own main type matches the category (so a hotel that is also listed as a bar doesn't stand in for bars).
// The ratings behind the directory, for the home page: how many customer reviews they come from, and their average
// (each place's rating weighted by its number of reviews).
export async function getReviewStats() {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  const [r] = await sql<{ total: string; avg: number }>(
    `select sum(review_count)::bigint total, (sum(rating * review_count) / nullif(sum(review_count), 0))::float8 avg
     from businesses where rating is not null and review_count > 0`,
  )
  return { total: Number(r.total), avg: r.avg }
}

// Reviews people wrote on this site for one business, newest first; ones marked rejected in Supabase are hidden.
// Tagged, so a new review shows straight away (submitReview in lib/actions.ts calls updateTag); the short cache life
// picks up a review you reject in Supabase within a few minutes.
export async function getSiteReviews(businessId: string): Promise<Review[]> {
  'use cache'
  cacheLife('minutes')
  cacheTag(DIRECTORY)
  cacheTag(`reviews-${businessId}`)
  const rows = await sql<{ id: string; rating: number; body: string; author_name: string; created_at: Date }>(
    `select id, rating, body, author_name, created_at from user_reviews where business_id = $1 order by created_at desc limit 50`,
    [businessId],
  )
  return rows.map(r => ({ review_id: `site-${r.id}`, rating: r.rating, snippet: r.body, iso_date: new Date(r.created_at).toISOString(), user: { name: r.author_name } }))
}

// Quick picks: listed first in the search suggestions.
const QUICK = ['restaurant', 'hotel', 'dentist', 'hair salon', 'plumber']

// Search box suggestions: categories (the quick picks first, then the biggest) and cities (busiest first), each city
// with its country and centre point (for "Current location").
// ponytail: they ship with every page's header (~35 KB before compression); load them on first focus if pages get heavy.
export async function getSearchSuggestions() {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  const [groups, cities] = await Promise.all([getCategoryGroups(), getCities()])
  const rank = (name: string) => (QUICK.includes(name) ? QUICK.indexOf(name) : QUICK.length)
  return {
    what: groups
      .flatMap(g => g.niches.map(n => ({ name: n.name, count: n.count, hint: g.name })))
      .sort((a, b) => rank(a.name) - rank(b.name) || b.count - a.count)
      .map(n => ({ label: cap(n.name), hint: n.hint })),
    where: cities.map(c => ({ label: c.name, hint: c.country, point: c.lat != null && c.lng != null ? ([c.lat, c.lng] as [number, number]) : undefined })),
  }
}

export async function getCategoryTiles(slugs: string[]) {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  const rows = await sql<{ slug: string; name: string; count: number; photo: string | null }>(
    `select c.slug, c.name, p.thumbnail photo,
       (select coalesce(sum(cc.businesses), 0)::int from city_category_counts cc where cc.category_id = c.id) count
     from categories c
     left join lateral (select b.thumbnail from business_categories bc join businesses b on b.id = bc.business_id
       where bc.category_id = c.id and b.thumbnail is not null
       order by coalesce(b.primary_type ilike '%' || left(c.name, 4) || '%', false) desc, b.review_count desc limit 1) p on true
     where c.slug = any($1)`,
    [slugs],
  )
  return slugs.flatMap(s => rows.filter(r => r.slug === s)).map(r => ({ ...r, photo: u(r.photo) }))
}

// ---------- search ----------

// "Dentists" should find "dentist": drop a trailing s/es from longer words, keep letters and digits only.
const terms = (s = '') =>
  s.toLowerCase().split(/[\s,]+/).map(t => t.replace(/[^\p{L}\p{N}]/gu, '')).filter(t => t.length > 1).map(t => (t.length > 3 ? t.replace(/e?s$/, '') : t))

export type SearchOptions = { q?: string; loc?: string; sort?: string; rating?: string; features?: string[]; page?: number }

// Everything runs in the database, so totals, filters and pages are exact.
// (No price filter: the scraped data has price ranges like "€10–20", not comparable "$$" levels.)
// ponytail: ILIKE scans for the location part (~250ms over 200k rows); add a pg_trgm index if search gets busy.
export async function search({ q, loc, sort, rating, features = [], page = 1 }: SearchOptions) {
  'use cache'
  cacheLife('hours')
  cacheTag(DIRECTORY)
  const what = terms(q), where = terms(loc)

  // "What" + "where" match, shared by the result query and the filter counts.
  const matched = `with cats as (select id from categories where $1::text[] is not null and name ilike all($1)),
    matched as (
      select b.id from businesses b join cities ci on ci.id = b.city_id
      where ($2::text is null or b.search @@ to_tsquery('simple', $2)
             or b.id in (select business_id from business_categories where category_id in (select id from cats)))
        and ($3::text[] is null or (ci.name || ' ' || coalesce(ci.state, '') || ' ' || coalesce(b.area, '') || ' ' || b.address) ilike all($3))
    )`
  const base = [
    what.length ? what.map(t => `%${t}%`) : null,
    what.length ? what.map(t => `${t}:*`).join(' & ') : null,
    where.length ? where.map(t => `%${t}%`) : null,
  ]
  const minRating = Number(rating) || null
  const mustHave = features.length ? JSON.stringify(Object.fromEntries(features.map(f => [f, true]))) : null
  const order = sort === 'rating' ? 'b.rating desc nulls last, b.review_count desc' : sort === 'reviews' ? 'b.review_count desc' : 'b.score desc'
  const offset = (Math.max(1, Math.floor(page)) - 1) * PAGE_SIZE

  const [rows, featureCounts] = await Promise.all([
    sql<Row & { total: number }>(
      `${matched}
       select ${BIZ}, count(*) over()::int total from businesses b join cities ci on ci.id = b.city_id
       where b.id in (select id from matched)
         and ($4::numeric is null or b.rating >= $4)
         and ($5::jsonb is null or b.service_options @> $5)
       order by ${order}, b.id limit ${PAGE_SIZE} offset $6`,
      [...base, minRating, mustHave, offset],
    ),
    // Filter options come from the whole match, so ticking one never hides the others.
    sql<{ key: string; count: number }>(
      `${matched}
       select e.key, count(*)::int count from businesses b, jsonb_each(b.service_options) e
       where b.id in (select id from matched) and e.value = 'true'::jsonb
       group by e.key order by count desc, e.key limit 8`,
      base,
    ),
  ])

  return { results: rows.map(toBusiness), total: rows[0]?.total ?? 0, features: featureCounts }
}

// ---------- sitemap ----------

export const SITEMAP_SIZE = 45000

export async function getSitemapPages() {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  const [cities, listings, areas] = await Promise.all([
    sql<{ slug: string }>(`select slug from cities order by id`),
    sql<{ path: string }>(
      `select '/' || ci.slug || '/' || c.slug path from city_category_counts cc
       join cities ci on ci.id = cc.city_id join categories c on c.id = cc.category_id where cc.businesses >= $1`,
      [MIN_CATEGORY_LISTINGS],
    ),
    sql<{ path: string }>(
      `select '/' || ci.slug || '/' || c.slug || '/' || la.area_slug path from listing_areas la
       join cities ci on ci.id = la.city_id join categories c on c.id = la.category_id where la.businesses >= $1`,
      [MIN_AREA_LISTINGS],
    ),
  ])
  return [...cities.map(c => `/${c.slug}`), ...listings.map(l => l.path), ...areas.map(a => a.path)]
}

export async function getBusinessCount() {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  return (await sql<{ n: number }>(`select count(*)::int n from businesses`))[0].n
}

export async function getBusinessSlugs(offset: number, limit: number) {
  'use cache'
  cacheLife('days')
  cacheTag(DIRECTORY)
  return (await sql<{ slug: string }>(`select slug from businesses order by id offset $1 limit $2`, [offset, limit])).map(r => r.slug)
}
