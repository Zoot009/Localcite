import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { CategoryGroup } from '@/lib/types'
import { cap, plural } from '@/lib/utils'
import { CategoryIcon } from './CategoryIcon'
import { HoverMenu } from './client'

// These groups get a menu each, in this order; the rest go under "More".
const MAIN_GROUPS = ['Restaurants', 'Home services', 'Health & medical', 'Beauty & spas', 'Shopping', 'Automotive']
const PER_MENU = 15 // three columns of five
// In the Restaurants menu "Pizza" says enough; elsewhere the full name.
const menuLabel = (group: string, name: string) => (group === 'Restaurants' ? cap(plural(name)).replace(/ restaurants$/, '') : cap(plural(name)))

// The home page's row of category menus, white text over the hero video (like Yelp's). Each group opens a panel of
// its categories under its label (HoverMenu in components/client.tsx). Shown under the header's search box on the home
// page (components/Header.tsx), lined up with its left edge.
export function CategoryNav({ groups }: { groups: CategoryGroup[] }) {
  const main = MAIN_GROUPS.map(name => groups.find(g => g.name === name)).filter((g): g is CategoryGroup => !!g)
  const more = groups.filter(g => !main.includes(g))
  return (
    // Laptops: -ml-3 lines the first label up with the logo. Large screens (xl:): centred under the search box, so it
    // overhangs both ends equally. To nudge it, add e.g. xl:-ml-6 (24px further left) or xl:ml-6 (24px right).
    <nav aria-label="Categories" className="-ml-3 flex h-11 items-center gap-0.5 xl:ml-0 xl:justify-center">
      {main.map(g => (
        <HoverMenu key={g.slug} label={g.name} href={`/categories#${g.slug}`}>
          <MenuLinks
            items={[...g.niches].sort((a, b) => b.count - a.count).slice(0, PER_MENU).map(n => ({
              href: `/search?q=${encodeURIComponent(n.name)}`, label: menuLabel(g.name, n.name), icon: <CategoryIcon name={n.name} group={g.name} mono size={19} />,
            }))}
          />
          {g.niches.length > PER_MENU && <PanelLink href={`/categories#${g.slug}`}>All {g.niches.length} {g.name.toLowerCase()} categories</PanelLink>}
        </HoverMenu>
      ))}
      <HoverMenu label="More" href="/categories">
        <MenuLinks items={more.map(g => ({ href: `/categories#${g.slug}`, label: g.name, icon: <CategoryIcon name={g.name} group={g.name} mono size={19} /> }))} />
        <PanelLink href="/categories">All categories</PanelLink>
      </HoverMenu>
    </nav>
  )
}

function MenuLinks({ items }: { items: { href: string; label: string; icon: ReactNode }[] }) {
  return (
    <ul className="grid grid-cols-3 gap-0.5">
      {items.map(it => (
        <li key={it.href} className="min-w-0">
          <Link href={it.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
            <span className="shrink-0 text-zinc-500">{it.icon}</span>
            <span className="leading-snug">{it.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mt-1 flex items-center gap-1 px-3 py-2 text-sm font-semibold text-brand-700 hover:text-brand-800">
      {children} <ArrowRight size={15} />
    </Link>
  )
}
