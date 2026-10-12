import Link from 'next/link'
import { getCategoryGroups, getSearchSuggestions } from '@/lib/data'
import { SITE } from '@/lib/site'
import { CategoryNav } from './CategoryNav'
import { Logo, MenuIcon, PlusIcon, SearchIcon, Wordmark } from './icons'
import { SearchForm } from './ui'

// Like Yelp's: the logo on the left, the search box in the middle (laptops and up), For businesses and Add a business
// on the right. The home page renders <Header home />: the bar is see-through over the hero video, lies on top of it
// and scrolls away with it, with the category menus under the search box (data-home; the `group-data-[home]/header:`
// classes are that look). Every other page gets the white bar, stuck to the top (app/(site)/layout.tsx), and browses
// categories from the menu on small screens and the footer.
// A see-through strip that lets clicks through. overflow-x-clip: a category panel waiting off to the side (hidden, before
// it's placed on screen) mustn't widen the page.
const FRAME = 'pointer-events-none z-40 overflow-x-clip px-3 pt-3 sm:px-4'
const onHome = {
  bar: 'group-data-[home]/header:bg-transparent group-data-[home]/header:shadow-none group-data-[home]/header:ring-0',
  icon: 'group-data-[home]/header:text-white group-data-[home]/header:hover:bg-white/10',
}
// The search box's box. The category row under it (on large screens) uses the same classes, so their left edges line up.
const MIDDLE = 'w-full max-w-3xl justify-self-center px-3'

export async function Header({ home = false }: { home?: boolean }) {
  const [suggest, groups] = await Promise.all([getSearchSuggestions(), getCategoryGroups()])
  const bar = (
    // Row one is 4rem; with the gap above, the header is 4.75rem tall (--header-h in globals.css). On the home page a
    // second row holds the category menus. The outline is a ring, which takes no room. Solid white rather than frosted:
    // a backdrop blur over the home page's video would be redrawn on every frame.
    <div className={`pointer-events-auto relative mx-auto grid max-w-[120rem] grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[4rem] items-center gap-x-2 rounded-2xl bg-white px-3 shadow-lg ring-1 shadow-zinc-900/5 ring-zinc-200/80 sm:px-5 lg:group-data-[home]/header:gap-y-3 ${onHome.bar}`}>
      <Link href="/" aria-label={`${SITE.name} home`} className="col-start-1 mr-1 flex shrink-0 items-center gap-2.5 text-base sm:mr-3 sm:text-xl">
        <Logo className="group-data-[home]/header:ring-1 group-data-[home]/header:ring-white/25" />
        <Wordmark />
      </Link>

      <div className={`col-start-2 hidden lg:block ${MIDDLE}`}>
        <SearchForm variant="header" suggest={suggest} />
      </div>

      <div className="col-start-3 flex items-center gap-1.5">
        <Link
          href="/for-business"
          className="hidden rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium whitespace-nowrap text-zinc-800 transition-colors hover:bg-zinc-200 lg:block group-data-[home]/header:bg-white group-data-[home]/header:text-zinc-900 group-data-[home]/header:shadow-sm group-data-[home]/header:hover:bg-zinc-100"
        >
          For businesses
        </Link>
        <Link href="/add-business" className="btn btn-primary hidden rounded-full px-4 py-2 whitespace-nowrap shadow-sm shadow-brand-600/20 sm:inline-flex">
          <PlusIcon width={16} height={16} /> Add a business
        </Link>

        <Link href="/search" aria-label="Search" className={`rounded-full p-2 text-zinc-700 hover:bg-zinc-100 lg:hidden ${onHome.icon}`}>
          <SearchIcon />
        </Link>
        <details className="relative lg:hidden">
          <summary aria-label="Menu" className={`list-none rounded-full p-2 text-zinc-700 hover:bg-zinc-100 [&::-webkit-details-marker]:hidden ${onHome.icon}`}>
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

      {/* Home page, laptops and up: the category menus under the search box. Below 1280px the row is too wide to start
          there, so it starts under the logo instead. */}
      <div className="col-span-3 row-start-2 hidden lg:group-data-[home]/header:block xl:col-span-1 xl:col-start-2 xl:w-full xl:max-w-3xl xl:justify-self-center xl:px-3">
        <CategoryNav groups={groups} />
      </div>
    </div>
  )
  return (
    <header data-home={home ? '' : undefined} className={`group/header ${home ? 'absolute inset-x-0 top-0' : 'sticky top-0'} ${FRAME}`}>
      {bar}
    </header>
  )
}
