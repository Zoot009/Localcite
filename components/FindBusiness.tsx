import Form from 'next/form'
import Link from 'next/link'
import { search } from '@/lib/data'
import { SearchIcon } from './icons'
import { BizImage } from './ui'

// "Find your business" box used by the claim and write-a-review flows.
export async function FindBusiness({ action, find, hrefFor, cta }: { action: string; find?: string; hrefFor: (slug: string) => string; cta: string }) {
  const results = find ? (await search({ q: find })).results.slice(0, 8) : []
  return (
    <div>
      <Form action={action} scroll={false} role="search" className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Business name</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-400" />
          <input name="find" defaultValue={find} placeholder="Business name, e.g. Sai Dental Clinic" className="input py-3 pl-11" />
        </label>
        <button type="submit" className="btn btn-primary px-6">Find</button>
      </Form>
      {find && (
        <div className="mt-6">
          {results.length ? (
            <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-surface">
              {results.map(b => (
                <li key={b.key} className="flex items-center gap-4 p-4">
                  <BizImage biz={b} className="size-14 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{b.title}</p>
                    <p className="truncate text-sm text-zinc-500">{b.address}</p>
                  </div>
                  <Link href={hrefFor(b.slug)} className="btn btn-outline shrink-0">{cta}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-600">
              No businesses match “{find}”.{' '}
              <Link href="/add-business" className="font-semibold text-brand-700 hover:underline">Add it to the directory</Link>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
