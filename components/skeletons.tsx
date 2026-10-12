// Instant placeholders shown while a page's data streams in (used by the loading.tsx files).
const Bar = ({ className = '' }: { className?: string }) => <div className={`animate-pulse rounded-lg bg-zinc-200/70 ${className}`} />

function ResultRow() {
  return (
    <div className="card flex gap-4 p-4 sm:gap-5 sm:p-5">
      <Bar className="size-24 shrink-0 rounded-xl sm:size-40" />
      <div className="flex-1 space-y-3 pt-1">
        <Bar className="h-5 w-1/2" />
        <Bar className="h-4 w-40" />
        <Bar className="h-4 w-2/3" />
        <Bar className="h-4 w-full max-w-md" />
      </div>
    </div>
  )
}

export function ListingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="mx-auto max-w-7xl px-4 py-8">
      <Bar className="h-4 w-48" />
      <Bar className="mt-5 h-9 w-full max-w-md" />
      <Bar className="mt-3 h-4 w-72" />
      <div className="mt-6 flex gap-2">
        {[0, 1, 2, 3, 4].map(i => <Bar key={i} className="h-9 w-28 rounded-full" />)}
      </div>
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">{[0, 1, 2, 3].map(i => <ResultRow key={i} />)}</div>
        <Bar className="hidden h-64 rounded-2xl lg:block" />
      </div>
    </div>
  )
}

export function CitySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="border-b border-zinc-200 bg-gradient-to-b from-brand-50 to-page">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <Bar className="h-4 w-40" />
          <Bar className="mt-5 h-11 w-full max-w-lg" />
          <Bar className="mt-4 h-5 w-80" />
          <Bar className="mt-8 h-12 w-full max-w-3xl rounded-xl" />
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="card flex items-center gap-4 p-4">
            <Bar className="size-12 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Bar className="h-4 w-2/3" />
              <Bar className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BizSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div data-theme="light" className="h-72 animate-pulse bg-zinc-800 sm:h-96" />
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-10 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="flex gap-3">
            <Bar className="h-10 w-36" />
            <Bar className="h-10 w-24" />
            <Bar className="h-10 w-36" />
          </div>
          <Bar className="mt-6 h-6 w-48" />
          <Bar className="h-4 w-full" />
          <Bar className="h-4 w-5/6" />
          <Bar className="mt-6 h-56 w-full rounded-2xl" />
        </div>
        <Bar className="h-56 rounded-2xl" />
      </div>
    </div>
  )
}
