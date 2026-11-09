import { useCallback, useEffect, useState } from 'react'
import { validatePinApi } from '../services/apiService.js'
import { readJson, removeStorage, writeJson } from '../utils/storage.js'

const ACCESS_STORAGE_KEY = 'fisk.access.v2'

function readAuthorization() {
  const stored = readJson(ACCESS_STORAGE_KEY)
  if (!stored || stored.v !== 2 || stored.authorized !== true) return null
  if (!stored.expiresAt) return null

  const expiresAt = Date.parse(stored.expiresAt)
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null

  return stored
}

function hasExpiredAuthorization() {
  const stored = readJson(ACCESS_STORAGE_KEY)
  if (!stored || stored.v !== 2 || stored.authorized !== true) return false
  if (!stored.expiresAt) return false

  const expiresAt = Date.parse(stored.expiresAt)
  return Number.isFinite(expiresAt) && expiresAt <= Date.now()
}

function saveAuthorization(auth) {
  writeJson(ACCESS_STORAGE_KEY, auth)
}

function clearAuthorization() {
  removeStorage(ACCESS_STORAGE_KEY)
  // Also clear old v1 key to avoid stale sessions
  removeStorage('fisk.access.v1')
}

export function useAccess() {
  const [authorization, setAuthorization] = useState(readAuthorization)
  const [sessionExpired, setSessionExpired] = useState(hasExpiredAuthorization)
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    const revalidate = () => {
      const fresh = readAuthorization()

      setAuthorization((current) => {
        if (current && !fresh) return null
        return current
      })

      if (hasExpiredAuthorization()) {
        setSessionExpired(true)
      }
    }

    const intervalId = window.setInterval(revalidate, 60_000)

    document.addEventListener('visibilitychange', revalidate)
    window.addEventListener('focus', revalidate)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', revalidate)
      window.removeEventListener('focus', revalidate)
    }
  }, [])

  /**
   * Validates the PIN via the backend API.
   * Returns { ok, reason?, error? }
   */
  const authorize = useCallback(async (pin) => {
    setValidating(true)

    try {
      const result = await validatePinApi(pin)

      if (result.ok && result.data?.valid) {
        const auth = {
          v: 2,
          authorized: true,
          period: result.data.period,
          expiresAt: result.data.expiresAt,
          matched: result.data.matched,
        }

        saveAuthorization(auth)
        setAuthorization(auth)
        setSessionExpired(false)

        return { ok: true, reason: 'ok', matched: result.data.matched }
      }

      // API returned an error
      return {
        ok: false,
        reason: result.reason || 'incorrect',
        error: result.error,
      }
    } catch (err) {
      return { ok: false, reason: 'error', error: err.message || 'Erro de rede.' }
    } finally {
      setValidating(false)
    }
  }, [])

  const lock = useCallback(() => {
    clearAuthorization()
    setAuthorization(null)
    setSessionExpired(false)
  }, [])

  return {
    isAuthorized: Boolean(authorization),
    authorization,
    sessionExpired,
    validating,
    authorize,
    lock,
  }
}
