import type { ReactNode, SVGProps } from 'react'
import { SITE } from '@/lib/site'

type P = SVGProps<SVGSVGElement>

const icon = (paths: ReactNode) =>
  function Icon(p: P) {
    return (
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
        {paths}
      </svg>
    )
  }

export const SearchIcon = icon(<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>)
export const PinIcon = icon(<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>)
export const PhoneIcon = icon(<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />)
export const MailIcon = icon(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>)
export const GlobeIcon = icon(<><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>)
export const ClockIcon = icon(<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>)
export const DirectionsIcon = icon(<path d="M3 11l19-9-9 19-2-8-8-2z" />)
export const ShareIcon = icon(<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" /></>)
export const CheckIcon = icon(<path d="M20 6 9 17l-5-5" />)
export const CheckCircleIcon = icon(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" /></>)
export const PencilIcon = icon(<><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>)
export const ChevronRightIcon = icon(<path d="m9 18 6-6-6-6" />)
export const ChevronLeftIcon = icon(<path d="m15 18-6-6 6-6" />)
export const ChevronDownIcon = icon(<path d="m6 9 6 6 6-6" />)
export const MenuIcon = icon(<path d="M3 12h18M3 6h18M3 18h18" />)
export const ThumbsUpIcon = icon(<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />)
export const PlusIcon = icon(<path d="M12 5v14M5 12h14" />)
export const ShieldIcon = icon(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>)
export const BriefcaseIcon = icon(<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>)
export const ExternalIcon = icon(<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6M10 14 21 3" /></>)
export const InfoIcon = icon(<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>)

export function StarIcon(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden {...p}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

// Brand mark: a white map pin with a check (a place you can trust) on a solid indigo tile. The pin is a circle whose
// bottom quarter comes to a point; the check is drawn in the tile colour. Same mark as the favicon, app/icon.svg.
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden className={`grid size-8 shrink-0 place-items-center rounded-[10px] bg-brand-600 ${className}`}>
      <svg viewBox="0 0 24 24" width={24} height={24}>
        <path fill="#fff" d="M12 21.31 6.34 15.66A8 8 0 1 1 17.66 15.66Z" />
        <path d="M8.6 10.1l2.3 2.3 4.6-4.7" fill="none" stroke="var(--color-brand-600)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

// The site name in two tones, its last word in brand indigo (LocalCompany + Guide), so a long name reads at a glance.
export function Wordmark() {
  const [, head, tail] = SITE.name.match(/^(.*?)([A-Z][a-z]*)$/) ?? [null, SITE.name, '']
  return (
    <span className="font-display font-extrabold tracking-[-0.03em] text-zinc-900">
      {head}
      <span className="text-brand-600">{tail}</span>
    </span>
  )
}
