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
  { name: 'Essentials 1', id: '1Im0EZZghHm27P2TAOKX5eD0Vv5ZmEpm-' },
  { name: 'Essentials 2', id: '17Jnd7Mq5B1uDzJ408QU4MjzMYgIor-dz' },
  { name: 'Transitions 1', id: '1jOAeE5_1OhPbmfv2hM21yGeJV8ZjzwG8' },
  { name: 'Transitions 2', id: '1pSCHDCYvobzp7JXmnp9dID1BKnczriQA' },
  { name: 'Fluency 1', id: '1qNiNdt_XhRPxRAv2f694Fy7uqKucIMOu' },
  { name: 'Fluency 2', id: '1j5l0S7_kGLwFyFC7JdNFmsi8P9PpnoE2' },
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
