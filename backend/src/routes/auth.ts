import { Hono } from 'hono'
import type { Env } from '../types.js'
import { hashPassword, signJwt, verifyPassword } from '../utils/helpers.js'
import { rateLimitMiddleware } from '../middleware/index.js'

const app = new Hono<{ Bindings: Env }>()

/**
 * POST /api/auth/teacher
 * Authenticates a teacher with PIN and returns a JWT.
 *
 * Body: { pin: string }
 */
app.post(
  '/teacher',
  rateLimitMiddleware({ keyPrefix: 'teacher_pin', maxAttempts: 10, windowSeconds: 300 }),
  async (c) => {
    let body: { pin?: string }

    try {
      body = await c.req.json<{ pin?: string }>()
    } catch {
      return c.json({ ok: false, error: 'Corpo da requisição inválido.' }, 400)
    }

    const { pin } = body

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return c.json({ ok: false, error: 'PIN deve ter 4 dígitos.' }, 400)
    }

    try {
      const teacherPin = await c.env.DB
        .prepare(`SELECT id, pin_hash FROM teacher_pins WHERE active = 1 ORDER BY created_at DESC LIMIT 1`)
        .first<{ id: number; pin_hash: string }>()

      // Constant-time: always verify even if no PIN exists (prevent timing attacks)
      const dummyHash = 'pbkdf2sha256:100000:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000'
      const valid = teacherPin
        ? await verifyPassword(pin, teacherPin.pin_hash)
        : await verifyPassword(pin, dummyHash)

      if (!teacherPin || !valid) {
        return c.json({ ok: false, error: 'PIN incorreto.' }, 401)
      }

      const token = await signJwt(
        { sub: 'teacher', role: 'teacher' },
        c.env.JWT_SECRET,
        86400 * 7, // 7 days
      )

      return c.json({
        ok: true,
        data: {
          token,
          role: 'teacher',
          expiresIn: 86400 * 7,
        },
      })
    } catch (err) {
      const error = err as Error
      console.error('Teacher login error:', error.message)
      return c.json({ ok: false, error: 'Erro interno ao autenticar.' }, 500)
    }
  },
)

/**
 * POST /api/auth/admin
 * Authenticates an admin with PIN and returns a JWT.
 *
 * Body: { pin: string }
 */
app.post(
  '/admin',
  rateLimitMiddleware({ keyPrefix: 'admin_pin', maxAttempts: 5, windowSeconds: 300 }),
  async (c) => {
    let body: { pin?: string }

    try {
      body = await c.req.json<{ pin?: string }>()
    } catch {
      return c.json({ ok: false, error: 'Corpo da requisição inválido.' }, 400)
    }

    const { pin } = body

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return c.json({ ok: false, error: 'PIN deve ter 4 dígitos.' }, 400)
    }

    try {
      const adminPin = await c.env.DB
        .prepare(`SELECT id, pin_hash FROM admin_pin WHERE active = 1 ORDER BY created_at DESC LIMIT 1`)
        .first<{ id: number; pin_hash: string }>()

      // Constant-time: always verify even if no PIN exists (prevent timing attacks)
      const dummyHash = 'pbkdf2sha256:100000:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000'
      const valid = adminPin
        ? await verifyPassword(pin, adminPin.pin_hash)
        : await verifyPassword(pin, dummyHash)

      if (!adminPin || !valid) {
        return c.json({ ok: false, error: 'PIN incorreto.' }, 401)
      }

      const token = await signJwt(
        { sub: 'admin', role: 'admin' },
        c.env.JWT_SECRET,
        86400 * 7, // 7 days
      )

      return c.json({
        ok: true,
        data: {
          token,
          role: 'admin',
          expiresIn: 86400 * 7,
        },
      })
    } catch (err) {
      const error = err as Error
      console.error('Admin login error:', error.message)
      return c.json({ ok: false, error: 'Erro interno ao autenticar.' }, 500)
    }
  },
)

/**
 * POST /api/auth/setup
 * Creates the initial admin and teacher PINs. Only works once.
 * Must be called once after deployment with ADMIN_SETUP_KEY secret.
 *
 * Body: { adminPin: string; teacherPin: string; setupKey: string }
 */
app.post('/setup', async (c) => {
  let body: { adminPin?: string; teacherPin?: string; setupKey?: string }

  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'Corpo da requisição inválido.' }, 400)
  }

  const { adminPin, teacherPin, setupKey } = body

  if (!adminPin || !teacherPin || !setupKey) {
    return c.json({ ok: false, error: 'adminPin, teacherPin e setupKey são obrigatórios.' }, 400)
  }

  if (!/^\d{4}$/.test(adminPin) || !/^\d{4}$/.test(teacherPin)) {
    return c.json({ ok: false, error: 'PINs devem ter 4 dígitos.' }, 400)
  }

  // setupKey must match the ADMIN_SETUP_KEY secret
  const expectedKey = (c.env as Env & { ADMIN_SETUP_KEY?: string }).ADMIN_SETUP_KEY
  if (!expectedKey || setupKey !== expectedKey) {
    return c.json({ ok: false, error: 'Setup key inválida.' }, 403)
  }

  try {
    // Only allow setup if no admin PIN exists
    const existingAdmin = await c.env.DB
      .prepare(`SELECT COUNT(*) as count FROM admin_pin`)
      .first<{ count: number }>()

    if ((existingAdmin?.count ?? 0) > 0) {
      return c.json({ ok: false, error: 'PINs já foram configurados.' }, 409)
    }

    const adminPinHash = await hashPassword(adminPin)
    const teacherPinHash = await hashPassword(teacherPin)

    await c.env.DB
      .prepare(`INSERT INTO admin_pin (pin_hash, active) VALUES (?, 1)`)
      .bind(adminPinHash)
      .run()

    await c.env.DB
      .prepare(`INSERT INTO teacher_pins (pin_hash, active) VALUES (?, 1)`)
      .bind(teacherPinHash)
      .run()

    return c.json({
      ok: true,
      data: { message: 'PINs de admin e teacher criados com sucesso.' },
    }, 201)
  } catch (err) {
    const error = err as Error
    console.error('Setup error:', error.message)
    return c.json({ ok: false, error: 'Erro ao criar PINs.' }, 500)
  }
})

/**
 * GET /api/auth/me
 * Returns info about the authenticated user (verifies JWT).
 */
app.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ ok: false, error: 'Não autenticado.' }, 401)
  }

  const { verifyJwt } = await import('../utils/helpers.js')
  const token = authHeader.slice(7)
  const payload = await verifyJwt(token, c.env.JWT_SECRET)

  if (!payload || !payload['role']) {
    return c.json({ ok: false, error: 'Token inválido ou expirado.' }, 401)
  }

  return c.json({
    ok: true,
    data: { role: payload['role'], sub: payload['sub'] },
  })
})

/**
 * GET /api/auth/ip
 * Returns the client's IP address (debug/rate limit helper).
 */
app.get('/ip', (c) => {
  return c.json({ ok: true, data: { ip: getClientIp(c.req.raw) } })
})

export default app
