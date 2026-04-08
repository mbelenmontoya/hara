// Shared admin filter bar — search input + status/month dropdown
// Used by Leads, Professionals, and PQLs list pages

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
}

export function AdminFilterBar({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  statusOptions,
  statusValue,
  onStatusChange,
  resultCount,
}: AdminFilterBarProps) {
  const countLabel = resultCount === 1 ? '1 resultado' : `${resultCount} resultados`

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-9 py-2.5 bg-surface border border-outline rounded-xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Status / month dropdown */}
        <select
          value={statusValue}
          onChange={(e) => onStatusChange(e.target.value)}
          className="sm:w-48 px-3 py-2.5 bg-surface border border-outline rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
        >
          <option value="">Todos</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-muted">{countLabel}</p>
    </div>
  )
}
