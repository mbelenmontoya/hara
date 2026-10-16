import { describe, it, expect } from 'vitest'
import { readingMinutes, nextPost } from './diario'

function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `palabra${i}`).join(' ')
}

describe('readingMinutes', () => {
  it('should return 1 when the html is empty or has only tags', () => {
    expect(readingMinutes('')).toBe(1)
    expect(readingMinutes('<p></p>')).toBe(1)
  })

  it('should round up to the next minute at 200 words per minute', () => {
    expect(readingMinutes(`<p>${words(200)}</p>`)).toBe(1)
    expect(readingMinutes(`<p>${words(201)}</p>`)).toBe(2)
    expect(readingMinutes(`<p>${words(600)}</p>`)).toBe(3)
  })

  it('should not count words inside tag attributes', () => {
    const attrHeavy = `<a href="${words(300)}">tres</a>`
    expect(readingMinutes(attrHeavy)).toBe(1)
  })

  it('should count words split only by tags as separate words', () => {
    expect(readingMinutes(`<p>${words(150)}</p><p>${words(100)}</p>`)).toBe(2)
  })
})

describe('nextPost', () => {
  const posts = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }]

  it('should return the post after the current one', () => {
    expect(nextPost(posts, 'a')).toEqual({ slug: 'b' })
    expect(nextPost(posts, 'b')).toEqual({ slug: 'c' })
  })

  it('should wrap from the last post to the first', () => {
    expect(nextPost(posts, 'c')).toEqual({ slug: 'a' })
  })

  it('should return null when there is only one post or the slug is unknown', () => {
    expect(nextPost([{ slug: 'a' }], 'a')).toBeNull()
    expect(nextPost(posts, 'zzz')).toBeNull()
  })
})
