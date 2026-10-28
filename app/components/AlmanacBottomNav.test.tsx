import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlmanacBottomNav } from './AlmanacBottomNav'

function tab(name: string): HTMLElement {
  return within(screen.getByRole('navigation', { name: 'Principal' })).getByRole(name === 'Buscar' ? 'button' : 'link', { name })
}

describe('AlmanacBottomNav', () => {
  it('links Inicio, Diario and Ayuda to their pages and marks only the active one', () => {
    render(<AlmanacBottomNav active="diario" />)
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(nav).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Inicio', '/'],
      ['Buscar', '/#buscar'],
      ['Diario', '/blog'],
      ['Ayuda', '/que-es-hara'],
    ])
    expect(within(nav).getByRole('link', { name: 'Diario' })).toHaveAttribute('aria-current', 'page')
    for (const name of ['Inicio', 'Buscar', 'Ayuda']) {
      expect(within(nav).getByRole('link', { name })).not.toHaveAttribute('aria-current')
    }
  })

  it('opens the search in place when the page gives it a way to', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    render(<AlmanacBottomNav active="inicio" onSearch={onSearch} />)
    expect(tab('Inicio')).toHaveAttribute('aria-current', 'page')
    expect(tab('Ayuda')).not.toHaveAttribute('aria-current')

    await user.click(tab('Buscar'))
    expect(onSearch).toHaveBeenCalledTimes(1)
  })
})
