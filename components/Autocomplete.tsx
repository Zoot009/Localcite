'use client'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { PinIcon, SearchIcon } from './icons'

export type Option = { label: string; hint?: string }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const MAX = 8

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

// Search field with a styled suggestion list (ARIA combobox: ↑ ↓ to move, Enter to pick, Esc to close).
export function Autocomplete({ id, name, kind, options, placeholder, defaultValue = '', className = '' }: {
  id: string; name: string; kind: 'what' | 'where'; options: Option[]; placeholder: string; defaultValue?: string; className?: string
}) {
  const listId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const results = rank(options, value)
  const show = open && results.length > 0
  const Icon = kind === 'where' ? PinIcon : SearchIcon

  function choose(o: Option) {
    setValue(o.label)
    setOpen(false)
    setActive(-1)
    // Picked what you want: carry on to "where".
    if (kind === 'what') input.current?.form?.querySelector<HTMLInputElement>('input[name=loc]')?.focus()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive(a => (a + 1) % Math.max(results.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => (a <= 0 ? results.length - 1 : a - 1))
    } else if (e.key === 'Enter' && show && active >= 0) {
      e.preventDefault() // pick the highlighted suggestion instead of submitting
      choose(results[active])
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
          // Keep focus in the input while clicking a suggestion.
          onPointerDown={e => e.preventDefault()}
          className="absolute top-full left-0 z-50 mt-3 w-full min-w-[17rem] rounded-2xl bg-surface p-1.5 text-left shadow-2xl ring-1 shadow-black/25 ring-zinc-900/10"
        >
          {!value.trim() && (
            <li role="presentation" className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
              {kind === 'where' ? 'Popular cities' : 'Popular searches'}
            </li>
          )}
          {results.map((o, i) => (
            <li
              key={`${o.label}|${o.hint ?? ''}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onClick={() => choose(o)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors ${i === active ? 'bg-zinc-100' : ''}`}
            >
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg transition-colors ${i === active ? 'bg-brand-100 text-brand-700' : 'bg-zinc-100 text-zinc-500'}`}>
                <Icon width={16} height={16} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm text-zinc-700">
                  <Highlight text={o.label} query={value} />
                </span>
                {o.hint && <span className="block truncate text-xs text-zinc-400">{o.hint}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
