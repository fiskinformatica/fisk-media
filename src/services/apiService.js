/**
 * API service for communicating with the Fisk Media backend.
 * Replaces direct Google Drive API calls with backend endpoints.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

// -------------------------------------------------------
// Storage helpers
// -------------------------------------------------------

const ADMIN_TOKEN_KEY = 'fisk.admin.token.v1'

export function getAdminToken() {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAdminToken(token) {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token)
  } catch {
    // Ignore storage errors
  }
}

export function clearAdminToken() {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
  } catch {
    // Ignore storage errors
  }
}

// -------------------------------------------------------
// API request helper
// -------------------------------------------------------

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Add auth token if available and not explicitly disabled
  if (options.auth !== false) {
    const token = getAdminToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    // Handle 401 by clearing token
    if (response.status === 401 && options.auth !== false) {
      clearAdminToken()
    }

    const data = await response.json()

    return {
      ok: response.ok,
      status: response.status,
      data: response.ok ? data.data : null,
      error: !response.ok ? data.error : null,
    }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err.message || 'Erro de conexão com o servidor.',
    }
  }
}

// -------------------------------------------------------
// Library
// -------------------------------------------------------

/**
 * Checks if the API is configured.
 */
export function isApiConfigured() {
  return Boolean(API_BASE_URL)
}

/**
 * Fetches the full library from the backend.
 * Used by useLibrary hook.
 */
export async function fetchLibraryFromApi(signal) {
  return apiRequest('/api/library', { signal, auth: false })
}

/**
 * Fetches the full library from the backend.
 * Returns the same shape as the original driveService.fetchLibrary.
 */
export async function fetchLibrary({ signal } = {}) {
  const result = await apiRequest('/api/library', { signal, auth: false })

  if (!result.ok) {
    throw new Error(result.error || 'Erro ao carregar a biblioteca.')
  }

  return result.data
}

// -------------------------------------------------------
// PIN validation
// -------------------------------------------------------

/**
 * Validates a student PIN.
 * Returns: { ok: boolean, data: { valid, matched, expiresAt, period }, error }
 */
export async function validatePin(pin) {
  return apiRequest('/api/pin/validate', {
    method: 'POST',
    body: JSON.stringify({ pin }),
    auth: false,
  })
}

/**
 * Validates a student PIN (alias for useAccess hook).
 */
export async function validatePinApi(pin) {
  return validatePin(pin)
}

// -------------------------------------------------------
// Admin authentication
// -------------------------------------------------------

/**
 * Teacher login with PIN.
 * Returns: { ok: boolean, data: { token, role, expiresIn }, error }
 */
export async function teacherLogin(pin) {
  const result = await apiRequest('/api/auth/teacher', {
    method: 'POST',
    body: JSON.stringify({ pin }),
    auth: false,
  })

  if (result.ok && result.data?.token) {
    setAdminToken(result.data.token)
  }

  return result
}

/**
 * Admin login with PIN.
 * Returns: { ok: boolean, data: { token, role, expiresIn }, error }
 */
export async function adminLogin(pin) {
  const result = await apiRequest('/api/auth/admin', {
    method: 'POST',
    body: JSON.stringify({ pin }),
    auth: false,
  })

  if (result.ok && result.data?.token) {
    setAdminToken(result.data.token)
  }

  return result
}

/**
 * Verifies the current admin token.
 */
export async function verifyAdminToken() {
  return apiRequest('/api/auth/me', { method: 'GET' })
}

/**
 * Admin logout (clears token).
 */
export function adminLogout() {
  clearAdminToken()
}

/**
 * Teacher logout (alias for adminLogout).
 */
export function teacherLogout() {
  clearAdminToken()
}

// -------------------------------------------------------
// PIN management (admin only)
// -------------------------------------------------------

/**
 * Updates the teacher PIN.
 * Requires admin authentication.
 */
export async function updateTeacherPin(pin) {
  return apiRequest('/api/admin/pins/teacher', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  })
}

/**
 * Updates the admin PIN.
 * Requires admin authentication.
 */
export async function updateAdminPin(pin) {
  return apiRequest('/api/admin/pins/admin', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  })
}

/**
 * Updates the student PIN for the current month.
 * Requires admin authentication.
 */
export async function updateStudentPin(pin) {
  return apiRequest('/api/admin/pins/student', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  })
}

// -------------------------------------------------------
// Admin PIN info
// -------------------------------------------------------

/**
 * Gets the current PIN for admin display.
 * Requires admin authentication.
 */
export async function getAdminPinInfo() {
  return apiRequest('/api/pin/info', { method: 'GET' })
}

/**
 * Manually rotates the monthly PIN.
 * Requires admin authentication.
 */
export async function rotatePin() {
  return apiRequest('/api/pin/rotate', { method: 'POST' })
}

// -------------------------------------------------------
// Sync
// -------------------------------------------------------

/**
 * Triggers a manual sync with Google Drive.
 * Requires admin authentication.
 */
export async function triggerSync() {
  return apiRequest('/api/sync', { method: 'POST' })
}

/**
 * Gets sync status.
 * Requires admin authentication.
 */
export async function getSyncStatus() {
  return apiRequest('/api/sync/status', { method: 'GET' })
}

/**
 * Gets sync history.
 * Requires admin authentication.
 */
export async function getSyncHistory() {
  return apiRequest('/api/sync/history', { method: 'GET' })
}

// -------------------------------------------------------
// Folder management
// -------------------------------------------------------

/**
 * Gets all folders (including hidden).
 * Requires admin authentication.
 */
export async function getFolders() {
  return apiRequest('/api/admin/folders', { method: 'GET' })
}

/**
 * Updates a folder.
 * Requires admin authentication.
 */
export async function updateFolder(folderId, updates) {
  return apiRequest(`/api/admin/folders/${folderId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

/**
 * Reorders multiple folders.
 * Requires admin authentication.
 */
export async function reorderFolders(orders) {
  return apiRequest('/api/admin/folders/reorder', {
    method: 'POST',
    body: JSON.stringify({ orders }),
  })
}

// -------------------------------------------------------
// Video management
// -------------------------------------------------------

/**
 * Gets videos for a folder.
 * Requires admin authentication.
 */
export async function getVideos(folderId, kind) {
  const params = new URLSearchParams()
  if (folderId) params.set('folderId', folderId)
  if (kind) params.set('kind', kind)

  return apiRequest(`/api/admin/videos?${params.toString()}`, { method: 'GET' })
}

/**
 * Updates a video.
 * Requires admin authentication.
 */
export async function updateVideo(videoId, updates) {
  return apiRequest(`/api/admin/videos/${videoId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

/**
 * Reorders multiple videos.
 * Requires admin authentication.
 */
export async function reorderVideos(orders) {
  return apiRequest('/api/admin/videos/reorder', {
    method: 'POST',
    body: JSON.stringify({ orders }),
  })
}

// -------------------------------------------------------
// Media streaming (via optimized backend proxy)
// -------------------------------------------------------

/**
 * Returns the streaming URL for a file.
 * Uses backend proxy (required due to CORS and modern browser security).
 * Backend implements efficient streaming with Range support.
 */
export function getMediaUrl(fileId) {
  return `${API_BASE_URL}/api/stream/${encodeURIComponent(fileId)}`
}

/**
 * Returns the fallback media URL (direct from Drive with usercontent domain).
 * Used as fallback if the backend stream fails.
 */
export function getMediaFallbackUrl(fileId) {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`
}

/**
 * Returns the fallback Drive preview URL (for video player fallback).
 */
export function getDrivePreviewUrl(fileId) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`
}

/**
 * Returns the Drive view URL.
 */
export function getDriveViewUrl(fileId) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`
}

/**
 * Returns the Drive thumbnail URL.
 */
export function getThumbnailUrl(fileId, width = 480) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${width}`
}
