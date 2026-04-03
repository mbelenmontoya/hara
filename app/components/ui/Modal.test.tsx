import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders nothing when closed, shows title + children when open', () => {
    const { rerender } = render(<Modal open={false} onClose={vi.fn()} title="Test">Hidden</Modal>)
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()

    rerender(<Modal open={true} onClose={vi.fn()} title="Confirmar">¿Seguro?</Modal>)
    expect(screen.getByText('Confirmar')).toBeInTheDocument()
    expect(screen.getByText('¿Seguro?')).toBeInTheDocument()
  })

  it('closes via ESC key and X button', async () => {
    const onClose = vi.fn()
    render(<Modal open={true} onClose={onClose} title="Test">Content</Modal>)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByLabelText('Cerrar'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('renders optional footer', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="T" footer={<button>Confirmar</button>}>
        Body
      </Modal>
    )
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument()
  })
})
