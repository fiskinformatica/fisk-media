import { useCallback, useEffect, useRef, useState } from 'react'
import { SYNC_INTERVAL_MS } from '../config/drive.js'
import {
  diffLibraries,
  fetchLibrary,
  isDriveConfigured,
} from '../services/driveService.js'
import { readJson, writeJson } from '../utils/storage.js'

const CACHE_KEY = 'fisk.library.v1'

function readCache() {
  const cache = readJson(CACHE_KEY)
  if (!cache || cache.v !== 1 || !cache.library) return null
  if (!Array.isArray(cache.library.audio) || !Array.isArray(cache.library.video)) {
    return null
  }
  return cache
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
      const next = await fetchLibrary({
        signal: controller.signal,
        onProgress: (nextProgress) => {
          if (mountedRef.current) setProgress(nextProgress)
        },
      })

      if (controller.signal.aborted || !mountedRef.current) return

      const previous = libraryRef.current
      const diff = previous ? diffLibraries(previous, next) : null
      const timestamp = Date.now()

      libraryRef.current = next
      syncedAtRef.current = timestamp
      setLibrary(next)
      setSyncedAt(timestamp)
      setChanges(diff && diff.total > 0 ? diff : null)
      setStatus('ready')
      writeJson(CACHE_KEY, { v: 1, syncedAt: timestamp, library: next })
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

    const isStale = Date.now() - (syncedAtRef.current ?? 0) > SYNC_INTERVAL_MS

    const timeoutId = window.setTimeout(() => {
      if (isStale || !libraryRef.current) sync()
    }, 0)

    const intervalId = window.setInterval(sync, SYNC_INTERVAL_MS)

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
    apiConfigured: isDriveConfigured(),
    refresh: sync,
    dismissChanges,
  }
}
