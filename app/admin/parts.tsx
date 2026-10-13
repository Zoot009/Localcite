import type { ReactNode } from 'react'
import { SITE } from '@/lib/site'

// Pieces shared by the admin tabs (page.tsx and websites.tsx).

export type Tone = 'new' | 'good' | 'bad' | 'info'
const BADGE: Record<Tone, string> = {
  new: 'bg-amber-50 text-amber-800 ring-amber-200',
  good: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  bad: 'bg-red-50 text-red-700 ring-red-200',
  info: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
}

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${BADGE[tone]}`}>{children}</span>
}

export const Empty = ({ children }: { children: ReactNode }) => <p className="card p-10 text-center text-zinc-600">{children}</p>

// Each business lives on one of the websites sharing this database (scripts/setup-sites-db.mjs). All five use the same
// page addresses, so a page is linked on its own website: here when it's this one, else at www.<domain>, each site's
// main address (the bare domain isn't set up on every one of them).
const HERE = new URL(SITE.url).hostname
export const siteUrl = (domain: string) => `https://www.${domain}`
export const pageHref = (domain: string | null, path: string) => (!domain || domain === HERE ? path : `${siteUrl(domain)}${path}`)
