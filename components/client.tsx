'use client'
import Link from 'next/link'
import {
  createContext, useActionState, useContext, useState, useSyncExternalStore,
  type FormEvent, type InputHTMLAttributes, type ReactNode, type SyntheticEvent, type TextareaHTMLAttributes,
} from 'react'
import { submitBusiness, submitReview, type FormState } from '@/lib/actions'
import { fold } from '@/lib/utils'
import { CLAIM_RULES, LISTING_RULES, MESSAGES, REVIEW_RULES, check, cityRule, type Rules } from '@/lib/validate'
import { Autocomplete, type Option } from './Autocomplete'
import { CheckCircleIcon, ChevronDownIcon, InfoIcon, MailIcon, PhoneIcon, SearchIcon, ShareIcon, StarIcon } from './icons'

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
              active === i ? 'bg-zinc-900 text-white shadow-sm' : 'bg-white text-zinc-700 ring-1 ring-zinc-200 hover:ring-zinc-300'
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

// ---------- Form checks ----------

type Checks = { errors: Record<string, string>; recheck: (name: string, value: string) => void }
const FormChecks = createContext<Checks>({ errors: {}, recheck: () => {} })

// Checks fields with the shared rules (lib/validate.ts): when you leave a field, again as you correct it, and all of
// them on submit, which holds the form back until they pass. The server action checks again, and its verdict replaces
// ours. `more` adds checks that aren't about one field's text, like the star rating or the confirm box.
function useChecks(rules: Rules, serverErrors?: Record<string, string>, more?: (values: Record<string, string>) => Record<string, string>) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [seen, setSeen] = useState(serverErrors)
  if (seen !== serverErrors) {
    setSeen(serverErrors)
    setErrors(serverErrors ?? {})
  }
  const recheck = (name: string, value: string) => setErrors(e => ({ ...e, [name]: rules[name]?.(value.trim()) ?? '' }))
  const formProps = {
    noValidate: true, // our messages instead of the browser's pop-ups
    onBlur: ({ target }: { target: EventTarget }) => {
      const { name, value } = target as HTMLInputElement
      if (name in rules) recheck(name, value)
    },
    onChange: ({ target }: { target: EventTarget }) => {
      const { name, value } = target as HTMLInputElement
      if (errors[name]) recheck(name, value)
    },
    onSubmit: (e: FormEvent<HTMLFormElement>) => {
      const values = Object.fromEntries([...new FormData(e.currentTarget)].map(([k, v]) => [k, String(v)]))
      const found = { ...check(rules, values), ...more?.(values) }
      setErrors(found)
      if (!Object.keys(found).length) return
      e.preventDefault()
      // Jump to the first problem on the page: the field itself, or the first button of a group like the stars.
      const first = [...e.currentTarget.querySelectorAll<HTMLElement>('[name]:not([type=hidden]), [data-field]')]
        .find(el => found[el.getAttribute('name') ?? el.dataset.field ?? ''])
      ;(first?.dataset.field ? first.querySelector('button') : first)?.focus()
    },
  }
  return { checks: { errors, recheck }, formProps }
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-600">
      <InfoIcon width={14} height={14} className="mt-px shrink-0" />
      {children}
    </p>
  )
}

type FieldProps = { label: string; name: string; hint?: string; textarea?: boolean; values?: Record<string, string>; rows?: number } &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'name'>

function Field({ label, name, hint, textarea, values, ...rest }: FieldProps) {
  const error = useContext(FormChecks).errors[name]
  const props = {
    id: name, name, defaultValue: values?.[name], className: 'input',
    'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${name}-error` : hint ? `${name}-hint` : undefined, ...rest,
  }
  return (
    <div>
      <label htmlFor={name} className="label">
        {label} {!rest.required && <span className="font-normal text-zinc-400">(optional)</span>}
      </label>
      {textarea ? <textarea rows={4} {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)} /> : <input {...props} />}
      {error ? <FieldError id={`${name}-error`}>{error}</FieldError> : hint && <p id={`${name}-hint`} className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  )
}

// A required field with suggestions as you type (categories, cities).
function AutoField({ label, name, hint, values, ...rest }: {
  label: string; name: string; hint: string; values?: Record<string, string>; kind: 'what' | 'where'; options: Option[]; placeholder: string; heading: string
}) {
  const { errors, recheck } = useContext(FormChecks)
  const error = errors[name]
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <div className="relative">
        <Autocomplete id={name} name={name} defaultValue={values?.[name]} className="input" required invalid={!!error}
          describedBy={`${name}-${error ? 'error' : 'hint'}`} onChoose={value => recheck(name, value)} {...rest} />
      </div>
      {error ? <FieldError id={`${name}-error`}>{error}</FieldError> : <p id={`${name}-hint`} className="mt-1 text-xs text-zinc-500">{hint}</p>}
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
  const { checks, formProps } = useChecks(REVIEW_RULES, state?.errors, (values): Record<string, string> => (Number(values.rating) >= 1 ? {} : { rating: MESSAGES.rating }))
  if (state?.ok) return <Success message={state.message} href={`/biz/${slug}`} linkText={`Back to ${title}`} />
  const shown = hover || rating
  return (
    <FormChecks value={checks}>
    <form action={action} {...formProps} className="space-y-6">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="rating" value={rating} />
      <div>
        <p className="label">Your rating</p>
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="radiogroup" aria-label="Rating" data-field="rating" aria-invalid={checks.errors.rating ? true : undefined}
            aria-describedby={checks.errors.rating ? 'rating-error' : undefined} className="flex gap-1" onMouseLeave={() => setHover(0)}
          >
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}, ${RATING_LABELS[n]}`}
                onClick={() => {
                  setRating(n)
                  checks.recheck('rating', String(n))
                }}
                onMouseEnter={() => setHover(n)}
                className={`grid size-11 place-items-center rounded-lg transition-colors ${n <= shown ? 'bg-star text-white' : 'bg-zinc-100 text-zinc-300 hover:bg-zinc-200'}`}
              >
                <StarIcon width={24} height={24} />
              </button>
            ))}
          </div>
          <span className="text-sm font-medium text-zinc-600">{RATING_LABELS[shown]}</span>
        </div>
        {checks.errors.rating && <FieldError id="rating-error">{checks.errors.rating}</FieldError>}
      </div>
      <Field
        label="Your review" name="text" textarea required maxLength={5000} rows={8} values={state?.values}
        placeholder="What did you like or dislike? How were the service, price and quality? Tell other customers what to expect."
        hint="At least 50 characters. Keep it honest, helpful and about your own experience."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" name="name" required maxLength={80} autoComplete="name" values={state?.values} hint="Shown with your review." />
        <Field label="Email" name="email" type="email" required maxLength={254} autoComplete="email" values={state?.values} hint="Never shown publicly." />
      </div>
      <Honeypot />
      <ErrorNote state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
        {pending ? 'Posting…' : 'Post review'}
      </button>
    </form>
    </FormChecks>
  )
}

type ClaimTarget = { slug: string; title: string; phone?: string }

export function BusinessForm({ claim, categories, cities }: { claim?: ClaimTarget; categories: Option[]; cities: { name: string; country: string }[] }) {
  const [state, action, pending] = useActionState(submitBusiness, null)
  const { checks, formProps } = useChecks(
    claim ? CLAIM_RULES : { ...LISTING_RULES, city: cityRule(cities) },
    state?.errors,
    (values): Record<string, string> => (claim && values.confirm !== 'on' ? { confirm: MESSAGES.confirm } : {}),
  )
  if (state?.ok) {
    return <Success message={state.message} href={claim ? `/biz/${claim.slug}` : '/'} linkText={claim ? `Back to ${claim.title}` : 'Back to home'} />
  }
  const v = state?.values
  return (
    <FormChecks value={checks}>
    <form action={action} {...formProps} className="space-y-10">
      {claim ? (
        <>
          <input type="hidden" name="claim" value={claim.slug} />
          <Group title="About you">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" name="contact_name" required maxLength={80} autoComplete="name" values={v} />
              <div>
                <label htmlFor="role" className="label">Your role</label>
                <select id="role" name="role" defaultValue={v?.role ?? 'Owner'} className="input">
                  <option>Owner</option>
                  <option>Manager</option>
                  <option>Employee</option>
                  <option>Agency or marketer</option>
                </select>
              </div>
              <Field label="Work email" name="email" type="email" required maxLength={254} autoComplete="email" values={v} hint="Only used to contact you about this claim." />
              <Field label="Your phone number" name="phone" type="tel" required maxLength={25} autoComplete="tel" values={v} hint="In case we need to reach you." />
            </div>
          </Group>
          <Group title="How should we confirm it’s you?">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { value: 'phone', Icon: PhoneIcon, title: 'Phone call', text: claim.phone ? `We’ll call the business on ${claim.phone} and ask for you.` : 'We’ll call the number on the listing and ask for you.' },
                { value: 'email', Icon: MailIcon, title: 'Email', text: 'We’ll email your work address. One at your website’s domain is quickest.' },
              ].map(({ value, Icon, title, text }) => (
                <label key={value} className="card flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:border-zinc-300 has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:ring-1 has-checked:ring-brand-600">
                  <span className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-white text-brand-700 ring-1 ring-zinc-200">
                      <Icon width={18} height={18} />
                    </span>
                    <input type="radio" name="verify" value={value} defaultChecked={(v?.verify || 'phone') === value} className="size-4 accent-brand-600" />
                  </span>
                  <span>
                    <span className="block font-semibold text-zinc-900">{title}</span>
                    <span className="mt-0.5 block text-sm text-zinc-600">{text}</span>
                  </span>
                </label>
              ))}
            </div>
          </Group>
          <Field label="Anything we should update?" name="note" textarea maxLength={1000} values={v} placeholder="For example: our phone number has changed, or we now open at 8 AM." />
          <div>
            <label className="flex items-start gap-3 text-sm text-zinc-700">
              <input
                type="checkbox" name="confirm" required className="mt-0.5 size-4 accent-brand-600"
                aria-invalid={checks.errors.confirm ? true : undefined} aria-describedby={checks.errors.confirm ? 'confirm-error' : undefined}
              />
              I’m the owner of this business, or I’m authorised to manage its listing.
            </label>
            {checks.errors.confirm && <FieldError id="confirm-error">{checks.errors.confirm}</FieldError>}
          </div>
        </>
      ) : (
        <>
          <Group title="Free or instant?">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="card flex cursor-pointer flex-col gap-2 p-4 has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:ring-1 has-checked:ring-brand-600">
                <span className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900">Free listing</span>
                  <input type="radio" name="plan" value="free" defaultChecked className="size-4 accent-brand-600" />
                </span>
                <span className="text-2xl font-bold tracking-tight text-zinc-900">Free</span>
                <span className="text-sm text-zinc-600">We check every new listing by hand, so it usually goes live within a few days.</span>
              </label>
              {/* Not selectable until payments are set up. */}
              <div aria-disabled="true" className="card flex cursor-not-allowed flex-col gap-2 p-4">
                <span className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900">Instant listing</span>
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">Coming soon</span>
                </span>
                <span className="text-2xl font-bold tracking-tight text-zinc-900">
                  $5 <span className="text-sm font-medium text-zinc-500">one-time</span>
                </span>
                <span className="text-sm text-zinc-600">Goes live the moment you pay. No subscription, and it doesn’t change your ranking.</span>
              </div>
            </div>
          </Group>
          <Group title="Business details">
            <Field label="Business name" name="name" required maxLength={120} values={v} />
            <AutoField label="Category" name="category" kind="what" heading="Popular categories" options={categories} values={v}
              placeholder="e.g. Dentist" hint="Pick one from the list, or type your own." />
            <Field label="Description" name="description" textarea maxLength={1000} values={v} placeholder="What you offer, what makes you different" />
          </Group>
          <Group title="Location & contact">
            <Field label="Street address" name="address" required maxLength={200} autoComplete="street-address" values={v} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Neighbourhood / area" name="area" maxLength={80} values={v} placeholder="e.g. Kothrud" />
              <AutoField label="City" name="city" kind="where" heading="Popular cities" options={cities.map(c => ({ label: `${c.name}, ${c.country}` }))} values={v}
                placeholder="Start typing your city" hint={`We cover ${cities.length} cities. Pick yours from the list.`} />
              <Field label="Phone" name="phone" type="tel" maxLength={25} autoComplete="tel" values={v} />
              <Field label="Website" name="website" type="url" maxLength={200} values={v} placeholder="example.com" />
            </div>
          </Group>
          <Group title="Opening hours">
            <Field label="Hours" name="hours" textarea maxLength={500} values={v} placeholder={'Mon–Fri 9 AM–6 PM\nSat 10 AM–2 PM\nSun closed'} />
          </Group>
          <Group title="About you">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" name="contact_name" required maxLength={80} autoComplete="name" values={v} />
              <Field label="Email" name="email" type="email" required maxLength={254} autoComplete="email" values={v} hint="Never shown publicly." />
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
          {pending ? 'Sending…' : claim ? 'Claim this business' : 'Add business'}
        </button>
        {claim && <p className="text-sm text-zinc-500">Free. Nothing on your page changes until we’ve confirmed it’s you.</p>}
      </div>
    </form>
    </FormChecks>
  )
}

// A menu in the home page's category row (components/CategoryNav.tsx). Hovered, its label becomes a purple pill and its
// panel opens just below, from the same left edge, moving left only as far as it must to stay on screen (measured each
// time it opens, so it fits any width). Also opens while it has keyboard focus (focus-visible, so a mouse click doesn't
// leave it stuck open). An invisible strip (before:) bridges the gap so the pointer can reach the panel.
export function HoverMenu({ label, href, children }: { label: string; href: string; children: ReactNode }) {
  function place(e: SyntheticEvent<HTMLDivElement>) {
    const panel = e.currentTarget.lastElementChild as HTMLElement
    const spill = e.currentTarget.getBoundingClientRect().left + panel.offsetWidth - (document.documentElement.clientWidth - 16)
    panel.style.left = `${-Math.max(0, Math.ceil(spill))}px`
  }
  return (
    <div onMouseEnter={place} onFocus={place} className="group/menu relative flex h-full items-center">
      <Link
        href={href}
        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white/85 transition-colors group-hover/menu:bg-brand-600 group-hover/menu:text-white group-hover/menu:shadow-md group-hover/menu:shadow-brand-950/40 group-has-[:focus-visible]/menu:bg-brand-600 group-has-[:focus-visible]/menu:text-white"
      >
        {label}
        {/* Flips without animating, so it never shows half-turned. */}
        <ChevronDownIcon width={14} height={14} className="text-white/60 group-hover/menu:rotate-180 group-hover/menu:text-white" />
      </Link>
      <div className="invisible absolute top-full left-0 z-50 mt-1.5 w-[36rem] rounded-2xl border border-zinc-200 bg-white p-2.5 opacity-0 shadow-2xl shadow-black/25 transition duration-150 before:absolute before:inset-x-0 before:bottom-full before:h-2 group-hover/menu:visible group-hover/menu:opacity-100 group-has-[:focus-visible]/menu:visible group-has-[:focus-visible]/menu:opacity-100">
        {children}
      </div>
    </div>
  )
}

// ---------- Cities page directory ----------

export type DirectoryCountry = { name: string; code: string; cities: { name: string; slug: string; count: number }[] }
export type DirectoryRegion = { name: string; slug: string; countries: DirectoryCountry[] }


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
      <div className="sticky top-[var(--header-h)] z-20 -mx-4 flex flex-col gap-3 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur-xl sm:flex-row sm:items-center">
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
        <section key={r.slug} id={r.slug} className="mt-10 scroll-mt-[calc(var(--header-h)_+_8.25rem)] sm:scroll-mt-[calc(var(--header-h)_+_5.25rem)]">
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
