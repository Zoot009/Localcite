import type { Metadata } from 'next'
import Link from 'next/link'
import { CategoryIcon, GroupIcon } from '@/components/CategoryIcon'
import { Breadcrumbs } from '@/components/ui'
import { getCategoryGroups } from '@/lib/data'
import { cap, plural } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'All categories',
  description: 'Browse every kind of local business: restaurants, health, beauty, home services, shopping, auto, legal and more.',
  alternates: { canonical: '/categories' },
}

export default async function CategoriesPage() {
  const groups = await getCategoryGroups()
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Categories' }]} />
      <h1 className="mt-4 text-4xl font-bold tracking-tight">All categories</h1>
      <p className="mt-2 text-zinc-600">{groups.reduce((s, g) => s + g.niches.length, 0)} kinds of local businesses</p>

      <nav aria-label="Category groups" className="mt-8 flex flex-wrap gap-2">
        {groups.map(g => (
          <a key={g.slug} href={`#${g.slug}`} className="chip">
            <CategoryIcon name="" group={g.name} plain size={15} />
            {g.name}
          </a>
        ))}
      </nav>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {groups.map(g => (
          <section key={g.slug} id={g.slug} className="card scroll-mt-32 p-6">
            <h2 className="flex items-center gap-3 text-xl font-bold tracking-tight">
              <GroupIcon group={g.name} size={40} />
              {g.name}
              <span className="ml-auto text-sm font-normal text-zinc-500">{g.niches.length} categories</span>
            </h2>
            <ul className="mt-5 grid gap-1 sm:grid-cols-2">
              {g.niches.map(n => (
                <li key={n.slug}>
                  <Link href={`/search?q=${encodeURIComponent(n.name)}`} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-zinc-700 hover:bg-zinc-100">
                    <CategoryIcon name={n.name} group={g.name} plain size={17} />
                    <span className="truncate">{cap(plural(n.name))}</span>
                    {n.count > 0 && <span className="ml-auto text-xs text-zinc-400 tabular-nums">{n.count.toLocaleString('en-US')}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
