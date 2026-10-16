import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SolicitarForm, type SolicitarFormProps } from './SolicitarForm'
import { createLead } from '@/app/actions/create-lead'

vi.mock('@/app/actions/create-lead', () => ({ createLead: vi.fn() }))
vi.mock('@/app/components/PlacesAutocomplete', () => ({
  PlacesAutocomplete: ({ onChange, placeholder }: { onChange: (v: string, d?: unknown) => void; placeholder: string }) => (
    <input
      placeholder={placeholder}
      data-testid="place-input"
      onChange={(e) =>
        onChange(e.target.value, { city: 'Rosario', country: 'Argentina', countryCode: 'AR', formattedAddress: 'Rosario, Argentina' })
      }
    />
  ),
}))

const PROPS: SolicitarFormProps = {
  cards: [
    { key: 'estres-ansiedad', label: 'Estrés y ansiedad', count: 12 },
    { key: 'duelo-perdidas', label: 'Duelo y pérdidas', count: 1 },
  ],
  situations: [
    { key: 'pareja', label: 'Pareja' },
    { key: 'autoconocimiento', label: 'Autoconocimiento' },
  ],
  latestPost: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})

async function goToStep2(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Estrés y ansiedad/ }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
}

describe('SolicitarForm', () => {
  it('should start on step 1 with the real cards and chips, and keep Continuar disabled until one is picked', async () => {
    const user = userEvent.setup()
    render(<SolicitarForm {...PROPS} />)
    expect(screen.getByText('Paso 1 de 4')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cerrar' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('button', { name: /Estrés y ansiedad.*12 profesionales/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Duelo y pérdidas.*1 profesional$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Pareja' }))
    expect(screen.getByRole('button', { name: 'Pareja' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Atrás' })).not.toBeInTheDocument()
  })

  it('should ask for a place only for presencial and ambos on step 2', async () => {
    const user = userEvent.setup()
    render(<SolicitarForm {...PROPS} />)
    await goToStep2(user)
    expect(screen.getByText('Paso 2 de 4')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Online' }))
    expect(screen.queryByTestId('place-input')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Presencial' }))
    expect(screen.getByTestId('place-input')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()

    await user.type(screen.getByTestId('place-input'), 'R')
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()
  })

  it('should go back to step 1 with the picks kept', async () => {
    const user = userEvent.setup()
    render(<SolicitarForm {...PROPS} />)
    await goToStep2(user)
    await user.click(screen.getByRole('button', { name: 'Atrás' }))
    expect(screen.getByText('Paso 1 de 4')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Estrés y ansiedad/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('should let people pick several schedules and type a budget on step 2', async () => {
    const user = userEvent.setup()
    render(<SolicitarForm {...PROPS} />)
    await goToStep2(user)
    await user.click(screen.getByRole('button', { name: 'Mañana' }))
    await user.click(screen.getByRole('button', { name: 'Noche' }))
    expect(screen.getByRole('button', { name: 'Mañana' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Noche' })).toHaveAttribute('aria-pressed', 'true')
    await user.type(screen.getByLabelText('Mínimo'), '15000')
    expect(screen.getByLabelText('Mínimo')).toHaveValue('15000')
    expect(screen.getByLabelText('Moneda')).toHaveValue('USD')
  })

  describe('steps 3 and 4 and sending', () => {
    const VALID_WHATSAPP = '+5491123456789'

    async function goToStep4(user: ReturnType<typeof userEvent.setup>) {
      await goToStep2(user)
      await user.click(screen.getByRole('button', { name: 'Online' }))
      await user.click(screen.getByRole('button', { name: 'Noche' }))
      await user.click(screen.getByRole('button', { name: 'Continuar' }))
      expect(screen.getByText('Paso 3 de 4')).toBeInTheDocument()
      await user.type(screen.getByLabelText('Con tus palabras'), 'Duermo mal hace meses')
      await user.click(screen.getByRole('button', { name: 'No' }))
      await user.click(screen.getByRole('button', { name: 'Me gustaría empezar pronto' }))
      await user.click(screen.getByRole('button', { name: 'Continuar' }))
      expect(screen.getByText('Paso 4 de 4')).toBeInTheDocument()
    }

    async function fillContact(user: ReturnType<typeof userEvent.setup>, overrides: { whatsapp?: string; email?: string } = {}) {
      await user.type(screen.getByLabelText('Tu nombre'), 'Sol')
      await user.type(screen.getByLabelText('WhatsApp'), overrides.whatsapp ?? VALID_WHATSAPP)
      await user.type(screen.getByLabelText('Email'), overrides.email ?? 'sol@example.com')
    }

    it('should send exactly the mapped answers through createLead', async () => {
      vi.mocked(createLead).mockResolvedValue({ lead_id: 'abcd1234-0000-0000-0000-000000000000' })
      const user = userEvent.setup()
      render(<SolicitarForm {...PROPS} />)
      await goToStep4(user)
      await fillContact(user)
      await user.click(screen.getByRole('checkbox'))
      await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }))

      expect(createLead).toHaveBeenCalledTimes(1)
      expect(vi.mocked(createLead).mock.calls[0][0]).toStrictEqual({
        intent_tags: ['estres-ansiedad'],
        country: 'AR',
        city: undefined,
        online_ok: true,
        modality_preference: ['online'],
        budget_min: undefined,
        budget_max: undefined,
        currency: 'USD',
        urgency: 'medium',
        whatsapp: VALID_WHATSAPP,
        email: 'sol@example.com',
        additional_context: 'Nombre: Sol\nHorario: Noche\nFue con alguien antes: No\n\nDuermo mal hace meses',
      })
      expect(await screen.findByText('Solicitud ABCD1234')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Listo, Sol.')
      expect(screen.queryByText('Paso 4 de 4')).not.toBeInTheDocument()
    })

    it('should keep Enviar disabled without the name, the checkbox, or a valid WhatsApp and email', async () => {
      const user = userEvent.setup()
      render(<SolicitarForm {...PROPS} />)
      await goToStep4(user)
      const send = () => screen.getByRole('button', { name: 'Enviar solicitud' })

      await user.type(screen.getByLabelText('WhatsApp'), VALID_WHATSAPP)
      await user.type(screen.getByLabelText('Email'), 'sol@example.com')
      await user.click(screen.getByRole('checkbox'))
      expect(send()).toBeDisabled()

      await user.type(screen.getByLabelText('Tu nombre'), 'Sol')
      expect(send()).toBeEnabled()

      await user.click(screen.getByRole('checkbox'))
      expect(send()).toBeDisabled()
      await user.click(screen.getByRole('checkbox'))

      await user.clear(screen.getByLabelText('WhatsApp'))
      await user.type(screen.getByLabelText('WhatsApp'), '+5491112')
      expect(send()).toBeDisabled()
      expect(screen.getByText(/El número no parece válido/)).toBeInTheDocument()
      await user.clear(screen.getByLabelText('WhatsApp'))
      await user.type(screen.getByLabelText('WhatsApp'), VALID_WHATSAPP)

      await user.clear(screen.getByLabelText('Email'))
      await user.type(screen.getByLabelText('Email'), 'sol@example')
      expect(send()).toBeDisabled()
      expect(screen.getByText('El email no parece válido')).toBeInTheDocument()
    })

    it('should list the answers in the summary and go back to step 1 with Editar', async () => {
      const user = userEvent.setup()
      render(<SolicitarForm {...PROPS} />)
      await goToStep4(user)
      const summary = screen.getByRole('region', { name: 'Tu solicitud' })
      expect(summary).toHaveTextContent('Estrés y ansiedad')
      expect(summary).toHaveTextContent('Online')
      expect(summary).toHaveTextContent('Noche')
      expect(summary).toHaveTextContent('Me gustaría empezar pronto')
      expect(summary).not.toHaveTextContent('Zona')

      await user.click(screen.getByRole('button', { name: 'Editar' }))
      expect(screen.getByText('Paso 1 de 4')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Estrés y ansiedad/ })).toHaveAttribute('aria-pressed', 'true')
    })

    it('should show the error and keep the form filled when sending fails', async () => {
      vi.mocked(createLead).mockRejectedValue(new Error('Failed to create lead'))
      const user = userEvent.setup()
      render(<SolicitarForm {...PROPS} />)
      await goToStep4(user)
      await fillContact(user)
      await user.click(screen.getByRole('checkbox'))
      await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }))

      expect(await screen.findByText('Hubo un error. Intentá de nuevo.')).toBeInTheDocument()
      expect(screen.getByLabelText('Tu nombre')).toHaveValue('Sol')
      expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeEnabled()
    })
  })
})
