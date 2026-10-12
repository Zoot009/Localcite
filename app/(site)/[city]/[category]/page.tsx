import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ListingView } from '@/components/ListingView'
import { getListing, getListingAreas, getTopListings } from '@/lib/data'
import { cap, cityName, plural } from '@/lib/utils'

// ponytail: builds the 200 biggest lists ahead of time; the other ~22k render on first visit and are then cached.
export async function generateStaticParams() {
  return getTopListings(200)
}

export async function generateMetadata({ params }: PageProps<'/[city]/[category]'>): Promise<Metadata> {
  const { city, category } = await params
  const l = await getListing(city, category)
  if (!l) return {}
  const what = plural(l.niche)
  return {
    title: `Best ${cap(what)} in ${cityName(l.city)} (${l.items.length} listings)`,
    description: `Compare the ${l.items.length} best ${what} in ${l.city}: ratings, phone numbers, opening hours and directions.`,
    alternates: { canonical: `/${city}/${category}` },
  }
}

export default async function CategoryPage({ params }: PageProps<'/[city]/[category]'>) {
  const { city, category } = await params
  const [l, areas] = await Promise.all([getListing(city, category), getListingAreas(city, category)])
  if (!l) notFound()
  return <ListingView listing={l} items={l.items} areas={areas} />
}
