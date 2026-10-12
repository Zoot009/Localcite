'use client'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { PinIcon, SearchIcon } from './icons'

// `point` is a city's [latitude, longitude], so "Current location" can find the nearest one.
export type Option = { label: string; hint?: string; point?: [number, number] }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const MAX = 8
const NEARBY_KM = 100

// Best matches first: starts with the query, then a word starting with it, then contains it, then the hint
// (so typing a country lists its cities). Ties keep the caller's order, which is most popular first.
function rank(options: Option[], query: string) {
  const q = norm(query.trim())
  if (!q) return options.slice(0, MAX)
  const scored: [number, number, Option][] = []
  options.forEach((o, i) => {
    const label = norm(o.label)
    const hint = norm(o.hint ?? '')
    const score = label.startsWith(q) ? 0 : label.includes(` ${q}`) ? 1 : label.includes(q) ? 2 : hint.startsWith(q) || hint.includes(` ${q}`) ? 3 : -1
    if (score >= 0) scored.push([score, i, o])
  })
  return scored.sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, MAX).map(([, , o]) => o)
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = norm(query.trim())
  const at = q ? norm(text).indexOf(q) : -1
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <span className="font-semibold text-zinc-900">{text.slice(at, at + q.length)}</span>
      {text.slice(at + q.length)}
    </>
  )
}

// Rough distance in km between two [lat, lng] points: plenty for finding the nearest city.
function km([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]) {
  const rad = Math.PI / 180
  return 6371 * Math.hypot((lng2 - lng1) * rad * Math.cos(((lat1 + lat2) / 2) * rad), (lat2 - lat1) * rad)
}

// Search field with a suggestion list (ARIA combobox: ↑ ↓ to move, Enter to pick, Esc to close).
// `locate` puts a "Current location" row first: it asks the browser where you are and fills in the nearest city.
export function Autocomplete({ id, name, kind, options, placeholder, defaultValue = '', className = '', required = false, heading, invalid, describedBy, onChoose, locate = false }: {
  id: string; name: string; kind: 'what' | 'where'; options: Option[]; placeholder: string; defaultValue?: string; className?: string
  required?: boolean; heading?: string; invalid?: boolean; describedBy?: string; onChoose?: (value: string) => void; locate?: boolean
}) {
  const listId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [status, setStatus] = useState('') // "Current location": '' | 'busy' | why it didn't work
  const rows: (Option | 'here')[] = [...(locate ? ['here' as const] : []), ...rank(options, value)]
  const show = open && rows.length > 0

  function choose(o: Option) {
    setValue(o.label)
    onChoose?.(o.label)
    setOpen(false)
    setActive(-1)
    setStatus('')
    // Picked what you want: carry on to "where".
    if (kind === 'what') input.current?.form?.querySelector<HTMLInputElement>('input[name=loc]')?.focus()
  }

  function findMe() {
    if (!navigator.geolocation) return setStatus('Your browser can’t share its location.')
    setStatus('busy')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const here: [number, number] = [coords.latitude, coords.longitude]
        let nearest: Option | undefined
        let best = Infinity
        for (const o of options) {
          const d = o.point ? km(here, o.point) : Infinity
          if (d < best) [nearest, best] = [o, d]
        }
        if (nearest && best <= NEARBY_KM) choose(nearest)
        else setStatus('We don’t list any cities near you yet.')
      },
      () => setStatus('Couldn’t get your location. Allow location access and try again.'),
      { timeout: 10_000, maximumAge: 600_000 },
    )
  }

  const pick = (row: Option | 'here') => (row === 'here' ? findMe() : choose(row))

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive(a => (a + 1) % Math.max(rows.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => (a <= 0 ? rows.length - 1 : a - 1))
    } else if (e.key === 'Enter' && show && active >= 0) {
      e.preventDefault() // pick the highlighted row instead of submitting
      pick(rows[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <>
      <input
        ref={input}
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={e => {
          setValue(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={className}
      />
      {show && (
        <ul
          id={listId}
          role="listbox"
          // Keep focus in the input while clicking a row.
          onPointerDown={e => e.preventDefault()}
          className="absolute top-full left-0 z-50 mt-2 w-full min-w-[18rem] rounded-xl border border-zinc-200 bg-white p-1.5 text-left shadow-xl shadow-zinc-900/10"
        >
          {heading && !value.trim() && (
            <li role="presentation" className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">{heading}</li>
          )}
          {rows.map((row, i) => (
            <li
              key={row === 'here' ? 'here' : `${row.label}|${row.hint ?? ''}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onClick={() => pick(row)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${i === active ? 'bg-zinc-100' : ''}`}
            >
              {row === 'here' ? (
                <>
                  <PinIcon width={18} height={18} className="shrink-0 text-brand-600" />
                  <span className="min-w-0">
                    <span className="block font-medium text-brand-700">{status === 'busy' ? 'Finding you…' : 'Current location'}</span>
                    {status && status !== 'busy' && <span className="block text-xs text-zinc-500">{status}</span>}
                  </span>
                </>
              ) : kind === 'where' ? (
                <span className="truncate text-zinc-800">
                  <Highlight text={row.label} query={value} />
                  {row.hint && <span className="text-zinc-500">, {row.hint}</span>}
                </span>
              ) : (
                <>
                  <SearchIcon width={16} height={16} className="shrink-0 text-zinc-400" />
                  <span className="min-w-0 flex-1 truncate text-zinc-800">
                    <Highlight text={row.label} query={value} />
                  </span>
                  {row.hint && <span className="shrink-0 text-xs text-zinc-400">{row.hint}</span>}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
