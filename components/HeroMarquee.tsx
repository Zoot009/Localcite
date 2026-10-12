import Link from 'next/link'
import { getHeroPicks } from '@/lib/data'
import { visitorGeo } from '@/lib/geo'
import type { Business } from '@/lib/types'
import { cityName } from '@/lib/utils'
import { PinIcon, StarIcon } from './icons'
import { BizImage } from './ui'

// Personalised version: reads the visitor's location, so the page streams it in after the static shell.
export async function NearbyMarquee() {
  const { country, city } = await visitorGeo()
  const { picks, place } = await getHeroPicks(country, city)
  return <HeroMarquee picks={picks} place={place} />
}

// Two columns of photo tiles drifting in opposite directions (CSS only; pauses on hover, off for reduced motion).
export function HeroMarquee({ picks, place }: { picks: Business[]; place?: string }) {
  const half = Math.ceil(picks.length / 2)
  return (
    <div className="group relative hidden lg:block">
      <div aria-hidden className="absolute -inset-10 bg-[radial-gradient(closest-side,rgb(139_92_246/0.25),transparent)]" />
      <div className="relative grid h-[34rem] grid-cols-2 gap-4 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
        <Column items={picks.slice(0, half)} direction="up" />
        <Column items={picks.slice(half)} direction="down" />
      </div>
      {/* A caption under the photos, so nothing sits on top of them. */}
      <p className="relative mt-3 flex items-center justify-center gap-1.5 text-sm text-brand-100/70">
        <PinIcon width={14} height={14} className="text-accent-300" />
        <span>{place ? <>Top picks in <span className="font-semibold text-white">{place}</span></> : 'Top picks worldwide'}</span>
      </p>
    </div>
  )
}

function Column({ items, direction }: { items: Business[]; direction: 'up' | 'down' }) {
  return (
    <div
      className={`${direction === 'up' ? 'animate-marquee-up' : 'animate-marquee-down'} group-hover:[animation-play-state:paused] motion-reduce:animate-none`}
    >
      {/* The list twice, back to back: sliding by half its height lands exactly where it started. */}
      {[...items, ...items].map((b, i) => (
        <div key={i} className="pb-4" aria-hidden={i >= items.length}>
          <Tile b={b} hidden={i >= items.length} />
        </div>
      ))}
    </div>
  )
}

function Tile({ b, hidden }: { b: Business; hidden: boolean }) {
  return (
    <Link
      href={`/biz/${b.slug}`}
      tabIndex={hidden ? -1 : undefined}
      className="group/tile relative block h-[11rem] overflow-hidden rounded-2xl shadow-2xl shadow-black/30 ring-1 ring-white/10"
    >
      <BizImage biz={b} w={600} h={420} eager className="h-full w-full transition duration-700 group-hover/tile:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
        <p className="truncate text-sm font-semibold">{b.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/80">
          <StarIcon width={12} height={12} className="text-star" /> {b.rating?.toFixed(1)} · {cityName(b.city)}
        </p>
      </div>
    </Link>
  )
}
