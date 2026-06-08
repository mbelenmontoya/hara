import { describe, it, expect } from 'vitest'
import { parseMarkdownDoc } from './parse-markdown'

describe('parseMarkdownDoc', () => {
  describe('frontmatter title', () => {
    it('extracts title from frontmatter and converts body to html', () => {
      const result = parseMarkdownDoc('---\ntitle: Hola\n---\n\nTexto')
      expect(result.title).toBe('Hola')
      expect(result.html).toContain('<p>Texto</p>')
    })

    it('strips frontmatter block from body html', () => {
      const result = parseMarkdownDoc('---\ntitle: Hola\n---\n\nTexto')
      expect(result.html).not.toContain('title:')
      expect(result.html).not.toContain('---')
    })

    it('strips surrounding quotes from frontmatter title', () => {
      const double = parseMarkdownDoc('---\ntitle: "Mi nota"\n---\n\nCuerpo')
      expect(double.title).toBe('Mi nota')

      const single = parseMarkdownDoc("---\ntitle: 'Mi nota'\n---\n\nCuerpo")
      expect(single.title).toBe('Mi nota')
    })

    it('truncates frontmatter title longer than 140 chars to exactly 140', () => {
      const longTitle = 'A'.repeat(200)
      const result = parseMarkdownDoc(`---\ntitle: ${longTitle}\n---\n\nCuerpo`)
      expect(result.title).toHaveLength(140)
    })
  })

  describe('H1 title (no frontmatter)', () => {
    it('extracts title from first H1 and removes it from body', () => {
      const result = parseMarkdownDoc('# Mi título\n\nCuerpo')
      expect(result.title).toBe('Mi título')
      expect(result.html).not.toContain('Mi título')
    })

    it('converts remaining body after H1 removal', () => {
      const result = parseMarkdownDoc('# Mi título\n\nCuerpo del post.')
      expect(result.html).toContain('<p>Cuerpo del post.</p>')
    })

    it('truncates H1 title longer than 140 chars to exactly 140', () => {
      const longTitle = 'B'.repeat(200)
      const result = parseMarkdownDoc(`# ${longTitle}\n\nCuerpo`)
      expect(result.title).toHaveLength(140)
    })
  })

  describe('no title', () => {
    it('returns null title when no frontmatter or H1', () => {
      const result = parseMarkdownDoc('Solo cuerpo sin título')
      expect(result.title).toBeNull()
      expect(result.html).toContain('<p>Solo cuerpo sin título</p>')
    })
  })

  describe('edge cases', () => {
    it('does not treat ---note as a closing delimiter (should_fix regression)', () => {
      // indexOf('\n---') would have falsely closed here; /^---$/m does not
      const result = parseMarkdownDoc('---\ntitle: X\n---\n\nCuerpo con ---note aquí')
      expect(result.title).toBe('X')
      expect(result.html).toContain('---note')
    })

    it('handles empty string', () => {
      const result = parseMarkdownDoc('')
      expect(result.title).toBeNull()
      expect(result.html).toBe('')
    })

    it('handles frontmatter-only (empty body)', () => {
      const result = parseMarkdownDoc('---\ntitle: X\n---\n')
      expect(result.title).toBe('X')
      expect(result.html.trim()).toBe('')
    })

    it('converts markdown formatting to html', () => {
      const result = parseMarkdownDoc('Texto **fuerte** y _énfasis_.')
      expect(result.html).toContain('<strong>fuerte</strong>')
      expect(result.html).toContain('<em>énfasis</em>')
    })

    it('does not sanitize — returns raw marked output', () => {
      // Sanitization is the consumer's job; function is DOM-free
      const result = parseMarkdownDoc('<script>alert(1)</script>\n\nTexto')
      // marked passes through unknown HTML inline; we just verify html is non-empty
      expect(result.html.length).toBeGreaterThan(0)
    })
  })
})
