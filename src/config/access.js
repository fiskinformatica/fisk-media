/**
 * Access configuration.
 */
export const SECRET_SALT =
  (import.meta.env.VITE_SECRET_SALT ?? '').trim() || 'CHANGE-THIS-SECRET'

/** 4-digit PIN fallback for the teacher's area (used only if Firestore is unreachable). */
export const STAFF_PASSWORD =
  (import.meta.env.VITE_STAFF_PASSWORD ?? '').trim() || '0000'

/** Kept for compatibility with cached modules; daily PINs have no grace period. */
export const ACCEPT_PREVIOUS_MONTH = false

export const PIN_LENGTH = 4

/** Bumped when the PIN period changes so old authorizations are ignored. */
export const ACCESS_STORAGE_KEY = 'media.access.v2'
