// Hará Match - Validation Utilities
// Purpose: Validate client inputs for billing-critical events
// Security: Never trust client data, validate all formats

export function extractClientIP(req: Request): string | null {
  const cfIP = req.headers.get('cf-connecting-ip')
  const realIP = req.headers.get('x-real-ip')
  const forwarded = req.headers.get('x-forwarded-for')

  if (cfIP) return validateIPFormat(cfIP)
  if (realIP) return validateIPFormat(realIP)
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim())
    return validateIPFormat(ips[0])  // First IP is client
  }
  return null
}

function validateIPFormat(ip: string): string | null {
  ip = ip.replace(/^\[|\]$/g, '').trim()
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6 = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/
  return (ipv4.test(ip) || ipv6.test(ip)) ? ip : null
}

export function validateFingerprint(fp: string | undefined): string | null {
  if (!fp) return null
  // Must be SHA256 hex (64 lowercase hex chars)
  return /^[a-f0-9]{64}$/.test(fp) ? fp : null
}

export function validateSessionId(sid: string | undefined): string | null {
  if (!sid) return null
  // Must be UUID v4
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sid) ? sid : null
}
