import { useState } from 'react'
import {
  AlertCircle,
  Lock,
  LogOut,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import FolderOrderPanel from './FolderOrderPanel.jsx'
import SyncButton from './SyncButton.jsx'
import { OWNER_PASSWORD, PIN_LENGTH } from '../config/access.js'
import { useLibrary } from '../hooks/useLibrary.js'
import { formatLastSync } from '../utils/format.js'

export default function AdminPanel() {
  const [unlocked, setUnlocked] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)

  const {
    library,
    isSyncing,
    syncedAt,
    error: syncError,
    apiConfigured,
    refresh,
  } = useLibrary({ autoSync: unlocked })

  function handleChange(event) {
    const nextPin = event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
    setPin(nextPin)
    if (error) setError(null)
  }

  function handleUnlock(event) {
    event.preventDefault()

    if (pin !== OWNER_PASSWORD) {
      setError('PIN incorreto.')
      setPin('')
      return
    }

    setError(null)
    setPin('')
    setUnlocked(true)
  }

  function handleLock() {
    setUnlocked(false)
    setPin('')
    setError(null)
  }

  return (
    <section className="card-elevated animate-rise p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
            {unlocked ? (
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Lock className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold tracking-tight text-stone-900">
              Administração
            </h2>
            <p className="mt-0.5 text-sm leading-relaxed text-stone-500">
              {unlocked
                ? 'Sincronização e ordem das pastas da biblioteca.'
                : 'Acesso restrito ao administrador.'}
            </p>
          </div>
        </div>

        {unlocked && (
          <button
            type="button"
            onClick={handleLock}
            className="btn-secondary shrink-0"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </button>
        )}
      </div>

      {!unlocked ? (
        <form onSubmit={handleUnlock} className="mt-4" noValidate>
          <label htmlFor="owner-pin" className="sr-only">
            PIN do administrador
          </label>
          <input
            id="owner-pin"
            name="owner-pin"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={PIN_LENGTH}
            value={pin}
            onChange={handleChange}
            placeholder="••••"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'owner-pin-error' : undefined}
            className="field-control h-14 text-center text-[26px] font-semibold tracking-[0.55em] placeholder:tracking-[0.4em] placeholder:text-stone-300"
          />

          {error && (
            <p
              id="owner-pin-error"
              role="alert"
              className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-red-600"
            >
              <AlertCircle
                className="mt-px h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pin.length !== PIN_LENGTH}
            className="btn-primary mt-4 w-full"
          >
            Desbloquear
          </button>

          <p className="mt-3 text-center text-[11px] leading-relaxed text-stone-400">
            Sincronização e ordem das pastas são exclusivas do administrador.
          </p>
        </form>
      ) : (
        <div className="mt-5 space-y-5">
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
                onRefresh={refresh}
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
                <TriangleAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                  aria-hidden="true"
                />
                <span>
                  A chave da API não está configurada. Defina{' '}
                  <code>VITE_GOOGLE_API_KEY</code> para sincronizar.
                </span>
              </div>
            )}

            {syncError && (
              <p className="mt-3 rounded-xl border border-red-200/70 bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-700">
                {syncError.message ||
                  'Não foi possível sincronizar a biblioteca agora.'}
              </p>
            )}
          </div>

          <div className="border-t border-stone-100 pt-5">
            <FolderOrderPanel library={library} />
          </div>
        </div>
      )}
    </section>
  )
}
