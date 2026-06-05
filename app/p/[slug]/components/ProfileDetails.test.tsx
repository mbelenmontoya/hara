import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileDetails } from './ProfileDetails'

describe('ProfileDetails', () => {
  const emptyProps = {
    specialties: [],
    practiceLabels: [],
    serviceTypeLabels: [],
    modalityLabels: [],
  }

  it('returns null when all arrays are empty', () => {
    const { container } = render(<ProfileDetails {...emptyProps} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows Especialidades section only when specialties present', () => {
    render(<ProfileDetails {...emptyProps} specialties={['ansiedad', 'duelo']} />)
    expect(screen.getByText(/especialidades/i)).toBeInTheDocument()
    expect(screen.queryByText(/tipo de servicio/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/modalidad/i)).not.toBeInTheDocument()
  })

  it('shows Tipo de servicio only when serviceTypeLabels present', () => {
    render(<ProfileDetails {...emptyProps} serviceTypeLabels={['Sesiones individuales']} />)
    expect(screen.getByText(/tipo de servicio/i)).toBeInTheDocument()
    expect(screen.getByText('Sesiones individuales')).toBeInTheDocument()
    expect(screen.queryByText(/especialidades/i)).not.toBeInTheDocument()
  })

  it('shows Modalidad only when modalityLabels present', () => {
    render(<ProfileDetails {...emptyProps} modalityLabels={['Online', 'Presencial']} />)
    expect(screen.getByText(/modalidad/i)).toBeInTheDocument()
    expect(screen.queryByText(/especialidades/i)).not.toBeInTheDocument()
  })

  it('shows all sections when all arrays have data', () => {
    render(
      <ProfileDetails
        specialties={['ansiedad']}
        practiceLabels={['Reiki']}
        serviceTypeLabels={['Sesiones individuales']}
        modalityLabels={['Online']}
      />
    )
    expect(screen.getByText(/especialidades/i)).toBeInTheDocument()
    expect(screen.getByText(/tipo de servicio/i)).toBeInTheDocument()
    expect(screen.getByText(/modalidad/i)).toBeInTheDocument()
  })
})
