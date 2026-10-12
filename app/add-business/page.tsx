import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { BusinessForm } from '@/components/client'
import { CheckIcon, ChevronLeftIcon } from '@/components/icons'
import { BizImage } from '@/components/ui'
import { getBusiness, getCategoryGroups, getCities } from '@/lib/data'
import { SITE } from '@/lib/site'
import { cap, one } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Add your business for free',
  description: `List your business on ${SITE.name} for free and get found by local customers.`,
  alternates: { canonical: '/add-business' },
}

const PERKS = ['A free page for your business', 'A link to your website', 'Your hours, phone and address kept accurate', 'Customer reviews and ratings', 'Shown on category and neighbourhood pages']

// What happens after someone claims a listing: [step, detail].
const CLAIM_STEPS = [
  ['Tell us who you are', 'Fill in this short form.'],
  ['We confirm it’s you', 'With a quick call to the business, or an email.'],
  ['Keep your page up to date', 'Send us new hours, phone numbers or details any time.'],
] as const

export default function AddBusinessPage({ searchParams }: PageProps<'/add-business'>) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-zinc-100" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function Content({ searchParams }: Pick<PageProps<'/add-business'>, 'searchParams'>) {
  const sp = await searchParams
  const b = await getBusiness(one(sp.claim) ?? '')
  const [groups, allCities] = await Promise.all([getCategoryGroups(), getCities()])
  // Suggestions for the add form: the commonest categories first; cities busiest first, as name + country
  // (a name alone can be ambiguous: Spain and Venezuela both have a Valencia).
  const categories = groups.flatMap(g => g.niches.map(n => ({ label: cap(n.name), hint: g.name, count: n.count })))
    .sort((x, y) => y.count - x.count).map(({ label, hint }) => ({ label, hint }))
  const cities = allCities.map(c => ({ name: c.name, country: c.country }))

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        {b && (
          <Link href={`/biz/${b.slug}`} className="mb-4 inline-flex max-w-full items-center gap-1 text-sm font-medium text-zinc-500 hover:text-brand-700">
            <ChevronLeftIcon width={16} height={16} className="shrink-0" />
            <span className="truncate">Back to {b.title}</span>
          </Link>
        )}
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{b ? 'Claim your business' : 'Add your business'}</h1>
        <p className="mt-2 text-zinc-600">
          {b
            ? 'Confirm that you manage this business to keep its hours, phone number and other details up to date. It’s free and takes about two minutes.'
            : `Get your business in front of local customers on ${SITE.name}. It’s free and takes about two minutes.`}
        </p>
        {b && (
          <>
            <div className="card mt-6 flex items-center gap-4 p-4">
              <BizImage biz={b} className="size-14 shrink-0 rounded-lg" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{b.title}</p>
                <p className="truncate text-sm text-zinc-500">{b.address}</p>
              </div>
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              Not your business? <Link href="/search" className="font-medium text-brand-700 hover:underline">Find yours</Link> or{' '}
              <Link href="/add-business" className="font-medium text-brand-700 hover:underline">add it</Link>.
            </p>
          </>
        )}
        <div className="mt-10">
          <BusinessForm claim={b && { slug: b.slug, title: b.title, phone: b.phone }} categories={categories} cities={cities} />
        </div>
      </div>
      <aside className="h-fit rounded-2xl bg-brand-50 p-6">
        {b ? (
          <>
            <h2 className="font-semibold">How claiming works</h2>
            <ol className="mt-4 space-y-4">
              {CLAIM_STEPS.map(([step, detail], i) => (
                <li key={step} className="flex gap-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">{i + 1}</span>
                  <span>
                    <span className="block font-medium text-zinc-900">{step}</span>
                    <span className="text-zinc-600">{detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
            <h2 className="font-semibold">What you get</h2>
            <ul className="mt-4 space-y-3">
              {PERKS.map(p => (
                <li key={p} className="flex items-start gap-2 text-sm text-zinc-700">
                  <CheckIcon width={18} height={18} className="mt-0.5 shrink-0 text-brand-600" /> {p}
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-6 text-xs text-zinc-500">
          {b ? 'Claiming is free. Rankings are never for sale.' : 'Rankings are never for sale: paying only gets a listing live sooner.'}
        </p>
      </aside>
    </div>
  )
}
