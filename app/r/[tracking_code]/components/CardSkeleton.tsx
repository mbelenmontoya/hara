// Loading state for the concierge Carta: the almanac background with three card placeholders.

export function LoadingSkeleton() {
  return (
    <main className="min-h-screen bg-background" aria-busy="true" aria-label="Cargando tu carta">
      <div className="mx-auto w-full max-w-md animate-pulse px-4 pt-6 md:max-w-xl">
        <div className="mx-auto h-10 w-14 rounded-lg bg-surface-2" />
        <div className="mt-6 h-11 w-4/5 rounded-xl bg-surface-2" />
        <ul className="mb-0 mt-[26px] flex list-none flex-col gap-4 p-0">
          {[1, 2, 3].map((n) => (
            <li key={n} className="overflow-hidden rounded-[26px] bg-gray-50 shadow-soft">
              <div className="h-[190px] bg-surface-2" />
              <div className="space-y-3 p-[18px]">
                <div className="h-3 w-1/3 rounded bg-surface-2" />
                <div className="h-6 w-2/3 rounded bg-surface-2" />
                <div className="h-11 rounded-[15px] bg-surface-2" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
