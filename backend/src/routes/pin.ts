import { Hono } from 'hono'
import type { Env } from '../types.js'
import { requireAdmin, requireTeacherOrAdmin, rateLimitMiddleware } from '../middleware/index.js'
import { getAdminPinInfo, rotateMonthlyPin, validateStudentPin } from '../services/pinService.js'

const app = new Hono<{ Bindings: Env; Variables: { adminId: string; adminUsername: string } }>()

/**
 * POST /api/pin/validate
 * Validates a student PIN.
 * Rate limited: max 10 attempts per 5 minutes per IP.
 *
 * Body: { pin: string }
 * Returns: { ok: boolean, reason: string, matched?: string, expiresAt?: string }
 */
app.post(
  '/validate',
  rateLimitMiddleware({ keyPrefix: 'pin', maxAttempts: 10, windowSeconds: 300 }),
  async (c) => {
    let body: { pin?: string }

    try {
      body = await c.req.json()
    } catch {
      return c.json({ ok: false, error: 'Corpo da requisição inválido.' }, 400)
    }

    const { pin } = body

    if (!pin) {
      return c.json({ ok: false, error: 'PIN é obrigatório.' }, 400)
    }

    try {
      const result = await validateStudentPin(c.env, pin)

      if (result.ok) {
        // Return expiry info so frontend can store it
        const now = new Date()
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

        return c.json({
          ok: true,
          data: {
            valid: true,
            matched: result.matched,
            expiresAt: nextMonth.toISOString(),
            period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
          },
        })
      }

      return c.json({
        ok: false,
        error: result.reason === 'expired'
          ? 'PIN expirado. Solicite o PIN do mês atual ao professor.'
          : result.reason === 'invalid'
            ? 'PIN deve ter 4 dígitos.'
            : 'PIN incorreto.',
        reason: result.reason,
      }, 401)
    } catch (err) {
      const error = err as Error
      console.error('PIN validation error:', error.message)
      return c.json({ ok: false, error: 'Erro ao validar PIN.' }, 500)
    }
  },
)

/**
 * GET /api/pin/info
 * Returns the current PIN for admin/teacher display.
 * Teacher or Admin authentication required.
 */
app.get('/info', requireTeacherOrAdmin, (c) => {
  try {
    const info = getAdminPinInfo(c.env)
    return c.json({ ok: true, data: info })
  } catch (err) {
    const error = err as Error
    return c.json({ ok: false, error: error.message }, 500)
  }
})

/**
 * POST /api/pin/rotate
 * Manually rotates the monthly PIN.
 * Admin authentication required.
 * Normally run by cron on 1st of each month.
 */
app.post('/rotate', requireAdmin, async (c) => {
  try {
    const result = await rotateMonthlyPin(c.env)
    return c.json({
      ok: true,
      data: {
        message: 'PIN rotacionado com sucesso.',
        periodKey: result.periodKey,
        // Don't return the plain PIN in the response body for security
        // Admin should use GET /api/pin/info to see the current PIN
      },
    })
  } catch (err) {
    const error = err as Error
    return c.json({ ok: false, error: error.message }, 500)
  }
})

export default app
