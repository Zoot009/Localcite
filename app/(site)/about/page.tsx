import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/ui'
import { MIN_CATEGORY_LISTINGS, SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: `About ${SITE.name}`,
  description: `How ${SITE.name} works: where listings come from, how rankings are calculated and our content guidelines.`,
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'About' }]} />
      <h1 className="mt-4 text-4xl font-bold tracking-tight">About {SITE.name}</h1>
      <p className="mt-4 text-lg text-zinc-700">
        {SITE.name} helps people find good local businesses, and helps local businesses get found. It’s free for everyone, and no business
        can pay to rank higher.
      </p>

      <section id="how-it-works" className="mt-12 scroll-mt-[calc(var(--header-h)_+_1.25rem)]">
        <h2 className="section-title">How it works</h2>
        <div className="mt-4 space-y-4 text-zinc-700">
          <p>
            <strong>Listings.</strong> Business names, addresses, phone numbers, websites and hours come from public sources such as maps and
            business websites. Owners can <Link href="/for-business" className="text-brand-700 hover:underline">claim their listing</Link> to
            correct anything, and anyone can <Link href="/add-business" className="text-brand-700 hover:underline">add a missing business</Link>.
          </p>
          <p>
            <strong>Rankings.</strong> “Best of” pages are ordered by rating, weighted by how many reviews a business has, so a 4.7 from 300
            reviews ranks above a 5.0 from 2. Advertising doesn’t exist here, so it can’t affect the order.
          </p>
          <p>
            <strong>Quality.</strong> We only publish category pages with at least {MIN_CATEGORY_LISTINGS} businesses, and skip businesses that
            are permanently closed or outside the city.
          </p>
        </div>
      </section>

      <section id="guidelines" className="mt-12 scroll-mt-[calc(var(--header-h)_+_1.25rem)]">
        <h2 className="section-title">Content guidelines</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-700">
          <li>Reviews must describe your own, first-hand experience with the business.</li>
          <li>No reviews of your own business, your employer, or a competitor.</li>
          <li>No reviews offered in exchange for discounts, gifts or payment.</li>
          <li>No hate speech, harassment, threats, or other people’s personal information.</li>
          <li>Keep it relevant: focus on the product, service and experience.</li>
        </ul>
        <p className="mt-4 text-zinc-700">Reviews go live straight away, and we remove ones that break these rules.</p>
      </section>

      <section id="contact" className="mt-12 scroll-mt-[calc(var(--header-h)_+_1.25rem)]">
        <h2 className="section-title">Contact</h2>
        <p className="mt-4 text-zinc-700">
          Questions, corrections or removal requests: <a href={`mailto:${SITE.email}`} className="text-brand-700 hover:underline">{SITE.email}</a>
        </p>
      </section>
    </div>
  )
}
