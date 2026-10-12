import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'
import { BizResult } from '@/components/biz'
import { CategoryIcon } from '@/components/CategoryIcon'
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { SearchForm } from '@/components/ui'
import { getCities, getPopularNiches, search } from '@/lib/data'
import { PAGE_SIZE } from '@/lib/site'
import { ResultsMap } from '@/components/ResultsMap'
import { cap, featureLabel, mapPoints, one, plural } from '@/lib/utils'

export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } }

export default function SearchPage({ searchParams }: PageProps<'/search'>) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Results searchParams={searchParams} />
    </Suspense>
  )
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-[120rem] animate-pulse px-4 py-8 sm:px-6">
      <div className="h-9 w-72 rounded-lg bg-zinc-100" />
      <div className="mt-8 space-y-4">
        {[0, 1, 2].map(i => <div key={i} className="h-44 rounded-2xl bg-zinc-100" />)}
      </div>
    </div>
  )
}

const SORTS = [['', 'Recommended'], ['rating', 'Highest rated'], ['reviews', 'Most reviewed']] as const
const RATINGS = [['', 'Any rating'], ['4.5', '4.5+ ★'], ['4', '4.0+ ★'], ['3.5', '3.5+ ★']] as const

async function Results({ searchParams }: Pick<PageProps<'/search'>, 'searchParams'>) {
  const sp = await searchParams
  const p = { q: one(sp.q)?.trim() ?? '', loc: one(sp.loc)?.trim() ?? '', sort: one(sp.sort) ?? '', rating: one(sp.rating) ?? '', f: one(sp.f) ?? '' }
  const page = Math.max(1, Math.floor(Number(one(sp.page))) || 1)

  if (!p.q && !p.loc && !p.sort) return <Browse />

  const { results: shown, total, features } = await search({ ...p, features: p.f.split(',').filter(Boolean), page })
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const href = (o: Partial<typeof p> & { page?: number }) =>
    `/search?${new URLSearchParams(Object.entries({ ...p, ...o }).filter(([, v]) => v).map(([k, v]) => [k, String(v)]))}`
  const toggle = (csv: string, v: string) => {
    const s = new Set(csv.split(',').filter(Boolean))
    if (!s.delete(v)) s.add(v)
    return [...s].join(',')
  }
  const filtered = p.rating || p.f
  const heading = p.q ? `${cap(p.q)}${p.loc ? ` near ${p.loc}` : ''}` : p.loc ? `Businesses near ${p.loc}` : 'All businesses'

  const filters = (
    <div className="space-y-7">
      <FilterGroup title="Sort by">
        {SORTS.map(([v, label]) => <FilterLink key={label} href={href({ sort: v })} active={p.sort === v}>{label}</FilterLink>)}
      </FilterGroup>
      <FilterGroup title="Rating">
        {RATINGS.map(([v, label]) => <FilterLink key={label} href={href({ rating: v })} active={p.rating === v}>{label}</FilterLink>)}
      </FilterGroup>
      {features.length > 0 && (
        <FilterGroup title="Features">
          {features.map(({ key, count }) => {
            const on = p.f.split(',').includes(key)
            return (
              <FilterLink key={key} href={href({ f: toggle(p.f, key) })} active={on} check>
                {featureLabel(key)} <span className="text-zinc-400">{count}</span>
              </FilterLink>
            )
          })}
        </FilterGroup>
      )}
      {filtered && <Link href={href({ rating: '', f: '' })} className="text-sm font-semibold text-brand-700 hover:underline">Clear filters</Link>}
    </div>
  )

  return (
    <div className="mx-auto max-w-[120rem] px-4 py-8 sm:px-6">
      <div className="md:hidden">
        <SearchForm q={p.q} loc={p.loc} />
      </div>
      <div className="mt-6 grid gap-8 md:mt-0 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1.1fr)_minmax(0,1fr)] xl:gap-6">
        <aside className="hidden lg:block">{filters}</aside>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{heading}</h1>
          <p className="mt-1 text-zinc-600">{total.toLocaleString('en-US')} {total === 1 ? 'result' : 'results'}</p>
          <details className="mt-4 lg:hidden">
            <summary className="chip cursor-pointer list-none [&::-webkit-details-marker]:hidden">Filters & sort{filtered ? ' •' : ''}</summary>
            <div className="card mt-3 p-5">{filters}</div>
          </details>
          {shown.length ? (
            <ol className="mt-6 space-y-4">
              {shown.map((b, i) => (
                <li key={b.key}>
                  <BizResult b={b} rank={(page - 1) * PAGE_SIZE + i + 1} />
                </li>
              ))}
            </ol>
          ) : (
            <div className="card mt-6 p-10 text-center">
              <p className="text-lg font-semibold">No results{p.q && ` for “${p.q}”`}{p.loc && ` near ${p.loc}`}</p>
              <p className="mt-2 text-zinc-600">Try a different spelling, fewer filters or a nearby area.</p>
              {filtered && <Link href={href({ rating: '', f: '' })} className="btn btn-outline mt-6">Clear filters</Link>}
            </div>
          )}
          {shown.length > 0 && (
            <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 pt-6">
              <p className="text-sm text-zinc-600">
                Showing <span className="font-semibold text-zinc-900">{(page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + shown.length}</span> of {total.toLocaleString('en-US')}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <PageLink href={page > 1 ? href({ page: page - 1 }) : undefined}><ChevronLeftIcon width={14} height={14} /> Previous</PageLink>
                {pageNumbers(page, pages).map((n, i, all) => (
                  <span key={n} className="flex items-center gap-2">
                    {i > 0 && n - all[i - 1] > 1 && <span className="text-zinc-400">…</span>}
                    <Link href={href({ page: n })} aria-current={n === page ? 'page' : undefined} className={`chip min-w-10 justify-center ${n === page ? 'chip-active' : ''}`}>{n}</Link>
                  </span>
                ))}
                <PageLink href={page < pages ? href({ page: page + 1 }) : undefined}>Next <ChevronRightIcon width={14} height={14} /></PageLink>
              </div>
            </nav>
          )}
        </div>
        <aside className="hidden xl:block">
          <ResultsMap points={mapPoints(shown, (page - 1) * PAGE_SIZE + 1)} className="sticky top-20 h-[calc(100vh-6rem)]" />
        </aside>
      </div>
    </div>
  )
}

// First, last and the pages either side of the current one: 1 … 4 5 6 … 20
const pageNumbers = (page: number, pages: number) =>
  [...new Set([1, page - 1, page, page + 1, pages])].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b)

// Previous / Next: greyed out (not a link) when there's no page that way.
function PageLink({ href, children }: { href?: string; children: ReactNode }) {
  return href
    ? <Link href={href} className="chip">{children}</Link>
    : <span aria-disabled="true" className="chip pointer-events-none opacity-40">{children}</span>
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-zinc-900">{title}</h2>
      <div className="flex flex-col items-start gap-1">{children}</div>
    </div>
  )
}

function FilterLink({ href, active, check, children }: { href: string; active: boolean; check?: boolean; children: ReactNode }) {
  return (
    <Link href={href} scroll={false} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${active ? 'font-semibold text-brand-800' : 'text-zinc-700 hover:text-zinc-900'}`}>
      {check ? (
        <span className={`grid size-4 place-items-center rounded border ${active ? 'border-brand-600 bg-brand-600 text-white' : 'border-zinc-300'}`}>
          {active && <CheckIcon width={12} height={12} strokeWidth={3} />}
        </span>
      ) : (
        <span className={`size-4 rounded-full border ${active ? 'border-[5px] border-brand-600' : 'border-zinc-300'}`} />
      )}
      {children}
    </Link>
  )
}

async function Browse() {
  const [niches, cities] = await Promise.all([getPopularNiches(12), getCities()])
  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="text-3xl font-bold tracking-tight">What are you looking for?</h1>
      <div className="mt-6">
        <SearchForm />
      </div>
      <h2 className="mt-12 font-semibold">Popular searches</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {niches.map(n => (
          <Link key={n.slug} href={`/search?q=${encodeURIComponent(n.name)}`} className="chip"><CategoryIcon name={n.name} group={n.group} plain size={15} />{cap(plural(n.name))}</Link>
        ))}
      </div>
      <h2 className="mt-10 font-semibold">Cities</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {cities.slice(0, 40).map(c => <Link key={c.slug} href={`/${c.slug}`} className="chip">{c.name}</Link>)}
        <Link href="/cities" className="chip chip-active">All {cities.length} cities</Link>
      </div>
    </div>
  )
}
