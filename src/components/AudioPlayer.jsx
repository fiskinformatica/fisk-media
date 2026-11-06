import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { formatDuration } from '../utils/format.js'

function progressPercent(current, total) {
  if (!total) return 0
  return Math.min(100, Math.max(0, (current / total) * 100))
}

export default function AudioPlayer({
  currentTrack,
  isPlaying,
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
  const percent = progressPercent(currentTime, duration)
  const location = currentTrack.path.length
    ? `${currentTrack.categoryName} · ${currentTrack.path.join(' / ')}`
    : currentTrack.categoryName

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] sm:px-4 sm:pb-4">
      <div className="mx-auto w-full border-t border-stone-200/80 bg-white/95 shadow-[0_-10px_40px_-24px_rgba(28,25,23,0.35)] backdrop-blur-md sm:max-w-5xl sm:rounded-2xl sm:border sm:shadow-[0_18px_50px_-24px_rgba(28,25,23,0.35)]">
        <div className="flex items-center gap-2.5 px-4 py-3 sm:gap-4 sm:px-5">
          <div className="min-w-0 flex-1 sm:w-52 sm:flex-none">
            <p className="truncate text-sm font-semibold text-stone-900">
              {currentTrack.name}
            </p>
            <p className="truncate text-[11px] text-stone-400">{location}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={previous}
              disabled={!hasPrevious}
              aria-label="Faixa anterior"
              className="grid h-8 w-8 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <SkipBack className="h-4 w-4" fill="currentColor" />
            </button>

            <button
              type="button"
              onClick={toggle}
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              className="grid h-11 w-11 place-items-center rounded-full bg-brand-600 text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" fill="currentColor" />
              ) : (
                <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
              )}
            </button>

            <button
              type="button"
              onClick={next}
              disabled={!hasNext}
              aria-label="Próxima faixa"
              className="grid h-8 w-8 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <SkipForward className="h-4 w-4" fill="currentColor" />
            </button>
          </div>

          <div className="hidden flex-1 items-center gap-2.5 sm:flex">
            <span className="w-9 text-right text-[11px] tabular-nums text-stone-400">
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
              aria-label="Progresso do áudio"
              className="player-range flex-1"
              style={{ '--progress': `${percent}%` }}
            />
            <span className="w-9 text-[11px] tabular-nums text-stone-400">
              {formatDuration(duration)}
            </span>
          </div>

          <div className="hidden items-center gap-1.5 md:flex md:w-28">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Ativar som' : 'Silenciar'}
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
              aria-label="Volume"
              className="player-range w-16"
              style={{ '--progress': `${(muted ? 0 : volume) * 100}%` }}
            />
          </div>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Ativar som' : 'Silenciar'}
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
          <span className="text-[10px] tabular-nums text-stone-400">
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
            aria-label="Progresso do áudio"
            className="player-range flex-1"
            style={{ '--progress': `${percent}%` }}
          />
          <span className="text-[10px] tabular-nums text-stone-400">
            {formatDuration(duration)}
          </span>
        </div>

        {error && (
          <p className="px-4 pb-3 text-center text-[11px] leading-relaxed text-red-600 sm:px-5">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
