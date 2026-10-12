'use client'
import { Moon, Sun } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useActionState, useLayoutEffect, useState, useSyncExternalStore, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { submitBusiness, submitReview, type FormState } from '@/lib/actions'
import { CheckCircleIcon, SearchIcon, ShareIcon, StarIcon } from './icons'

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)
  async function share() {
    if (navigator.share) {
      await navigator.share({ title, url: location.href }).catch(() => {}) // user closed the share sheet
      return
    }
    await navigator.clipboard.writeText(location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button type="button" onClick={share} className="btn btn-outline">
      <ShareIcon width={18} height={18} /> {copied ? 'Link copied' : 'Share'}
    </button>
  )
}

// Server renders every panel; the buttons only switch which one is visible (works without a fetch).
export function Tabs({ labels, panels }: { labels: ReactNode[]; panels: ReactNode[] }) {
  const [active, setActive] = useState(0)
  return (
    <div>
      <div role="tablist" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {labels.map((label, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              active === i ? 'bg-zinc-900 text-zinc-50 shadow-sm' : 'bg-surface text-zinc-700 ring-1 ring-zinc-200 hover:ring-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {panels.map((panel, i) => (
        <div key={i} role="tabpanel" hidden={active !== i} className="mt-8">
          {panel}
        </div>
      ))}
    </div>
  )
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const weekOrder = (day: string) => {
  const i = DAYS.indexOf(day.toLowerCase())
  return i < 0 ? 7 : (i + 6) % 7 // Monday first; unknown (non-English) names last
}
const noSubscribe = () => () => {}

// Highlights today in the visitor's timezone. The server render has no "today", so it starts unhighlighted.
export function HoursTable({ hours }: { hours: Record<string, string> }) {
  const today = useSyncExternalStore(noSubscribe, () => DAYS[new Date().getDay()], () => '')
  return (
    <table className="w-full text-sm">
      <tbody>
        {Object.entries(hours).sort(([a], [b]) => weekOrder(a) - weekOrder(b)).map(([day, h]) => (
          <tr key={day} className={day === today ? 'font-semibold text-zinc-900' : 'text-zinc-600'}>
            <th scope="row" className="py-1.5 pr-6 text-left font-[inherit] capitalize">{day}</th>
            <td className="py-1.5">
              {h}
              {day === today && <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700">Today</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Success({ message, href, linkText }: { message: string; href: string; linkText: string }) {
  return (
    <div className="card p-10 text-center">
      <CheckCircleIcon width={48} height={48} className="mx-auto text-brand-600" />
      <p className="mt-4 text-lg font-semibold">{message}</p>
      <Link href={href} className="btn btn-primary mt-6">{linkText}</Link>
    </div>
  )
}

function ErrorNote({ state }: { state: FormState }) {
  return state && !state.ok ? <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.message}</p> : null
}

// Hidden from people; bots that fill every field get silently dropped by the server action.
const Honeypot = () => <input name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

type FieldProps = { label: string; name: string; hint?: string; textarea?: boolean; values?: Record<string, string>; rows?: number } &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'name'>

function Field({ label, name, hint, textarea, values, ...rest }: FieldProps) {
  const props = { id: name, name, defaultValue: values?.[name], className: 'input', ...rest }
  return (
    <div>
      <label htmlFor={name} className="label">
        {label} {!rest.required && <span className="font-normal text-zinc-400">(optional)</span>}
      </label>
      {textarea ? <textarea rows={4} {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)} /> : <input {...props} />}
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  )
}

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <fieldset className="space-y-4">
    <legend className="mb-4 text-lg font-semibold">{title}</legend>
    {children}
  </fieldset>
)

const RATING_LABELS = ['Select your rating', 'Not good', 'Could’ve been better', 'OK', 'Good', 'Great']

export function ReviewForm({ slug, title }: { slug: string; title: string }) {
  const [state, action, pending] = useActionState(submitReview, null)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  if (state?.ok) return <Success message={state.message} href={`/biz/${slug}`} linkText={`Back to ${title}`} />
  const shown = hover || rating
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="rating" value={rating} />
      <div>
        <p className="label">Your rating</p>
        <div className="flex flex-wrap items-center gap-3">
          <div role="radiogroup" aria-label="Rating" className="flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}, ${RATING_LABELS[n]}`}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                className={`grid size-11 place-items-center rounded-lg transition-colors ${n <= shown ? 'bg-star text-white' : 'bg-zinc-100 text-zinc-300 hover:bg-zinc-200'}`}
              >
                <StarIcon width={24} height={24} />
              </button>
            ))}
          </div>
          <span className="text-sm font-medium text-zinc-600">{RATING_LABELS[shown]}</span>
        </div>
      </div>
      <Field
        label="Your review" name="text" textarea required minLength={50} maxLength={5000} rows={8} values={state?.values}
        placeholder="What did you like or dislike? How were the service, price and quality? Tell other customers what to expect."
        hint="At least 50 characters. Keep it honest, helpful and about your own experience."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" name="name" required maxLength={80} autoComplete="name" values={state?.values} hint="Shown with your review." />
        <Field label="Email" name="email" type="email" required autoComplete="email" values={state?.values} hint="Never shown publicly." />
      </div>
      <Honeypot />
      <ErrorNote state={state} />
      <button type="submit" disabled={pending || !rating} className="btn btn-primary w-full sm:w-auto">
        {pending ? 'Posting…' : 'Post review'}
      </button>
    </form>
  )
}

type ClaimTarget = { slug: string; title: string }

export function BusinessForm({ claim, niches }: { claim?: ClaimTarget; niches: string[] }) {
  const [state, action, pending] = useActionState(submitBusiness, null)
  if (state?.ok) {
    return <Success message={state.message} href={claim ? `/biz/${claim.slug}` : '/'} linkText={claim ? `Back to ${claim.title}` : 'Back to home'} />
  }
  const v = state?.values
  return (
    <form action={action} className="space-y-10">
      {claim ? (
        <>
          <input type="hidden" name="claim" value={claim.slug} />
          <Group title="Your details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" name="contact_name" required autoComplete="name" values={v} />
              <div>
                <label htmlFor="role" className="label">Your role</label>
                <select id="role" name="role" defaultValue={v?.role ?? 'Owner'} className="input">
                  <option>Owner</option>
                  <option>Manager</option>
                  <option>Employee</option>
                  <option>Agency / marketer</option>
                </select>
              </div>
              <Field label="Business email" name="email" type="email" required autoComplete="email" values={v} hint="Ideally at your website’s domain." />
              <Field label="Phone" name="phone" type="tel" required autoComplete="tel" values={v} />
            </div>
          </Group>
          <Group title="How should we verify you?">
            {[
              ['phone', 'Call the business', 'We’ll call the phone number on the listing.'],
              ['email', 'Email', 'We’ll email an address at the business website’s domain.'],
            ].map(([value, label, hint]) => (
              <label key={value} className="card flex cursor-pointer items-start gap-3 p-4 has-checked:border-brand-600 has-checked:bg-brand-50">
                <input type="radio" name="verify" value={value} defaultChecked={(v?.verify || 'phone') === value} className="mt-1 accent-brand-600" />
                <span>
                  <span className="block font-medium">{label}</span>
                  <span className="text-sm text-zinc-600">{hint}</span>
                </span>
              </label>
            ))}
          </Group>
          <Field label="Anything we should know?" name="note" textarea values={v} placeholder="e.g. the phone number or hours on the listing are out of date" />
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="confirm" required className="mt-0.5 size-4 accent-brand-600" />
            I confirm I’m the owner of this business or authorised to manage its listing.
          </label>
        </>
      ) : (
        <>
          <Group title="Business details">
            <Field label="Business name" name="name" required values={v} />
            <Field label="Category" name="category" required list="niches" values={v} placeholder="e.g. Dentist" />
            <datalist id="niches">
              {niches.map(n => <option key={n} value={n} />)}
            </datalist>
            <Field label="Description" name="description" textarea values={v} placeholder="What you offer, what makes you different" />
          </Group>
          <Group title="Location & contact">
            <Field label="Street address" name="address" required autoComplete="street-address" values={v} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Neighbourhood / area" name="area" values={v} placeholder="e.g. Kothrud" />
              <Field label="City" name="city" required autoComplete="address-level2" values={v} />
              <Field label="Phone" name="phone" type="tel" autoComplete="tel" values={v} />
              <Field label="Website" name="website" type="url" values={v} placeholder="https://" />
            </div>
          </Group>
          <Group title="Opening hours">
            <Field label="Hours" name="hours" textarea values={v} placeholder={'Mon–Fri 9 AM–6 PM\nSat 10 AM–2 PM\nSun closed'} />
          </Group>
          <Group title="About you">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" name="contact_name" required autoComplete="name" values={v} />
              <Field label="Email" name="email" type="email" required autoComplete="email" values={v} hint="Never shown publicly." />
            </div>
            <div>
              <label htmlFor="relationship" className="label">Your relationship to the business</label>
              <select id="relationship" name="relationship" defaultValue={v?.relationship ?? 'owner'} className="input">
                <option value="owner">I own or manage it</option>
                <option value="employee">I work there</option>
                <option value="customer">I’m a customer</option>
              </select>
            </div>
          </Group>
        </>
      )}
      <Honeypot />
      <ErrorNote state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
        {pending ? 'Sending…' : claim ? 'Submit claim' : 'Add business'}
      </button>
    </form>
  )
}

// The home page has its own big search, so the header one steps aside there.
// (A pathname check, not CSS :has(): the home page stays in the DOM, hidden, after you navigate away.)
export function HeaderSearch({ children }: { children: ReactNode }) {
  const home = usePathname() === '/'
  return <div className={`mx-3 hidden max-w-md flex-1 md:block ${home ? 'invisible' : ''}`}>{children}</div>
}

// ---------- Cities page directory ----------

export type DirectoryCountry = { name: string; code: string; cities: { name: string; slug: string; count: number }[] }
export type DirectoryRegion = { name: string; slug: string; countries: DirectoryCountry[] }

// Lower case without accents, so "sao paulo" finds São Paulo.
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

// Region jump links and a live filter over the country cards. Typing a country shows all its cities.
export function CityDirectory({ regions }: { regions: DirectoryRegion[] }) {
  const [query, setQuery] = useState('')
  const q = fold(query.trim())
  const shown = regions
    .map(r => ({
      ...r,
      countries: r.countries
        .map(c => ({ ...c, cities: !q || fold(c.name).includes(q) ? c.cities : c.cities.filter(x => fold(x.name).includes(q)) }))
        .filter(c => c.cities.length),
    }))
    .filter(r => r.countries.length)

  return (
    <>
      <div className="sticky top-16 z-20 -mx-4 flex flex-col gap-3 border-b border-zinc-200 bg-page/90 px-4 py-3 backdrop-blur-xl sm:flex-row sm:items-center">
        <label className="relative shrink-0 sm:w-80">
          <span className="sr-only">Find a city or country</span>
          <SearchIcon width={18} height={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-400" />
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a city or country" className="input rounded-full pl-10" />
        </label>
        <nav aria-label="Regions" className="flex min-w-0 gap-2 overflow-x-auto">
          {regions.map(r => <a key={r.slug} href={`#${r.slug}`} className="chip shrink-0">{r.name}</a>)}
        </nav>
      </div>

      {shown.map(r => (
        <section key={r.slug} id={r.slug} className="mt-10 scroll-mt-48 sm:scroll-mt-36">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-display text-2xl font-bold tracking-tight">{r.name}</h2>
            <p className="text-sm text-zinc-500">
              {r.countries.length} {r.countries.length === 1 ? 'country' : 'countries'} · {r.countries.reduce((n, c) => n + c.cities.length, 0)} cities
            </p>
          </div>
          <div className="mt-5 columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {r.countries.map(c => <CountryCard key={c.code} c={c} expanded={!!q} />)}
          </div>
        </section>
      ))}

      {!shown.length && (
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 p-10 text-center">
          <p className="font-semibold text-zinc-900">No cities match “{query.trim()}”</p>
          <p className="mt-1 text-sm text-zinc-500">
            Check the spelling, or{' '}
            <Link href={`/search?loc=${encodeURIComponent(query.trim())}`} className="font-semibold text-brand-700 hover:underline">search for businesses near “{query.trim()}”</Link>.
          </p>
        </div>
      )}
    </>
  )
}

const CITY_LIMIT = 6

function CountryCard({ c, expanded }: { c: DirectoryCountry; expanded: boolean }) {
  const [open, setOpen] = useState(false)
  const all = expanded || open
  return (
    <section className="card mb-4 break-inside-avoid p-4">
      <h3 className="flex items-center gap-2.5">
        <span className="grid h-6 min-w-8 place-items-center rounded-md bg-brand-50 px-1.5 text-[11px] font-bold tracking-wide text-brand-700 uppercase">{c.code}</span>
        <span className="min-w-0 truncate font-semibold text-zinc-900">{c.name}</span>
        {c.cities.length > 1 && <span className="ml-auto shrink-0 text-xs text-zinc-400">{c.cities.length} cities</span>}
      </h3>
      <ul className="mt-2">
        {c.cities.map((x, i) => (
          // Cities past the limit stay in the HTML (crawlable links), just hidden until "Show all".
          <li key={x.slug} className={!all && i >= CITY_LIMIT ? 'hidden' : undefined}>
            <Link href={`/${x.slug}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm text-zinc-700 hover:bg-brand-50 hover:text-brand-800">
              <span className="truncate">{x.name}</span>
              <span className="shrink-0 text-xs text-zinc-400 tabular-nums">{x.count.toLocaleString('en-US')} places</span>
            </Link>
          </li>
        ))}
      </ul>
      {!expanded && c.cities.length > CITY_LIMIT && (
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
          {open ? 'Show fewer' : `Show all ${c.cities.length}`}
        </button>
      )}
    </section>
  )
}

// ---------- Light / dark switch ----------

// The theme lives on <html data-theme>; the script in app/layout.tsx applies the saved choice before the first paint.
// The icon follows the attribute through CSS (dark:), so nothing here depends on state.
export function ThemeToggle({ className = '' }: { className?: string }) {
  // React's development remount resets <html> attributes, so put the saved choice back (a no-op in production).
  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem('theme')
      if (saved) document.documentElement.dataset.theme = saved
    } catch {}
  }, [])

  const toggle = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {}
  }

  return (
    <button type="button" onClick={toggle} aria-label="Switch between light and dark mode" title="Light / dark mode" className={className}>
      <Moon size={18} className="dark:hidden" />
      <Sun size={18} className="hidden dark:block" />
    </button>
  )
}
