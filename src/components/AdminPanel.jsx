import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Download,
  KeyRound,
  Lock,
  LogOut,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Undo2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import ChangeNotice from './ChangeNotice.jsx'
import FolderOrderPanel from './FolderOrderPanel.jsx'
import SyncButton from './SyncButton.jsx'
import { PIN_LENGTH, STAFF_PASSWORD } from '../config/access.js'
import { useLibrary } from '../hooks/useLibrary.js'
import {
  clearStaffPassword,
  hasCustomStaffPassword,
  setStaffPassword,
  updateRemoteStaffPin,
} from '../services/accessService.js'
import {
  onAdminAuthStateChanged,
  saveStaffPinToFirestore,
  signInAdmin,
  signOutAdmin,
} from '../services/firebaseService.js'
import { buildSnapshot, downloadSnapshot } from '../services/snapshotService.js'
import { exportFolderOrders, resetLocalOrders } from '../utils/folderOrder.js'
import { formatLastSync } from '../utils/format.js'

export default function AdminPanel() {
  const { t } = useTranslation()
  const [unlocked, setUnlocked] = useState(false)
  const [email, setEmail] = useState('admin@fisk.com.br')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [published, setPublished] = useState(false)
  const [customStaffPin, setCustomStaffPin] = useState(hasCustomStaffPassword)
  const [newStaffPin, setNewStaffPin] = useState('')
  const [confirmStaffPin, setConfirmStaffPin] = useState('')
  const [staffError, setStaffError] = useState(null)
  const [staffNotice, setStaffNotice] = useState(null)
  const [isUpdatingStaff, setIsUpdatingStaff] = useState(false)

  const {
    library,
    isSyncing,
    syncedAt,
    error: syncError,
    changes,
    apiConfigured,
    refresh,
    dismissChanges,
  } = useLibrary({ autoSync: unlocked })

  useEffect(() => {
    const unsubscribe = onAdminAuthStateChanged((user) => {
      setUnlocked(Boolean(user))
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!changes) return undefined

    const timeoutId = window.setTimeout(dismissChanges, 12_000)
    return () => window.clearTimeout(timeoutId)
  }, [changes, dismissChanges])

  function cleanPin(value) {
    return value.replace(/\D/g, '').slice(0, PIN_LENGTH)
  }

  function handleStaffPinField(event, setter) {
    setter(cleanPin(event.target.value))
    setStaffError(null)
    setStaffNotice(null)
  }

  async function handleStaffPinSubmit(event) {
    event.preventDefault()

    if (
      newStaffPin.length !== PIN_LENGTH ||
      confirmStaffPin.length !== PIN_LENGTH
    ) {
      setStaffError(t('admin.pinRequired'))
      setStaffNotice(null)
      return
    }

    if (newStaffPin !== confirmStaffPin) {
      setStaffError(t('admin.pinMismatch'))
      setStaffNotice(null)
      return
    }

    setIsUpdatingStaff(true)
    setStaffError(null)
    setStaffNotice(null)

    try {
      await saveStaffPinToFirestore(newStaffPin)
      updateRemoteStaffPin(newStaffPin)
      setStaffPassword(newStaffPin)
      setCustomStaffPin(true)
      setNewStaffPin('')
      setConfirmStaffPin('')
      setStaffNotice(t('admin.updatedGlobal'))
    } catch (err) {
      console.error(err)
      setStaffError(t('admin.updateFailed'))
    } finally {
      setIsUpdatingStaff(false)
    }
  }

  async function handleStaffPinReset() {
    setIsUpdatingStaff(true)
    setStaffError(null)
    setStaffNotice(null)

    try {
      await saveStaffPinToFirestore(STAFF_PASSWORD)
      updateRemoteStaffPin(STAFF_PASSWORD)
      clearStaffPassword()
      setCustomStaffPin(false)
      setNewStaffPin('')
      setConfirmStaffPin('')
      setStaffNotice(t('admin.restored'))
    } catch (err) {
      console.error(err)
      setStaffError(t('admin.updateFailed'))
    } finally {
      setIsUpdatingStaff(false)
    }
  }

  async function handleUnlock(event) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await signInAdmin(email.trim(), password)
      setPassword('')
    } catch {
      setError(t('admin.wrongCredentials'))
    } finally {
      setLoading(false)
    }
  }

  async function handleLock() {
    try {
      await signOutAdmin()
    } catch {
      /* ignore */
    }
    setUnlocked(false)
    setPassword('')
    setError(null)
    setPublished(false)
  }

  function handlePublish() {
    if (!library) return

    downloadSnapshot(
      buildSnapshot({ library, folderOrder: exportFolderOrders() }),
    )
    resetLocalOrders()
    setPublished(true)
  }

  return (
    <section className="card-elevated animate-rise p-5 sm:p-6 lg:p-7">
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
              Admin
            </h2>
            <p className="mt-0.5 text-sm leading-relaxed text-stone-500">
              {unlocked
                ? t('admin.unlockedSubtitle')
                : t('admin.lockedSubtitle')}
            </p>
          </div>
        </div>

        {unlocked && (
          <button
            type="button"
            onClick={handleLock}
            className="btn-secondary w-full max-w-full shrink-0 sm:w-36"
          >
            <LogOut className="cursor-pointer h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">{t('common.signOut')}</span>
          </button>
        )}
      </div>

      {!unlocked ? (
        <form onSubmit={handleUnlock} className="mt-4 max-w-sm space-y-3" noValidate>
          <div>
            <label htmlFor="admin-email" className="eyebrow mb-1.5 block">
              {t('admin.emailLabel')}
            </label>
            <input
              id="admin-email"
              name="admin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (error) setError(null)
              }}
              placeholder="admin@fisk.com.br"
              className="field-control h-11 px-3 text-sm font-medium"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="eyebrow mb-1.5 block">
              {t('admin.passwordLabel')}
            </label>
            <input
              id="admin-password"
              name="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (error) setError(null)
              }}
              placeholder="••••••••"
              className="field-control h-11 px-3 text-sm font-medium"
            />
          </div>

          {error && (
            <p
              id="admin-error"
              role="alert"
              className="flex min-w-0 items-start gap-1.5 text-xs leading-relaxed break-words text-red-600"
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
            disabled={loading || !email.trim() || !password}
            className="btn-primary mt-3 w-full"
          >
            {loading ? t('admin.signingIn') : t('admin.unlock')}
          </button>

          <p className="mt-3 max-w-sm text-xs leading-relaxed text-stone-400">
            {t('admin.lockedNote')}
          </p>
        </form>
      ) : (
        <div className="mt-5 space-y-5 xl:grid xl:grid-cols-2 xl:items-start xl:gap-5 xl:space-y-0">
          {changes && (
            <div className="xl:col-span-2">
              <ChangeNotice changes={changes} onDismiss={dismissChanges} />
            </div>
          )}

          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold tracking-tight text-stone-900">
                  {t('admin.syncTitle')}
                </h3>
                <p className="mt-0.5 text-sm leading-relaxed text-stone-500">
                  {t('admin.syncDesc')}
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
              <span className="min-w-0 break-words">
                {isSyncing ? t('admin.syncing') : formatLastSync(syncedAt)}
              </span>
            </div>

            <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-700">
                    {t('admin.publishTitle')}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed break-words text-stone-400">
                    {published
                      ? t('admin.publishedDesc')
                      : t('admin.publishDesc')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={!library}
                  className="btn-secondary min-h-9 w-full max-w-full shrink-0 py-2 text-xs sm:w-48"
                >
                  <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 truncate">
                    {t('admin.downloadSnapshot')}
                  </span>
                </button>
              </div>
            </div>

            {!apiConfigured && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-800">
                <TriangleAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                  aria-hidden="true"
                />
                <span>
                  {t('admin.apiKey')}
                </span>
              </div>
            )}

            {syncError && (
              <p className="mt-3 rounded-xl border border-red-200/70 bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-700">
                {syncError.message || t('admin.syncFailed')}
              </p>
            )}
          </div>

          <div className="border-t border-stone-100 pt-5 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-600">
                  <KeyRound className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold tracking-tight text-stone-900">
                    {t('admin.teacherPinTitle')}
                  </h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-stone-500">
                    {t('admin.teacherPinDesc')}
                  </p>
                </div>
              </div>

              <span
                className={`flex w-40 shrink-0 items-center justify-center overflow-hidden rounded-full px-2.5 py-1 text-center text-[11px] font-medium whitespace-nowrap sm:w-44 ${
                  customStaffPin
                    ? 'bg-brand-50 text-brand-700'
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                {customStaffPin
                  ? t('admin.customPin')
                  : t('admin.configuredPin')}
              </span>
            </div>

            <form onSubmit={handleStaffPinSubmit} className="mt-4 space-y-3" noValidate>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="new-staff-pin" className="eyebrow mb-1.5 block">
                    {t('admin.newPin')}
                  </label>
                  <input
                    id="new-staff-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    pattern="[0-9]*"
                    maxLength={PIN_LENGTH}
                    value={newStaffPin}
                    onChange={(event) =>
                      handleStaffPinField(event, setNewStaffPin)
                    }
                    placeholder="••••"
                    className="field-control h-12 px-2 pl-[0.4em] text-center text-lg font-semibold tracking-[0.35em]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirm-staff-pin"
                    className="eyebrow mb-1.5 block"
                  >
                    {t('admin.confirmPin')}
                  </label>
                  <input
                    id="confirm-staff-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    pattern="[0-9]*"
                    maxLength={PIN_LENGTH}
                    value={confirmStaffPin}
                    onChange={(event) =>
                      handleStaffPinField(event, setConfirmStaffPin)
                    }
                    placeholder="••••"
                    className="field-control h-12 px-2 pl-[0.4em] text-center text-lg font-semibold tracking-[0.35em]"
                  />
                </div>
              </div>

              {staffError && (
                <p
                  role="alert"
                  className="flex items-start gap-1.5 text-xs leading-relaxed text-red-600"
                >
                  <AlertCircle
                    className="mt-px h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {staffError}
                </p>
              )}

              {staffNotice && (
                <p className="text-xs leading-relaxed text-brand-700">
                  {staffNotice}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={
                    isUpdatingStaff ||
                    newStaffPin.length !== PIN_LENGTH ||
                    confirmStaffPin.length !== PIN_LENGTH
                  }
                  className="btn-primary min-h-9 w-full py-2 text-xs sm:w-40"
                >
                  <span className="min-w-0 truncate">{t('admin.updatePin')}</span>
                </button>

                {customStaffPin && (
                  <button
                    type="button"
                    onClick={handleStaffPinReset}
                    disabled={isUpdatingStaff}
                    className="btn-secondary min-h-9 w-full py-2 text-xs sm:w-60"
                  >
                    <Undo2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 truncate">
                      {t('admin.restoreDefault')}
                    </span>
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="border-t border-stone-100 pt-5 xl:col-span-2">
            <FolderOrderPanel library={library} />
          </div>
        </div>
      )}
    </section>
  )
}
