import {
  Accessibility, AirVent, Baby, Banknote, Beer, CakeSlice, CalendarCheck, Car, Check, Cigarette, CircleParking, Coffee, CreditCard, Dog,
  Dumbbell, FileText, Flame, Languages, Laptop, MapPin, Martini, Music, Rainbow, Recycle, Salad, ShoppingBag, ShoppingCart, Smartphone,
  Sparkles, Store, Sun, Sunrise, Toilet, Truck, Tv, User, Users, UtensilsCrossed, Waves, Wifi, Wine, Wrench, Zap, type LucideIcon,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { BizCard, RatingLine, RatingSummary, ReviewCard, starsOf } from '@/components/biz'
import { HoursTable, ShareButton } from '@/components/client'
import { ResultsMap } from '@/components/ResultsMap'
import { DirectionsIcon, ExternalIcon, GlobeIcon, PencilIcon, PhoneIcon, PinIcon, ShieldIcon, StarIcon } from '@/components/icons'
import { BizImage, Breadcrumbs, JsonLd } from '@/components/ui'
import { getBusiness, getListing, getListingAreas, getSimilar, getSiteReviews, getTopRated, ratingBreakdown } from '@/lib/data'
import { SITE } from '@/lib/site'
import type { Business } from '@/lib/types'
import { cap, cityName, directionsUrl, featureLabel, hostname, mapPoints, plural, safeUrl, telHref } from '@/lib/utils'

// ponytail: prerenders every business at build. Past ~20k, return only the top ones here and let the
// rest render on their first visit (Next caches them after that).
export async function generateStaticParams() {
  return (await getTopRated(100)).map(b => ({ slug: b.slug }))
}

export async function generateMetadata({ params }: PageProps<'/biz/[slug]'>): Promise<Metadata> {
  const b = await getBusiness((await params).slug)
  if (!b) return {}
  const where = [b.area, cityName(b.city)].filter(Boolean).join(', ')
  return {
    title: `${b.title} – ${b.categories[0] ?? cap(b.niches[0])} in ${where}`,
    description: `${b.title}, ${b.address}.${b.phone ? ` Phone: ${b.phone}.` : ''} See opening hours, reviews and directions.`,
    alternates: { canonical: `/biz/${b.slug}` },
  }
}

// Full-width photo that runs up behind the floating header (--header-h tall): the breadcrumb trail at the top, the name,
// rating and categories at the bottom. Without a photo, a brand-colour gradient.
function Hero({ b, crumbs }: { b: Business; crumbs: { name: string; href?: string }[] }) {
  const photos = (b.images?.map(i => i.thumbnail) ?? [b.thumbnail]).map(src => safeUrl(src)).filter((s): s is string => !!s).slice(0, 4)
  return (
    <section className="relative -mt-[var(--header-h)] flex min-h-[calc(var(--header-h)_+_18rem)] flex-col overflow-hidden bg-zinc-900 sm:min-h-[calc(var(--header-h)_+_24rem)]">
      {photos.length ? (
        // grid-rows-1 holds the row to the section's height, so a photo is cropped around its middle instead of cut to its top.
        <div className="absolute inset-0 grid grid-rows-1" style={{ gridTemplateColumns: `repeat(${photos.length}, minmax(0, 1fr))` }}>
          {photos.map(src => <BizImage key={src} biz={b} src={src} w={Math.round(2000 / photos.length)} h={1125} eager className="h-full w-full" />)}
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 to-brand-950" />
      )}
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="relative mx-auto w-full max-w-7xl px-4 pt-[calc(var(--header-h)_+_1.5rem)]">
        <Breadcrumbs items={crumbs} light />
      </div>
      <div className="relative mx-auto mt-auto w-full max-w-7xl px-4 pt-10 pb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">{b.title}</h1>
        <div className="mt-3">
          <RatingLine b={b} size={22} light />
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/90">
          {b.price && <span>{b.price}</span>}
          {b.categories.slice(0, 3).map(c => <span key={c} className="rounded-full bg-white/15 px-2.5 py-0.5 ring-1 ring-white/25">{c}</span>)}
          {b.area && <span className="flex items-center gap-1"><PinIcon width={14} height={14} /> {b.area}, {cityName(b.city)}</span>}
        </p>
      </div>
    </section>
  )
}

// Amenity → icon, for Google's usual attributes. First match wins, so specific phrases come before general words
// ("Outdoor seating" is a sun, not cutlery); anything else gets a tick.
const AMENITY_ICONS: [RegExp, LucideIcon][] = [
  [/wheelchair|accessib|hearing loop|assist|braille|listening/i, Accessibility],
  [/lgbtq|transgender|gender-neutral/i, Rainbow],
  [/nfc|mobile pay/i, Smartphone],
  [/card/i, CreditCard],
  [/cash/i, Banknote],
  [/wi-?fi/i, Wifi],
  [/parking|car park|valet/i, CircleParking],
  [/kid|child|high chair|baby|changing table|family/i, Baby],
  [/\bdogs?\b|\bpets?\b/i, Dog],
  [/delivery/i, Truck],
  [/drive[- ]?through/i, Car],
  [/takeaway|take-?out|pick-?up|curbside|kerbside/i, ShoppingBag],
  [/coffee|espresso|\btea\b/i, Coffee],
  [/dessert|cake|ice cream/i, CakeSlice],
  [/beer/i, Beer],
  [/wine/i, Wine],
  [/cocktail|spirits|alcohol|bar on site|happy[- ]hour/i, Martini],
  [/vegetarian|vegan|organic|halal|healthy|salad/i, Salad],
  [/reserv|appointment|booking/i, CalendarCheck],
  [/breakfast|brunch/i, Sunrise],
  [/solo/i, User],
  [/quick/i, Zap],
  [/outdoor|terrace|rooftop|patio|garden/i, Sun],
  [/dine|dining|dinner|lunch|table service|counter service|seating|food|plates|catering|menu|all you can eat|buffet/i, UtensilsCrossed],
  [/group|tourist|student|locals/i, Users],
  [/laptop|working/i, Laptop],
  [/toilet|restroom|bathroom/i, Toilet],
  [/music|karaoke|dancing/i, Music],
  [/fireplace/i, Flame],
  [/smok/i, Cigarette],
  [/\btv\b|sport/i, Tv],
  [/pool|swim/i, Waves],
  [/gym|fitness/i, Dumbbell],
  [/air[- ]condition/i, AirVent],
  [/language/i, Languages],
  [/recycl/i, Recycle],
  [/repair/i, Wrench],
  [/estimate|quote/i, FileText],
  [/owned/i, Store],
  [/shopping|store|shop/i, ShoppingCart],
  [/on-?site/i, MapPin],
  [/casual|cosy|cozy|trendy|quiet|romantic|upmarket|historic|lively/i, Sparkles],
]
const amenityIcon = (item: string) => AMENITY_ICONS.find(([re]) => re.test(item))?.[1] ?? Check

// Groups flow down the columns, so short and long groups pack together without gaps.
// (A top margin, not a bottom one: it disappears at the top of each column.)
function AmenityColumns({ groups }: { groups: [string, string[]][] }) {
  return (
    <div className="gap-x-10 sm:columns-2 lg:columns-3">
      {groups.map(([group, items]) => (
        <div key={group} className="mt-7 break-inside-avoid first:mt-0">
          <h3 className="text-xs font-bold tracking-wider text-zinc-900 uppercase">{group}</h3>
          <ul className="mt-3 space-y-2.5">
            {items.map(item => {
              const Icon = amenityIcon(item)
              return (
                <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-800">
                  <Icon aria-hidden size={18} strokeWidth={1.75} className="mt-px shrink-0 text-brand-600" />
                  {item}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-[calc(var(--header-h)_+_1.25rem)] border-t border-zinc-200 py-8">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

export default async function BizPage({ params }: PageProps<'/biz/[slug]'>) {
  const b = await getBusiness((await params).slug)
  if (!b) notFound()

  const town = cityName(b.city)
  const niche = b.niches[0] ?? b.categories[0] ?? 'business'
  const nicheSlug = b.nicheSlugs[0] ?? ''
  const website = safeUrl(b.website)
  // Google's service_options plus its grouped "extensions" (accessibility, payments, offerings…), merged by heading.
  // One list per group; "Dine in" and "Dine-in", or "Wheelchair-accessible" and "Wheelchair accessible", count once.
  const amenities = new Map<string, string[]>()
  const same = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
  const addAmenities = (group: string, items: string[]) => {
    const list = amenities.get(featureLabel(group)) ?? []
    for (const item of items) if (!list.some(x => same(x) === same(item))) list.push(item)
    amenities.set(featureLabel(group), list)
  }
  addAmenities('service_options', Object.entries(b.service_options ?? {}).filter(([, v]) => v).map(([k]) => featureLabel(k)))
  for (const ext of b.extensions ?? []) for (const [group, items] of Object.entries(ext)) if (Array.isArray(items)) addAmenities(group, items)
  for (const [group, items] of amenities) if (!items.length) amenities.delete(group)
  const extraLinks = ([['Menu', b.menu?.link], ['Order online', b.order_online], ['Reserve a table', b.reserve_a_table], ['Book online', b.book_online]] as const)
    .map(([label, url]) => [label, safeUrl(url)] as const)
    .filter((x): x is readonly [typeof x[0], string] => !!x[1])
  const reviews = b.review_items ?? [] // Google's, from the listing data
  const [listing, areas, similar, siteReviews] = await Promise.all([
    getListing(b.citySlug, nicheSlug), getListingAreas(b.citySlug, nicheSlug), getSimilar(b, 4), getSiteReviews(b.key),
  ])
  // The review count and average from the reviews just read (getBusiness is cached for a day), so a new one counts
  // straight away. ponytail: getSiteReviews reads at most 50, so the count stops at 50; count in SQL past that.
  const rated = {
    ...b, siteReviews: siteReviews.length,
    siteRating: siteReviews.length ? siteReviews.reduce((sum, r) => sum + r.rating, 0) / siteReviews.length : undefined,
  }
  const areaPage = b.areaSlug && areas.some(a => a.slug === b.areaSlug)
  const nicheHref = `/${b.citySlug}/${nicheSlug}`

  return (
    <>
      <Hero
        b={rated}
        crumbs={[
          { name: 'Home', href: '/' },
          { name: town, href: `/${b.citySlug}` },
          ...(listing ? [{ name: cap(plural(niche)), href: nicheHref }] : []),
          ...(listing && areaPage ? [{ name: b.area!, href: `${nicheHref}/${b.areaSlug}` }] : []),
          { name: b.title },
        ]}
      />
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-3 py-6">
              <Link href={`/write-a-review?biz=${b.slug}`} className="btn btn-primary">
                <StarIcon width={18} height={18} /> Write a review
              </Link>
              <ShareButton title={b.title} />
              <Link href={`/add-business?claim=${b.slug}`} className="btn btn-outline">
                <PencilIcon width={18} height={18} /> Suggest an edit
              </Link>
            </div>

            <div className="pt-2">
              {amenities.size > 0 && (
                <Section title="Amenities and more">
                  <AmenityColumns groups={[...amenities]} />
                </Section>
              )}

              {(b.description || b.summary) && (
                <Section title="About the business">
                  {[b.summary, b.description].filter(Boolean).map(t => <p key={t} className="mb-3 leading-relaxed text-zinc-700">{t}</p>)}
                </Section>
              )}

              <Section id="location" title="Location & hours">
                <div className="grid gap-8 md:grid-cols-2">
                  <div>
                    <ResultsMap points={mapPoints([b])} className="h-56" />
                    <p className="mt-3 text-sm text-zinc-700">{b.address}</p>
                    <a href={directionsUrl(b.address ?? b.title, b.place_id)} target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
                      <DirectionsIcon width={16} height={16} /> Get directions
                    </a>
                  </div>
                  {b.operating_hours && Object.keys(b.operating_hours).length > 0 ? (
                    <HoursTable hours={b.operating_hours} />
                  ) : (
                    <p className="text-sm text-zinc-500">Opening hours not available yet.</p>
                  )}
                </div>
              </Section>

              <Section id="reviews" title="Ratings & reviews">
                {starsOf(rated) ? (
                  <RatingSummary b={rated} counts={ratingBreakdown(b)} />
                ) : (
                  <p className="text-zinc-600">No ratings yet.</p>
                )}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-zinc-50 p-5">
                  <p className="font-medium">Been to {b.title}? Share your experience.</p>
                  <Link href={`/write-a-review?biz=${b.slug}`} className="btn btn-primary"><StarIcon width={18} height={18} /> Write a review</Link>
                </div>
                {/* Reviews written here, with their own count, kept apart from Google's total above. */}
                <h3 className="mt-8 flex items-baseline gap-2 text-lg font-semibold">
                  Reviews on {SITE.name}
                  {siteReviews.length > 0 && <span className="text-sm font-normal text-zinc-500">{siteReviews.length}</span>}
                </h3>
                {siteReviews.length > 0 ? (
                  <div className="mt-1">
                    {siteReviews.map(r => <ReviewCard key={r.review_id} review={r} />)}
                  </div>
                ) : (
                  <p className="mt-2 text-zinc-600">No reviews on {SITE.name} yet. Be the first to write one.</p>
                )}
                {reviews.length > 0 ? (
                  <>
                    <h3 className="mt-8 text-lg font-semibold">From Google</h3>
                    <div className="mt-1">
                      {reviews.map((r, i) => <ReviewCard key={r.review_id ?? i} review={r} />)}
                    </div>
                  </>
                ) : (
                  b.user_review && (
                    <figure className="mt-8 rounded-2xl border-l-4 border-star bg-amber-50/60 p-5">
                      <blockquote className="text-lg leading-relaxed text-zinc-800">“{b.user_review.replace(/^"|"$/g, '')}”</blockquote>
                      <figcaption className="mt-2 text-sm text-zinc-500">Review highlight from Google</figcaption>
                    </figure>
                  )
                )}
              </Section>
            </div>
          </div>

          <aside className="min-w-0 space-y-4 pt-6 lg:sticky lg:top-[calc(var(--header-h)_+_1.25rem)] lg:self-start">
            <div className="card divide-y divide-zinc-200">
              {website && (
                <a href={website} target="_blank" rel="noopener" className="flex items-center justify-between gap-3 p-5 hover:bg-zinc-50">
                  <span className="min-w-0 truncate font-medium text-brand-700">{hostname(website)}</span>
                  <GlobeIcon className="shrink-0 text-zinc-500" />
                </a>
              )}
              {b.phone && (
                <a href={telHref(b.phone)} className="flex items-center justify-between gap-3 p-5 hover:bg-zinc-50">
                  <span className="font-medium">{b.phone}</span>
                  <PhoneIcon className="shrink-0 text-zinc-500" />
                </a>
              )}
              <a href={directionsUrl(b.address ?? b.title, b.place_id)} target="_blank" rel="noopener" className="flex items-center justify-between gap-3 p-5 hover:bg-zinc-50">
                <span className="min-w-0">
                  <span className="block font-medium text-brand-700">Get directions</span>
                  <span className="block truncate text-sm text-zinc-600">{b.address}</span>
                </span>
                <DirectionsIcon className="shrink-0 text-zinc-500" />
              </a>
              {extraLinks.map(([label, url]) => (
                <a key={label} href={url} target="_blank" rel="noopener" className="flex items-center justify-between gap-3 p-5 hover:bg-zinc-50">
                  <span className="font-medium">{label}</span>
                  <ExternalIcon className="shrink-0 text-zinc-500" />
                </a>
              ))}
            </div>
            <div className="card p-5">
              <p className="flex items-center gap-2 font-semibold"><ShieldIcon width={18} height={18} className="text-brand-600" /> Is this your business?</p>
              <p className="mt-2 text-sm text-zinc-600">Claim it for free to update your details, add photos and respond to customers.</p>
              <Link href={`/add-business?claim=${b.slug}`} className="btn btn-outline mt-4 w-full">Claim this business</Link>
            </div>
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="border-t border-zinc-200 py-12">
            <h2 className="section-title">More {plural(niche)} in {b.area ?? town}</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map(s => <BizCard key={s.key} b={s} />)}
            </div>
          </section>
        )}
      </div>

      {/* No aggregateRating: Google's rules forbid marking up ratings collected by another site. */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          '@id': `${SITE.url}/biz/${b.slug}`,
          name: b.title,
          address: b.address,
          telephone: b.phone,
          url: website,
          description: b.description,
          image: safeUrl(b.thumbnail),
          priceRange: b.price,
          ...(b.gps_coordinates && { geo: { '@type': 'GeoCoordinates', latitude: b.gps_coordinates.latitude, longitude: b.gps_coordinates.longitude } }),
          ...(b.place_id && { sameAs: [`https://www.google.com/maps/place/?q=place_id:${b.place_id}`] }),
        }}
      />
    </>
  )
}
