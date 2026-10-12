import Link from 'next/link'
import { Suspense } from 'react'
import { getCategoryGroups } from '@/lib/data'
import { SITE } from '@/lib/site'
import { cap, plural } from '@/lib/utils'
import { GroupIcon } from './CategoryIcon'
import { HeaderSearch, ThemeToggle } from './client'
import { ChevronDownIcon, Logo, MenuIcon, PencilIcon, PlusIcon, SearchIcon } from './icons'
import { SearchForm } from './ui'

const navLink = 'flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900'

export async function Header() {
  const groups = await getCategoryGroups()

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[120rem] items-center gap-2 px-4 sm:px-6">
        <Link href="/" className="mr-3 flex shrink-0 items-center gap-2 font-display text-xl font-bold tracking-tight text-zinc-900">
          <Logo />
          {SITE.name}
        </Link>

        <nav aria-label="Main" className="hidden h-full items-center gap-0.5 lg:flex">
          {/* Categories: full-width panel. The trigger spans the header's full height so the pointer can reach the panel.
              Opens on hover, or on keyboard focus (focus-visible, so a mouse click doesn't leave it stuck open). */}
          <div className="group flex h-full items-center">
            <Link href="/categories" className={`${navLink} group-hover:bg-zinc-100 group-hover:text-zinc-900`}>
              Categories <ChevronDownIcon width={14} height={14} className="text-zinc-400 transition-transform group-hover:rotate-180" />
            </Link>
            <div className="invisible absolute inset-x-0 top-full border-b border-zinc-200 bg-surface opacity-0 shadow-2xl shadow-zinc-900/10 transition duration-150 group-hover:visible group-hover:opacity-100 group-has-[:focus-visible]:visible group-has-[:focus-visible]:opacity-100">
              <div className="mx-auto grid max-w-7xl grid-cols-4 gap-x-10 gap-y-8 px-4 py-8">
                {groups.slice(0, 8).map(g => (
                  <div key={g.slug}>
                    <Link href={`/categories#${g.slug}`} className="flex items-center gap-2.5 font-semibold text-zinc-900 hover:text-brand-700">
                      <GroupIcon group={g.name} size={32} brand />
                      {g.name}
                    </Link>
                    <ul className="mt-3 space-y-0.5">
                      {[...g.niches].sort((a, b) => b.count - a.count).slice(0, 5).map(n => (
                        <li key={n.slug}>
                          <Link href={`/search?q=${encodeURIComponent(n.name)}`} className="-mx-2 block truncate rounded-md px-2 py-1.5 text-sm text-zinc-600 hover:bg-brand-50 hover:text-brand-800">
                            {cap(plural(n.name))}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Link href="/cities" className={navLink}>Cities</Link>
        </nav>

        {/* Search pill on inner pages. Suspense: on routes only known at request time the pathname isn't ready during prerender. */}
        <Suspense fallback={<div className="mx-3 hidden max-w-md flex-1 md:block" />}>
          <HeaderSearch>
            <SearchForm variant="header" />
          </HeaderSearch>
        </Suspense>

        <div className="ml-auto flex items-center gap-0.5">
          <Link href="/write-a-review" className={`${navLink} hidden xl:flex`}>
            <PencilIcon width={15} height={15} /> Write a review
          </Link>
          <Link href="/for-business" className={`${navLink} hidden lg:flex`}>For businesses</Link>
          <ThemeToggle className="rounded-full p-2.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900" />
          <Link href="/add-business" className="btn btn-primary ml-2 hidden rounded-full px-4 py-2 shadow-sm shadow-brand-600/20 sm:inline-flex">
            <PlusIcon width={16} height={16} /> Add a business
          </Link>

          <Link href="/search" aria-label="Search" className="rounded-full p-2 text-zinc-700 hover:bg-zinc-100 md:hidden">
            <SearchIcon />
          </Link>
          <details className="relative lg:hidden">
            <summary aria-label="Menu" className="list-none rounded-full p-2 text-zinc-700 hover:bg-zinc-100 [&::-webkit-details-marker]:hidden">
              <MenuIcon />
            </summary>
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-zinc-200 bg-surface p-2 shadow-xl">
              {[
                ['/categories', 'All categories'],
                ['/cities', 'All cities'],
                ['/search', 'Search'],
                ['/write-a-review', 'Write a review'],
                ['/for-business', 'For businesses'],
                ['/add-business', 'Add a business'],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100">{label}</Link>
              ))}
            </div>
          </details>
        </div>
      </div>
    </header>
  )
}
