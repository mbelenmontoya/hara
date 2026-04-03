// Tests for the Modal component
// Covers: open/closed state, title, children, ESC key, overlay click, footer

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={vi.fn()} title="Test">Content</Modal>)
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders title and children when open', () => {
    render(<Modal open={true} onClose={vi.fn()} title="Confirmar acción">¿Estás seguro?</Modal>)
    expect(screen.getByText('Confirmar acción')).toBeInTheDocument()
    expect(screen.getByText('¿Estás seguro?')).toBeInTheDocument()
  })

  it('calls onClose when ESC key is pressed', async () => {
    const onClose = vi.fn()
    render(<Modal open={true} onClose={onClose} title="Test">Content</Modal>)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when clicking the X button', async () => {
    const onClose = vi.fn()
    render(<Modal open={true} onClose={onClose} title="Test">Content</Modal>)
    await userEvent.click(screen.getByLabelText('Cerrar'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders optional footer content', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test" footer={<button>Confirmar</button>}>
        Content
      </Modal>
    )
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument()
  })
})
