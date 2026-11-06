import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { AlmanacBottomNav } from './AlmanacBottomNav'

describe('AlmanacBottomNav', () => {
  it('shows Inicio, Diario, Ayuda and the single professional access without a duplicate search entry', () => {
    render(<AlmanacBottomNav active="diario" />)
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(nav).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Inicio', '/'],
      ['Diario', '/blog'],
      ['Ayuda', '/que-es-hara'],
      ['Ingresar', '/pro/login'],
    ])
    expect(within(nav).getByRole('link', { name: 'Diario' })).toHaveAttribute('aria-current', 'page')
    for (const name of ['Inicio', 'Ayuda', 'Ingresar']) {
      expect(within(nav).getByRole('link', { name })).not.toHaveAttribute('aria-current')
    }
  })
})
