import {
  ACCESS_STORAGE_KEY,
  PIN_LENGTH,
  SECRET_SALT,
  STAFF_PASSWORD,
} from '../config/access.js'
import { readJson, removeStorage, writeJson } from '../utils/storage.js'
import { formatDayLabel } from '../utils/format.js'

const MS_PER_DAY = 86_400_000
const PIN_STEP = 7
const STAFF_PASSWORD_STORAGE_KEY = 'media.staff-password.v1'

/**
 * Remote config fetched from Firestore (config/access).
 * Populated at app startup via initRemoteConfig(); env vars are the fallback.
 */
let _remoteConfig = null

/**
 * Called once at app startup after fetching from Firestore.
 * @param {{ staffPin?: string, dailySalt?: string }} data
 */
export function initRemoteConfig(data) {
  if (data && typeof data === 'object') {
    _remoteConfig = data
  }
}

/** Returns true when the remote config has been loaded from Firestore. */
export function isRemoteConfigReady() {
  return _remoteConfig !== null
}

function normalizePin(input) {
  return String(input ?? '')
    .replace(/\D/g, '')
    .slice(0, PIN_LENGTH)
}

function isPin(value) {
  return value.length === PIN_LENGTH
}

function dayKeyOf(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function shiftDay(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

function nextMidnight(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
}

function dayNumber(date) {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY,
  )
}

/**
 * Simple deterministic 4-digit PIN. Intentionally not cryptographic: the goal
 * is casual access control for a static site, not security. PIN_STEP is coprime
 * with 10,000, so consecutive days never share a PIN.
 */
function hashSeed(seed) {
  let hash = 7
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1_000_003
  }
  return hash
}

function pinFromHash(hash) {
  return String((hash * 7 + 13) % 10_000).padStart(PIN_LENGTH, '0')
}

/**
 * Returns the effective salt: Firestore value takes precedence, then env var.
 */
function getEffectiveSalt() {
  const remote = _remoteConfig?.dailySalt
  return typeof remote === 'string' && remote.length > 0 ? remote : SECRET_SALT
}

export function generateDailyPin(date = new Date()) {
  return pinFromHash(hashSeed(getEffectiveSalt()) + dayNumber(date) * PIN_STEP)
}

/**
 * @returns {{ ok: boolean, reason: 'ok'|'incorrect'|'expired'|'invalid', periodKey?: string }}
 */
export function validatePin(input, date = new Date()) {
  const pin = normalizePin(input)

  if (!isPin(pin)) {
    return { ok: false, reason: 'invalid' }
  }

  if (pin === generateDailyPin(date)) {
    return { ok: true, reason: 'ok', periodKey: dayKeyOf(date) }
  }

  // Recognize PINs from previous days so the UI can say "expirado".
  for (let daysBack = 1; daysBack <= 30; daysBack += 1) {
    if (pin === generateDailyPin(shiftDay(date, -daysBack))) {
      return { ok: false, reason: 'expired' }
    }
  }

  return { ok: false, reason: 'incorrect' }
}

export function createAuthorization(date = new Date()) {
  return {
    v: 2,
    authorized: true,
    period: dayKeyOf(date),
    expiresAt: nextMidnight(date).toISOString(),
  }
}

export function saveAuthorization(authorization) {
  writeJson(ACCESS_STORAGE_KEY, authorization)
}

export function clearAuthorization() {
  removeStorage(ACCESS_STORAGE_KEY)
}

/**
 * The admin can override the teacher PIN locally. A static site has no server,
 * so the override lives in this browser and falls back to the Firestore value,
 * and then to the build-time env var.
 */
export function getStaffPassword() {
  // 1. Local override set via AdminPanel always wins
  const stored = readJson(STAFF_PASSWORD_STORAGE_KEY)
  const pin = normalizePin(stored?.pin)
  if (stored?.v === 1 && isPin(pin)) return pin

  // 2. Firestore value (loaded at startup)
  if (_remoteConfig?.staffPin) {
    const remotePin = normalizePin(_remoteConfig.staffPin)
    if (isPin(remotePin)) return remotePin
  }

  // 3. Env-var fallback (build-time)
  return STAFF_PASSWORD
}

export function hasCustomStaffPassword() {
  const stored = readJson(STAFF_PASSWORD_STORAGE_KEY)
  return stored?.v === 1 && isPin(normalizePin(stored.pin))
}

export function setStaffPassword(input) {
  const pin = normalizePin(input)
  if (!isPin(pin)) return false

  writeJson(STAFF_PASSWORD_STORAGE_KEY, { v: 1, pin })
  return true
}

export function clearStaffPassword() {
  removeStorage(STAFF_PASSWORD_STORAGE_KEY)
}

export function readAuthorization() {
  const stored = readJson(ACCESS_STORAGE_KEY)
  if (!stored || stored.v !== 2 || stored.authorized !== true) return null
  if (!stored.expiresAt) return null

  const expiresAt = Date.parse(stored.expiresAt)
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null

  return stored
}

export function hasExpiredAuthorization() {
  const stored = readJson(ACCESS_STORAGE_KEY)
  if (!stored || stored.v !== 2 || stored.authorized !== true) return false
  if (!stored.expiresAt) return false

  const expiresAt = Date.parse(stored.expiresAt)
  return Number.isFinite(expiresAt) && expiresAt <= Date.now()
}

export function getAdminPinInfo(date = new Date()) {
  return {
    currentPin: generateDailyPin(date),
    periodKey: dayKeyOf(date),
    dayLabel: formatDayLabel(date),
    validUntil: nextMidnight(date),
  }
}
