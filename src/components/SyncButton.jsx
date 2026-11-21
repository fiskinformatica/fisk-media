import { RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function SyncButton({ isSyncing, onRefresh, showLabel = false }) {
  const { t } = useTranslation()
  const label = isSyncing ? t('admin.syncing') : t('admin.syncTitle')

  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isSyncing}
      title={t('admin.syncDesc')}
      aria-label={t('admin.syncDesc')}
      className={
        showLabel
          ? 'btn-secondary min-h-9 w-full max-w-full shrink-0 py-2 text-xs sm:w-40'
          : 'icon-button'
      }
    >
      <RefreshCw
        className={`h-4 w-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
      {showLabel && <span className="min-w-0 truncate">{label}</span>}
    </button>
  )
}
