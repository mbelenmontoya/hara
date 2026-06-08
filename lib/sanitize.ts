// Blog HTML sanitization — server-side only.
// Strips all content except a strict allowlist matching the TipTap editor config.
// Used: (1) before storing body_html in the DB (Task 3 API) and
//       (2) on render of stored body_html (Tasks 8/9) — defense-in-depth.
// Requires Node runtime; do NOT import in Edge functions.

import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a']
const ALLOWED_ATTR = ['href', 'rel', 'target']

// Only http/https/mailto hrefs — blocks javascript: and data: URIs
const ALLOWED_URI_REGEXP = /^(?:https?|mailto):/i

/** Sanitize TipTap-authored HTML to a strict allowlist before storage or render. */
export function sanitizeBlogHtml(html: string): string {
  if (!html) return ''

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
    FORCE_BODY: true,
  })

  // Add rel + target to every anchor that survived sanitization.
  // DOMPurify strips href-less anchors so we only process ones with an href.
  return clean.replace(
    /<a\b([^>]*)>/gi,
    (_match, attrs: string) => {
      const withoutRel = attrs.replace(/\s*rel="[^"]*"/gi, '').replace(/\s*target="[^"]*"/gi, '')
      return `<a${withoutRel} rel="noopener noreferrer nofollow" target="_blank">`
    }
  )
}

/** Strip all HTML tags and return plain-text excerpt, truncated to `max` chars. */
export function htmlToExcerpt(html: string, max = 200): string {
  if (!html) return ''

  const text = DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '...'
}
