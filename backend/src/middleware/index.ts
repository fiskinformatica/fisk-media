import type { Context, Next } from 'hono'
import type { Env } from '../types.js'
import { getClientIp, verifyJwt } from '../utils/helpers.js'

// Hono variable types for admin context
type AdminVariables = {
  adminId: string
  adminUsername: string
}

/**
 * CORS middleware — allows requests from the configured frontend URL.
 */
export function corsMiddleware(env: Env) {
  const configuredOrigin = env.FRONTEND_URL || 'http://localhost:5173'

  return async (c: Context, next: Next): Promise<Response | void> => {
    // Get the actual request origin
    const requestOrigin = c.req.header('Origin') || configuredOrigin
    
    // Allow any origin if configured as '*', otherwise use configured origin
    const origin = configuredOrigin === '*' ? requestOrigin : configuredOrigin

    // Handle preflight
    if (c.req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
          'Access-Control-Allow-Credentials': 'true',
        },
      })
    }

    await next()

    c.res.headers.set('Access-Control-Allow-Origin', origin)
    c.res.headers.set('Access-Control-Allow-Credentials', 'true')
  }
}

/**
 * Admin authentication middleware.
 * Verifies the JWT from the Authorization: Bearer <token> header.
 */
export async function requireAdmin(
  c: Context<{ Bindings: Env; Variables: AdminVariables }>,
  next: Next,
): Promise<Response | void> {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ ok: false, error: 'Autenticação necessária.' }, 401)
  }

  const token = authHeader.slice(7)
  const payload = await verifyJwt(token, c.env.JWT_SECRET)

  if (!payload || payload['role'] !== 'admin') {
    return c.json({ ok: false, error: 'Token inválido ou expirado.' }, 401)
  }

  // Attach admin info to context
  c.set('adminId', payload['sub'] as string)
  c.set('adminUsername', payload['username'] as string)

  await next()
}

/**
 * Teacher or Admin authentication middleware.
 * Accepts both teacher and admin roles.
 */
export async function requireTeacherOrAdmin(
  c: Context<{ Bindings: Env }>,
  next: Next,
): Promise<Response | void> {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ ok: false, error: 'Autenticação necessária.' }, 401)
  }

  const token = authHeader.slice(7)
  const payload = await verifyJwt(token, c.env.JWT_SECRET)

  if (!payload || (payload['role'] !== 'admin' && payload['role'] !== 'teacher')) {
    return c.json({ ok: false, error: 'Token inválido ou expirado.' }, 401)
  }

  await next()
}

/**
 * Rate limiting middleware using D1.
 * Allows up to `maxAttempts` per `windowSeconds` for a given key prefix.
 */
export function rateLimitMiddleware(options: {
  keyPrefix: string
  maxAttempts: number
  windowSeconds: number
}) {
  return async (c: Context<{ Bindings: Env }>, next: Next): Promise<Response | void> => {
    const ip = getClientIp(c.req.raw)
    const key = `${options.keyPrefix}:${ip}`
    const db = c.env.DB
    const now = new Date().toISOString()

    try {
      // Get or create rate limit record
      const record = await db
        .prepare(`SELECT attempts, window_start FROM rate_limits WHERE key = ?`)
        .bind(key)
        .first<{ attempts: number; window_start: string }>()

      if (record) {
        const windowStart = new Date(record.window_start).getTime()
        const windowElapsed = (Date.now() - windowStart) / 1000

        if (windowElapsed > options.windowSeconds) {
          // Reset window
          await db
            .prepare(`UPDATE rate_limits SET attempts = 1, window_start = ? WHERE key = ?`)
            .bind(now, key)
            .run()
        } else if (record.attempts >= options.maxAttempts) {
          const retryAfter = Math.ceil(options.windowSeconds - windowElapsed)
          return c.json(
            { ok: false, error: 'Muitas tentativas. Tente novamente mais tarde.', retryAfter },
            429,
          )
        } else {
          await db
            .prepare(`UPDATE rate_limits SET attempts = attempts + 1 WHERE key = ?`)
            .bind(key)
            .run()
        }
      } else {
        await db
          .prepare(`INSERT OR REPLACE INTO rate_limits (key, attempts, window_start) VALUES (?, 1, ?)`)
          .bind(key, now)
          .run()
      }
    } catch {
      // Rate limiting is best-effort; don't block requests if DB fails
    }

    await next()
  }
}
