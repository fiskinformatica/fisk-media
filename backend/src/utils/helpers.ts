/**
 * Error response helpers
 */
export function errorResponse(message: string, status: number, code?: string): Response {
  return new Response(
    JSON.stringify({ ok: false, error: message, ...(code ? { code } : {}) }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

export function successResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Month key: "YYYY-MM"
 */
export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function shiftMonth(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

export function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

/**
 * Deterministic 4-digit PIN from a seed string.
 * Matches the algorithm used by the original frontend accessService.js.
 */
export function pinFromSeed(seed: string): string {
  let hash = 7
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1_000_003
  }
  return String((hash * 7 + 13) % 10_000).padStart(4, '0')
}

export function generateMonthlyPin(salt: string, date: Date = new Date()): string {
  return pinFromSeed(`${monthKeyOf(date)}:${salt}`)
}

/**
 * Natural sort comparator matching Intl.Collator('pt-BR', { numeric: true })
 */
const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' })

export function naturalCompare(a: string, b: string): number {
  return collator.compare(a, b)
}

/**
 * Simple bcrypt-compatible password hashing using SubtleCrypto (PBKDF2).
 * We use PBKDF2-SHA256 with 100_000 iterations, compatible with WebCrypto.
 *
 * Note: For production use, consider using a proper bcrypt library.
 * Cloudflare Workers don't support Node's bcrypt, so we use WebCrypto PBKDF2.
 */
export async function hashPassword(password: string, saltBytes?: Uint8Array): Promise<string> {
  const encoder = new TextEncoder()
  const salt = saltBytes ?? crypto.getRandomValues(new Uint8Array(16))

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: 100_000,
    },
    keyMaterial,
    256,
  )

  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('')
  const hashHex = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('')

  return `pbkdf2sha256:100000:${saltHex}:${hashHex}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split(':')
    if (parts.length !== 4 || parts[0] !== 'pbkdf2sha256') return false

    const saltHex = parts[2]

    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)))
    const expected = await hashPassword(password, salt)

    // Constant-time comparison
    return timingSafeEqual(stored, expected)
  } catch {
    return false
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/**
 * Simple JWT implementation using WebCrypto HMAC-SHA256.
 */
export async function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSeconds = 86400,
): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSeconds, iat: Math.floor(Date.now() / 1000) }))
  const unsigned = `${header}.${body}`

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(unsigned))
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `${unsigned}.${sigBase64}`
}

export async function verifyJwt(
  token: string,
  secret: string,
): Promise<Record<string, unknown> | null> {
  try {
    const [header, body, sig] = token.split('.')
    if (!header || !body || !sig) return null

    const unsigned = `${header}.${body}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    // Convert base64url back to binary
    const sigBin = atob(sig.replace(/-/g, '+').replace(/_/g, '/'))
    const sigBytes = new Uint8Array(sigBin.length)
    for (let i = 0; i < sigBin.length; i++) sigBytes[i] = sigBin.charCodeAt(i)

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(unsigned))
    if (!valid) return null

    const payload = JSON.parse(atob(body)) as Record<string, unknown>
    const exp = payload['exp'] as number | undefined
    if (exp && exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}

/**
 * Get client IP from Cloudflare headers
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'
  )
}
