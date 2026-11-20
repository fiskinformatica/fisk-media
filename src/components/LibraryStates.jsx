import {
  AlertCircle,
  FolderOpen,
  KeyRound,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react'

export function LoadingState({ progress }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-stone-200 bg-white/60 px-6 py-20 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-stone-800">
        Building your library
      </h2>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-stone-400">
        Reading folders from Google Drive. The first sync can take a few seconds.
      </p>
      {progress?.folders > 0 && (
        <p className="mt-3 text-xs font-medium text-stone-400">
          {progress.folders}{' '}
          {progress.folders === 1 ? 'folder checked' : 'folders checked'} ·{' '}
          {progress.files} {progress.files === 1 ? 'file' : 'files'}
        </p>
      )}
    </div>
  )
}

export function SetupState() {
  return (
    <div className="card mx-auto max-w-lg animate-rise p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <KeyRound className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-stone-800">
        Setup required
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
        Add a Google Drive API key to your environment and rebuild.
      </p>

      <div className="mt-5 overflow-x-auto rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-left">
        <code className="text-xs text-brand-700">
          VITE_GOOGLE_API_KEY=your-key
        </code>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-stone-400">
        Create the key in Google Cloud Console with Drive API v3 enabled. Folders
        are configured in{' '}
        <code className="rounded bg-stone-100 px-1 py-0.5 text-[11px] text-stone-600">
          src/config/drive.js
        </code>
        .
      </p>
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="card mx-auto max-w-lg p-6 text-center sm:p-8">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-500">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-stone-800">
        Couldn't load the library
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed break-words text-stone-500">
        {error?.message ||
          'Check your connection, API key and folder sharing.'}
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

export function InlineWarning({ children, onRetry }) {
  return (
    <div className="mb-5 flex flex-col gap-2 rounded-xl border border-red-200/70 bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-700 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-2">
        <AlertCircle
          className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
          aria-hidden="true"
        />
        <span className="min-w-0 break-words">{children}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="max-w-full shrink-0 self-start rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 shadow-sm transition hover:bg-red-100 sm:self-auto"
        >
          Retry
        </button>
      )}
    </div>
  )
}
