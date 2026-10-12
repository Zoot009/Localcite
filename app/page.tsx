import { ArrowRight, ArrowUpRight, BadgeCheck, Clock, Globe2, MapPin, Quote, Scale, Store } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { BizCard } from '@/components/biz'
import { CategoryIcon, GroupIcon } from '@/components/CategoryIcon'
import { HeroMarquee, NearbyMarquee } from '@/components/HeroMarquee'
import { Tabs } from '@/components/client'
import { GlobeIcon, PhoneIcon } from '@/components/icons'
import { BizImage, CityTile, SearchForm, SectionHeader, Stars } from '@/components/ui'
import { getCategoryGroups, getCities, getHeroPicks, getHighlights, getTopRated } from '@/lib/data'
import { SITE } from '@/lib/site'
import type { Business } from '@/lib/types'
import { cap, cityName, plural } from '@/lib/utils'

const fmt = (n: number) => n.toLocaleString('en-US')

// Quick searches under the hero search box: a spread of everyday needs.
const QUICK = ['restaurant', 'hotel', 'dentist', 'hair salon', 'plumber']

// "Top picks" tabs: [label, category slug].
const PICKS = [
  ['Restaurants', 'restaurant'],
  ['Cafés', 'cafe'],
  ['Hotels', 'hotel'],
  ['Bars', 'bar'],
  ['Bakeries', 'bakery'],
] as const

const WHY = [
  { Icon: Scale, title: 'Honest rankings', text: 'Places are ordered by rating and review count. Nobody can pay to move up, and there are no ads.' },
  { Icon: Clock, title: 'Everything at a glance', text: 'Opening hours, phone numbers, websites, amenities and directions on one clean page.' },
  { Icon: Globe2, title: 'Local, everywhere', text: 'From Tokyo to Toronto: neighbourhood-level lists for hundreds of cities around the world.' },
]

export default async function Home() {
  const [cities, groups, worldPicks, highlights, ...picks] = await Promise.all([
    getCities(),
    getCategoryGroups(),
    getHeroPicks(),
    getHighlights(3, undefined, ['restaurant', 'cafe', 'hotel', 'bar']),
    ...PICKS.map(([, slug]) => getTopRated(8, undefined, [slug])),
  ])
  // Autocomplete: the quick picks first, then everything else by how many places it has; cities busiest first.
  const quickRank = (name: string) => {
    const i = QUICK.indexOf(name)
    return i < 0 ? QUICK.length : i
  }
  const suggest = {
    what: groups
      .flatMap(g => g.niches.map(n => ({ name: n.name, count: n.count, hint: g.name })))
      .sort((a, b) => quickRank(a.name) - quickRank(b.name) || b.count - a.count)
      .map(n => ({ label: cap(n.name), hint: n.hint })),
    where: cities.map(c => ({ label: c.name, hint: c.country })),
  }
  const stats = [
    { Icon: Store, value: '200,000+', label: 'businesses listed' },
    { Icon: MapPin, value: '500+', label: 'cities covered' },
    { Icon: BadgeCheck, value: '100+', label: 'categories' },
  ]

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-x-clip bg-brand-950">
        {/* Background: a looping night-street video (public/hero.mp4, Mixkit free licence; off for reduced motion).
            Grey-scaled and blended by luminosity into the indigo, so it reads as one brand colour instead of mixing
            its orange lights with the tint. Darker on the left where the text sits, then the brand glows. */}
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden bg-brand-950">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="/hero.jpg"
            className="absolute inset-0 size-full object-cover opacity-50 mix-blend-luminosity contrast-125 grayscale motion-reduce:hidden"
          >
            <source src="/hero.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-r from-brand-950/80 via-brand-950/30 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(50rem_30rem_at_15%_0%,var(--glow-accent),transparent_70%),radial-gradient(40rem_30rem_at_90%_30%,var(--glow-brand),transparent_70%),radial-gradient(30rem_18rem_at_55%_100%,var(--glow-warm),transparent_70%)] opacity-60" />
        </div>

        {/* Always dark: keeps the light-theme colours in dark mode too (see the theme notes in globals.css). */}
        <div data-theme="light" className="mx-auto grid max-w-7xl items-center gap-14 px-4 pt-16 pb-6 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <h1 className="text-[2.6rem] leading-[1.05] font-bold text-balance text-white sm:text-6xl lg:text-[4.2rem]">
              Find the best local spots, <span className="bg-gradient-to-r from-brand-300 to-accent-300 bg-clip-text text-transparent">anywhere you go.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-pretty text-brand-100/80">
              Compare ratings, opening hours and contact details for restaurants, clinics, salons, repair shops and every other kind of local business.
            </p>
            <div className="mt-9 max-w-2xl">
              <SearchForm variant="hero" suggest={suggest} />
            </div>
            <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="text-brand-100/50">Try:</span>
              {QUICK.map(name => (
                <Link
                  key={name}
                  href={`/search?q=${encodeURIComponent(name)}`}
                  className="inline-flex items-center gap-1.5 text-brand-100/85 underline-offset-4 transition hover:text-white hover:underline"
                >
                  <CategoryIcon name={name} mono size={15} className="text-brand-200" />
                  {cap(plural(name))}
                </Link>
              ))}
            </p>
          </div>

          {/* Moving photo columns: worldwide picks right away, then places near the visitor stream in. */}
          <Suspense fallback={<HeroMarquee picks={worldPicks.picks} />}>
            <NearbyMarquee />
          </Suspense>
        </div>

        {/* Stats strip: inside the hero so the search dropdown can sit on top of it; hangs half below. */}
        <div className="relative z-10 mx-auto max-w-6xl translate-y-1/2 px-4">
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-zinc-200 shadow-xl shadow-zinc-900/5 ring-1 ring-zinc-200">
          {stats.map(({ Icon, value, label }) => (
            <div key={label} className="flex items-center gap-4 bg-surface px-4 py-4 sm:px-6 sm:py-5">
              <span className="hidden size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 sm:grid"><Icon size={22} /></span>
              <div>
                <dd className="font-display text-xl font-bold text-zinc-900 sm:text-2xl">{value}</dd>
                <dt className="text-sm text-zinc-500">{label}</dt>
              </div>
            </div>
          ))}
        </dl>
        </div>
      </section>

      {/* ---------- Categories ---------- */}
      <section className="mx-auto max-w-7xl px-4 pt-24 pb-20">
        <SectionHeader eyebrow="Browse" title="What are you looking for?" sub="Every kind of local business, grouped the way you search" href="/categories" linkText="All categories" />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {groups.slice(0, 8).map(g => (
            <div
              key={g.slug}
              className="group/card card relative flex flex-col p-4 transition duration-200 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-xl hover:shadow-brand-600/10 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <GroupIcon group={g.name} size={48} />
                <span className="hidden size-8 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition group-hover/card:bg-brand-600 group-hover/card:text-white sm:grid">
                  <ArrowUpRight size={16} />
                </span>
              </div>
              <h3 className="mt-4 leading-tight font-semibold text-zinc-900 sm:text-lg">
                {/* Stretched link: the whole card opens the group; the chips below sit above it. */}
                <Link href={`/categories#${g.slug}`} className="after:absolute after:inset-0 after:rounded-2xl">{g.name}</Link>
              </h3>
              <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
                {fmt(g.niches.reduce((s, n) => s + n.count, 0))} places · {g.niches.length} categories
              </p>
              <div className="relative mt-4 hidden flex-wrap gap-1.5 sm:flex">
                {[...g.niches].sort((a, b) => b.count - a.count).slice(0, 4).map(n => (
                  <Link
                    key={n.slug}
                    href={`/search?q=${encodeURIComponent(n.name)}`}
                    className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-brand-50 hover:text-brand-800"
                  >
                    {cap(plural(n.name))}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Top picks ---------- */}
      <section className="bg-zinc-50 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeader eyebrow="Top picks" title="Highest-rated around the world" sub="Ranked by rating and number of reviews" />
          <div className="mt-8">
            <Tabs
              labels={PICKS.map(([label, slug]) => (
                <span key={slug} className="inline-flex items-center gap-2">
                  <CategoryIcon name={slug} mono size={16} />
                  {label}
                </span>
              ))}
              panels={PICKS.map(([label, slug], i) => (
                <div key={slug}>
                  <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
                    {picks[i].map(b => <BizCard key={b.key} b={b} />)}
                  </div>
                  <Link href={`/search?q=${encodeURIComponent(slug)}&sort=rating`} className="btn btn-outline mt-10">
                    More top {label.toLowerCase()} <ArrowRight size={16} />
                  </Link>
                </div>
              ))}
            />
          </div>
        </div>
      </section>

      {/* ---------- Cities ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <SectionHeader eyebrow="Destinations" title="Explore popular cities" sub="Top-rated businesses, neighbourhood by neighbourhood" href="/cities" linkText={`All ${cities.length} cities`} />
        <div className="mt-10 grid auto-rows-[15rem] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cities.slice(0, 5).map((c, i) => <CityTile key={c.slug} c={c} big={i === 0} />)}
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {cities.slice(5, 23).map(c => (
            <Link key={c.slug} href={`/${c.slug}`} className="chip">
              {c.name} <span className="text-zinc-400">{c.country}</span>
            </Link>
          ))}
          <Link href="/cities" className="chip chip-active">
            All {cities.length} cities <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ---------- Review highlights ---------- */}
      {highlights.length > 0 && (
        <section data-theme="light" className="bg-brand-950 py-20 text-white">
          <div className="mx-auto max-w-7xl px-4">
            <p className="eyebrow text-brand-200">In their words</p>
            <h2 className="section-title mt-2 text-white">What people love about these places</h2>
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {highlights.map(({ business: b, review }) => (
                <figure key={b.key} className="relative flex flex-col rounded-2xl bg-white/[0.06] p-7 ring-1 ring-white/10">
                  <Quote aria-hidden size={36} className="text-accent-400/70" />
                  <blockquote className="mt-4 flex-1 font-display text-xl leading-snug text-white">“{review.snippet}”</blockquote>
                  <figcaption className="mt-8 flex items-center gap-3 border-t border-white/10 pt-5">
                    <BizImage biz={b} w={120} h={120} className="size-12 shrink-0 rounded-full" />
                    <div className="min-w-0">
                      <Link href={`/biz/${b.slug}`} className="block truncate font-semibold hover:underline">{b.title}</Link>
                      <div className="mt-0.5 flex items-center gap-2 text-sm text-brand-100/70">
                        <Stars rating={b.rating} size={13} /> {cityName(b.city)}
                      </div>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- Why ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="max-w-2xl">
          <p className="eyebrow">Why {SITE.name}</p>
          <h2 className="section-title mt-2">A directory built for people, not advertisers</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {WHY.map(({ Icon, title, text }) => (
            <div key={title} className="card p-7">
              <span className="grid size-12 place-items-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/25"><Icon size={22} /></span>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 leading-relaxed text-zinc-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- For business owners ---------- */}
      <section className="mx-auto max-w-7xl px-4 pb-8">
        <div data-theme="light" className="relative isolate grid items-center gap-12 overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 to-brand-950 p-8 text-white sm:p-14 lg:grid-cols-2">
          <div aria-hidden className="absolute -top-24 -right-24 -z-10 size-96 rounded-full bg-accent-400/30 blur-3xl" />
          <div>
            <p className="eyebrow text-brand-200">For business owners</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Your business is probably already here. Make it shine.</h2>
            <p className="mt-4 max-w-lg text-brand-100/85">
              Claim your free listing to keep your address, phone number and hours accurate, link customers straight to your website, and
              show off your ratings. No fees, no ads, no catch.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/for-business" className="btn bg-white px-6 py-3 text-brand-800 hover:bg-brand-50">Claim your business</Link>
              <Link href="/add-business" className="btn px-6 py-3 text-white ring-1 ring-white/30 hover:bg-white/10">Add a new business</Link>
            </div>
          </div>
          <ListingPreview />
        </div>
      </section>
    </>
  )
}

// What a claimed listing looks like. Static, illustrative markup.
function ListingPreview() {
  const rows = [
    { Icon: GlobeIcon, text: 'yourbusiness.com', cls: 'text-brand-700' },
    { Icon: PhoneIcon, text: '+1 555 0100', cls: 'text-zinc-700' },
    { Icon: MapPin, text: '12 Main Street, Downtown', cls: 'text-zinc-700' },
  ]
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-4 -z-10 rotate-3 rounded-3xl bg-white/10" />
      <div className="rounded-3xl bg-white p-6 text-zinc-900 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100 ring-inset">
            <Store size={26} />
          </span>
          <div>
            <p className="flex items-center gap-1.5 font-display text-lg font-bold">
              Your Business <BadgeCheck size={18} className="text-brand-600" />
            </p>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Stars rating={4.8} size={14} /> 4.8 · 236 reviews
            </div>
          </div>
        </div>
        <div className="mt-5 space-y-2.5 text-sm">
          {rows.map(({ Icon, text, cls }) => (
            <div key={text} className="flex items-center gap-3 rounded-xl bg-zinc-50 px-3.5 py-2.5">
              <Icon width={16} height={16} className="text-zinc-400" />
              <span className={cls}>{text}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm">
          <span className="font-medium text-emerald-700">Open now</span>
          <span className="text-emerald-700/80">9 am – 9 pm</span>
        </div>
      </div>
    </div>
  )
}
