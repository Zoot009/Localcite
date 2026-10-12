import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ActivityCard, BizCard } from '@/components/biz'
import { CategoryIcon } from '@/components/CategoryIcon'
import { Breadcrumbs, SearchForm, SectionHeader } from '@/components/ui'
import { getCities, getCity, getCityAreas, getCityCategories, getHighlights, getTopRated } from '@/lib/data'
import { cap, plural } from '@/lib/utils'

// ponytail: builds the 50 biggest cities ahead of time; the rest render on first visit and are then cached.
export async function generateStaticParams() {
  return (await getCities()).slice(0, 50).map(c => ({ city: c.slug }))
}

export async function generateMetadata({ params }: PageProps<'/[city]'>): Promise<Metadata> {
  const c = await getCity((await params).city)
  if (!c) return {}
  return {
    title: `Best local businesses in ${c.name}`,
    description: `Find ${c.count} top-rated local businesses in ${c.label} across ${c.categories} categories, with ratings, hours and directions.`,
    alternates: { canonical: `/${c.slug}` },
  }
}

export default async function CityPage({ params }: PageProps<'/[city]'>) {
  const c = await getCity((await params).city)
  if (!c) notFound()
  const [categories, areas, top, recent] = await Promise.all([getCityCategories(c.slug), getCityAreas(c.slug), getTopRated(8, c.slug), getHighlights(3, c.slug)])

  return (
    <>
      <section className="border-b border-zinc-200 bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Cities', href: '/cities' }, { name: c.name }]} />
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Discover the best of {c.name}</h1>
          <p className="mt-3 text-lg text-zinc-600">
            {c.count.toLocaleString('en-US')} businesses across {categories.length} categories in {c.label}
          </p>
          <div className="mt-8 max-w-3xl">
            <SearchForm loc={c.name} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <SectionHeader title={`Popular in ${c.name}`} />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map(l => (
            <Link key={l.slug} href={`/${c.slug}/${l.slug}`} className="card flex min-w-0 items-center gap-4 p-4 transition hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-200/70">
              <CategoryIcon name={l.name} group={l.group} size={48} />
              <span className="min-w-0">
                <span className="block font-semibold">{cap(plural(l.name))}</span>
                <span className="block text-sm text-zinc-500">{l.count} listings</span>
                {l.top && <span className="mt-1 block truncate text-sm text-zinc-600">Top: {l.top}</span>}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {areas.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-14">
          <SectionHeader title="Neighbourhoods" sub={`Find businesses close to you in ${c.name}`} />
          <ul className="mt-6 flex flex-wrap gap-2">
            {areas.map(a => (
              <li key={a.slug}>
                <Link href={`/search?loc=${encodeURIComponent(`${a.name}, ${c.name}`)}`} className="chip">
                  {a.name} <span className="text-zinc-400">{a.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {top.length > 0 && (
        <section className="bg-zinc-50 py-14">
          <div className="mx-auto max-w-7xl px-4">
            <SectionHeader title={`Top rated in ${c.name}`} href={`/search?loc=${encodeURIComponent(c.name)}&sort=rating`} />
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {top.map(b => <BizCard key={b.key} b={b} />)}
            </div>
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14">
          <SectionHeader title={`What people say in ${c.name}`} />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map(({ business, review }) => <ActivityCard key={business.key} business={business} review={review} />)}
          </div>
        </section>
      )}
    </>
  )
}
