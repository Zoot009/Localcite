import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { FindBusiness } from '@/components/FindBusiness'
import { CheckCircleIcon, ChevronDownIcon, ClockIcon, GlobeIcon, PinIcon, SearchIcon, ShieldIcon, StarIcon } from '@/components/icons'
import { SITE } from '@/lib/site'
import { one } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'For businesses: claim your free listing',
  description: `Claim your free ${SITE.name} page to keep your business details accurate, link customers to your website and show your reviews.`,
  alternates: { canonical: '/for-business' },
}

const BENEFITS = [
  { Icon: CheckCircleIcon, title: 'Free to list', text: 'No subscriptions, no ads, no pay-to-rank. Instant listing for a one-time $5 is coming soon.' },
  { Icon: PinIcon, title: 'Consistent NAP', text: 'The same name, address and phone everywhere helps you rank in local search.' },
  { Icon: GlobeIcon, title: 'Link to your website', text: 'Every listing links straight to your site so customers and search engines can find it.' },
  { Icon: ClockIcon, title: 'Hours & services', text: 'Show customers when you’re open and what you offer before they call.' },
  { Icon: StarIcon, title: 'Reviews', text: 'Real customer reviews and ratings build trust with new customers.' },
  { Icon: SearchIcon, title: 'Found locally', text: 'Appear on category and neighbourhood pages like “Best dentists in Kothrud”.' },
]

const FAQ = [
  ['Is it really free?', 'Yes. Adding and claiming a business is free. Soon you’ll also be able to pay a one-time $5 to go live instantly instead of waiting for our check. Nobody can pay to rank higher: rankings are based only on ratings and reviews.'],
  ['How do you verify I own the business?', 'We call the phone number on your listing or email an address at your website’s domain.'],
  ['My business isn’t listed. What do I do?', 'Use the Add a business form. Free listings go live once we’ve checked them, usually within a few days.'],
  ['Where does the listing information come from?', 'Public sources such as maps and business websites, plus updates from owners and customers.'],
  ['Can I remove my listing?', `Yes. Email ${SITE.email} from an address at your business and we’ll take it down.`],
]

export default function ForBusinessPage({ searchParams }: PageProps<'/for-business'>) {
  return (
    <>
      <section className="relative overflow-hidden bg-brand-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,var(--glow-accent),transparent_45%),radial-gradient(circle_at_10%_90%,var(--glow-brand),transparent_40%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:py-24">
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-200"><ShieldIcon width={16} height={16} /> {SITE.name} for businesses</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">Get found by more local customers</h1>
          <p className="mt-5 max-w-2xl text-lg text-brand-100">
            Claim your free page to keep your details accurate, link customers to your website and show off your reviews.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#claim" className="btn bg-white px-6 py-3 text-brand-800 hover:bg-brand-50">Claim your business</a>
            <Link href="/add-business" className="btn px-6 py-3 text-white ring-1 ring-white/40 hover:bg-white/10">Add a new business</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="section-title text-center">Everything you need, free</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ Icon, title, text }) => (
            <div key={title} className="card p-6">
              <span className="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon width={24} height={24} /></span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1 text-zinc-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="claim" className="scroll-mt-[calc(var(--header-h)_+_1.25rem)] bg-zinc-50 py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="section-title">Find your business</h2>
          <p className="mt-2 text-zinc-600">Search for your business, then claim it to manage the listing.</p>
          <div className="mt-6">
            <Suspense fallback={<div className="h-12 animate-pulse rounded-lg bg-zinc-200" />}>
              {searchParams.then(sp => (
                <FindBusiness action="/for-business" find={one(sp.find)} hrefFor={slug => `/add-business?claim=${slug}`} cta="Claim" />
              ))}
            </Suspense>
          </div>
          <p className="mt-6 text-sm text-zinc-600">
            Not listed yet? <Link href="/add-business" className="font-semibold text-brand-700 hover:underline">Add your business</Link>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="section-title text-center">How claiming works</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            ['Find your page', 'Search for your business name above.'],
            ['Verify', 'We confirm by phone or email that you manage the business.'],
            ['Keep it fresh', 'Update hours, contact details and description whenever they change.'],
          ].map(([title, text], i) => (
            <li key={title} className="text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-600 text-lg font-bold text-white">{i + 1}</span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1 text-zinc-600">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="faq" className="mx-auto max-w-3xl scroll-mt-[calc(var(--header-h)_+_1.25rem)] px-4 pb-8">
        <h2 className="section-title">Frequently asked questions</h2>
        <div className="mt-6 divide-y divide-zinc-200 rounded-2xl border border-zinc-200">
          {FAQ.map(([q, a]) => (
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
    </>
  )
}
