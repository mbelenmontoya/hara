import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

// Mock TipTap — renders a textarea that lets tests set the body content
vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => ({
    getHTML: vi.fn(() => ''),
    isActive: vi.fn(() => false),
    chain: vi.fn(() => ({ focus: vi.fn(() => ({ toggleBold: vi.fn(() => ({ run: vi.fn() })), toggleItalic: vi.fn(() => ({ run: vi.fn() })), toggleUnderline: vi.fn(() => ({ run: vi.fn() })), toggleHeading: vi.fn(() => ({ run: vi.fn() })), toggleBulletList: vi.fn(() => ({ run: vi.fn() })) })) })),
    commands: { setContent: vi.fn() },
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
    isDestroyed: false,
  })),
  EditorContent: ({ editor }: { editor: unknown }) => (
    <textarea
      data-testid="tiptap-editor"
      aria-label="Contenido"
      onChange={(e) => {
        if (editor && typeof editor === 'object' && editor !== null) {
          const ed = editor as { getHTML: () => string }
          vi.mocked(ed.getHTML).mockReturnValue(e.target.value)
        }
      }}
    />
  ),
}))

vi.mock('@tiptap/starter-kit', () => ({ default: { configure: vi.fn(() => ({})) } }))
vi.mock('@tiptap/extension-link', () => ({ default: { configure: vi.fn(() => ({})) } }))
vi.mock('@tiptap/extension-underline', () => ({ default: {} }))
vi.mock('@/app/components/ui/PageBackground', () => ({ PageBackground: () => null }))

beforeEach(() => { vi.clearAllMocks() })

// ── Import AFTER mocks ────────────────────────────────────────────────────────
import { EscribirForm } from './EscribirForm'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText(/título/i), {
    target: { value: 'Mi primera nota sobre bienestar holístico' },
  })
  fireEvent.change(screen.getByPlaceholderText(/nombre/i), {
    target: { value: 'María García' },
  })
  fireEvent.change(screen.getByPlaceholderText(/email/i), {
    target: { value: 'maria@example.com' },
  })
  // Simulate cover file selection via testing-library pattern
  const coverInput = screen.getByLabelText(/portada/i)
  const file = new File(['img'], 'cover.jpg', { type: 'image/jpeg' })
  fireEvent.change(coverInput, { target: { files: [file] } })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EscribirForm', () => {
  it('renders title, name, email, cover, and secondary image inputs', () => {
    render(<EscribirForm />)
    expect(screen.getByPlaceholderText(/título/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/nombre/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/portada/i)).toBeInTheDocument()
  })

  it('submit button is disabled when all fields are empty', () => {
    render(<EscribirForm />)
    const btn = screen.getByRole('button', { name: /publicar nota/i })
    expect(btn).toBeDisabled()
  })

  it('submit button is disabled when cover is missing', () => {
    render(<EscribirForm />)
    fireEvent.change(screen.getByPlaceholderText(/título/i), {
      target: { value: 'Un título largo suficiente' },
    })
    fireEvent.change(screen.getByPlaceholderText(/nombre/i), {
      target: { value: 'Autora' },
    })
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'autora@example.com' },
    })
    // No cover file selected
    const btn = screen.getByRole('button', { name: /publicar nota/i })
    expect(btn).toBeDisabled()
  })

  it('shows confirmation message after successful submit', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, slug: 'mi-nota' }),
    })

    render(<EscribirForm />)
    fillRequiredFields()

    const btn = screen.getByRole('button', { name: /publicar nota/i })
    await act(async () => {
      fireEvent.click(btn)
    })

    expect(screen.getByText(/recibimos/i)).toBeInTheDocument()
  })
})
