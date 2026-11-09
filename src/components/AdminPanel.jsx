import { useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import FolderOrderPanel from './FolderOrderPanel.jsx'
import SyncButton from './SyncButton.jsx'
import { useLibrary } from '../hooks/useLibrary.js'
import { getAdminToken, getSyncHistory, getSyncStatus, triggerSync } from '../services/apiService.js'
import { formatLastSync } from '../utils/format.js'

export default function AdminPanel() {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [syncError, setSyncError] = useState(null)
  const [syncHistory, setSyncHistory] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [lastSyncInfo, setLastSyncInfo] = useState(null)

  // Check if admin is authenticated (token present)
  const isAuthenticated = Boolean(getAdminToken())

  const {
    library,
    isSyncing: librarySyncing,
    syncedAt,
    error: libraryError,
    apiConfigured,
    refresh: refreshLibrary,
  } = useLibrary({ autoSync: isAuthenticated })

  const isSyncing = syncing || librarySyncing

  // Load sync status on mount
  useEffect(() => {
    if (!isAuthenticated) return

    getSyncStatus().then((result) => {
      if (result.ok && result.data?.lastSync) {
        setLastSyncInfo(result.data.lastSync)
      }
    })
  }, [isAuthenticated])

  async function handleSync() {
    if (syncing) return

    setSyncing(true)
    setSyncError(null)
    setSyncResult(null)

    try {
      const result = await triggerSync()

      if (result.ok) {
        setSyncResult(result.data)
        // Refresh the library in the frontend after sync
        await refreshLibrary()
      } else {
        setSyncError(result.error || 'Sincronização falhou.')
      }
    } catch (err) {
      setSyncError(err.message || 'Erro de rede ao sincronizar.')
    } finally {
      setSyncing(false)
    }
  }

  async function handleShowHistory() {
    if (!showHistory) {
      const result = await getSyncHistory()
      if (result.ok) setSyncHistory(result.data)
    }
    setShowHistory(!showHistory)
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <section className="card-elevated animate-rise p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-tight text-stone-900">
            Administração
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-stone-500">
            Sincronização e ordem das pastas da biblioteca.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {/* Sync section */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-stone-900">
                Sincronização
              </h3>
              <p className="mt-0.5 text-sm leading-relaxed text-stone-500">
                Atualize a biblioteca exibida aos alunos.
              </p>
            </div>
            <SyncButton
              isSyncing={isSyncing}
              onRefresh={handleSync}
              showLabel
            />
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2.5 text-xs text-stone-500">
            <RefreshCw
              className={`h-3.5 w-3.5 shrink-0 ${
                isSyncing ? 'animate-spin text-brand-600' : 'text-stone-400'
              }`}
              aria-hidden="true"
            />
            <span>
              {isSyncing ? 'Sincronizando...' : formatLastSync(syncedAt)}
            </span>
          </div>

          {!apiConfigured && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-800">
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <span>
                A URL da API não está configurada. Defina{' '}
                <code>VITE_API_URL</code> no arquivo <code>.env</code>.
              </span>
            </div>
          )}

          {syncError && (
            <p className="mt-3 rounded-xl border border-red-200/70 bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-700">
              {syncError}
            </p>
          )}

          {libraryError && !syncError && (
            <p className="mt-3 rounded-xl border border-red-200/70 bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-700">
              {libraryError.message || 'Não foi possível carregar a biblioteca.'}
            </p>
          )}

          {syncResult && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-green-200/70 bg-green-50 px-3.5 py-3 text-xs leading-relaxed text-green-800">
              <CheckCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
                aria-hidden="true"
              />
              <span>
                Sincronização concluída em{' '}
                {Math.round((syncResult.durationMs ?? 0) / 1000)}s.{' '}
                {syncResult.filesAdded > 0 && `${syncResult.filesAdded} arquivo(s) adicionado(s). `}
                {syncResult.filesRemoved > 0 && `${syncResult.filesRemoved} arquivo(s) removido(s). `}
                {syncResult.errors?.length > 0 && (
                  <span className="text-amber-700">
                    {syncResult.errors.length} erro(s) encontrado(s).
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Sync history toggle */}
          <button
            type="button"
            onClick={handleShowHistory}
            className="mt-3 text-xs text-stone-400 underline underline-offset-2 hover:text-stone-600"
          >
            {showHistory ? 'Ocultar histórico' : 'Ver histórico de sincronizações'}
          </button>

          {showHistory && syncHistory && (
            <div className="mt-3 space-y-2">
              {syncHistory.length === 0 ? (
                <p className="text-xs text-stone-400">Nenhuma sincronização registrada.</p>
              ) : (
                syncHistory.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-xs text-stone-600"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-medium ${job.status === 'completed' ? 'text-green-700' : job.status === 'failed' ? 'text-red-700' : 'text-amber-700'}`}>
                        {job.status === 'completed' ? 'Concluída' : job.status === 'failed' ? 'Falhou' : 'Em andamento'}
                      </span>
                      <span className="text-stone-400 text-[10px]">
                        {job.started_at ? new Date(job.started_at).toLocaleString('pt-BR') : '—'}
                      </span>
                    </div>
                    <div className="mt-1 flex gap-3 text-[11px] text-stone-400">
                      <span>{job.files_processed ?? 0} processados</span>
                      <span>+{job.files_added ?? 0} adicionados</span>
                      <span>-{job.files_removed ?? 0} removidos</span>
                      <span>{job.triggered_by}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Folder order section */}
        <div className="border-t border-stone-100 pt-5">
          <FolderOrderPanel library={library} />
        </div>
      </div>
    </section>
  )
}
