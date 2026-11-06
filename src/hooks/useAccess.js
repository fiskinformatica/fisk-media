import { useCallback, useEffect, useState } from 'react'
import {
  clearAuthorization,
  createAuthorization,
  hasExpiredAuthorization,
  readAuthorization,
  saveAuthorization,
  validatePin,
} from '../services/accessService.js'

export function useAccess() {
  const [authorization, setAuthorization] = useState(readAuthorization)
  const [sessionExpired, setSessionExpired] = useState(hasExpiredAuthorization)

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

  const authorize = useCallback((pin) => {
    const result = validatePin(pin)

    if (!result.ok) return result

    const nextAuthorization = createAuthorization()
    saveAuthorization(nextAuthorization)
    setAuthorization(nextAuthorization)
    setSessionExpired(false)

    return result
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
    authorize,
    lock,
  }
}
