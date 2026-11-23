import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  KeyRound,
  LogOut,
  ShieldCheck,
  Timer,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AdminPanel from '../components/AdminPanel.jsx'
import LanguageSelect from '../components/LanguageSelect.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { PIN_LENGTH } from '../config/access.js'
import {
  clearAuthorization,
  getAdminPinInfo,
  validateStaffPinAsync,
} from '../services/accessService.js'
import {
  onAdminAuthStateChanged,
  signInAdmin,
  signOutAdmin,
} from '../services/firebaseService.js'
import { formatDuration } from '../utils/format.js'

function formatValidUntil(date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
  }
}

function TeacherHeader({ onLogout }) {
  const { t } = useTranslation()

  return (
    <header className="card-elevated flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 lg:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">{t('teacher.teacher')}</p>
          <p className="text-sm leading-tight font-semibold text-stone-800">
            {t('teacher.title')}
          </p>
        </div>
      </div>

      <nav
        className="flex w-full min-w-0 items-center gap-2 sm:w-auto"
        aria-label={t('teacher.navigation')}
      >
        <LanguageSelect />
        <ThemeToggle />

        <a
          href="#/"
          className="btn-secondary min-h-10 flex-1 py-2 text-xs sm:w-36 sm:flex-none sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">{t('common.library')}</span>
        </a>
        <button
          type="button"
          onClick={onLogout}
          className="btn-secondary min-h-10 flex-1 py-2 text-xs sm:w-36 sm:flex-none sm:text-sm"
        >
          <LogOut className="cursor-pointer h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">{t('common.signOut')}</span>
        </button>
      </nav>
    </header>
  )
}

export default function TeachersPage() {
  const { t } = useTranslation()
  const [pin, setPin] = useState('')
  const [pinInfo, setPinInfo] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [adminEmail, setAdminEmail] = useState('admin@fisk.com.br')
  const [adminPassword, setAdminPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isFirebaseAdmin, setIsFirebaseAdmin] = useState(false)

  useEffect(() => {
    const unsubscribe = onAdminAuthStateChanged((user) => {
      const hasUser = Boolean(user)
      setIsFirebaseAdmin(hasUser)
      if (hasUser && !pinInfo) {
        setPinInfo(getAdminPinInfo())
      }
    })
    return unsubscribe
  }, [pinInfo])

  useEffect(() => {
    if (!pinInfo) return undefined

    const intervalId = window.setInterval(() => {
      const current = Date.now()
      setNow(current)

      if (current >= pinInfo.validUntil.getTime()) {
        setPinInfo(getAdminPinInfo())
        setCopied(false)
      }
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [pinInfo])

  function handleChange(event) {
    const nextPin = event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
    setPin(nextPin)
    if (error) setError(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const isValid = await validateStaffPinAsync(pin)
    if (!isValid) {
      setError(t('teacher.wrongPin'))
      setPin('')
      setSubmitting(false)
      return
    }

    setError(null)
    setPin('')
    setNow(Date.now())
    setPinInfo(getAdminPinInfo())
    setSubmitting(false)
  }

  async function handleAdminSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await signInAdmin(adminEmail.trim(), adminPassword)
      setAdminPassword('')
      setNow(Date.now())
      setPinInfo(getAdminPinInfo())
    } catch {
      setError(t('admin.wrongCredentials'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopy() {
    if (!pinInfo) return

    try {
      await navigator.clipboard.writeText(pinInfo.currentPin)
    } catch {
      fallbackCopy(pinInfo.currentPin)
    }

    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  async function handleLogout() {
    if (isFirebaseAdmin) {
      try {
        await signOutAdmin()
      } catch {
        /* ignore */
      }
    }
    clearAuthorization()
    setPinInfo(null)
    setPin('')
    window.history.replaceState(null, '', '#/')
    window.dispatchEvent(new Event('hashchange'))
  }

  if (!pinInfo) {
    return (
      <main className="relative flex min-h-svh items-center justify-center bg-canvas px-4 py-10">
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <LanguageSelect />
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[23rem] animate-rise">
          <div className="relative overflow-hidden rounded-3xl border border-stone-200 bg-surface p-7 shadow-[0_24px_60px_-30px_rgba(28,25,23,0.35)] sm:p-8">
            <span
              className="absolute inset-x-0 top-0 h-1 bg-brand-600"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-brand-600/10 blur-3xl"
              aria-hidden="true"
            />

            {/* Mode switch: Teacher PIN or Admin Login */}
            <div className="relative mb-6 flex rounded-xl bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setIsAdminMode(false)
                  setError(null)
                }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  !isAdminMode
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-stone-500 hover:text-ink'
                }`}
              >
                {t('teacher.teacher')} (PIN)
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdminMode(true)
                  setError(null)
                }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  isAdminMode
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-stone-500 hover:text-ink'
                }`}
              >
                {t('admin.title')}
              </button>
            </div>

            <div className="relative mb-6 text-center">
              <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-200/60">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="eyebrow text-brand-600">
                {isAdminMode ? t('admin.title') : t('teacher.staffAccess')}
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-ink">
                {isAdminMode ? t('admin.title') : t('teacher.title')}
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
                {isAdminMode
                  ? t('admin.lockedSubtitle')
                  : t('teacher.subtitle')}
              </p>
            </div>

            {!isAdminMode ? (
              <form onSubmit={handleSubmit} noValidate className="relative">
                <label htmlFor="teacher-pin" className="sr-only">
                  {t('teacher.pinLabel')}
                </label>
                <input
                  id="teacher-pin"
                  name="teacher-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  pattern="[0-9]*"
                  maxLength={PIN_LENGTH}
                  autoFocus
                  value={pin}
                  onChange={handleChange}
                  placeholder="••••"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'teacher-pin-error' : undefined}
                  className="field-control h-14 px-2 pl-[0.4em] text-center text-2xl font-semibold tracking-[0.4em] text-ink placeholder:text-stone-400 focus:border-brand-500 focus:bg-surface sm:text-[26px]"
                />

                {error && (
                  <p
                    id="teacher-pin-error"
                    role="alert"
                    className="mt-3 flex min-w-0 items-start gap-1.5 text-xs leading-relaxed break-words text-red-600"
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
                  disabled={submitting || pin.length !== PIN_LENGTH}
                  className="btn-primary mt-5 w-full"
                >
                  {submitting ? '...' : t('common.signIn')}
                </button>

                <p className="relative mt-5 text-center text-xs leading-relaxed text-stone-400">
                  {t('teacher.footer')}
                </p>
              </form>
            ) : (
              <form onSubmit={handleAdminSubmit} noValidate className="relative space-y-3">
                <div>
                  <label htmlFor="admin-direct-email" className="eyebrow mb-1.5 block">
                    {t('admin.emailLabel')}
                  </label>
                  <input
                    id="admin-direct-email"
                    name="admin-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={adminEmail}
                    onChange={(event) => {
                      setAdminEmail(event.target.value)
                      if (error) setError(null)
                    }}
                    placeholder="admin@fisk.com.br"
                    className="field-control h-11 px-3 text-sm font-medium"
                  />
                </div>

                <div>
                  <label htmlFor="admin-direct-password" className="eyebrow mb-1.5 block">
                    {t('admin.passwordLabel')}
                  </label>
                  <input
                    id="admin-direct-password"
                    name="admin-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={adminPassword}
                    onChange={(event) => {
                      setAdminPassword(event.target.value)
                      if (error) setError(null)
                    }}
                    placeholder="••••••••"
                    className="field-control h-11 px-3 text-sm font-medium"
                  />
                </div>

                {error && (
                  <p
                    id="admin-direct-error"
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
                  disabled={submitting || !adminEmail.trim() || !adminPassword}
                  className="btn-primary mt-2 w-full"
                >
                  {submitting ? t('admin.signingIn') : t('admin.unlock')}
                </button>
              </form>
            )}
          </div>

          <a
            href="#/"
            className="btn-secondary mx-auto mt-5 flex w-full max-w-[18rem]"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('common.backToLibrary')}
          </a>
        </div>
      </main>
    )
  }

  const countdown = formatDuration(
    Math.max(0, Math.ceil((pinInfo.validUntil.getTime() - now) / 1000)),
  )

  return (
    <main className="flex min-h-svh flex-col px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5">
        <TeacherHeader onLogout={handleLogout} />

        <div className="grid min-w-0 flex-1 items-start gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
            <section className="card-elevated animate-rise p-7 sm:p-8 lg:p-9">
              <div className="text-center">
                <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="eyebrow">{t('teacher.accessPin')}</p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-stone-900">
                  {pinInfo.dayLabel}
                </h1>
              </div>

              <div className="mt-6 flex items-center justify-center rounded-2xl border border-stone-200 bg-stone-50/70 px-5 py-6 lg:py-8">
                <span className="pl-[0.25em] text-3xl font-semibold tracking-[0.25em] text-brand-700 tabular-nums sm:pl-[0.35em] sm:text-[38px] sm:tracking-[0.35em] lg:text-[44px] lg:tracking-[0.38em]">
                  {pinInfo.currentPin}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="btn-primary mt-3 w-full lg:mt-4"
              >
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                {copied ? t('teacher.pinCopied') : t('teacher.copyPin')}
              </button>

              <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 tabular-nums">
                <Timer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {t('teacher.newPinIn', { time: countdown })}
              </div>

              <div className="mt-5 rounded-xl bg-stone-50 px-3.5 py-3 text-xs leading-relaxed text-stone-500">
                <p>
                  {t('teacher.validUntil', {
                    time: formatValidUntil(pinInfo.validUntil),
                  })}
                </p>
              </div>
            </section>
          </div>

          <AdminPanel />
        </div>
      </div>
    </main>
  )
}
