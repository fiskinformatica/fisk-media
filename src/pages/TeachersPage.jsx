import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  KeyRound,
  Lock,
  LogOut,
  ShieldCheck,
  Timer,
  TriangleAlert,
} from 'lucide-react'
import AdminPanel from '../components/AdminPanel.jsx'
import {
  OWNER_PASSWORD,
  PIN_LENGTH,
  SECRET_SALT,
  STAFF_PASSWORD,
} from '../config/access.js'
import { getAdminPinInfo } from '../services/accessService.js'
import { formatDuration } from '../utils/format.js'

const USING_DEFAULTS =
  SECRET_SALT === 'CHANGE-THIS-SECRET' ||
  STAFF_PASSWORD === '0000' ||
  OWNER_PASSWORD === '9999'

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
  return (
    <header className="card-elevated flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">Teacher</p>
          <p className="text-sm leading-tight font-semibold text-stone-800">
            Teacher's area
          </p>
        </div>
      </div>

      <nav
        className="flex w-full min-w-0 items-center gap-2 sm:w-auto"
        aria-label="Teacher navigation"
      >
        <a
          href="#/"
          className="btn-secondary min-h-10 flex-1 py-2 text-xs sm:flex-none sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          Library
        </a>
        <button
          type="button"
          onClick={onLogout}
          className="btn-secondary min-h-10 flex-1 py-2 text-xs sm:flex-none sm:text-sm"
        >
          <LogOut className="cursor-pointer h-4 w-4 shrink-0" aria-hidden="true" />
          Sign out
        </button>
      </nav>
    </header>
  )
}

function SecurityNote() {
  return (
    <div className="flex items-start gap-2 px-2 text-xs leading-relaxed text-stone-400 sm:text-sm">
      <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <p>
        This is casual access control. On a static site, PINs and secrets can be
        inspected in the browser. Don't use them for strong security.
      </p>
    </div>
  )
}

export default function TeachersPage() {
  const [pin, setPin] = useState('')
  const [pinInfo, setPinInfo] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState(() => Date.now())

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

  function handleSubmit(event) {
    event.preventDefault()

    if (pin !== STAFF_PASSWORD) {
      setError('Wrong PIN.')
      setPin('')
      return
    }

    setError(null)
    setPin('')
    setNow(Date.now())
    setPinInfo(getAdminPinInfo())
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

  function handleLogout() {
    setPinInfo(null)
    setPin('')
  }

  if (!pinInfo) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4 py-10">
        <div className="w-full max-w-[22rem] animate-rise">
          <div className="card-elevated p-7 sm:p-8">
            <div className="mb-6 text-center">
              <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <Lock className="h-5 w-5" aria-hidden="true" />
              </span>
              <h1 className="text-xl font-semibold tracking-tight text-stone-900">
                Teacher's area
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
                Enter your PIN to view today's access code.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="teacher-pin" className="sr-only">
                Teacher PIN
              </label>
              <input
                id="teacher-pin"
                name="teacher-pin"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={PIN_LENGTH}
                autoFocus
                value={pin}
                onChange={handleChange}
                placeholder="••••"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'teacher-pin-error' : undefined}
                className="field-control h-14 px-2 pl-[0.4em] text-center text-2xl font-semibold tracking-[0.4em] placeholder:tracking-[0.3em] placeholder:text-stone-300 sm:text-[26px]"
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
                disabled={pin.length !== PIN_LENGTH}
                className="btn-primary mt-5 w-full"
              >
                Sign in
              </button>
            </form>

            <p className="mt-5 text-center text-xs leading-relaxed text-stone-400">
              Teachers only. Student PIN changes daily at midnight.
            </p>
          </div>

          <a
            href="#/"
            className="btn-secondary mx-auto mt-5 flex min-h-10 w-full max-w-[18rem] py-2"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            Back to library
          </a>
        </div>
      </main>
    )
  }

  const countdown = formatDuration(
    Math.max(0, Math.ceil((pinInfo.validUntil.getTime() - now) / 1000)),
  )

  return (
    <main className="flex min-h-svh flex-col px-4 py-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4">
        <TeacherHeader onLogout={handleLogout} />

        <section className="card-elevated animate-rise p-7 sm:p-8">
          <div className="text-center">
            <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="eyebrow">Access PIN</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-stone-900">
              {pinInfo.dayLabel}
            </h1>
          </div>

          <div className="mt-6 flex items-center justify-center rounded-2xl border border-stone-200 bg-stone-50/70 px-5 py-6">
            <span className="pl-[0.25em] text-3xl font-semibold tracking-[0.25em] text-brand-700 tabular-nums sm:pl-[0.35em] sm:text-[38px] sm:tracking-[0.35em]">
              {pinInfo.currentPin}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="btn-primary mt-3 w-full"
          >
            {copied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {copied ? 'PIN copied' : 'Copy PIN'}
          </button>

          <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 tabular-nums">
            <Timer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            New PIN in {countdown}
          </div>

          <div className="mt-5 rounded-xl bg-stone-50 px-3.5 py-3 text-xs leading-relaxed text-stone-500">
            <p>
              Valid until {formatValidUntil(pinInfo.validUntil)}. A new PIN is
              generated at midnight; the previous day's PIN stops working.
            </p>
          </div>

          {USING_DEFAULTS && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-800">
              <TriangleAlert
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <span>
                Default secrets in use. Set <code>VITE_SECRET_SALT</code>,{' '}
                <code>VITE_STAFF_PASSWORD</code> and{' '}
                <code>VITE_OWNER_PASSWORD</code> in <code>.env</code> before
                publishing.
              </span>
            </div>
          )}
        </section>

        <AdminPanel />

        <SecurityNote />
      </div>
    </main>
  )
}
