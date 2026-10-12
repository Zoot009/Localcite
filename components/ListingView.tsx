import Link from 'next/link'
import { getCityCategories } from '@/lib/data'
import { SITE } from '@/lib/site'
import type { AreaCount, Business, Listing } from '@/lib/types'
import { cap, cityName, mapPoints, plural } from '@/lib/utils'
import { BizResult } from './biz'
import { ResultsMap } from './ResultsMap'
import { CategoryIcon } from './CategoryIcon'
import { ChevronDownIcon } from './icons'
import { Breadcrumbs, JsonLd } from './ui'

const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`)

// "Best dentists in Pune" and "Best dentists in Kothrud, Pune" pages.
export async function ListingView({ listing, items, areas, area }: { listing: Listing; items: Business[]; areas: AreaCount[]; area?: AreaCount }) {
  const town = cityName(listing.city)
  const place = area ? `${area.name}, ${town}` : town
  const what = plural(listing.niche)
  const base = `/${listing.citySlug}/${listing.nicheSlug}`
  const related = (await getCityCategories(listing.citySlug)).filter(l => l.slug !== listing.nicheSlug).slice(0, 14)
  const rated = items.filter(b => b.rating)
  const avg = rated.length ? rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length : 0
  const sunday = items.filter(b => b.operating_hours?.sunday && !/closed/i.test(b.operating_hours.sunday))

  // Answers are computed from the listings themselves, so every page's FAQ is specific to it.
  const faqs: [string, string][] = [
    [
      `What are the best ${what} in ${place}?`,
      `Based on ratings and number of reviews, the top-rated ${what} in ${place} are ${list(
        items.slice(0, 3).map(b => `${b.title}${b.rating ? ` (${b.rating.toFixed(1)}★ from ${b.reviews ?? 0} reviews)` : ''}`),
      )}.`,
    ],
    [`How many ${what} are there in ${place}?`, `${SITE.name} lists ${items.length} ${what} in ${place}${avg ? `, with an average rating of ${avg.toFixed(1)} out of 5` : ''}.`],
    [
      `Are any ${what} in ${place} open on Sunday?`,
      sunday.length
        ? `Yes. ${list(sunday.slice(0, 3).map(b => b.title))}${sunday.length > 3 ? ` and ${sunday.length - 3} more` : ''} list Sunday hours. Check each listing for exact times.`
        : `None of the ${what} listed here show Sunday opening hours, so call ahead to check.`,
    ],
  ]
  if (!area && areas.length > 1) {
    faqs.push([`Which areas of ${town} have the most ${what}?`, `${list(areas.slice(0, 3).map(a => `${a.name} (${a.count})`))}.`])
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: town, href: `/${listing.citySlug}` },
          area ? { name: cap(what), href: base } : { name: cap(what) },
          ...(area ? [{ name: area.name }] : []),
        ]}
      />
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
        Best {what} in {place}
      </h1>
      <p className="mt-2 text-zinc-600">
        {items.length} {what} · ranked by rating and number of reviews{avg ? ` · average ${avg.toFixed(1)}★` : ''}
      </p>

      {areas.length > 0 && (
        <nav aria-label="Filter by area" className="mt-6 -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          <Link href={base} className={`chip shrink-0 ${area ? '' : 'chip-active'}`}>All of {town}</Link>
          {areas.map(a => (
            <Link key={a.slug} href={`${base}/${a.slug}`} className={`chip shrink-0 ${area?.slug === a.slug ? 'chip-active' : ''}`}>
              {a.name} <span className="text-zinc-400">{a.count}</span>
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ol className="space-y-4">
          {items.map((b, i) => (
            <li key={b.key}>
              <BizResult b={b} rank={i + 1} />
            </li>
          ))}
        </ol>
        <aside className="space-y-6 lg:sticky lg:top-[calc(var(--header-h)_+_1.25rem)] lg:self-start">
          <ResultsMap points={mapPoints(items, 1)} className="h-[26rem]" />
          {related.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold">More in {town}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {related.map(l => (
                  <li key={l.slug}>
                    <Link href={`/${listing.citySlug}/${l.slug}`} className="chip"><CategoryIcon name={l.name} group={l.group} plain size={15} />{cap(plural(l.name))}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <section className="mt-16 max-w-3xl">
        <h2 className="section-title">Frequently asked questions</h2>
        <div className="mt-6 divide-y divide-zinc-200 rounded-2xl border border-zinc-200">
          {faqs.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDownIcon className="shrink-0 text-zinc-400 transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-zinc-600">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `Best ${what} in ${place}`,
          itemListElement: items.map((b, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE.url}/biz/${b.slug}`, name: b.title })),
        }}
      />
    </div>
  )
}
