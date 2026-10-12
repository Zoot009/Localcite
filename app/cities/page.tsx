import type { Metadata } from 'next'
import { CityDirectory, type DirectoryCountry } from '@/components/client'
import { Breadcrumbs, CityTile } from '@/components/ui'
import { getCities } from '@/lib/data'
import { slugify } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'All cities',
  description: 'Browse top-rated local businesses in cities around the world.',
  alternates: { canonical: '/cities' },
}

// Continents by ISO country code; a code missing here lands in "Other".
const REGIONS: [string, string][] = [
  ['Asia', 'ae af am az bd bh bn bt cn cy ge hk id il in iq ir jo jp kg kh kp kr kw kz la lb lk mm mn mo mv my np om ph pk ps qa sa sg sy th tj tl tm tr tw uz vn ye'],
  ['Europe', 'ad al at ba be bg by ch cz de dk ee es fi fo fr gb gi gr hr hu ie is it li lt lu lv mc md me mk mt nl no pl pt ro rs ru se si sk sm ua va xk'],
  ['Africa', 'ao bf bi bj bw cd cf cg ci cm cv dj dz eg er et ga gh gm gn gq gw ke km lr ls ly ma mg ml mr mu mw mz na ne ng rw sc sd sl sn so ss st sz td tg tn tz ug za zm zw'],
  ['North America', 'ag bb bs bz ca cr cu dm do gd gt hn ht jm kn lc mx ni pa pr sv tt us vc'],
  ['South America', 'ar bo br cl co ec gy pe py sr uy ve'],
  ['Oceania', 'au fj fm ki mh nc nr nz pf pg pw sb to tv vu ws'],
]

export default async function CitiesPage() {
  const cities = await getCities() // busiest first

  // Region → country → cities (busiest first), regions in the order above.
  const regions = new Map<string, Map<string, DirectoryCountry>>([...REGIONS.map(([name]) => [name, new Map()] as const), ['Other', new Map()]])
  for (const c of cities) {
    const countries = regions.get(REGIONS.find(([, codes]) => codes.split(' ').includes(c.countryCode))?.[0] ?? 'Other')!
    const country = countries.get(c.countryCode) ?? { name: c.country, code: c.countryCode, cities: [] }
    country.cities.push({ name: c.name, slug: c.slug, count: c.count })
    countries.set(c.countryCode, country)
  }
  const directory = [...regions]
    .filter(([, countries]) => countries.size)
    .map(([name, countries]) => ({ name, slug: slugify(name), countries: [...countries.values()].sort((a, b) => a.name.localeCompare(b.name)) }))
  const countryCount = new Set(cities.map(c => c.countryCode)).size

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Cities' }]} />
      <h1 className="mt-4 text-4xl font-bold tracking-tight">Explore cities</h1>
      <p className="mt-2 max-w-2xl text-zinc-600">
        {cities.length} cities in {countryCount} countries. Pick one to see its best-rated restaurants, hotels, clinics and more.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">Popular cities</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Four on phones, eight from tablet up. */}
        {cities.slice(0, 8).map((c, i) => <CityTile key={c.slug} c={c} className={`h-44 sm:h-52 ${i >= 4 ? 'hidden sm:block' : ''}`} />)}
      </div>

      <div className="mt-14">
        <CityDirectory regions={directory} />
      </div>
    </div>
  )
}
