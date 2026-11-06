/**
 * Google Drive folders that make up the library.
 *
 * IDs were checked against the original Drive folder links. The displayed name
 * is intentionally short; the numbered Drive folder name ("01. Essentials 1")
 * is not used in the UI.
 *
 * To add a category, add the same folder shape to AUDIO_FOLDERS and/or
 * VIDEO_FOLDERS. No other code change is required.
 */



export const AUDIO_FOLDERS = [
  { name: 'Essentials 1', id: '13AkH5a-R3vo7GusDrtno2GT_Ziwa5a7n' },
  { name: 'Essentials 2', id: '1ncrq4Rl4vIx-TS_-KHpLYsOjC8i1lwif' },
  { name: 'Transitions 1', id: '1snq7mtHv0HJPr_SXokfYiHrou_u_ZEzi' },
  { name: 'Transitions 2', id: '13yGr3Bo5rRUEvJ6JhIUo3HYxOEZr6BpW' },
  { name: 'Fluency 1', id: '1cGMiNjdYqKC7WUFdtKaGMXcwpwEfe2NF' },
  { name: 'Fluency 2', id: '161J8pT6z-T1htkCVybGelMpg3EM4kRxr' },
  { name: 'In Focus', id: '1cA7b4vCjhuE0xa2EtQwHFA3rq3UbB8jv' },
]
export const VIDEO_FOLDERS = [
  { name: 'Essentials 1', id: '1Im0EZZghHm27P2TAOKX5eD0Vv5ZmEpm-' },
  { name: 'Essentials 2', id: '17Jnd7Mq5B1uDzJ408QU4MjzMYgIor-dz' },
  { name: 'Transitions 1', id: '1jOAeE5_1OhPbmfv2hM21yGeJV8ZjzwG8' },
  { name: 'Transitions 2', id: '1pSCHDCYvobzp7JXmnp9dID1BKnczriQA' },
  { name: 'Fluency 1', id: '1qNiNdt_XhRPxRAv2f694Fy7uqKucIMOu' },
  { name: 'Fluency 2', id: '1j5l0S7_kGLwFyFC7JdNFmsi8P9PpnoE2' },
]

export const LIBRARY_NAME = 'Fisk Media'
export const LIBRARY_TAGLINE = 'Biblioteca de áudios e vídeos'

/**
 * Drive API key, created in Google Cloud Console with the Drive API enabled.
 * The key is safe to ship in a static site only because every listed file is
 * publicly shared. Restrict the key by HTTP referrer before publishing.
 */
export const DRIVE_API_KEY = (import.meta.env.VITE_GOOGLE_API_KEY ?? '').trim()

export const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'
export const SYNC_INTERVAL_MS = 15 * 60 * 1000
export const DRIVE_PAGE_SIZE = 1000
