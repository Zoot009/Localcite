'use client'
import { useEffect, useRef, useState } from 'react'

export type MapPoint = { id: string; lat: number; lng: number; title: string; address?: string; href: string; rating?: number; label?: string }

// With a Google Maps API key (.env.local) every result gets a numbered pin on one interactive map.
// Without a key we use Google's free embed, which shows one place at a time: the result you hover.
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
const GOOGLE_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'DEMO_MAP_ID' // Advanced markers need a Map ID

export function ResultsMap(props: { points: MapPoint[]; className?: string }) {
  if (!props.points.length) {
    return <div className={`grid place-items-center rounded-2xl bg-zinc-100 text-sm text-zinc-500 ${props.className ?? ''}`}>No locations to show</div>
  }
  return GOOGLE_KEY ? <PinMap {...props} /> : <EmbedMap {...props} />
}

// Result cards carry data-biz="<id>"; hovering one tells the map which place to show.
function useHoveredResult(points: MapPoint[], onHover: (id: string | null) => void, delay = 0) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const listener = (e: MouseEvent) => {
      const id = (e.target as Element | null)?.closest?.('[data-biz]')?.getAttribute('data-biz') ?? null
      if (delay && (!id || !points.some(p => p.id === id))) return
      clearTimeout(timer)
      timer = setTimeout(() => onHover(id), delay)
    }
    document.addEventListener('mouseover', listener)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mouseover', listener)
    }
  }, [points, onHover, delay])
}

// ---------- Free Google embed: one place at a time ----------

function EmbedMap({ points, className = '' }: { points: MapPoint[]; className?: string }) {
  const [activeId, setActiveId] = useState(points[0].id)
  // Wait a moment before switching, so sweeping the pointer down the list doesn't reload the map for every card.
  useHoveredResult(points, id => id && setActiveId(id), 350)
  const p = points.find(x => x.id === activeId) ?? points[0]
  // Exact coordinates with the name as the pin label: never the wrong branch of a chain.
  const query = `${p.lat},${p.lng} (${p.title})`

  // Outline the card that's on the map. Pages you navigated away from stay in the DOM (hidden), so pick the visible card.
  useEffect(() => {
    if (points.length < 2) return
    const card = [...document.querySelectorAll(`[data-biz="${CSS.escape(p.id)}"]`)].find(el => el.checkVisibility())
    card?.classList.add('is-on-map')
    return () => card?.classList.remove('is-on-map')
  }, [p.id, points.length])

  return (
    <iframe
      title={`Google map of ${p.title}`}
      src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      // Google's embed has no dark style; inverting it (and turning the hues back) gives a dark map.
      className={`w-full rounded-2xl border-0 bg-zinc-100 ring-1 ring-zinc-200 dark:hue-rotate-180 dark:invert-[0.9] ${className}`}
    />
  )
}

// ---------- Google Maps JavaScript API (needs a key): all results as numbered pins ----------

const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
let googleConfigured = false

function PinMap({ points, className = '' }: { points: MapPoint[]; className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const pins = useRef(new Map<string, { el: HTMLElement; marker: google.maps.marker.AdvancedMarkerElement }>())
  const active = useRef<string | null>(null)

  useEffect(() => {
    if (!box.current) return
    let cancelled = false
    let info: google.maps.InfoWindow | undefined
    const markers = pins.current
    ;(async () => {
      const { setOptions, importLibrary } = await import('@googlemaps/js-api-loader')
      if (!googleConfigured) setOptions({ key: GOOGLE_KEY, v: 'weekly' })
      googleConfigured = true
      const [{ Map, InfoWindow }, { AdvancedMarkerElement }, { LatLngBounds }] = await Promise.all([
        importLibrary('maps'),
        importLibrary('marker'),
        importLibrary('core'),
      ])
      if (cancelled || !box.current) return
      const map = new Map(box.current, { mapId: GOOGLE_MAP_ID, disableDefaultUI: true, zoomControl: true, gestureHandling: 'cooperative', clickableIcons: false })
      info = new InfoWindow({ headerDisabled: true })
      const bounds = new LatLngBounds()
      for (const p of points) {
        // Google positions the outer element itself, so styling (and the hover scale) lives on the inner pin.
        const wrap = document.createElement('div')
        const el = document.createElement('span')
        el.className = 'map-pin'
        el.textContent = p.label ?? ''
        wrap.appendChild(el)
        const marker = new AdvancedMarkerElement({ map, position: { lat: p.lat, lng: p.lng }, content: wrap, title: p.title, gmpClickable: true })
        marker.addEventListener('gmp-click', () => {
          info?.setContent(`<a class="map-popup" href="${esc(p.href)}"><strong>${esc(p.title)}</strong>${p.rating ? `<span>★ ${p.rating.toFixed(1)}</span>` : ''}</a>`)
          info?.open({ map, anchor: marker })
        })
        bounds.extend({ lat: p.lat, lng: p.lng })
        markers.set(p.id, { el, marker })
      }
      if (points.length === 1) {
        map.setCenter(bounds.getCenter())
        map.setZoom(15)
      } else map.fitBounds(bounds, 56)
    })().catch(err => console.warn('[map]', err))
    return () => {
      cancelled = true
      info?.close()
      for (const { marker } of markers.values()) marker.map = null
      markers.clear()
    }
  }, [points])

  useHoveredResult(points, id => {
    if (id === active.current) return
    for (const [key, on] of [[active.current, false], [id, true]] as const) {
      const pin = key ? pins.current.get(key) : undefined
      pin?.el.classList.toggle('is-active', on)
      if (pin) pin.marker.zIndex = on ? 1000 : null
    }
    active.current = id
  })

  // `isolate` keeps the map's internal z-indexes from covering the sticky header.
  return <div ref={box} role="region" aria-label="Map of results" className={`isolate overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-zinc-200 ${className}`} />
}
