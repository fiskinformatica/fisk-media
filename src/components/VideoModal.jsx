import { useEffect, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import {
  getDrivePreviewUrl,
  getDriveViewUrl,
  getMediaUrl,
} from '../services/driveService.js'

export default function VideoModal({ item, onClose }) {
  const [useDrivePreview, setUseDrivePreview] = useState(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const location = item.path.length
    ? `${item.categoryName} · ${item.path.join(' / ')}`
    : item.categoryName

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      onClick={onClose}
    >
      <div
        className="flex max-h-svh w-full max-w-4xl animate-fade-in flex-col overflow-hidden bg-stone-950 sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-4 py-3 sm:items-center sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-tight font-medium break-words text-white line-clamp-2">
              {item.name}
            </p>
            <p className="text-xs leading-snug break-words text-white/45 line-clamp-2">
              {location}
            </p>
          </div>

          <a
            href={getDriveViewUrl(item.id)}
            target="_blank"
            rel="noreferrer"
            className="hidden shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/60 transition hover:bg-white/10 hover:text-white sm:flex"
          >
            Open in Drive
            <ExternalLink
              className="h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
          </a>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close video"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 bg-black">
          {useDrivePreview ? (
            <iframe
              src={getDrivePreviewUrl(item.id)}
              title={item.name}
              allow="autoplay; fullscreen"
              allowFullScreen
              className="h-[70svh] w-full"
            />
          ) : (
            <video
              key={item.id}
              src={getMediaUrl(item.id)}
              controls
              autoPlay
              playsInline
              onError={() => setUseDrivePreview(true)}
              className="mx-auto max-h-[72svh] w-full bg-black object-contain"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:hidden">
          <a
            href={getDriveViewUrl(item.id)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-white/60"
          >
            Open in Drive
            <ExternalLink
              className="h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
          </a>
          <span className="text-xs text-white/45">
            Use the player controls
          </span>
        </div>
      </div>
    </div>
  )
}
