import { describe, it, expect } from 'vitest'
import { publicReviewerName, cleanTagList, REVIEW_TAGS, STAR_LABELS, tagLabels } from './review-form'

describe('publicReviewerName', () => {
  it('keeps the first name and shortens the rest to an initial', () => {
    expect(publicReviewerName('  prueba claude ')).toBe('Prueba C.')
    expect(publicReviewerName('María José López')).toBe('María L.')
  })

  it('keeps a single name as is, capitalized', () => {
    expect(publicReviewerName('ana')).toBe('Ana')
  })

  it('returns null for blank or missing names', () => {
    expect(publicReviewerName('')).toBeNull()
    expect(publicReviewerName('   ')).toBeNull()
    expect(publicReviewerName(null)).toBeNull()
  })
})

describe('cleanTagList', () => {
  const [first, second] = REVIEW_TAGS.map((t) => t.key)

  it('keeps known keys once, in the order given', () => {
    expect(cleanTagList([second, first, second])).toEqual([second, first])
  })

  it('treats a missing list as no tags', () => {
    expect(cleanTagList(undefined)).toEqual([])
  })

  it('rejects unknown keys and non-lists', () => {
    expect(cleanTagList([first, 'inventado'])).toBeNull()
    expect(cleanTagList('puntual')).toBeNull()
    expect(cleanTagList([1])).toBeNull()
  })
})

describe('labels', () => {
  it('has a label for no stars and for each of the five', () => {
    expect(STAR_LABELS).toHaveLength(6)
    expect(STAR_LABELS[4]).toBe('Muy bien')
  })

  it('maps stored tag keys to their labels and skips unknown ones', () => {
    expect(tagLabels(['puntual', 'volveria', 'viejo'])).toEqual(['Puntual', 'Volvería'])
  })
})
