function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export default function PageLoadingSkeleton({
  variant = 'dashboard',
}: {
  variant?: 'dashboard' | 'list' | 'table';
}) {
  return (
    <div className="space-y-section" aria-busy="true" aria-label="Carregando conteúdo">
      <div className="space-y-2 border-b border-border pb-6">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="h-8 w-56" />
        <SkeletonBlock className="h-4 w-full max-w-lg" />
      </div>

      {variant === 'dashboard' ? (
        <>
          <div className="space-y-4">
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-5 w-52" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 rounded-lg border border-border bg-surface p-card shadow-subtle">
                  <SkeletonBlock className="h-3 w-24" />
                  <SkeletonBlock className="mt-4 h-7 w-16" />
                  <SkeletonBlock className="mt-2 h-3 w-36" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.85fr)] 2xl:gap-5 2xl:grid-cols-[minmax(0,1.7fr)_minmax(22rem,0.8fr)]">
            {[5, 4].map((rows, index) => (
              <div key={index} className="min-h-80 rounded-lg border border-border bg-surface p-card shadow-subtle">
                <SkeletonBlock className="h-5 w-40" />
                <div className="mt-6 space-y-4">
                  {Array.from({ length: rows }).map((__, row) => <SkeletonBlock key={row} className="h-10 w-full" />)}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : variant === 'table' ? (
        <>
          <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-surface md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="border-b border-r border-border p-4 even:border-r-0 last:col-span-2 last:border-b-0 last:border-r-0 md:col-span-1 md:border-b-0 md:even:border-r md:last:col-span-1 md:last:border-r-0">
                <SkeletonBlock className="h-3 w-20" />
                <SkeletonBlock className="mt-3 h-6 w-12" />
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <SkeletonBlock className="h-10 w-full max-w-md" />
            <div className="mt-3 flex gap-2 border-t border-border pt-3">
              {Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} className="h-7 w-20" />)}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="h-10 border-b border-border bg-surface-subtle" />
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex h-16 items-center gap-4 border-b border-border px-4 last:border-b-0">
                <SkeletonBlock className="h-9 w-9 shrink-0" />
                <div className="min-w-0 flex-1">
                  <SkeletonBlock className="h-4 w-44 max-w-full" />
                  <SkeletonBlock className="mt-2 h-3 w-64 max-w-full" />
                </div>
                <SkeletonBlock className="hidden h-5 w-20 sm:block" />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-card sm:flex-row sm:justify-between">
            <SkeletonBlock className="h-10 w-full sm:w-80" />
            <SkeletonBlock className="h-10 w-full sm:w-40" />
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-lg border border-border bg-surface">
                <SkeletonBlock className="h-48 w-full rounded-none" />
                <div className="space-y-3 p-card">
                  <SkeletonBlock className="h-5 w-2/3" />
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-4 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
