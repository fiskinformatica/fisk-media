import { RefreshCw } from 'lucide-react'

export default function SyncButton({ isSyncing, onRefresh, showLabel = false }) {
  const label = isSyncing ? 'Sincronizando...' : 'Sincronizar'

  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isSyncing}
      title="Sincronizar biblioteca"
      aria-label="Sincronizar biblioteca"
      className={showLabel ? 'btn-secondary shrink-0' : 'icon-button'}
    >
      <RefreshCw
        className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
      {showLabel && <span>{label}</span>}
    </button>
  )
}
