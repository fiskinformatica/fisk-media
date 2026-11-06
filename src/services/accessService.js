import {
  ACCEPT_PREVIOUS_MONTH,
  ACCESS_STORAGE_KEY,
  PIN_LENGTH,
  SECRET_SALT,
} from '../config/access.js'
import { readJson, removeStorage, writeJson } from '../utils/storage.js'
import { formatMonthYear } from '../utils/format.js'

function monthKeyOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

/**
 * Simple deterministic 4-digit PIN. Intentionally not cryptographic: the goal
 * is casual access control for a static site, not security.
 */
function pinFromSeed(seed) {
  let hash = 7
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1_000_003
  }
  return String((hash * 7 + 13) % 10_000).padStart(PIN_LENGTH, '0')
}

export function generateMonthlyPin(date = new Date()) {
  return pinFromSeed(`${monthKeyOf(date)}:${SECRET_SALT}`)
}

/**
 * @returns {{ ok: boolean, reason: 'ok'|'incorrect'|'expired'|'invalid', periodKey?: string, matched?: 'current'|'previous' }}
 */
export function validatePin(input, date = new Date()) {
  const pin = String(input ?? '')
    .replace(/\D/g, '')
    .slice(0, PIN_LENGTH)

  if (pin.length !== PIN_LENGTH) {
    return { ok: false, reason: 'invalid' }
  }

  if (pin === generateMonthlyPin(date)) {
    return {
      ok: true,
      reason: 'ok',
      periodKey: monthKeyOf(date),
      matched: 'current',
    }
  }

  if (ACCEPT_PREVIOUS_MONTH && pin === generateMonthlyPin(shiftMonth(date, -1))) {
    return {
      ok: true,
      reason: 'ok',
      periodKey: monthKeyOf(date),
      matched: 'previous',
    }
  }

  // Recognize older PINs so the UI can say "expirado" instead of "incorreto".
  for (let monthsBack = 2; monthsBack <= 12; monthsBack += 1) {
    if (pin === generateMonthlyPin(shiftMonth(date, -monthsBack))) {
      return { ok: false, reason: 'expired' }
    }
  }

  return { ok: false, reason: 'incorrect' }
}

export function createAuthorization(date = new Date()) {
  return {
    v: 1,
    authorized: true,
    period: monthKeyOf(date),
    expiresAt: endOfMonth(date).toISOString(),
  }
}

export function saveAuthorization(authorization) {
  writeJson(ACCESS_STORAGE_KEY, authorization)
}

export function clearAuthorization() {
  removeStorage(ACCESS_STORAGE_KEY)
}

export function readAuthorization() {
  const stored = readJson(ACCESS_STORAGE_KEY)
  if (!stored || stored.v !== 1 || stored.authorized !== true) return null
  if (!stored.expiresAt) return null

  const expiresAt = Date.parse(stored.expiresAt)
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null

  return stored
}

export function hasExpiredAuthorization() {
  const stored = readJson(ACCESS_STORAGE_KEY)
  if (!stored || stored.v !== 1 || stored.authorized !== true) return false
  if (!stored.expiresAt) return false

  const expiresAt = Date.parse(stored.expiresAt)
  return Number.isFinite(expiresAt) && expiresAt <= Date.now()
}

export function getAdminPinInfo(date = new Date()) {
  return {
    currentPin: generateMonthlyPin(date),
    previousPin: ACCEPT_PREVIOUS_MONTH ? generateMonthlyPin(shiftMonth(date, -1)) : null,
    periodKey: monthKeyOf(date),
    monthLabel: formatMonthYear(date),
    acceptsPreviousMonth: ACCEPT_PREVIOUS_MONTH,
    validUntil: endOfMonth(date),
  }
}
