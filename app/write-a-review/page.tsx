import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { RatingLine } from '@/components/biz'
import { ReviewForm } from '@/components/client'
import { FindBusiness } from '@/components/FindBusiness'
import { BizImage } from '@/components/ui'
import { getBusiness } from '@/lib/data'
import { one } from '@/lib/utils'

export const metadata: Metadata = { title: 'Write a review', robots: { index: false, follow: true } }

export default function WriteReviewPage({ searchParams }: PageProps<'/write-a-review'>) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-zinc-100" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

const GUIDELINES = [
  'Write about your own, first-hand experience.',
  'Be specific: what you bought, how the service was, what it cost.',
  'Keep it respectful. No hate speech, threats or personal details.',
  'Don’t review your own business or a competitor’s.',
]

async function Content({ searchParams }: Pick<PageProps<'/write-a-review'>, 'searchParams'>) {
  const sp = await searchParams
  const b = await getBusiness(one(sp.biz) ?? '')

  if (!b) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find a business to review</h1>
        <p className="mt-2 text-zinc-600">Your review helps people in your area choose with confidence.</p>
        <div className="mt-8">
          <FindBusiness action="/write-a-review" find={one(sp.find)} hrefFor={slug => `/write-a-review?biz=${slug}`} cta="Review" />
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
      <div>
        <Link href={`/biz/${b.slug}`} className="card flex items-center gap-4 p-4 hover:bg-zinc-50">
          <BizImage biz={b} className="size-16 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{b.title}</p>
            <p className="truncate text-sm text-zinc-500">{b.address}</p>
            <div className="mt-1"><RatingLine b={b} size={14} /></div>
          </div>
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-tight">Write a review</h1>
        <div className="mt-6">
          <ReviewForm slug={b.slug} title={b.title} />
        </div>
      </div>
      <aside className="card h-fit p-6">
        <h2 className="font-semibold">Review guidelines</h2>
        <ul className="mt-3 space-y-3 text-sm text-zinc-600">
          {GUIDELINES.map(g => <li key={g} className="flex gap-2"><span className="text-brand-600">•</span>{g}</li>)}
        </ul>
        <Link href="/about#guidelines" className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline">Read the full guidelines</Link>
      </aside>
    </div>
  )
}
