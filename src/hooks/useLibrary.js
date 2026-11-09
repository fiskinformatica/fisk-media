import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchLibraryFromApi, isApiConfigured } from '../services/apiService.js'
import { diffLibraries } from '../services/driveService.js'
import { readJson, writeJson } from '../utils/storage.js'

const CACHE_KEY = 'fisk.library.v2'
const CACHE_MAX_AGE_MS = 5 * 60 * 1000  // 5 minutes (matches backend Cache-Control)

function readCache() {
  const cache = readJson(CACHE_KEY)
  if (!cache || cache.v !== 2 || !cache.library) return null
  if (!Array.isArray(cache.library.audio) || !Array.isArray(cache.library.video)) {
    return null
  }
  return cache
}

/**
 * Normalises the library payload from the API into the same shape
 * that all existing components expect.
 *
 * API shape:
 *   { audio: LibraryCategory[], video: LibraryCategory[], stats, syncedAt, version }
 *
 * Each LibraryCategory has:
 *   { id, name, kind, sortOrder, items: LibraryItem[] }
 *
 * Each LibraryItem has:
 *   { id (drive_file_id), title, mimeType, kind, size, modifiedTime, categoryId, categoryName, path, sortOrder }
 *
 * Original shape expected by components:
 *   { audio: [{ id, name, items: [{ id, name, mimeType, size, modifiedTime, kind, categoryId, categoryName, path }] }] }
 *
 * The main difference: API uses `title` as the display name. Components use `name`.
 * We normalise here: item.name = item.title.
 */
function normaliseLibrary(apiLibrary) {
  function normaliseCategory(category) {
    return {
      ...category,
      items: (category.items ?? []).map((item) => ({
        ...item,
        // Keep id as drive_file_id for URL building
        id: item.id,
        // Normalise: components use `name` as display label
        name: item.title ?? item.name ?? '',
      })),
    }
  }

  return {
    ...apiLibrary,
    audio: (apiLibrary.audio ?? []).map(normaliseCategory),
    video: (apiLibrary.video ?? []).map(normaliseCategory),
  }
}

export function useLibrary({ autoSync = true } = {}) {
  const [cache] = useState(readCache)
  const [library, setLibrary] = useState(cache?.library ?? null)
  const [syncedAt, setSyncedAt] = useState(cache?.syncedAt ?? null)
  const [status, setStatus] = useState(cache?.library ? 'ready' : 'idle')
  const [error, setError] = useState(null)
  const [changes, setChanges] = useState(null)
  const [progress, setProgress] = useState({ folders: 0, files: 0 })

  const libraryRef = useRef(library)
  const syncedAtRef = useRef(syncedAt)
  const inFlightRef = useRef(false)
  const controllerRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const sync = useCallback(async () => {
    if (inFlightRef.current) return

    inFlightRef.current = true
    const controller = new AbortController()
    controllerRef.current = controller

    setStatus(libraryRef.current ? 'refreshing' : 'loading')
    setError(null)
    setProgress({ folders: 0, files: 0 })

    try {
      const response = await fetchLibraryFromApi(controller.signal)

      if (controller.signal.aborted || !mountedRef.current) return

      if (!response.ok) {
        throw new Error(response.error || 'Não foi possível carregar a biblioteca.')
      }

      const next = normaliseLibrary(response.data)

      const previous = libraryRef.current
      const diff = previous ? diffLibraries(previous, next) : null
      const timestamp = Date.now()

      libraryRef.current = next
      syncedAtRef.current = timestamp
      setLibrary(next)
      setSyncedAt(timestamp)
      setChanges(diff && diff.total > 0 ? diff : null)
      setStatus('ready')
      writeJson(CACHE_KEY, { v: 2, syncedAt: timestamp, library: next })

      // Update progress from stats
      if (next.stats) {
        setProgress({ folders: next.stats.folders ?? 0, files: (next.stats.audio ?? 0) + (next.stats.video ?? 0) })
      }
    } catch (caught) {
      if (caught.name === 'AbortError') return
      if (!mountedRef.current) return

      setError(caught)
      setStatus(libraryRef.current ? 'ready' : 'error')
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null
      inFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!autoSync) return undefined

    const isStale = Date.now() - (syncedAtRef.current ?? 0) > CACHE_MAX_AGE_MS

    const timeoutId = window.setTimeout(() => {
      if (isStale || !libraryRef.current) sync()
    }, 0)

    const intervalId = window.setInterval(sync, CACHE_MAX_AGE_MS)

    return () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
      controllerRef.current?.abort()
    }
  }, [autoSync, sync])

  const dismissChanges = useCallback(() => setChanges(null), [])

  return {
    library,
    syncedAt,
    status,
    error,
    changes,
    progress,
    hasData: Boolean(library),
    isSyncing: status === 'loading' || status === 'refreshing',
    apiConfigured: isApiConfigured(),
    refresh: sync,
    dismissChanges,
  }
}
