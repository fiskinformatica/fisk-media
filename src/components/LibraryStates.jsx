import {
  AlertCircle,
  FolderOpen,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function LoadingState() {
  const { t } = useTranslation()

  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-stone-200 bg-surface/60 px-6 py-20 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-stone-800">
        {t('states.loading')}
      </h2>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-stone-400">
        {t('states.justAMoment')}
      </p>
    </div>
  )
}

export function SetupState() {
  const { t } = useTranslation()

  return (
    <div className="card mx-auto max-w-lg animate-rise p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <FolderOpen className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-stone-800">
        {t('states.unavailable')}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
        {t('states.tryLater')}
      </p>
    </div>
  )
}

export function ErrorState({ onRetry }) {
  const { t } = useTranslation()

  return (
    <div className="card mx-auto max-w-lg p-6 text-center sm:p-8">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-500">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-stone-800">
        {t('states.unavailable')}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
        {t('states.tryLater')}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="btn-primary mt-5 w-44"
      >
        <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">{t('common.retry')}</span>
      </button>
    </div>
  )
}

export function EmptyState({ title, description }) {
  const { t } = useTranslation()
  const heading = title ?? t('states.nothingHere')
  const text = description ?? t('states.noMedia')

  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-stone-200 bg-surface/50 px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400">
        <FolderOpen className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-stone-700">{heading}</h2>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-stone-400">
        {text}
      </p>
    </div>
  )
}

export function CategoryError({ errors }) {
  const { t } = useTranslation()
  const messages = [
    ...new Set(
      errors
        .filter((error) => error?.code || error?.message)
        .map((error) => {
          const text = error.code
            ? t(`errors.${error.code}`, {
                name: error.category,
                defaultValue: error.message,
              })
            : error.message

          return error.path && error.path !== error.category
            ? `${error.path}: ${text}`
            : text
        }),
    ),
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
