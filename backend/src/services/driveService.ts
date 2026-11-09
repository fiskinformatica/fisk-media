/**
 * Google Drive integration using Service Account OAuth2 JWT flow.
 *
 * Cloudflare Workers do not have Node.js crypto — everything runs through
 * the WebCrypto API (SubtleCrypto). The JWT is signed with RS256 using the
 * service account private key, then exchanged for an access token at
 * https://oauth2.googleapis.com/token.
 *
 * The access token is cached in a module-level variable for its lifetime
 * (~1 hour). Workers are short-lived, so this is effectively per-request
 * when the token has expired.
 */

import type { DriveFile, DriveFilesResponse } from '../types.js'

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut'
const DRIVE_PAGE_SIZE = 1000
const REQUEST_CONCURRENCY = 6
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'

const AUDIO_EXTENSION = /\.(mp3|m4a|aac|wav|oga|ogg|opus|flac|aiff|aif)$/i
const VIDEO_EXTENSION = /\.(mp4|m4v|mov|webm|ogv|mkv|avi)$/i

// -------------------------------------------------------
// In-memory token cache (valid for the Worker's lifetime)
// -------------------------------------------------------

interface CachedToken {
  accessToken: string
  expiresAt: number  // epoch ms
}

let _tokenCache: CachedToken | null = null

// -------------------------------------------------------
// Service Account JWT → OAuth2 access token
// -------------------------------------------------------

/**
 * Parses a PEM private key string and imports it as a CryptoKey for RS256 signing.
 * The private key in the JSON file uses \n escape sequences.
 */
async function importPrivateKey(pemString: string): Promise<CryptoKey> {
  // Normalise escaped newlines from .dev.vars / wrangler secrets
  const pem = pemString.replace(/\\n/g, '\n')

  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')

  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  return crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

/**
 * Creates and signs a JWT for the Google OAuth2 token endpoint.
 */
async function createServiceAccountJwt(clientEmail: string, privateKey: CryptoKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: clientEmail,
    scope: DRIVE_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

  const unsigned = `${encode(header)}.${encode(payload)}`
  const encoder = new TextEncoder()
  const sigBytes = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    encoder.encode(unsigned),
  )

  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `${unsigned}.${sig}`
}

/**
 * Exchanges a signed JWT for a Google OAuth2 access token.
 */
async function fetchAccessToken(jwt: string): Promise<{ accessToken: string; expiresIn: number }> {
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OAuth2 token exchange failed (${response.status}): ${text}`)
  }

  const data = await response.json() as { access_token: string; expires_in: number }
  return { accessToken: data.access_token, expiresIn: data.expires_in }
}

/**
 * Returns a valid access token, refreshing if expired.
 * Caches the token for reuse within the same Worker invocation.
 */
export async function getAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (_tokenCache && _tokenCache.expiresAt > Date.now() + 60_000) {
    return _tokenCache.accessToken
  }

  const privateKey = await importPrivateKey(privateKeyPem)
  const jwt = await createServiceAccountJwt(clientEmail, privateKey)
  const { accessToken, expiresIn } = await fetchAccessToken(jwt)

  _tokenCache = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  }

  return accessToken
}

// -------------------------------------------------------
// Drive API helpers
// -------------------------------------------------------

export interface MediaItem {
  id: string
  name: string
  mimeType: string
  size: number | null
  modifiedTime: string | null
  kind: 'audio' | 'video'
  categoryId: string
  categoryName: string
  path: string[]
}

export interface CategoryResult {
  id: string
  name: string
  kind: 'audio' | 'video'
  items: MediaItem[]
  errors: CategoryError[]
}

export interface CategoryError {
  kind: string
  category: string
  path: string
  message: string
}

function createLimiter(limit: number) {
  let active = 0
  const queue: Array<{
    fn: () => Promise<unknown>
    resolve: (v: unknown) => void
    reject: (e: unknown) => void
  }> = []

  function runNext() {
    if (active >= limit || queue.length === 0) return
    const task = queue.shift()!
    active++
    Promise.resolve()
      .then(task.fn)
      .then(task.resolve, task.reject)
      .finally(() => {
        active--
        runNext()
      })
  }

  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise((resolve, reject) => {
      queue.push({ fn: fn as () => Promise<unknown>, resolve: resolve as (v: unknown) => void, reject })
      runNext()
    })
}

async function readDriveError(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as { error?: { message?: string } }
    return data?.error?.message ?? null
  } catch {
    return null
  }
}

async function fetchFilesPage(
  folderId: string,
  accessToken: string,
  pageToken?: string,
  signal?: AbortSignal,
): Promise<DriveFilesResponse> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, shortcutDetails)',
    pageSize: String(DRIVE_PAGE_SIZE),
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true',
  })

  if (pageToken) params.set('pageToken', pageToken)

  const response = await fetch(`${DRIVE_API_BASE}/files?${params.toString()}`, {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const detail = await readDriveError(response)
    const error = new Error(
      detail ?? `Google Drive respondeu com status ${response.status}.`,
    ) as Error & { status: number }
    error.status = response.status
    throw error
  }

  return response.json() as Promise<DriveFilesResponse>
}

async function listAllFiles(
  folderId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<DriveFile[]> {
  const files: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const page = await fetchFilesPage(folderId, accessToken, pageToken, signal)
    files.push(...(page.files ?? []))
    pageToken = page.nextPageToken
  } while (pageToken)

  return files
}

function resolveShortcut(entry: DriveFile): DriveFile | null {
  if (entry.mimeType !== SHORTCUT_MIME) return entry

  const targetId = entry.shortcutDetails?.targetId
  const targetMimeType = entry.shortcutDetails?.targetMimeType
  if (!targetId || !targetMimeType) return null

  return {
    id: targetId,
    name: entry.name,
    mimeType: targetMimeType,
    modifiedTime: entry.modifiedTime,
  }
}

function getMediaKind(file: DriveFile): 'audio' | 'video' | null {
  const mimeType = String(file.mimeType ?? '').toLowerCase()
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'

  if (!mimeType || mimeType === 'application/octet-stream') {
    if (AUDIO_EXTENSION.test(file.name ?? '')) return 'audio'
    if (VIDEO_EXTENSION.test(file.name ?? '')) return 'video'
  }

  return null
}

function describeError(error: Error & { status?: number }, categoryName: string): string {
  if (error.status === 403) {
    return `Sem permissão para ler "${categoryName}". Compartilhe a pasta com a Service Account.`
  }
  if (error.status === 404) {
    return `A pasta "${categoryName}" não foi encontrada. Verifique o ID no banco.`
  }
  return error.message || 'Não foi possível consultar o Google Drive.'
}

async function collectCategory(
  root: { id: string; name: string },
  kind: 'audio' | 'video',
  accessToken: string,
  limit: <T>(fn: () => Promise<T>) => Promise<T>,
  signal?: AbortSignal,
): Promise<{ items: MediaItem[]; errors: CategoryError[] }> {
  const items: MediaItem[] = []
  const errors: CategoryError[] = []
  const visited = new Set<string>()

  async function visit(folderId: string, path: string[]): Promise<void> {
    if (visited.has(folderId)) return
    visited.add(folderId)

    let entries: DriveFile[]
    try {
      entries = await limit(() => listAllFiles(folderId, accessToken, signal))
    } catch (err) {
      const error = err as Error & { name?: string; status?: number }
      if (error.name === 'AbortError') throw error
      errors.push({
        kind,
        category: root.name,
        path: path.join(' / ') || root.name,
        message: describeError(error, root.name),
      })
      return
    }

    const subfolders: Array<{ id: string; name: string }> = []

    for (const rawEntry of entries) {
      const entry = resolveShortcut(rawEntry)
      if (!entry) continue

      if (entry.mimeType === FOLDER_MIME) {
        subfolders.push({ id: entry.id, name: entry.name })
        continue
      }

      const mediaKind = getMediaKind(entry)
      if (mediaKind !== kind) continue

      items.push({
        id: entry.id,
        name: entry.name,
        mimeType: entry.mimeType,
        size: entry.size ? Number(entry.size) : null,
        modifiedTime: entry.modifiedTime ?? null,
        kind,
        categoryId: root.id,
        categoryName: root.name,
        path,
      })
    }

    await Promise.all(
      subfolders.map((subfolder) => visit(subfolder.id, [...path, subfolder.name])),
    )
  }

  await visit(root.id, [])
  return { items, errors }
}

export interface FetchDriveLibraryOptions {
  accessToken: string
  folders: Array<{ id: string; name: string; kind: 'audio' | 'video' }>
  signal?: AbortSignal
  onProgress?: (stats: { folders: number; files: number }) => void
}

export interface DriveLibraryResult {
  categories: CategoryResult[]
  errors: CategoryError[]
  stats: { folders: number; files: number }
}

/**
 * Fetches every configured folder recursively using the Drive API.
 * Requires an OAuth2 access token obtained from the Service Account.
 */
export async function fetchDriveLibrary({
  accessToken,
  folders,
  signal,
  onProgress,
}: FetchDriveLibraryOptions): Promise<DriveLibraryResult> {
  const limit = createLimiter(REQUEST_CONCURRENCY)
  const allErrors: CategoryError[] = []
  const scanned = { folders: 0, files: 0 }

  const categories = await Promise.all(
    folders.map(async ({ id, name, kind }) => {
      const { items, errors } = await collectCategory(
        { id, name },
        kind,
        accessToken,
        limit,
        signal,
      )

      allErrors.push(...errors)
      scanned.folders++
      scanned.files += items.length
      onProgress?.({ ...scanned })

      return { id, name, kind, items, errors } as CategoryResult
    }),
  )

  return { categories, errors: allErrors, stats: scanned }
}

// -------------------------------------------------------
// Drive file metadata (for streaming)
// -------------------------------------------------------

export interface DriveFileMetadata {
  id: string
  name: string
  mimeType: string
  size: string
}

/**
 * Fetches a single file's metadata from the Drive API.
 */
export async function getDriveFileMetadata(
  fileId: string,
  accessToken: string,
): Promise<DriveFileMetadata> {
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,size',
    supportsAllDrives: 'true',
  })

  const response = await fetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!response.ok) {
    const detail = await readDriveError(response)
    const err = new Error(detail ?? `Drive metadata error: ${response.status}`) as Error & { status: number }
    err.status = response.status
    throw err
  }

  return response.json() as Promise<DriveFileMetadata>
}

/**
 * Streams a file from Google Drive, forwarding the Authorization header.
 * Supports byte-range requests for seek/partial playback.
 *
 * IMPORTANT: Workers must NOT buffer the entire file in memory.
 * We pipe the body stream directly from the Drive response.
 */
export async function streamDriveFile(
  fileId: string,
  accessToken: string,
  rangeHeader?: string | null,
): Promise<Response> {
  const params = new URLSearchParams({
    alt: 'media',
    supportsAllDrives: 'true',
  })

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  }

  if (rangeHeader) {
    headers['Range'] = rangeHeader
  }

  const driveResponse = await fetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?${params.toString()}`,
    { headers },
  )

  if (!driveResponse.ok && driveResponse.status !== 206) {
    const detail = await readDriveError(driveResponse)
    throw new Error(detail ?? `Drive stream error: ${driveResponse.status}`)
  }

  // Forward the response body as a stream (no buffering)
  const responseHeaders = new Headers()
  const forwardHeaders = [
    'Content-Type',
    'Content-Length',
    'Content-Range',
    'Accept-Ranges',
    'Last-Modified',
    'ETag',
  ]
  for (const h of forwardHeaders) {
    const v = driveResponse.headers.get(h)
    if (v) responseHeaders.set(h, v)
  }

  // Ensure Accept-Ranges is always set
  responseHeaders.set('Accept-Ranges', 'bytes')

  return new Response(driveResponse.body, {
    status: driveResponse.status,
    headers: responseHeaders,
  })
}
