import { ArrowRight } from 'lucide-react'
import Form from 'next/form'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { SITE } from '@/lib/site'
import type { Business, City } from '@/lib/types'
import { photoSize, safeUrl } from '@/lib/utils'
import { Autocomplete, type Option } from './Autocomplete'
import { categoryStyle } from './CategoryIcon'
import { ChevronRightIcon, PinIcon, SearchIcon, StarIcon } from './icons'

export function Stars({ rating = 0, size = 18 }: { rating?: number; size?: number }) {
  const row = (cls: string) => (
    <span className={`flex w-max gap-0.5 ${cls}`}>
      {[0, 1, 2, 3, 4].map(i => <StarIcon key={i} width={size} height={size} />)}
    </span>
  )
  return (
    <span className="relative inline-flex shrink-0" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {row('text-zinc-200')}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${(rating / 5) * 100}%` }}>
        {row('text-star')}
      </span>
    </span>
  )
}

const hue = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)

// Business photo, or a neutral tile with the category icon when there's no photo yet.
// `eager` for above-the-fold photos; everything else lazy-loads.
export function BizImage({ biz, className = '', src, w = 600, h = 450, eager = false }: { biz: Business; className?: string; src?: string; w?: number; h?: number; eager?: boolean }) {
  const url = safeUrl(src ?? biz.thumbnail ?? biz.images?.[0]?.thumbnail)
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- remote Google photos; no optimiser config needed
    return <img src={photoSize(url, w, h)} alt={biz.title} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} referrerPolicy="no-referrer" className={`object-cover ${className}`} />
  }
  // No photo: a quiet tile with the category's icon.
  const { Icon } = categoryStyle(biz.categories[0] ?? biz.niches[0] ?? '')
  return (
    <div aria-hidden className={`grid place-items-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-400 ${className}`}>
      <Icon className="h-2/5 max-h-20 w-2/5 max-w-20" strokeWidth={1.5} />
    </div>
  )
}

export function Avatar({ name, src, size = 44 }: { name: string; src?: string; size?: number }) {
  const url = safeUrl(src)
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} referrerPolicy="no-referrer" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  }
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: `hsl(${hue(name)} 45% 45%)` }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}

// `light`: white text for use over a photo. There the current page's name is left out on phones,
// since the big title right below already shows it.
export function Breadcrumbs({ items, light = false }: { items: { name: string; href?: string }[]; light?: boolean }) {
  return (
    <nav aria-label="Breadcrumb" className={`text-sm ${light ? 'text-white/85 [text-shadow:0_1px_3px_rgb(0_0_0/0.6)]' : 'text-zinc-500'}`}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={i} className={`flex items-center gap-1 ${light && !it.href ? 'max-sm:hidden' : ''}`}>
            {i > 0 && <ChevronRightIcon width={14} height={14} className={light ? 'text-white/50' : 'text-zinc-400'} />}
            {it.href ? (
              <Link href={it.href} className={light ? 'hover:text-white hover:underline' : 'hover:text-brand-700 hover:underline'}>{it.name}</Link>
            ) : (
              <span aria-current="page" className={light ? 'font-medium text-white' : 'text-zinc-700'}>{it.name}</span>
            )}
          </li>
        ))}
      </ol>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, ...(it.href && { item: SITE.url + it.href }) })),
        }}
      />
    </nav>
  )
}

// Example searches that take turns in the empty "what" field: whole ideas in the big boxes, single words in the
// narrow header box. Eight of each, because the keyframes in globals.css count on it.
const PHRASES = [
  'Cosy cafés with fast Wi-Fi',
  'Rooftop bars open late',
  'Dentists open on Saturdays',
  'Plumbers available today',
  'Barbers for a sharp fade',
  'Hotels in the city centre',
  'Spas for a relaxing day',
  'Restaurants with a terrace',
]
const WORDS = ['Dentists', 'Cafés', 'Plumbers', 'Hotels', 'Hair salons', 'Restaurants', 'Bars', 'Spas']

// Stands in for the placeholder: the examples slide up one after another. It shows only while the field is empty
// (it follows the input, a `peer`), pauses while the field has focus, and stays still for reduced motion.
// Each example has its own animation, started 3s after the one before: it rises in and fades in while the previous one
// rises out and fades out. Only `translate` and `opacity` move, so the graphics card does the work and the main
// thread can't make it stutter. With reduced motion, the first example just stands still.
function RollingPlaceholder({ items }: { items: string[] }) {
  return (
    <span aria-hidden className="pointer-events-none relative hidden h-[1.5em] min-w-0 overflow-hidden leading-[1.5em] text-zinc-500 [grid-area:1/1] self-center peer-placeholder-shown:block">
      {items.map((text, i) => (
        <span
          key={text}
          style={{ animationDelay: `${i * 3}s` }}
          className={`absolute inset-x-0 top-0 translate-y-full truncate opacity-0 animate-placeholder group-focus-within/what:[animation-play-state:paused] motion-reduce:animate-none ${
            i === 0 ? 'motion-reduce:translate-y-0 motion-reduce:opacity-100' : ''
          }`}
        >
          {text}
        </span>
      ))}
    </span>
  )
}

// `suggest` turns both fields into autocompletes (categories and cities, most popular first).
export function SearchForm({ variant = 'page', q, loc, suggest }: { variant?: 'hero' | 'header' | 'page'; q?: string; loc?: string; suggest?: { what: Option[]; where: Option[] } }) {
  const hero = variant === 'hero'
  const header = variant === 'header'
  const field = hero ? 'px-5 py-4 text-base' : header ? 'px-4 py-1 text-sm' : 'px-4 py-3'
  const input = 'w-full min-w-0 bg-transparent outline-none placeholder:text-zinc-500'
  const ids = { q: `${variant}-q`, loc: `${variant}-loc` }
  const shell = {
    hero: 'flex-col bg-white rounded-2xl shadow-2xl shadow-black/20 sm:flex-row sm:rounded-full',
    // Header: a soft grey pill that turns white with a brand ring while you type.
    header: 'h-11 items-center rounded-full bg-zinc-100 ring-1 ring-zinc-200/70 transition focus-within:bg-white focus-within:shadow-lg focus-within:shadow-brand-600/10 focus-within:ring-brand-300',
    page: 'bg-white rounded-xl border border-zinc-300 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100',
  }[variant]
  return (
    <Form action="/search" role="search" className={`flex w-full ${shell}`}>
      <div className={`relative flex min-w-0 flex-1 items-center gap-2.5 ${hero ? 'sm:flex-[1.6]' : ''} ${field}`}>
        <label htmlFor={ids.q} className="shrink-0 cursor-text text-zinc-400">
          <SearchIcon />
          <span className="sr-only">Find</span>
        </label>
        {/* The input and its rolling placeholder share one grid cell. The real placeholder is a space, so the input
            still knows when it's empty (:placeholder-shown). */}
        <div className="group/what grid min-w-0 flex-1">
          {suggest ? (
            <Autocomplete id={ids.q} name="q" kind="what" options={suggest.what} defaultValue={q} placeholder=" " className={`peer ${input} [grid-area:1/1]`} />
          ) : (
            <input id={ids.q} name="q" defaultValue={q} placeholder=" " className={`peer ${input} [grid-area:1/1]`} />
          )}
          <RollingPlaceholder items={header ? WORDS : PHRASES} />
        </div>
      </div>
      <div className={`relative flex min-w-0 flex-1 items-center gap-2.5 ${header ? 'border-zinc-300' : 'border-zinc-200'} ${field} ${hero ? 'border-t sm:border-t-0 sm:border-l' : 'border-l'}`}>
        <label htmlFor={ids.loc} className="shrink-0 cursor-text text-zinc-400">
          <PinIcon />
          <span className="sr-only">Near</span>
        </label>
        {suggest ? (
          <Autocomplete id={ids.loc} name="loc" kind="where" options={suggest.where} defaultValue={loc} placeholder="City or area" className={input} locate />
        ) : (
          <input id={ids.loc} name="loc" defaultValue={loc} placeholder="City or area" className={input} />
        )}
      </div>
      <button
        type="submit"
        aria-label="Search"
        className={`flex shrink-0 items-center justify-center gap-2 bg-brand-600 font-semibold text-white transition-colors hover:bg-brand-700 ${
          hero ? 'm-2 rounded-xl px-8 py-3 sm:rounded-full lg:max-xl:px-4' : header ? 'mr-1 size-9 rounded-full' : '-my-px -mr-px rounded-r-xl px-4'
        }`}
      >
        <SearchIcon width={18} height={18} />
        {/* Next to the photo columns (1024–1279px) the box is narrow: icon only, so the examples fit. */}
        {hero && <span className="lg:max-xl:sr-only">Search</span>}
      </button>
    </Form>
  )
}

export function SectionHeader({ title, sub, href, linkText = 'See all', eyebrow }: { title: string; sub?: ReactNode; href?: string; linkText?: string; eyebrow?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="section-title">{title}</h2>
        {sub && <p className="mt-1 text-zinc-600">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
          {linkText} <ChevronRightIcon width={16} height={16} />
        </Link>
      )}
    </div>
  )
}

// A city photo card: the home page's bento and the cities page. `big` spans two columns and two rows.
export function CityTile({ c, big = false, className = '' }: { c: City; big?: boolean; className?: string }) {
  return (
    <Link href={`/${c.slug}`} className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-900 ring-1 ring-zinc-900/5 ${big ? 'sm:col-span-2 lg:row-span-2' : ''} ${className}`}>
      {c.photo && (
        // eslint-disable-next-line @next/next/no-img-element -- remote Google photo
        <img src={photoSize(c.photo, big ? 1200 : 700, big ? 900 : 500)} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-6">
        <div>
          <p className="text-xs font-medium tracking-wide text-white/75 uppercase">{c.country}</p>
          <p className={`font-display font-bold ${big ? 'text-4xl' : 'text-2xl'}`}>{c.name}</p>
          <p className="mt-0.5 text-sm text-white/80">{c.count.toLocaleString('en-US')} places · {c.categories} categories</p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur transition group-hover:bg-white group-hover:text-zinc-900">
          <ArrowRight size={18} />
        </span>
      </div>
    </Link>
  )
}
