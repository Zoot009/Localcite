import type { Metadata } from 'next'
import { Suspense } from 'react'
import { BusinessForm } from '@/components/client'
import { CheckIcon } from '@/components/icons'
import { BizImage } from '@/components/ui'
import { getBusiness, getCategoryGroups } from '@/lib/data'
import { SITE } from '@/lib/site'
import { one } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Add your business for free',
  description: `List your business on ${SITE.name} for free and get found by local customers.`,
  alternates: { canonical: '/add-business' },
}

const PERKS = ['Free listing, forever', 'A link to your website', 'Your hours, phone and address kept accurate', 'Customer reviews and ratings', 'Shown on category and neighbourhood pages']

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
  const niches = (await getCategoryGroups()).flatMap(g => g.niches.map(n => n.name))

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{b ? `Claim ${b.title}` : 'Add your business'}</h1>
        <p className="mt-2 text-zinc-600">
          {b
            ? 'Tell us who you are and we’ll verify that you manage this business. Claiming is free.'
            : `Get your business in front of local customers on ${SITE.name}. It’s free and takes about two minutes.`}
        </p>
        {b && (
          <div className="card mt-6 flex items-center gap-4 p-4">
            <BizImage biz={b} className="size-14 shrink-0 rounded-lg" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{b.title}</p>
              <p className="truncate text-sm text-zinc-500">{b.address}</p>
            </div>
          </div>
        )}
        <div className="mt-10">
          <BusinessForm claim={b && { slug: b.slug, title: b.title }} niches={niches} />
        </div>
      </div>
      <aside className="h-fit rounded-2xl bg-brand-50 p-6">
        <h2 className="font-semibold">What you get</h2>
        <ul className="mt-4 space-y-3">
          {PERKS.map(p => (
            <li key={p} className="flex items-start gap-2 text-sm text-zinc-700">
              <CheckIcon width={18} height={18} className="mt-0.5 shrink-0 text-brand-600" /> {p}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-zinc-500">We never charge for listings or sell higher rankings.</p>
      </aside>
    </div>
  )
}
