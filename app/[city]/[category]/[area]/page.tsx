import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ListingView } from '@/components/ListingView'
import { getAreaListing, getTopAreaListings } from '@/lib/data'
import { cap, cityName, plural } from '@/lib/utils'

// Neighbourhood pages ("dentists in Shibuya, Tokyo"): only areas with enough listings exist.
// ponytail: builds the 100 biggest ahead of time; the rest render on first visit and are then cached.
export async function generateStaticParams() {
  return getTopAreaListings(100)
}

export async function generateMetadata({ params }: PageProps<'/[city]/[category]/[area]'>): Promise<Metadata> {
  const { city, category, area } = await params
  const r = await getAreaListing(city, category, area)
  if (!r) return {}
  const what = plural(r.listing.niche)
  const place = `${r.area.name}, ${cityName(r.listing.city)}`
  return {
    title: `Best ${cap(what)} in ${place} (${r.items.length} listings)`,
    description: `Compare the ${r.items.length} best ${what} in ${place}: ratings, phone numbers, opening hours and directions.`,
    alternates: { canonical: `/${city}/${category}/${area}` },
  }
}

export default async function AreaPage({ params }: PageProps<'/[city]/[category]/[area]'>) {
  const { city, category, area } = await params
  const r = await getAreaListing(city, category, area)
  if (!r) notFound()
  return <ListingView listing={r.listing} items={r.items} areas={r.areas} area={r.area} />
}
