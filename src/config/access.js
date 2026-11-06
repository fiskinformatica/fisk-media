/**
 * Access configuration.
 *
 * IMPORTANT: this is a static site. These values are downloaded by every
 * visitor. The PINs are a casual access control, not a security boundary
 * against technical users. Change the defaults before publishing. See
 * README.md for details.
 *
 * Configure them in .env (or in the GitHub Actions secrets) instead of editing
 * this file. The fallbacks are only here to keep local development working.
 */
export const SECRET_SALT =
  (import.meta.env.VITE_SECRET_SALT ?? '').trim() || 'ALTERE-ESTE-SEGREDO'

/** 4-digit PIN for the teacher area. */
export const STAFF_PASSWORD =
  (import.meta.env.VITE_STAFF_PASSWORD ?? '').trim() || '0000'

/**
 * Extra 4-digit PIN for the admin controls (sync and folder ordering). Keep it
 * different from the teacher PIN so only the owner can change the library.
 */
export const OWNER_PASSWORD =
  (import.meta.env.VITE_OWNER_PASSWORD ?? '').trim() || '9999'

/** The previous month's PIN is also accepted during the current month. */
export const ACCEPT_PREVIOUS_MONTH = true

export const PIN_LENGTH = 4
export const ACCESS_STORAGE_KEY = 'fisk.access.v1'
