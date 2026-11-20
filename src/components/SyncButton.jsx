import { RefreshCw } from 'lucide-react'

export default function SyncButton({ isSyncing, onRefresh, showLabel = false }) {
  const label = isSyncing ? 'Syncing…' : 'Sync'

  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isSyncing}
      title="Sync library"
      aria-label="Sync library"
      className={
        showLabel
          ? 'btn-secondary min-h-9 max-w-full shrink-0 py-2 text-xs'
          : 'icon-button'
      }
    >
      <RefreshCw
        className={`h-4 w-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
      {showLabel && <span className="min-w-0">{label}</span>}
    </button>
  )
}
