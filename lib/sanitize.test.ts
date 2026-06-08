import { describe, it, expect } from 'vitest'
import { sanitizeBlogHtml, htmlToExcerpt } from './sanitize'

describe('sanitizeBlogHtml', () => {
  it('strips script tags entirely', () => {
    const result = sanitizeBlogHtml('<script>alert(1)</script><p>hi</p>')
    expect(result).not.toContain('<script')
    expect(result).not.toContain('alert(1)')
    expect(result).toContain('hi')
  })

  it('strips event handler attributes', () => {
    const result = sanitizeBlogHtml('<p onerror="bad()" onclick="evil()">text</p>')
    expect(result).not.toContain('onerror')
    expect(result).not.toContain('onclick')
    expect(result).toContain('text')
  })

  it('strips javascript: hrefs from anchors', () => {
    const result = sanitizeBlogHtml('<a href="javascript:alert(1)">click</a>')
    expect(result).not.toContain('javascript:')
    expect(result).toContain('click')
  })

  it('strips data: URIs from hrefs (common exfiltration vector)', () => {
    const result = sanitizeBlogHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>')
    expect(result).not.toContain('data:')
    expect(result).toContain('x')
  })

  it('preserves https:// hrefs and adds rel/target', () => {
    const result = sanitizeBlogHtml('<a href="https://x.com">link</a>')
    expect(result).toContain('https://x.com')
    expect(result).toContain('rel=')
    expect(result).toContain('noopener')
    expect(result).toContain('target="_blank"')
  })

  it('preserves allowed block elements: p, h2, h3, ul, ol, li, blockquote', () => {
    const html = '<h2>Heading</h2><ul><li>item</li></ul><blockquote>quote</blockquote>'
    const result = sanitizeBlogHtml(html)
    expect(result).toContain('<h2>')
    expect(result).toContain('<ul>')
    expect(result).toContain('<li>')
    expect(result).toContain('<blockquote>')
  })

  it('preserves allowed inline formatting: strong, em, u', () => {
    const html = '<p><strong>bold</strong> <em>italic</em> <u>underline</u></p>'
    const result = sanitizeBlogHtml(html)
    expect(result).toContain('<strong>')
    expect(result).toContain('<em>')
    expect(result).toContain('<u>')
  })

  it('strips disallowed tags like img, iframe, style', () => {
    const result = sanitizeBlogHtml('<img src="x" onerror="bad()"><iframe src="evil.com"></iframe><style>body{}</style><p>ok</p>')
    expect(result).not.toContain('<img')
    expect(result).not.toContain('<iframe')
    expect(result).not.toContain('<style')
    expect(result).toContain('ok')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeBlogHtml('')).toBe('')
  })
})

describe('htmlToExcerpt', () => {
  it('strips all HTML tags', () => {
    const result = htmlToExcerpt('<p><strong>Hello</strong> <em>world</em></p>')
    expect(result).toBe('Hello world')
  })

  it('truncates to max length', () => {
    const long = '<p>' + 'a'.repeat(300) + '</p>'
    const result = htmlToExcerpt(long, 100)
    expect(result.length).toBeLessThanOrEqual(103) // allows for "..."
    expect(result).toContain('...')
  })

  it('does not truncate when content is under max', () => {
    const result = htmlToExcerpt('<p>Short text</p>', 200)
    expect(result).toBe('Short text')
    expect(result).not.toContain('...')
  })

  it('collapses multiple whitespace', () => {
    const result = htmlToExcerpt('<p>Hello   world</p>')
    expect(result).not.toMatch(/\s{2,}/)
  })

  it('returns empty string for empty input', () => {
    expect(htmlToExcerpt('')).toBe('')
  })
})
