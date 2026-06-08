import { marked } from 'marked'

const TITLE_MAX = 140

interface ParsedDoc {
  title: string | null
  html: string
}

/**
 * Parse raw markdown text into { title, html }.
 *
 * Title resolution order:
 *   1. YAML frontmatter `title:` value
 *   2. First `# H1` line (which is then removed from the body)
 *   3. null (no title found)
 *
 * Title is clamped to 140 chars. Body conversion uses marked with default
 * config. This function is pure / DOM-free — sanitization is the caller's job.
 */
export function parseMarkdownDoc(raw: string): ParsedDoc {
  let body = raw
  let rawTitle: string | null = null

  // ── 1. Frontmatter extraction ────────────────────────────────────────────
  if (raw.startsWith('---\n')) {
    // Match only a line that is *exactly* '---' (not '---note', '--- ', etc.)
    const rest = raw.slice(4)
    const closingMatch = /^---$/m.exec(rest)
    if (closingMatch !== null) {
      const frontmatter = rest.slice(0, closingMatch.index)
      const titleMatch = frontmatter.match(/^title:\s*(.+)$/m)
      if (titleMatch) {
        rawTitle = titleMatch[1].trim().replace(/^["']|["']$/g, '')
      }
      body = rest.slice(closingMatch.index + 3) // skip past the closing '---'
    }
  }

  // ── 2. H1 extraction (only when no frontmatter title) ───────────────────
  if (rawTitle === null) {
    const h1Match = body.match(/^#\s+(.+)$/m)
    if (h1Match) {
      rawTitle = h1Match[1].trim()
      // Remove only the matched H1 line from the body
      body = body.replace(h1Match[0], '').trimStart()
    }
  }

  // ── 3. Single-exit clamp ─────────────────────────────────────────────────
  const title = rawTitle !== null ? rawTitle.slice(0, TITLE_MAX) : null

  // ── 4. Convert body markdown → HTML ─────────────────────────────────────
  const html = body.trim() ? (marked.parse(body.trim()) as string) : ''

  return { title, html }
}
