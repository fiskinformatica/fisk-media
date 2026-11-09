import { useCallback, useEffect, useRef, useState } from 'react'
import { getMediaFallbackUrl, getMediaUrl } from '../services/apiService.js'
import { readJson, writeJson } from '../utils/storage.js'

const PLAYER_STORAGE_KEY = 'fisk.player.v1'

function readInitialVolume() {
  const stored = readJson(PLAYER_STORAGE_KEY)
  const value = typeof stored?.volume === 'number' ? stored.volume : 0.9
  return Math.min(1, Math.max(0, value))
}

export function useAudioPlayer() {
  const [volume, setVolumeState] = useState(readInitialVolume)

  const audioRef = useRef(null)
  const queueRef = useRef([])
  const indexRef = useRef(-1)
  const fallbackRef = useRef(false)
  const playIntentRef = useRef(false)
  const volumeRef = useRef(volume)

  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState(null)

  const loadAt = useCallback((targetIndex, autoplay = true) => {
    const track = queueRef.current[targetIndex]
    if (!track) return

    const audio = audioRef.current

    indexRef.current = targetIndex
    setIndex(targetIndex)
    setCurrentTime(0)
    setDuration(0)
    setError(null)
    fallbackRef.current = false
    playIntentRef.current = autoplay

    if (!audio) return

    audio.src = getMediaUrl(track.id)
    audio.load()

    if (autoplay) {
      const promise = audio.play()
      if (promise?.catch) promise.catch(() => setIsPlaying(false))
    }
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.volume = volumeRef.current
    audioRef.current = audio

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0)
    const handleDuration = () =>
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleVolume = () => {
      volumeRef.current = audio.volume
      setVolumeState(audio.volume)
      setMuted(audio.muted)
      writeJson(PLAYER_STORAGE_KEY, { volume: audio.volume })
    }
    const handleEnded = () => {
      const nextIndex = indexRef.current + 1
      if (nextIndex < queueRef.current.length) {
        loadAt(nextIndex, true)
      } else {
        playIntentRef.current = false
        setIsPlaying(false)
      }
    }
    const handleError = () => {
      const track = queueRef.current[indexRef.current]
      if (!track) return

      if (!fallbackRef.current) {
        fallbackRef.current = true
        const shouldPlay = playIntentRef.current
        audio.src = getMediaFallbackUrl(track.id)
        audio.load()
        if (shouldPlay) audio.play().catch(() => setIsPlaying(false))
        return
      }

      setError(
        'Não foi possível reproduzir este áudio. Confira se o arquivo está compartilhado publicamente no Drive.',
      )
      playIntentRef.current = false
      setIsPlaying(false)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleDuration)
    audio.addEventListener('durationchange', handleDuration)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('volumechange', handleVolume)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleDuration)
      audio.removeEventListener('durationchange', handleDuration)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('volumechange', handleVolume)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.src = ''
      audioRef.current = null
    }
  }, [loadAt])

  const playTrack = useCallback(
    (track, tracks = []) => {
      const list = tracks.length > 0 ? tracks : [track]
      const targetIndex = Math.max(
        0,
        list.findIndex((candidate) => candidate.id === track.id),
      )

      queueRef.current = list
      setQueue(list)
      loadAt(targetIndex, true)
    },
    [loadAt],
  )

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!audio.src) {
      if (queueRef.current.length > 0) {
        loadAt(Math.max(0, indexRef.current), true)
      }
      return
    }

    if (audio.paused) {
      playIntentRef.current = true
      audio.play().catch(() => setIsPlaying(false))
    } else {
      playIntentRef.current = false
      audio.pause()
    }
  }, [loadAt])

  const next = useCallback(() => {
    const targetIndex = indexRef.current + 1
    if (targetIndex < queueRef.current.length) loadAt(targetIndex, true)
  }, [loadAt])

  const previous = useCallback(() => {
    const audio = audioRef.current

    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      setCurrentTime(0)
      return
    }

    const targetIndex = indexRef.current - 1
    if (targetIndex >= 0) loadAt(targetIndex, true)
  }, [loadAt])

  const seek = useCallback((seconds) => {
    const audio = audioRef.current
    if (!audio) return

    const max = Number.isFinite(audio.duration) ? audio.duration : seconds
    const value = Math.min(Math.max(0, seconds), max)
    audio.currentTime = value
    setCurrentTime(value)
  }, [])

  const setVolume = useCallback((nextVolume) => {
    const audio = audioRef.current
    const value = Math.min(1, Math.max(0, nextVolume))

    volumeRef.current = value
    setVolumeState(value)

    if (!audio) return

    audio.volume = value
    audio.muted = value === 0
  }, [])

  const toggleMute = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.muted = !audio.muted
  }, [])

  const pause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    playIntentRef.current = false
    audio.pause()
  }, [])

  const currentTrack = queue[index] ?? null

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    error,
    hasNext: index >= 0 && index < queue.length - 1,
    hasPrevious: index > 0,
    playTrack,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    pause,
  }
}
