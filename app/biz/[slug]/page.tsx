import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { BizCard, RatingLine, RatingSummary, ReviewCard } from '@/components/biz'
import { HoursTable, ShareButton } from '@/components/client'
import { ResultsMap } from '@/components/ResultsMap'
import { CheckIcon, DirectionsIcon, ExternalIcon, GlobeIcon, PencilIcon, PhoneIcon, PinIcon, ShieldIcon, StarIcon } from '@/components/icons'
import { BizImage, Breadcrumbs, JsonLd } from '@/components/ui'
import { getBusiness, getListing, getListingAreas, getSimilar, getTopRated, ratingBreakdown } from '@/lib/data'
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

function Hero({ b }: { b: Business }) {
  const photos = (b.images?.map(i => i.thumbnail) ?? [b.thumbnail]).map(src => safeUrl(src)).filter((s): s is string => !!s).slice(0, 4)
  return (
    <section data-theme="light" className="relative h-72 overflow-hidden bg-zinc-900 sm:h-96">
      {photos.length ? (
        <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${photos.length}, minmax(0, 1fr))` }}>
          {photos.map(src => <BizImage key={src} biz={b} src={src} w={Math.round(1600 / photos.length)} h={700} className="h-full w-full" />)}
        </div>
      ) : (
        <BizImage biz={b} className="h-full w-full opacity-40" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto max-w-7xl px-4 pb-8">
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
      </div>
    </section>
  )
}

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32 border-t border-zinc-200 py-8">
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
  const amenities = new Map<string, string[]>()
  const addAmenities = (group: string, items: string[]) =>
    amenities.set(featureLabel(group), [...new Set([...(amenities.get(featureLabel(group)) ?? []), ...items])])
  addAmenities('service_options', Object.entries(b.service_options ?? {}).filter(([, v]) => v).map(([k]) => featureLabel(k)))
  for (const ext of b.extensions ?? []) for (const [group, items] of Object.entries(ext)) if (Array.isArray(items)) addAmenities(group, items)
  for (const [group, items] of amenities) if (!items.length) amenities.delete(group)
  const extraLinks = ([['Menu', b.menu?.link], ['Order online', b.order_online], ['Reserve a table', b.reserve_a_table], ['Book online', b.book_online]] as const)
    .map(([label, url]) => [label, safeUrl(url)] as const)
    .filter((x): x is readonly [typeof x[0], string] => !!x[1])
  const reviews = b.review_items ?? []
  const [listing, areas, similar] = await Promise.all([getListing(b.citySlug, nicheSlug), getListingAreas(b.citySlug, nicheSlug), getSimilar(b, 4)])
  const areaPage = b.areaSlug && areas.some(a => a.slug === b.areaSlug)
  const nicheHref = `/${b.citySlug}/${nicheSlug}`

  return (
    <>
      <Hero b={b} />
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

            <Breadcrumbs
              items={[
                { name: 'Home', href: '/' },
                { name: town, href: `/${b.citySlug}` },
                ...(listing ? [{ name: cap(plural(niche)), href: nicheHref }] : []),
                ...(listing && areaPage ? [{ name: b.area!, href: `${nicheHref}/${b.areaSlug}` }] : []),
                { name: b.title },
              ]}
            />

            <div className="pt-8">
              {amenities.size > 0 && (
                <Section title="Amenities and more">
                  <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                    {[...amenities].map(([group, items]) => (
                      <div key={group}>
                        <h3 className="text-sm font-semibold text-zinc-900">{group}</h3>
                        <ul className="mt-3 space-y-2.5">
                          {items.map(item => (
                            <li key={item} className="flex items-center gap-3 text-sm text-zinc-700">
                              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"><CheckIcon width={14} height={14} /></span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
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
                {b.rating ? (
                  <RatingSummary b={b} counts={ratingBreakdown(b)} />
                ) : (
                  <p className="text-zinc-600">No ratings yet.</p>
                )}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-zinc-50 p-5">
                  <p className="font-medium">Been to {b.title}? Share your experience.</p>
                  <Link href={`/write-a-review?biz=${b.slug}`} className="btn btn-primary"><StarIcon width={18} height={18} /> Write a review</Link>
                </div>
                {reviews.length > 0 ? (
                  <div className="mt-4">
                    {reviews.map((r, i) => <ReviewCard key={r.review_id ?? i} review={r} />)}
                  </div>
                ) : b.user_review ? (
                  <figure className="mt-6 rounded-2xl border-l-4 border-star bg-amber-50/60 p-5">
                    <blockquote className="text-lg leading-relaxed text-zinc-800">“{b.user_review.replace(/^"|"$/g, '')}”</blockquote>
                    <figcaption className="mt-2 text-sm text-zinc-500">Review highlight from Google</figcaption>
                  </figure>
                ) : (
                  <p className="mt-6 text-zinc-600">No written reviews yet. Be the first!</p>
                )}
              </Section>
            </div>
          </div>

          <aside className="min-w-0 space-y-4 pt-6 lg:sticky lg:top-24 lg:self-start">
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
