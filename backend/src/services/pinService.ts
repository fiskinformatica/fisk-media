import { generateMonthlyPin, hashPassword, monthKeyOf, shiftMonth, startOfNextMonth, verifyPassword } from '../utils/helpers.js'
import type { AccessCode, Env } from '../types.js'

/**
 * Generates and stores the monthly student PIN.
 * Called by the cron trigger on the 1st of each month,
 * or manually by an admin.
 *
 * The plain PIN is never stored; only its PBKDF2 hash.
 */
export async function rotateMonthlyPin(env: Env): Promise<{ pin: string; periodKey: string }> {
  const db = env.DB
  const now = new Date()
  const periodKey = monthKeyOf(now)
  const validFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const validUntil = startOfNextMonth(now).toISOString()

  // Generate PIN using the same deterministic algorithm as the original frontend
  const pin = generateMonthlyPin(env.SECRET_SALT, now)
  const codeHash = await hashPassword(pin)

  // Deactivate all previous codes
  await db.prepare(`UPDATE access_codes SET active = 0`).run()

  // Insert new code
  await db
    .prepare(
      `INSERT INTO access_codes (code_hash, valid_from, valid_until, active)
       VALUES (?, ?, ?, 1)`,
    )
    .bind(codeHash, validFrom, validUntil)
    .run()

  return { pin, periodKey }
}

/**
 * Validates a student PIN against active access codes.
 * Also accepts the previous month's code (grace period),
 * matching the original ACCEPT_PREVIOUS_MONTH behavior.
 */
export async function validateStudentPin(
  env: Env,
  input: string,
): Promise<{ ok: boolean; reason: 'ok' | 'incorrect' | 'expired' | 'invalid'; matched?: 'current' | 'previous' }> {
  const pin = String(input ?? '').replace(/\D/g, '').slice(0, 4)

  if (pin.length !== 4) {
    return { ok: false, reason: 'invalid' }
  }

  const db = env.DB
  const now = new Date()

  // Fetch current active code
  const currentCode = await db
    .prepare(
      `SELECT code_hash, valid_from, valid_until
       FROM access_codes
       WHERE active = 1 AND valid_until > datetime('now')
       ORDER BY id DESC LIMIT 1`,
    )
    .first<AccessCode>()

  if (currentCode && (await verifyPassword(pin, currentCode.code_hash))) {
    return { ok: true, reason: 'ok', matched: 'current' }
  }

  // Check previous month (grace period)
  const previousCode = await db
    .prepare(
      `SELECT code_hash, valid_from, valid_until
       FROM access_codes
       WHERE valid_until <= datetime('now')
       ORDER BY id DESC LIMIT 1`,
    )
    .first<AccessCode>()

  if (previousCode) {
    // Only accept if valid_until was within the last month
    const prevUntil = new Date(previousCode.valid_until)
    const oneMonthAgo = shiftMonth(now, -1)
    if (prevUntil > oneMonthAgo && (await verifyPassword(pin, previousCode.code_hash))) {
      return { ok: true, reason: 'ok', matched: 'previous' }
    }
  }

  // Check if it's an older (expired) PIN so we can give better error message
  // We check up to 12 months back using the deterministic algorithm
  for (let monthsBack = 1; monthsBack <= 12; monthsBack++) {
    const oldPin = generateMonthlyPin(env.SECRET_SALT, shiftMonth(now, -monthsBack))
    if (pin === oldPin) {
      return { ok: false, reason: 'expired' }
    }
  }

  return { ok: false, reason: 'incorrect' }
}

/**
 * Returns info about the current PIN for admin display.
 * NOTE: In the backend architecture, the plain PIN is only
 * available at rotation time. We re-generate it deterministically
 * for admin display (same as the original frontend did).
 */
export function getAdminPinInfo(env: Env, date: Date = new Date()): {
  currentPin: string
  previousPin: string
  periodKey: string
  monthLabel: string
  validUntil: string
} {
  const currentPin = generateMonthlyPin(env.SECRET_SALT, date)
  const previousPin = generateMonthlyPin(env.SECRET_SALT, shiftMonth(date, -1))

  return {
    currentPin,
    previousPin,
    periodKey: monthKeyOf(date),
    monthLabel: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date),
    validUntil: startOfNextMonth(date).toISOString(),
  }
}
