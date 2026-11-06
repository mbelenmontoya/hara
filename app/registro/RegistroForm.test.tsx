import { StrictMode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RegistroForm } from './RegistroForm'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))
// The city field: typing "Buenos Aires" picks the place, like a click on a Google suggestion
vi.mock('@/app/components/PlacesAutocomplete', () => ({
  PlacesAutocomplete: ({ placeholder, onChange }: { placeholder?: string; onChange: (v: string, p?: unknown) => void }) => (
    <input
      placeholder={placeholder}
      onChange={(e) =>
        onChange(e.target.value, e.target.value === 'Buenos Aires' ? { city: 'Buenos Aires', countryCode: 'AR', lat: -34.6, lng: -58.4 } : undefined)
      }
    />
  ),
}))
vi.mock('@/app/registro/components/SpecialtySelector', () => ({
  SpecialtySelector: ({ onChange }: { onChange: (s: string[]) => void }) => (
    <button type="button" onClick={() => onChange(['estres-ansiedad'])}>Elegir especialidad</button>
  ),
}))
vi.mock('@/app/components/PracticePicker', () => ({ PracticePicker: () => <div /> }))

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('scrollTo', vi.fn())
})

const continueBtn = () => screen.getByRole('button', { name: 'Continuar' })

function fillStepOne(password = 'clave-segura-1') {
  fireEvent.change(screen.getByPlaceholderText('Ej: María García López'), { target: { value: 'Sol Luna' } })
  fireEvent.change(screen.getByPlaceholderText('tu@email.com'), { target: { value: 'sol@test.com' } })
  fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: password } })
  fireEvent.change(screen.getByPlaceholderText('Buscar ciudad...'), { target: { value: 'Buenos Aires' } })
  fireEvent.change(screen.getByPlaceholderText('1123456789'), { target: { value: '1123456789' } })
}

function goToLastStep() {
  fillStepOne()
  fireEvent.click(continueBtn())
  expect(screen.getByRole('heading', { name: 'Perfil profesional' })).toHaveFocus()
  fireEvent.click(screen.getByRole('button', { name: 'Online' }))
  fireEvent.click(screen.getByRole('button', { name: 'Elegir especialidad' }))
  fireEvent.click(continueBtn())
  fireEvent.click(continueBtn())
  fireEvent.change(screen.getByPlaceholderText(/Contá tu enfoque/), { target: { value: 'x'.repeat(60) } })
}

describe('RegistroForm', () => {
  it('keeps step 1 closed until the password has 8 characters, and says so', () => {
    render(<RegistroForm practices={[]} />)
    expect(continueBtn()).toBeDisabled()

    // Everything else filled, password empty: still closed
    fillStepOne('')
    expect(continueBtn()).toBeDisabled()
    expect(screen.getByText('Completá nombre, email, contraseña, ciudad y WhatsApp para seguir.')).toBeInTheDocument()

    fillStepOne('1234567')
    expect(continueBtn()).toBeDisabled()
    expect(screen.getByText('La contraseña tiene que tener al menos 8 caracteres.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: '12345678' } })
    expect(continueBtn()).toBeEnabled()
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: 'x'.repeat(73) } })
    expect(continueBtn()).toBeDisabled()
    expect(screen.getByText('La contraseña puede tener hasta 72 caracteres.')).toBeInTheDocument()
  })

  it('sends the application with the password and shows the confirmation with the name and email', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    render(<RegistroForm practices={[]} />)
    goToLastStep()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))

    expect(await screen.findByText(/Solicitud/, { selector: 'h1' })).toHaveFocus()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/professionals/register')
    const body = init.body as FormData
    expect(body.get('password')).toBe('clave-segura-1')
    expect(body.get('email')).toBe('sol@test.com')
    expect(body.get('city')).toBe('Buenos Aires')
    expect(JSON.parse(body.get('modality') as string)).toEqual(['online'])
    expect(screen.getByText('sol@test.com')).toBeInTheDocument()
    expect(screen.getByText(/Gracias, Sol\./)).toBeInTheDocument()
  })

  it('shows the server message above the buttons and stays on the last step when the API refuses', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'Ya tenés una cuenta con este email.' }) })
    render(<RegistroForm practices={[]} />)
    goToLastStep()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya tenés una cuenta con este email.')
    expect(screen.getByText('PASO 4 DE 4')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeEnabled())
  })

  it('keeps the photo preview valid after going back and returning to step 4 in StrictMode', () => {
    let nextUrl = 0
    const revoked = new Set<string>()
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL() { return `blob:photo-${++nextUrl}` }
      static revokeObjectURL(url: string) { revoked.add(url) }
    })
    const { container } = render(<StrictMode><RegistroForm practices={[]} /></StrictMode>)
    goToLastStep()
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [new File(['image'], 'photo.png', { type: 'image/png' })] },
    })
    expect(screen.getByAltText('Vista previa')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
    fireEvent.click(continueBtn())
    const previewUrl = screen.getByAltText('Vista previa').getAttribute('src')!
    expect(revoked.has(previewUrl)).toBe(false)
    expect(revoked.size).toBeGreaterThan(0)
  })
})
