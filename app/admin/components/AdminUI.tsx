// Small presentational pieces shared by the almanac admin pages (design 13).
// Title, cream card, status badge, loading skeleton and the empty / no-results cards.

import type { ReactNode } from 'react'

/** Primary action button classes (deep terracotta). */
export const ADMIN_BTN_PRIMARY =
  'inline-flex flex-none items-center justify-center whitespace-nowrap rounded-[14px] bg-brand-dark px-[17px] py-[11px] text-[14px] font-medium text-gray-50 transition-opacity hover:opacity-90 disabled:opacity-60'

/** Secondary (outlined) button classes. */
export const ADMIN_BTN_SECONDARY =
  'inline-flex flex-none items-center justify-center whitespace-nowrap rounded-[14px] border-[1.5px] border-foreground/18 px-[15px] py-[9.5px] text-[14px] font-medium text-foreground transition-colors hover:bg-foreground/5'

/** Back link above a detail title ("← Solicitudes"). */
export const ADMIN_BACK_LINK = 'mb-3.5 inline-flex text-[13.5px] font-medium text-brand-dark hover:underline'

/** Page title (serif) with an optional line below it. */
export function AdminTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-[18px]">
      <h1 className="font-almanac-serif mb-0 text-[46px] leading-none tracking-[-0.5px]">{children}</h1>
      {sub && <p className="mt-[7px] text-[14px] text-muted">{sub}</p>}
    </div>
  )
}

/** Cream card used for list items and detail sections. */
export function AdminCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 rounded-[22px] bg-gray-50 px-[22px] py-5 ${className}`}>{children}</div>
}

/** Serif section title inside a card. */
export function AdminCardTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-almanac-serif mb-2 text-[24px] leading-[1.1]">{children}</h2>
}

// Spanish status label → token colors (design 13 status colors mapped to existing tokens)
const STATUS_TONE: Record<string, string> = {
  Nuevo: 'bg-brand-weak text-brand-dark',
  Matcheado: 'bg-info-weak text-info-dark',
  Contactado: 'bg-sp-cyan-weak text-sp-cyan',
  Convertido: 'bg-success-weak text-success-dark',
  Cerrado: 'bg-surface-2 text-gray-700',
  'Pendiente de revisión': 'bg-warning-weak text-warning-dark',
  Activo: 'bg-success-weak text-success-dark',
  Rechazado: 'bg-danger-weak text-danger-dark',
  Borrador: 'bg-surface-2 text-gray-700',
  Pausado: 'bg-info-weak text-info-dark',
  Activa: 'bg-success-weak text-success-dark',
  Inactiva: 'bg-surface-2 text-gray-700',
  Pendiente: 'bg-warning-weak text-warning-dark',
  Publicada: 'bg-success-weak text-success-dark',
  Rechazada: 'bg-danger-weak text-danger-dark',
  'Hara Vital': 'bg-brand-weak text-brand-dark',
  Visible: 'bg-success-weak text-success-dark',
  Oculta: 'bg-surface-2 text-gray-700',
}

/** Rounded status pill; unknown labels fall back to the neutral tone. */
export function StatusBadge({ label }: { label: string }) {
  const tone = STATUS_TONE[label] ?? 'bg-surface-2 text-gray-700'
  return (
    <span className={`flex-none whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-medium ${tone}`}>{label}</span>
  )
}

const SKELETON_OPACITY = [1, 0.75, 0.5]

/** Three fading placeholder cards plus "Cargando…". */
export function AdminSkeleton() {
  return (
    <div className="flex flex-col gap-2.5" aria-busy="true">
      {SKELETON_OPACITY.map((opacity) => (
        <div key={opacity} className="flex flex-col gap-2.5 rounded-[20px] bg-gray-50 p-5" style={{ opacity }}>
          <div className="h-3 w-[38%] rounded-md bg-surface-2" />
          <div className="h-[18px] w-[64%] rounded-md bg-surface-2" />
          <div className="h-2.5 w-[24%] rounded-md bg-surface-2" />
        </div>
      ))}
      <p className="pt-1 text-center text-[12.5px] text-gray-500">Cargando…</p>
    </div>
  )
}

/** Centered message card for an empty list. */
export function AdminEmpty({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="rounded-[22px] bg-gray-50 px-6 py-[34px] text-center">
      <h2 className="font-almanac-serif mb-0 text-[26px] leading-[1.1]">{title}</h2>
      <p className="mt-2 text-[14px] leading-normal text-gray-700">{text}</p>
      {children && <div className="mt-3.5 flex justify-center">{children}</div>}
    </div>
  )
}

/** "Sin resultados" card with a button that clears the search and filters. */
export function AdminNoResults({ onClear, text = 'Probá con otra búsqueda o con otro estado.' }: { onClear: () => void; text?: string }) {
  return (
    <AdminEmpty title="Sin resultados" text={text}>
      <button type="button" onClick={onClear} className={ADMIN_BTN_SECONDARY}>
        Limpiar búsqueda
      </button>
    </AdminEmpty>
  )
}

/** Muted italic line for a field the person left empty. */
export function EmptyText({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`italic text-gray-500 ${className}`}>{children}</span>
}

/** "2 oct 2026" style date used across the admin. A bare "YYYY-MM-DD" is read as a local date. */
export function formatAdminDate(iso: string): string {
  // Built from parts: browsers render es-AR as "6 de jun de 2026", and the design wants "6 jun 2026"
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso)
  const month = d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')
  return `${d.getDate()} ${month} ${d.getFullYear()}`
}

/** Selectable pill (filters, currency, period, method). Ink when selected. */
export function AdminPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex-none whitespace-nowrap rounded-full border-[1.5px] px-[13px] py-[7px] text-[13px] font-medium transition-colors ${
        active ? 'border-foreground bg-foreground text-background' : 'border-foreground/18 text-foreground hover:bg-foreground/5'
      }`}
    >
      {label}
    </button>
  )
}

/** Terracotta error box with the "!" mark, as in the design. */
export function AdminError({ text }: { text: string }) {
  return (
    <div role="alert" className="mt-3.5 flex items-center gap-2.5 rounded-[13px] bg-danger-weak px-[13px] py-[11px]">
      <span className="h-[18px] w-[18px] flex-none rounded-full bg-danger-dark text-center text-[12px] font-semibold leading-[18px] text-gray-50" aria-hidden="true">
        !
      </span>
      <p className="text-[13.5px] leading-[1.4] text-danger-dark">{text}</p>
    </div>
  )
}
