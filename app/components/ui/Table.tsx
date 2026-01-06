// Hará UI - Table Component
// Purpose: Data display for admin lists
// Accessibility: proper table markup, mobile horizontal scroll

import { ReactNode } from 'react'

interface TableProps {
  children: ReactNode
  className?: string
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={`w-full border-collapse ${className}`}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ children }: TableProps) {
  return <thead className="bg-subtle">{children}</thead>
}

export function TableBody({ children }: TableProps) {
  return <tbody className="bg-surface divide-y divide-outline">{children}</tbody>
}

export function TableRow({ children, className = '' }: TableProps) {
  return <tr className={`hover:bg-subtle transition-colors ${className}`}>{children}</tr>
}

export function TableHead({ children, className = '' }: TableProps) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider border-b border-outline ${className}`}>
      {children}
    </th>
  )
}

export function TableCell({ children, className = '' }: TableProps) {
  return <td className={`px-4 py-3 text-sm text-foreground ${className}`}>{children}</td>
}
