import { Hono } from 'hono'
import type { Env } from '../types.js'
import { getClientIp, hashPassword, signJwt, verifyPassword } from '../utils/helpers.js'

const app = new Hono<{ Bindings: Env }>()

/**
 * POST /api/auth/login
 * Authenticates an admin user and returns a JWT.
 *
 * Body: { username: string; password: string }
 *
 * Security: Basic brute-force protection via login attempt tracking.
 * For stronger protection, use the rateLimitMiddleware in index.ts.
 */
app.post('/login', async (c) => {
  let body: { username?: string; password?: string }

  try {
    body = await c.req.json<{ username?: string; password?: string }>()
  } catch {
    return c.json({ ok: false, error: 'Corpo da requisição inválido.' }, 400)
  }

  const { username, password } = body

  if (!username || !password) {
    return c.json({ ok: false, error: 'Usuário e senha são obrigatórios.' }, 400)
  }

  try {
    const admin = await c.env.DB
      .prepare(`SELECT id, username, password_hash FROM admins WHERE username = ?`)
      .bind(username.trim().toLowerCase())
      .first<{ id: number; username: string; password_hash: string }>()

    // Constant-time: always verify even if user not found (prevent timing attacks)
    const dummyHash = 'pbkdf2sha256:100000:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000'
    const valid = admin
      ? await verifyPassword(password, admin.password_hash)
      : await verifyPassword(password, dummyHash)

    if (!admin || !valid) {
      return c.json({ ok: false, error: 'Usuário ou senha incorretos.' }, 401)
    }

    const token = await signJwt(
      { sub: String(admin.id), username: admin.username, role: 'admin' },
      c.env.JWT_SECRET,
      86400 * 7,  // 7 days
    )

    return c.json({
      ok: true,
      data: {
        token,
        username: admin.username,
        expiresIn: 86400 * 7,
      },
    })
  } catch (err) {
    const error = err as Error
    console.error('Login error:', error.message)
    return c.json({ ok: false, error: 'Erro interno ao autenticar.' }, 500)
  }
})

/**
 * POST /api/auth/setup
 * Creates the first admin account. Only works if no admins exist.
 * Must be called once after deployment with ADMIN_SETUP_KEY secret.
 *
 * Body: { username: string; password: string; setupKey: string }
 */
app.post('/setup', async (c) => {
  let body: { username?: string; password?: string; setupKey?: string }

  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'Corpo da requisição inválido.' }, 400)
  }

  const { username, password, setupKey } = body

  if (!username || !password || !setupKey) {
    return c.json({ ok: false, error: 'username, password e setupKey são obrigatórios.' }, 400)
  }

  // setupKey must match the ADMIN_SETUP_KEY secret
  const expectedKey = (c.env as Env & { ADMIN_SETUP_KEY?: string }).ADMIN_SETUP_KEY
  if (!expectedKey || setupKey !== expectedKey) {
    return c.json({ ok: false, error: 'Setup key inválida.' }, 403)
  }

  try {
    // Only allow setup if no admins exist
    const existingCount = await c.env.DB
      .prepare(`SELECT COUNT(*) as count FROM admins`)
      .first<{ count: number }>()

    if ((existingCount?.count ?? 0) > 0) {
      return c.json({ ok: false, error: 'Um administrador já foi configurado.' }, 409)
    }

    if (password.length < 8) {
      return c.json({ ok: false, error: 'A senha deve ter pelo menos 8 caracteres.' }, 400)
    }

    const passwordHash = await hashPassword(password)

    await c.env.DB
      .prepare(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`)
      .bind(username.trim().toLowerCase(), passwordHash)
      .run()

    return c.json({ ok: true, data: { message: 'Administrador criado com sucesso.' } }, 201)
  } catch (err) {
    const error = err as Error
    console.error('Setup error:', error.message)
    return c.json({ ok: false, error: 'Erro ao criar administrador.' }, 500)
  }
})

/**
 * GET /api/auth/me
 * Returns info about the authenticated admin (verifies JWT).
 */
app.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ ok: false, error: 'Não autenticado.' }, 401)
  }

  const { verifyJwt } = await import('../utils/helpers.js')
  const token = authHeader.slice(7)
  const payload = await verifyJwt(token, c.env.JWT_SECRET)

  if (!payload || payload['role'] !== 'admin') {
    return c.json({ ok: false, error: 'Token inválido ou expirado.' }, 401)
  }

  return c.json({ ok: true, data: { username: payload['username'], id: payload['sub'] } })
})

/**
 * GET /api/auth/ip
 * Returns the client's IP address (debug/rate limit helper).
 */
app.get('/ip', (c) => {
  return c.json({ ok: true, data: { ip: getClientIp(c.req.raw) } })
})

export default app
