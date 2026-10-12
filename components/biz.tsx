import Link from 'next/link'
import type { Business, Review } from '@/lib/types'
import { cityName, featureLabel, formatDate } from '@/lib/utils'
import { CheckIcon, PinIcon, StarIcon, ThumbsUpIcon } from './icons'
import { Avatar, BizImage, Stars } from './ui'

const n = (x = 0) => x.toLocaleString('en-US')

export function RatingLine({ b, size = 16, light = false }: { b: Business; size?: number; light?: boolean }) {
  if (!b.rating) return <p className={`text-sm ${light ? 'text-white/80' : 'text-zinc-500'}`}>No reviews yet</p>
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <Stars rating={b.rating} size={size} />
      <span className={`font-semibold ${light ? 'text-white' : 'text-zinc-900'}`}>{b.rating.toFixed(1)}</span>
      <span className={light ? 'text-white/80' : 'text-zinc-500'}>({n(b.reviews)} reviews)</span>
    </div>
  )
}

// Search / "best of" row, in the style of a directory result.
export function BizResult({ b, rank }: { b: Business; rank?: number }) {
  const features = Object.entries(b.service_options ?? {}).filter(([, v]) => v).slice(0, 3)
  const snippet = b.user_review ?? b.description
  return (
    <article data-biz={b.key} className="card flex gap-4 p-4 transition-shadow hover:shadow-lg hover:shadow-zinc-200/60 sm:gap-5 sm:p-5">
      <Link href={`/biz/${b.slug}`} tabIndex={-1} className="shrink-0">
        <BizImage biz={b} className="size-24 rounded-xl sm:size-40" />
      </Link>
      <div className="min-w-0 flex-1">
        <h3 className="text-lg leading-snug font-bold">
          <Link href={`/biz/${b.slug}`} className="hover:underline">
            {rank ? `${rank}. ` : ''}
            {b.title}
          </Link>
        </h3>
        <div className="mt-1.5">
          <RatingLine b={b} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-zinc-600">
          {b.categories.slice(0, 2).map(c => (
            <span key={c} className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{c}</span>
          ))}
          {b.price && <span>{b.price}</span>}
          {b.area && (
            <span className="flex items-center gap-1">
              <PinIcon width={14} height={14} className="text-zinc-400" /> {b.area}
            </span>
          )}
        </div>
        {snippet && <p className="mt-3 line-clamp-2 text-sm text-zinc-700">{snippet}</p>}
        {features.length > 0 && (
          <ul className="mt-3 hidden flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-700 sm:flex">
            {features.map(([k]) => (
              <li key={k} className="flex items-center gap-1">
                <CheckIcon width={16} height={16} className="text-brand-600" />
                {featureLabel(k)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}

// Photo-first card: rating pill on the photo, name and place underneath.
export function BizCard({ b }: { b: Business }) {
  return (
    <Link href={`/biz/${b.slug}`} className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-zinc-900/5">
        <BizImage biz={b} className="h-full w-full transition duration-500 group-hover:scale-105" />
        {b.rating ? (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-semibold text-zinc-900 shadow-sm backdrop-blur">
            <StarIcon width={12} height={12} className="text-star" /> {b.rating.toFixed(1)}
          </span>
        ) : null}
      </div>
      <div className="mt-3 px-0.5">
        <h3 className="truncate font-semibold text-zinc-900 group-hover:text-brand-700">{b.title}</h3>
        <p className="mt-0.5 truncate text-sm text-zinc-500">{[b.categories[0], b.area ?? cityName(b.city)].filter(Boolean).join(' · ')}</p>
        {b.reviews ? <p className="mt-0.5 text-sm text-zinc-500">{n(b.reviews)} reviews</p> : null}
      </div>
    </Link>
  )
}

export function ReviewCard({ review }: { review: Review }) {
  const name = review.user?.name ?? 'Anonymous'
  const stats = [review.user?.reviews && `${n(review.user.reviews)} reviews`, review.user?.photos && `${n(review.user.photos)} photos`].filter(Boolean)
  return (
    <article className="border-b border-zinc-200 py-6 last:border-0">
      <header className="flex items-center gap-3">
        <Avatar name={name} src={review.user?.thumbnail} />
        <div>
          <p className="font-semibold">
            {name}
            {review.user?.local_guide && <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700">Local Guide</span>}
          </p>
          {stats.length > 0 && <p className="text-xs text-zinc-500">{stats.join(' · ')}</p>}
        </div>
      </header>
      <div className="mt-3 flex items-center gap-2 text-sm">
        <Stars rating={review.rating} size={16} />
        <span className="text-zinc-500">{formatDate(review.iso_date) || review.date}</span>
      </div>
      {review.snippet && <p className="mt-2 leading-relaxed whitespace-pre-line text-zinc-800">{review.snippet}</p>}
      {!!review.images?.length && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {review.images.slice(0, 4).map(src => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-28 shrink-0 rounded-lg object-cover" />
          ))}
        </div>
      )}
      {review.response?.snippet && (
        <div className="mt-4 rounded-xl border-l-4 border-brand-600 bg-zinc-50 p-4 text-sm">
          <p className="font-semibold">
            Response from the owner <span className="font-normal text-zinc-500">{formatDate(review.response.iso_date) || review.response.date}</span>
          </p>
          <p className="mt-1 text-zinc-700">{review.response.snippet}</p>
        </div>
      )}
      <footer className="mt-3 flex items-center gap-4 text-sm text-zinc-500">
        <span className="flex items-center gap-1.5">
          <ThumbsUpIcon width={15} height={15} /> Helpful{review.likes ? ` (${review.likes})` : ''}
        </span>
        {review.source && <span>Review from {review.source}</span>}
      </footer>
    </article>
  )
}

// "Recent activity" card on the home and city pages.
export function ActivityCard({ business, review }: { business: Business; review: Review }) {
  const name = review.user?.name ?? 'Customer review'
  const when = formatDate(review.iso_date) || review.date
  return (
    <article className="card flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <Avatar name={name} src={review.user?.thumbnail} size={40} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-xs text-zinc-500">{when ? `Wrote a review · ${when}` : `Highlight from ${review.source ?? 'reviews'}`}</p>
        </div>
      </div>
      <Link href={`/biz/${business.slug}`} tabIndex={-1}>
        <BizImage biz={business} className="h-36 w-full" />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/biz/${business.slug}`} className="truncate font-semibold hover:underline">{business.title}</Link>
        <div className="mt-1">
          <Stars rating={review.rating} size={14} />
        </div>
        <p className="mt-2 line-clamp-3 flex-1 text-sm text-zinc-700">{review.snippet}</p>
        <Link href={`/biz/${business.slug}#reviews`} className="mt-3 text-sm font-semibold text-brand-700 hover:underline">Continue reading</Link>
      </div>
    </article>
  )
}

export function RatingSummary({ b, counts }: { b: Business; counts: number[] }) {
  const max = Math.max(1, ...counts)
  const hasBreakdown = counts.some(Boolean) // only when per-star data was scraped
  return (
    <div className={hasBreakdown ? 'grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10' : ''}>
      <div>
        <p className="text-5xl font-bold tracking-tight">{(b.rating ?? 0).toFixed(1)}</p>
        <div className="mt-2">
          <Stars rating={b.rating} size={20} />
        </div>
        <p className="mt-1 text-sm text-zinc-500">{n(b.reviews)} reviews</p>
      </div>
      {hasBreakdown && <ul className="space-y-1.5">
        {counts.map((c, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span className="w-12 shrink-0 text-zinc-600">{5 - i} star</span>
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
              <span className="block h-full rounded-full bg-star" style={{ width: `${(c / max) * 100}%` }} />
            </span>
            <span className="w-12 shrink-0 text-right text-zinc-500 tabular-nums">{n(c)}</span>
          </li>
        ))}
      </ul>}
    </div>
  )
}
