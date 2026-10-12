import Link from 'next/link'
import { getCities } from '@/lib/data'
import { SITE } from '@/lib/site'
import { Logo, Wordmark } from './icons'

function Column({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map(([label, href]) => (
          <li key={href}>
            {href.startsWith('mailto:') ? (
              <a href={href} className="text-sm text-zinc-600 hover:text-brand-700">{label}</a>
            ) : (
              <Link href={href} className="text-sm text-zinc-600 hover:text-brand-700">{label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export async function Footer() {
  const cities = await getCities()
  return (
    <footer className="mt-24 border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[minmax(15rem,1.4fr)_repeat(4,minmax(0,1fr))]">
        <div>
          <Link href="/" aria-label={`${SITE.name} home`} className="flex items-center gap-2.5 text-xl">
            <Logo />
            <Wordmark />
          </Link>
          <p className="mt-3 text-sm text-zinc-600">{SITE.tagline}. Free for customers and businesses. Rankings are never for sale.</p>
        </div>
        <Column
          title="About"
          links={[
            [`About ${SITE.name}`, '/about'],
            ['How rankings work', '/about#how-it-works'],
            ['Content guidelines', '/about#guidelines'],
            ['Contact us', `mailto:${SITE.email}`],
          ]}
        />
        <Column
          title="Discover"
          links={[
            ['All categories', '/categories'],
            ['Search businesses', '/search'],
            ['Write a review', '/write-a-review'],
          ]}
        />
        <Column
          title="For businesses"
          links={[
            ['Claim your business', '/for-business'],
            ['Add your business', '/add-business'],
            ['Business FAQ', '/for-business#faq'],
          ]}
        />
        <Column title="Cities" links={[...cities.slice(0, 6).map(c => [c.name, `/${c.slug}`] as [string, string]), [`All ${cities.length} cities`, '/cities']]} />
      </div>
      <div className="border-t border-zinc-200">
        <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-zinc-500">
          © {SITE.name}. Business information is compiled from public sources and updated by business owners.
        </p>
      </div>
    </footer>
  )
}
