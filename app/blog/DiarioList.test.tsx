import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { DiarioList, type DiarioListPost } from './DiarioList'

const POSTS: DiarioListPost[] = [
  { slug: 'invierno', title: 'Lo que el invierno sabe', excerpt: 'Hay algo que el invierno sabe.', authorLabel: 'Hara Vital', isEditorial: true, coverUrl: 'https://cdn.test/invierno.jpg', minutes: 5 },
  { slug: 'preguntas', title: '5 preguntas antes de reservar', excerpt: 'Cuando algo te está pesando.', authorLabel: 'Hara Vital', isEditorial: true, coverUrl: null, minutes: 4 },
  { slug: 'match', title: 'Qué terapia va con vos', excerpt: 'A veces no sabés.', authorLabel: 'Mariana López', isEditorial: false, coverUrl: 'https://cdn.test/match.jpg', minutes: 3 },
]

describe('DiarioList', () => {
  it('should show the newest post as the featured article with its excerpt, and the rest as rows', () => {
    render(<DiarioList posts={POSTS} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Diario' })).toBeInTheDocument()

    const featured = screen.getByRole('link', { name: /Lo que el invierno sabe/ })
    expect(featured).toHaveAttribute('href', '/blog/invierno')
    expect(within(featured).getByRole('heading', { level: 2 })).toHaveTextContent('Lo que el invierno sabe')
    expect(within(featured).getByText('Hay algo que el invierno sabe.')).toBeInTheDocument()

    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByRole('link')).toHaveAttribute('href', '/blog/preguntas')
    expect(within(rows[1]).getByRole('link')).toHaveAttribute('href', '/blog/match')
    expect(within(rows[0]).queryByText('Cuando algo te está pesando.')).not.toBeInTheDocument()
  })

  it('should show each post its own reading time and author', () => {
    render(<DiarioList posts={POSTS} />)
    expect(within(screen.getByRole('link', { name: /invierno/ })).getByText('5 min de lectura')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /5 preguntas/ })).getByText('4 min de lectura')).toBeInTheDocument()
    const proRow = screen.getByRole('link', { name: /Qué terapia/ })
    expect(within(proRow).getByText('3 min de lectura')).toBeInTheDocument()
    expect(within(proRow).getByText('Mariana López')).toBeInTheDocument()
    expect(proRow.querySelector('img[src="/assets/logo/isotipo.png"]')).toBeNull()

    const editorial = screen.getByRole('link', { name: /invierno/ })
    expect(within(editorial).getByText('Hara Vital')).toBeInTheDocument()
    expect(editorial.querySelector('img[src="/assets/logo/isotipo.png"]')).not.toBeNull()
  })

  it('should render a cover only for posts that have one', () => {
    render(<DiarioList posts={POSTS} />)
    const featuredCover = screen.getByRole('link', { name: /invierno/ }).querySelector('img[src="https://cdn.test/invierno.jpg"]')
    expect(featuredCover).toHaveAttribute('alt', '')
    expect(screen.getByRole('link', { name: /Qué terapia/ }).querySelector('img[src="https://cdn.test/match.jpg"]')).not.toBeNull()
    const noCover = screen.getByRole('link', { name: /5 preguntas/ })
    expect(noCover.querySelectorAll('img')).toHaveLength(1)
    expect(noCover.querySelector('img')).toHaveAttribute('src', '/assets/logo/isotipo.png')
  })

  it('should invite people to write a note', () => {
    render(<DiarioList posts={POSTS} />)
    expect(screen.getByRole('link', { name: /escribí una nota/i })).toHaveAttribute('href', '/blog/escribir')
  })

  it('should show the empty state with the writing link when there are no posts', () => {
    render(<DiarioList posts={[]} />)
    expect(screen.getByText('Todavía no hay notas publicadas')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /escribir una nota/i })).toHaveAttribute('href', '/blog/escribir')
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
})
