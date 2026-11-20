import {
  AlertCircle,
  FolderOpen,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react'

export function LoadingState() {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-stone-200 bg-white/60 px-6 py-20 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-stone-800">
        Loading library
      </h2>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-stone-400">
        Just a moment…
      </p>
    </div>
  )
}

export function SetupState() {
  return (
    <div className="card mx-auto max-w-lg animate-rise p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <FolderOpen className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-stone-800">
        Library unavailable
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
        Please try again later.
      </p>
    </div>
  )
}

export function ErrorState({ onRetry }) {
  return (
    <div className="card mx-auto max-w-lg p-6 text-center sm:p-8">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-500">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-stone-800">
        Library unavailable
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
        Please try again later.
      </p>
      <button type="button" onClick={onRetry} className="btn-primary mt-5">
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Retry
      </button>
    </div>
  )
}

export function EmptyState({
  title = 'Nothing here yet',
  description = 'This folder has no media files.',
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-stone-200 bg-white/50 px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400">
        <FolderOpen className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-stone-700">{title}</h2>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-stone-400">
        {description}
      </p>
    </div>
  )
}

export function CategoryError({ errors }) {
  const messages = [
    ...new Set(errors.map((error) => error.message).filter(Boolean)),
  ]

  if (messages.length === 0) return null

  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200/70 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-800">
      <TriangleAlert
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
        aria-hidden="true"
      />
      <div className="min-w-0 space-y-1 break-words">
        {messages.map((message) => (
          <p key={message}>{message}</p>
        ))}
      </div>
    </div>
  )
}
