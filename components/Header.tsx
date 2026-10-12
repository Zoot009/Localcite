import Link from 'next/link'
import { Suspense } from 'react'
import { SITE } from '@/lib/site'
import { HeaderSearch } from './client'
import { Logo, MenuIcon, PlusIcon, SearchIcon, Wordmark } from './icons'
import { SearchForm } from './ui'

// Categories are browsed from the row on the home page (components/CategoryNav.tsx), the menu on small screens and
// the footer, which keeps this bar to the essentials.
export function Header() {
  return (
    // A floating capsule. On laptops and up it's only as wide as what's in it, centred; on phones and tablets it spans
    // the screen. The header around it is a see-through strip that lets clicks through. Its full height (4.25rem) is
    // --header-h in globals.css. Solid white rather than frosted: a backdrop blur over the home page's video would be
    // redrawn on every frame.
    <header className="pointer-events-none sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="pointer-events-auto relative mx-auto flex h-14 w-full items-center gap-2 rounded-full border border-zinc-200/80 bg-white pr-2 pl-4 shadow-lg shadow-zinc-900/5 lg:w-fit lg:gap-4">
        <Link href="/" aria-label={`${SITE.name} home`} className="mr-1 flex shrink-0 items-center gap-2.5 text-base sm:mr-3 sm:text-xl">
          <Logo />
          <Wordmark />
        </Link>

        {/* Search pill on inner pages. Suspense: on routes only known at request time the pathname isn't ready during prerender. */}
        <Suspense fallback={<div className="hidden lg:block lg:w-[22rem] xl:w-[34rem]" />}>
          <HeaderSearch>
            <SearchForm variant="header" />
          </HeaderSearch>
        </Suspense>

        <div className="ml-auto flex items-center gap-0.5">
          <Link
            href="/for-business"
            className="hidden items-center rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 lg:flex"
          >
            For businesses
          </Link>
          <Link href="/add-business" className="btn btn-primary ml-2 hidden rounded-full px-4 py-2 whitespace-nowrap shadow-sm shadow-brand-600/20 sm:inline-flex">
            <PlusIcon width={16} height={16} /> Add a business
          </Link>

          <Link href="/search" aria-label="Search" className="rounded-full p-2 text-zinc-700 hover:bg-zinc-100 lg:hidden">
            <SearchIcon />
          </Link>
          <details className="relative lg:hidden">
            <summary aria-label="Menu" className="list-none rounded-full p-2 text-zinc-700 hover:bg-zinc-100 [&::-webkit-details-marker]:hidden">
              <MenuIcon />
            </summary>
            <div className="absolute right-0 mt-4 w-64 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl">
              {[
                ['/categories', 'All categories'],
                ['/cities', 'All cities'],
                ['/search', 'Search'],
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
