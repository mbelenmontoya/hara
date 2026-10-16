import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ConciergeConfirmation } from './ConciergeConfirmation'

const LEAD_ID = 'abcd1234-5678-90ab-cdef-000000000000'
const POST = { slug: 'dormir-mejor', title: 'Dormir mejor sin pastillas', coverUrl: null, minutes: 6 }

describe('ConciergeConfirmation', () => {
  it('should show the request number, the name and the WhatsApp number, and the four steps with the first done', () => {
    render(<ConciergeConfirmation leadId={LEAD_ID} name="Sol" whatsapp="+5491123456789" latestPost={POST} />)

    expect(screen.getByText('Solicitud ABCD1234')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Listo, Sol.')
    expect(screen.getByText(/Te escribimos al \+5491123456789 en menos de 48 horas\./)).toBeInTheDocument()

    const steps = within(screen.getByRole('list', { name: 'Lo que sigue' })).getAllByRole('listitem')
    expect(steps.map((s) => s.querySelector('h3')?.textContent)).toEqual([
      'Recibimos tu solicitud',
      'La lee una persona del equipo',
      'Te mandamos tus tres',
      'Vos elegís y les escribís',
    ])
    expect(within(steps[0]).getByRole('img', { name: 'Hecho' })).toBeInTheDocument()
    steps.slice(1).forEach((s) => expect(within(s).queryByRole('img', { name: 'Hecho' })).not.toBeInTheDocument())
  })

  it('should link "Mientras tanto" to the latest post with its reading time', () => {
    render(<ConciergeConfirmation leadId={LEAD_ID} name="Sol" whatsapp="+5491123456789" latestPost={POST} />)
    const link = screen.getByRole('link', { name: /Dormir mejor sin pastillas/ })
    expect(link).toHaveAttribute('href', '/blog/dormir-mejor')
    expect(link).toHaveTextContent('En el Diario · 6 min')
  })

  it('should leave out "Mientras tanto" when there is no post, and never show an emergency line or an edit link', () => {
    render(<ConciergeConfirmation leadId={LEAD_ID} name="Sol" whatsapp="+5491123456789" latestPost={null} />)
    expect(screen.queryByText('Mientras tanto')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/800 911|Editar mi solicitud/)
  })
})
