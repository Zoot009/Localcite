import { ArrowRight, ArrowUpRight, BadgeCheck, Clock, Globe2, MapPin, Quote, Scale, Store } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { BizCard } from '@/components/biz'
import { CategoryIcon } from '@/components/CategoryIcon'
import { HeroMarquee, NearbyMarquee } from '@/components/HeroMarquee'
import { Tabs } from '@/components/client'
import { Header } from '@/components/Header'
import { GlobeIcon, PhoneIcon } from '@/components/icons'
import { BizImage, CityTile, SearchForm, SectionHeader, Stars } from '@/components/ui'
import { getCategoryTiles, getCities, getHeroPicks, getHighlights, getReviewStats, getSearchSuggestions, getTopRated } from '@/lib/data'
import { SITE } from '@/lib/site'
import { cap, cityName, photoSize, plural } from '@/lib/utils'

const fmt = (n: number) => n.toLocaleString('en-US')

// "Explore by category" photo tiles: everyday favourites that photograph well (every category has about as many places).
const FEATURED = ['restaurant', 'cafe', 'hotel', 'bar', 'hair-salon', 'spa', 'gym', 'dentist']

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
  const [cities, suggest, worldPicks, highlights, tiles, reviews, ...picks] = await Promise.all([
    getCities(),
    getSearchSuggestions(),
    getHeroPicks(),
    getHighlights(3, undefined, ['restaurant', 'cafe', 'hotel', 'bar']),
    getCategoryTiles(FEATURED),
    getReviewStats(),
    ...PICKS.map(([, slug]) => getTopRated(8, undefined, [slug])),
  ])
  // "105,821,615" → "100M+": rounded down to a headline number, like the stats strip.
  const millions = reviews.total / 1e6
  const reviewCount = `${millions >= 100 ? Math.floor(millions / 100) * 100 : millions >= 10 ? Math.floor(millions / 10) * 10 : Math.floor(millions)}M+`
  const stats = [
    { Icon: Store, value: '200,000+', label: 'businesses listed' },
    { Icon: MapPin, value: '500+', label: 'cities covered' },
    { Icon: BadgeCheck, value: '100+', label: 'categories' },
  ]

  return (
    <>
      <Header home />
      <main className="flex-1">
        {/* ---------- Hero ---------- */}
        {/* The header lies over the top of it (<Header home /> above); the top padding below keeps the content clear of it. */}
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

          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pt-[calc(var(--header-h)_+_4.25rem)] pb-6 sm:pt-[calc(var(--header-h)_+_5.25rem)] lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <h1 className="text-[2.6rem] leading-[1.05] font-bold text-balance text-white sm:text-6xl lg:text-[4.2rem]">
                Find the best local spots, <span className="bg-gradient-to-r from-brand-300 to-accent-300 bg-clip-text text-transparent">anywhere you go.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-pretty text-brand-100/80">
                Compare ratings, opening hours and contact details for restaurants, clinics, salons, repair shops and every other kind of local business.
              </p>
              {/* Phones and tablets; on larger screens the search box is in the header. */}
              <div className="mt-9 max-w-2xl lg:hidden">
                <SearchForm variant="hero" suggest={suggest} />
              </div>
              {/* Trust row: a few top-rated places, and the reviews behind every rating. */}
              <div className="mt-8 flex items-center gap-4">
                <div className="flex shrink-0 -space-x-3">
                  {/* Five photos; three on phones, so the text beside them stays on one line each. */}
                  {worldPicks.picks.slice(0, 5).map((b, i) => (
                    <BizImage key={b.key} biz={b} w={96} h={96} className={`size-10 rounded-full ring-2 ring-brand-950 ${i >= 3 ? 'max-sm:hidden' : ''}`} />
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Stars rating={reviews.avg} size={15} /> {reviews.avg.toFixed(1)} average rating
                  </p>
                  <p className="mt-0.5 text-sm text-brand-100/70">from {reviewCount} customer reviews</p>
                </div>
              </div>
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
              <div key={label} className="flex items-center gap-4 bg-white px-4 py-4 sm:px-6 sm:py-5">
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
          <SectionHeader eyebrow="Browse" title="Explore by category" sub="Everyday favourites, in 500+ cities around the world" href="/categories" linkText="All categories" />
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {tiles.map(t => (
              <Link key={t.slug} href={`/search?q=${encodeURIComponent(t.name)}`} className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-200">
                {t.photo && (
                  // eslint-disable-next-line @next/next/no-img-element -- remote Google photo
                  <img src={photoSize(t.photo, 640, 480)} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-lg font-bold text-white sm:text-xl">{cap(plural(t.name))}</h3>
                    <p className="text-xs text-white/75 sm:text-sm">{fmt(t.count)} places</p>
                  </div>
                  <span className="hidden size-9 shrink-0 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition group-hover:bg-white group-hover:text-zinc-900 sm:grid">
                    <ArrowUpRight size={16} />
                  </span>
                </div>
              </Link>
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
          {/* The big tile and four beside it, then a row of four more on large screens. */}
          <div className="mt-10 grid auto-rows-[15rem] gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cities.slice(0, 9).map((c, i) => <CityTile key={c.slug} c={c} big={i === 0} className={i >= 5 ? 'hidden lg:block' : ''} />)}
          </div>
        </section>

        {/* ---------- Review highlights ---------- */}
        {highlights.length > 0 && (
          <section className="bg-brand-950 py-20 text-white">
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
          <div className="relative isolate grid items-center gap-12 overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 to-brand-950 p-8 text-white sm:p-14 lg:grid-cols-2">
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
      </main>
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
