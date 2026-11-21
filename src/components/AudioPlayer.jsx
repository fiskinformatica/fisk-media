import {
  Loader2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDuration } from '../utils/format.js'

function progressPercent(current, total) {
  if (!total) return 0
  return Math.min(100, Math.max(0, (current / total) * 100))
}

export default function AudioPlayer({
  currentTrack,
  isPlaying,
  isBuffering,
  currentTime,
  duration,
  volume,
  muted,
  error,
  hasNext,
  hasPrevious,
  toggle,
  next,
  previous,
  seek,
  setVolume,
  toggleMute,
}) {
  const { t } = useTranslation()
  const percent = progressPercent(currentTime, duration)
  const location = currentTrack.path.length
    ? `${currentTrack.categoryName} · ${currentTrack.path.join(' / ')}`
    : currentTrack.categoryName

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] sm:px-4 sm:pb-4">
      <div className="mx-auto w-full border-t border-stone-200/80 bg-surface/95 shadow-[0_-10px_40px_-24px_rgba(28,25,23,0.35)] backdrop-blur-md sm:max-w-5xl sm:rounded-2xl sm:border sm:shadow-[0_18px_50px_-24px_rgba(28,25,23,0.35)]">
        <div className="flex items-center gap-2.5 px-4 py-3 sm:gap-4 sm:px-5">
          <div className="min-w-0 flex-1 sm:w-56 sm:flex-none lg:w-64">
            <p className="text-sm leading-tight font-semibold text-stone-900 line-clamp-2 break-words">
              {currentTrack.name}
            </p>
            <p className="truncate text-xs text-stone-400">{location}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={previous}
              disabled={!hasPrevious}
              aria-label={t('player.previous')}
              className="grid h-8 w-8 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <SkipBack className="h-4 w-4" fill="currentColor" />
            </button>

            <button
              type="button"
              onClick={toggle}
              aria-label={
                isBuffering
                  ? t('player.buffering')
                  : isPlaying
                    ? t('player.pause')
                    : t('player.play')
              }
              className="grid h-11 w-11 place-items-center rounded-full bg-brand-600 text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {isBuffering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4" fill="currentColor" />
              ) : (
                <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
              )}
            </button>

            <button
              type="button"
              onClick={next}
              disabled={!hasNext}
              aria-label={t('player.next')}
              className="grid h-8 w-8 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <SkipForward className="h-4 w-4" fill="currentColor" />
            </button>
          </div>

          <div className="hidden min-w-0 flex-1 items-center gap-2.5 sm:flex">
            <span className="w-10 text-right text-xs tabular-nums text-stone-400 sm:w-12">
              {formatDuration(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => seek(Number(event.target.value))}
              disabled={!duration}
              aria-label={t('player.seek')}
              className="player-range min-w-0 flex-1"
              style={{ '--progress': `${percent}%` }}
            />
            <span className="w-10 text-xs tabular-nums text-stone-400 sm:w-12">
              {formatDuration(duration)}
            </span>
          </div>

          <div className="hidden items-center gap-1.5 md:flex md:w-28">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? t('player.unmute') : t('player.mute')}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={muted ? 0 : volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              aria-label={t('player.volume')}
              className="player-range w-16"
              style={{ '--progress': `${(muted ? 0 : volume) * 100}%` }}
            />
          </div>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? t('player.unmute') : t('player.mute')}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 md:hidden"
          >
            {muted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 pb-3 sm:hidden">
          <span className="shrink-0 text-xs tabular-nums text-stone-400">
            {formatDuration(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => seek(Number(event.target.value))}
            disabled={!duration}
            aria-label={t('player.seek')}
            className="player-range min-w-0 flex-1"
            style={{ '--progress': `${percent}%` }}
          />
          <span className="shrink-0 text-xs tabular-nums text-stone-400">
            {formatDuration(duration)}
          </span>
        </div>

        {error && (
          <p className="px-4 pb-3 text-center text-xs leading-relaxed break-words text-red-600 sm:px-5">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
