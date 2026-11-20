/**
 * Google Drive folders that make up the library.
 *
 * IDs were checked against the original Drive folder links. Each root is a
 * series containing course folders, which contain lesson folders. The displayed
 * name is intentionally short.
 *
 * To add a series, add the same folder shape to AUDIO_FOLDERS and/or
 * VIDEO_FOLDERS. No other code change is required.
 */

export const AUDIO_FOLDERS = [
  { name: 'Adults', id: '10tYI18xoQL0RzLr_CVKZuOgnNDgneYqb' },
  { name: 'Teens', id: '1gboaaStHmKWUCpAFNsGt35eYP9wj07V0' },
]

export const VIDEO_FOLDERS = [
  { name: 'Adults', id: '1s5BCEVdz0-eM2tYCrBRwnTQeAWaiQuD6' },
  { name: 'Teens', id: '1gEBUgQgGb-vIu-ltYg35ojnI1IBKUMt6' },
]

/**
 * Drive API key, created in Google Cloud Console with the Drive API enabled.
 * The key is safe to ship in a static site only because every listed file is
 * publicly shared. Restrict the key by HTTP referrer before publishing.
 */
export const DRIVE_API_KEY = (import.meta.env.VITE_GOOGLE_API_KEY ?? '').trim()

export const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'
export const SYNC_INTERVAL_MS = 15 * 60 * 1000
export const DRIVE_PAGE_SIZE = 1000
