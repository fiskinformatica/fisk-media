import { RefreshCw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function ChangeNotice({ changes, onDismiss }) {
  const { t } = useTranslation()
  const parts = []

  if (changes.added.length > 0) {
    parts.push(t('changes.new', { count: changes.added.length }))
  }
  if (changes.removed.length > 0) {
    parts.push(t('changes.removed', { count: changes.removed.length }))
  }
  if (changes.renamed.length > 0) {
    parts.push(t('changes.renamed', { count: changes.renamed.length }))
  }

  return (
    <div className="card mb-5 flex animate-fade-in items-start gap-3 px-4 py-3">
      <RefreshCw
        className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-stone-800">{t('changes.title')}</p>
        <p className="mt-0.5 min-w-0 break-words text-xs text-stone-500 sm:text-sm">
          {parts.join(' · ')}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('changes.dismiss')}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}
