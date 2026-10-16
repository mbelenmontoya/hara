import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileDetails, ProfileDetailRows } from './ProfileDetails'

describe('ProfileDetails (specialty tiles)', () => {
  it('renders nothing when there are no specialties', () => {
    const { container } = render(<ProfileDetails specialties={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows each curated specialty with its Spanish label', () => {
    render(<ProfileDetails specialties={['estres-ansiedad', 'duelo-perdidas']} />)
    expect(screen.getByText('PARA CUANDO LLEGAS CON')).toBeInTheDocument()
    expect(screen.getByText('Estrés y ansiedad')).toBeInTheDocument()
    expect(screen.getByText('Duelo y pérdidas')).toBeInTheDocument()
  })
})

describe('ProfileDetailRows', () => {
  const empty = { serviceTypeLabels: [], modalityLabels: [], location: '' }

  it('renders nothing when every row is empty', () => {
    const { container } = render(<ProfileDetailRows {...empty} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows only the rows that have data, each with its value', () => {
    render(<ProfileDetailRows {...empty} modalityLabels={['Online', 'Presencial']} />)
    expect(screen.getByText('Modalidad')).toBeInTheDocument()
    expect(screen.getByText('Online, Presencial')).toBeInTheDocument()
    expect(screen.queryByText('Servicio')).not.toBeInTheDocument()
    expect(screen.queryByText('Dónde')).not.toBeInTheDocument()
  })

  it('shows service type and location rows', () => {
    render(
      <ProfileDetailRows
        serviceTypeLabels={['Sesiones individuales', 'Sesiones grupales']}
        modalityLabels={[]}
        location="Mendoza, Argentina"
      />
    )
    expect(screen.getByText('Sesiones individuales y Sesiones grupales')).toBeInTheDocument()
    expect(screen.getByText('Mendoza, Argentina')).toBeInTheDocument()
  })
})
