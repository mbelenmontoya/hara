import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { MarkdownUpload } from './MarkdownUpload'

vi.mock('./parse-markdown', () => ({
  parseMarkdownDoc: vi.fn(),
}))

vi.mock('@/lib/sanitize', () => ({
  sanitizeBlogHtml: vi.fn(),
}))

import { parseMarkdownDoc } from './parse-markdown'
import { sanitizeBlogHtml } from '@/lib/sanitize'

const mockParseMarkdownDoc = parseMarkdownDoc as ReturnType<typeof vi.fn>
const mockSanitizeBlogHtml = sanitizeBlogHtml as ReturnType<typeof vi.fn>

function makeMdFile(content: string, name = 'post.md') {
  return new File([content], name, { type: 'text/markdown' })
}

describe('MarkdownUpload', () => {
  let onParsed: ReturnType<typeof vi.fn>
  let onError: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onParsed = vi.fn()
    onError = vi.fn()
    vi.clearAllMocks()
  })

  it('renders a file input', () => {
    render(<MarkdownUpload onParsed={onParsed} onError={onError} />)
    expect(screen.getByLabelText('Subir archivo Markdown')).toBeInTheDocument()
  })

  it('rejects a non-.md file and calls onError', async () => {
    render(<MarkdownUpload onParsed={onParsed} onError={onError} />)
    const input = screen.getByLabelText('Subir archivo Markdown')
    const txtFile = new File(['contenido'], 'notas.txt', { type: 'text/plain' })

    // Use fireEvent to bypass the browser-level accept filter — our code checks
    // the extension in handleChange (the accept attr is a picker-UI hint only).
    Object.defineProperty(input, 'files', { value: [txtFile], configurable: true })
    fireEvent.change(input)

    expect(onError).toHaveBeenCalledWith('Solo se aceptan archivos .md')
    expect(onParsed).not.toHaveBeenCalled()
  })

  it('accepts .md file and calls onParsed with title and html', async () => {
    mockParseMarkdownDoc.mockReturnValue({ title: 'Mi título', html: '<p>Cuerpo</p>' })
    mockSanitizeBlogHtml.mockReturnValue('<p>Cuerpo</p>')

    const user = userEvent.setup()
    render(<MarkdownUpload onParsed={onParsed} onError={onError} />)
    const input = screen.getByLabelText('Subir archivo Markdown')

    await user.upload(input, makeMdFile('# Mi título\n\nCuerpo'))

    await waitFor(() => {
      expect(onParsed).toHaveBeenCalledWith({ title: 'Mi título', html: '<p>Cuerpo</p>' })
    })
    expect(onError).not.toHaveBeenCalled()
  })

  it('calls onError when sanitized body is empty', async () => {
    mockParseMarkdownDoc.mockReturnValue({ title: 'X', html: '' })
    mockSanitizeBlogHtml.mockReturnValue('')

    const user = userEvent.setup()
    render(<MarkdownUpload onParsed={onParsed} onError={onError} />)
    const input = screen.getByLabelText('Subir archivo Markdown')

    await user.upload(input, makeMdFile('---\ntitle: X\n---\n'))

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('El contenido del archivo está vacío.')
    })
    expect(onParsed).not.toHaveBeenCalled()
  })

  it('calls onError when sanitized html exceeds 50 000 chars', async () => {
    const bigHtml = 'x'.repeat(50_001)
    mockParseMarkdownDoc.mockReturnValue({ title: null, html: bigHtml })
    mockSanitizeBlogHtml.mockReturnValue(bigHtml)

    const user = userEvent.setup()
    render(<MarkdownUpload onParsed={onParsed} onError={onError} />)
    const input = screen.getByLabelText('Subir archivo Markdown')

    await user.upload(input, makeMdFile('x'.repeat(50_001)))

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        'El contenido es demasiado largo (límite: 50 000 caracteres).'
      )
    })
    expect(onParsed).not.toHaveBeenCalled()
  })

  it('shows preview after successful upload', async () => {
    mockParseMarkdownDoc.mockReturnValue({ title: 'T', html: '<p>Contenido del post.</p>' })
    mockSanitizeBlogHtml.mockReturnValue('<p>Contenido del post.</p>')

    const user = userEvent.setup()
    render(<MarkdownUpload onParsed={onParsed} onError={onError} />)
    const input = screen.getByLabelText('Subir archivo Markdown')

    await user.upload(input, makeMdFile('# T\n\nContenido del post.'))

    await waitFor(() => {
      expect(screen.getByText('Contenido del post.')).toBeInTheDocument()
    })
  })
})
