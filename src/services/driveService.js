import {
  AUDIO_FOLDERS,
  DRIVE_API_BASE,
  DRIVE_API_KEY,
  DRIVE_PAGE_SIZE,
  VIDEO_FOLDERS,
} from '../config/drive.js'

const FOLDER_MIME = 'application/vnd.google-apps.folder'
const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut'
const REQUEST_CONCURRENCY = 6

const AUDIO_EXTENSION = /\.(mp3|m4a|aac|wav|oga|ogg|opus|flac|aiff|aif)$/i
const VIDEO_EXTENSION = /\.(mp4|m4v|mov|webm|ogv|mkv|avi)$/i

const collator = new Intl.Collator('pt-BR', {
  numeric: true,
  sensitivity: 'base',
})

export class DriveConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'DriveConfigurationError'
    this.code = 'DRIVE_NOT_CONFIGURED'
  }
}

export function isDriveConfigured() {
  return Boolean(DRIVE_API_KEY)
}

function createLimiter(limit) {
  let active = 0
  const queue = []

  function runNext() {
    if (active >= limit || queue.length === 0) return

    const task = queue.shift()
    active += 1

    Promise.resolve()
      .then(task.fn)
      .then(task.resolve, task.reject)
      .finally(() => {
        active -= 1
        runNext()
      })
  }

  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject })
      runNext()
    })
}

async function readError(response) {
  try {
    const data = await response.json()
    return data?.error?.message || null
  } catch {
    return null
  }
}

async function fetchFilesPage(folderId, pageToken, signal) {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields:
      'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, shortcutDetails)',
    pageSize: String(DRIVE_PAGE_SIZE),
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true',
    key: DRIVE_API_KEY,
  })

  if (pageToken) params.set('pageToken', pageToken)

  const response = await fetch(`${DRIVE_API_BASE}/files?${params.toString()}`, {
    signal,
  })

  if (!response.ok) {
    const detail = await readError(response)
    const error = new Error(
      detail || `O Google Drive respondeu com o status ${response.status}.`,
    )
    error.status = response.status
    throw error
  }

  return response.json()
}

export async function listAllFiles(folderId, { signal } = {}) {
  const files = []
  let pageToken

  do {
    const page = await fetchFilesPage(folderId, pageToken, signal)
    files.push(...(page.files ?? []))
    pageToken = page.nextPageToken
  } while (pageToken)

  return files
}

function resolveShortcut(entry) {
  if (entry.mimeType !== SHORTCUT_MIME) return entry

  const targetId = entry.shortcutDetails?.targetId
  const targetMimeType = entry.shortcutDetails?.targetMimeType
  if (!targetId || !targetMimeType) return null

  return {
    id: targetId,
    name: entry.name,
    mimeType: targetMimeType,
    size: null,
    modifiedTime: entry.modifiedTime ?? null,
  }
}

function getMediaKind(file) {
  const mimeType = String(file.mimeType ?? '').toLowerCase()

  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'

  if (!mimeType || mimeType === 'application/octet-stream') {
    if (AUDIO_EXTENSION.test(file.name ?? '')) return 'audio'
    if (VIDEO_EXTENSION.test(file.name ?? '')) return 'video'
  }

  return null
}

function describeError(error, categoryName) {
  if (error.status === 403) {
    return `Sem permissão para ler "${categoryName}". Compartilhe a pasta e o conteúdo com "Qualquer pessoa com o link" e confira as restrições da chave da API.`
  }
  if (error.status === 404) {
    return `A pasta "${categoryName}" não foi encontrada. Confira o ID em src/config/drive.js.`
  }
  return error.message || 'Não foi possível consultar o Google Drive.'
}

function compareMedia(a, b) {
  const pathA = a.path.join('\u0000')
  const pathB = b.path.join('\u0000')
  return collator.compare(pathA, pathB) || collator.compare(a.name, b.name)
}

async function collectCategory(root, kind, { limit, signal, errors, onScan }) {
  const items = []
  const visited = new Set()

  async function visit(folderId, path) {
    if (visited.has(folderId)) return
    visited.add(folderId)

    let entries
    try {
      entries = await limit(() => listAllFiles(folderId, { signal }))
    } catch (error) {
      if (error.name === 'AbortError') throw error
      errors.push({
        kind,
        category: root.name,
        path: path.join(' / ') || root.name,
        message: describeError(error, root.name),
      })
      return
    }

    onScan?.()

    const subfolders = []

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
  return items
}

/**
 * Fetches every configured folder recursively, in parallel but with a small
 * request pool. A failure in one folder does not abort the rest of the library.
 */
export async function fetchLibrary({ signal, onProgress } = {}) {
  if (!DRIVE_API_KEY) {
    throw new DriveConfigurationError(
      'A chave da API do Google Drive não está configurada. Defina VITE_GOOGLE_API_KEY e gere o site novamente.',
    )
  }

  const limit = createLimiter(REQUEST_CONCURRENCY)
  const errors = []
  const scanned = { folders: 0, files: 0 }
  const report = () => onProgress?.({ ...scanned })

  const roots = [
    ...AUDIO_FOLDERS.map((folder) => ({ folder, kind: 'audio' })),
    ...VIDEO_FOLDERS.map((folder) => ({ folder, kind: 'video' })),
  ]

  const results = await Promise.all(
    roots.map(async ({ folder, kind }) => {
      const items = await collectCategory(folder, kind, {
        limit,
        signal,
        errors,
        onScan: () => {
          scanned.folders += 1
          report()
        },
      })

      items.sort(compareMedia)
      scanned.files += items.length
      report()

      return {
        kind,
        category: {
          id: folder.id,
          name: folder.name,
          items,
        },
      }
    }),
  )

  const audio = results
    .filter((result) => result.kind === 'audio')
    .map((result) => result.category)
  const video = results
    .filter((result) => result.kind === 'video')
    .map((result) => result.category)

  return {
    version: 1,
    fetchedAt: new Date().toISOString(),
    audio,
    video,
    errors,
    stats: {
      folders: scanned.folders,
      files: scanned.files,
      audio: audio.reduce((total, category) => total + category.items.length, 0),
      video: video.reduce((total, category) => total + category.items.length, 0),
    },
  }
}

function flattenLibrary(library) {
  const map = new Map()

  for (const kind of ['audio', 'video']) {
    for (const category of library?.[kind] ?? []) {
      for (const item of category.items ?? []) {
        map.set(item.id, { ...item, kind })
      }
    }
  }

  return map
}

export function diffLibraries(previous, next) {
  if (!previous || !next) return null

  const previousItems = flattenLibrary(previous)
  const nextItems = flattenLibrary(next)
  const added = []
  const removed = []
  const renamed = []

  for (const [id, item] of nextItems) {
    const oldItem = previousItems.get(id)
    if (!oldItem) {
      added.push(item)
      continue
    }

    const oldLocation = `${oldItem.categoryName}/${oldItem.path.join('/')}`
    const newLocation = `${item.categoryName}/${item.path.join('/')}`

    if (oldItem.name !== item.name || oldLocation !== newLocation) {
      renamed.push({
        item,
        previousName: oldItem.name,
        previousLocation: oldLocation,
      })
    }
  }

  for (const [id, item] of previousItems) {
    if (!nextItems.has(id)) removed.push(item)
  }

  return {
    added,
    removed,
    renamed,
    total: added.length + removed.length + renamed.length,
  }
}

export function getMediaUrl(fileId) {
  if (!DRIVE_API_KEY) return getMediaFallbackUrl(fileId)

  const params = new URLSearchParams({
    alt: 'media',
    key: DRIVE_API_KEY,
  })

  return `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?${params.toString()}`
}

export function getMediaFallbackUrl(fileId) {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(
    fileId,
  )}&export=download&confirm=t`
}

export function getDrivePreviewUrl(fileId) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`
}

export function getDriveViewUrl(fileId) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`
}

export function getThumbnailUrl(fileId, width = 480) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(
    fileId,
  )}&sz=w${width}`
}
