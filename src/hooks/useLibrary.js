import { useCallback, useEffect, useRef, useState } from 'react'
import { SYNC_INTERVAL_MS } from '../config/drive.js'
import {
  diffLibraries,
  fetchLibrary,
  isDriveConfigured,
} from '../services/driveService.js'
import { fetchSnapshot } from '../services/snapshotService.js'
import { setSharedOrders } from '../utils/folderOrder.js'
import { readJson, writeJson } from '../utils/storage.js'

const CACHE_KEY = 'media.library.v1'

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
  const [snapshot, setSnapshot] = useState(null)
  const [hydrated, setHydrated] = useState(false)
  const [library, setLibrary] = useState(cache?.library ?? null)
  const [syncedAt, setSyncedAt] = useState(cache?.syncedAt ?? null)
  const [status, setStatus] = useState(cache?.library ? 'ready' : 'loading')
  const [error, setError] = useState(null)
  const [changes, setChanges] = useState(null)
  const [progress, setProgress] = useState({ folders: 0, files: 0 })

  const libraryRef = useRef(library)
  const syncedAtRef = useRef(syncedAt)
  const snapshotRef = useRef(null)
  const inFlightRef = useRef(false)
  const controllerRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    fetchSnapshot({ signal: controller.signal }).then((next) => {
      if (!active || controller.signal.aborted) return

      snapshotRef.current = next
      setSnapshot(next)
      if (next?.folderOrder) setSharedOrders(next.folderOrder)

      const cacheTime = cache?.syncedAt ?? 0
      const publishedTime = Date.parse(next?.publishedAt ?? '') || 0
      const preferSnapshot =
        Boolean(next?.library) && (!cache?.library || publishedTime >= cacheTime)

      if (preferSnapshot) {
        const timestamp = publishedTime || Date.now()
        libraryRef.current = next.library
        syncedAtRef.current = timestamp
        setLibrary(next.library)
        setSyncedAt(timestamp)
        setStatus('ready')
        writeJson(CACHE_KEY, { v: 1, syncedAt: timestamp, library: next.library })
      } else if (!cache?.library) {
        setStatus('idle')
      }

      setHydrated(true)
    })

    return () => {
      active = false
      controller.abort()
    }
  }, [cache])

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
    if (!autoSync || !hydrated || snapshotRef.current?.library) return undefined

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
  }, [autoSync, hydrated, sync])

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
    hasPublishedSnapshot: Boolean(snapshot?.library),
    apiConfigured: isDriveConfigured(),
    refresh: sync,
    dismissChanges,
  }
}
