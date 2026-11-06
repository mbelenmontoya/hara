// Shared admin filter bar: search input plus status (or month) pills
// Used by Leads, Professionals, Blog, Reseñas and PQLs list pages

import { AdminPill } from '@/app/admin/components/AdminUI'

interface StatusOption {
  value: string
  label: string
}

interface AdminFilterBarProps {
  searchPlaceholder: string
  searchValue: string
  onSearchChange: (value: string) => void
  statusOptions: StatusOption[]
  statusValue: string
  onStatusChange: (value: string) => void
  resultCount: number
  /** Label of the pill that clears the status filter; null hides it (Blog has no "Todos"). */
  allLabel?: string | null
}

export function AdminFilterBar({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  statusOptions,
  statusValue,
  onStatusChange,
  resultCount,
  allLabel = 'Todos',
}: AdminFilterBarProps) {
  const countLabel = resultCount === 1 ? '1 resultado' : `${resultCount} resultados`

  const pills = allLabel === null ? statusOptions : [{ value: '', label: allLabel }, ...statusOptions]

  return (
    <div className="mb-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {/* Search input */}
        <div className="flex min-w-0 items-center gap-2.5 rounded-[14px] bg-gray-50 px-3.5 shadow-[inset_0_0_0_1.5px] shadow-foreground/10 md:w-[340px] md:flex-none">
          <svg className="h-4 w-4 flex-none text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent py-3 text-[15px] text-foreground outline-none placeholder:text-gray-500"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Limpiar texto"
              className="flex-none text-gray-500 transition-colors hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Status / month pills */}
        <div className="flex min-w-0 gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {pills.map((opt) => (
            <AdminPill key={opt.value || 'all'} label={opt.label} active={statusValue === opt.value} onClick={() => onStatusChange(opt.value)} />
          ))}
        </div>
      </div>

      <p className="mt-2 text-[13px] text-muted">{countLabel}</p>
    </div>
  )
}
