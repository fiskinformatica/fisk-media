import { useState } from 'react'
import { AlertCircle, ArrowUpRight, KeyRound, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PIN_LENGTH } from '../config/access.js'
import LanguageSelect from './LanguageSelect.jsx'
import ThemeToggle from './ThemeToggle.jsx'

export default function PinGate({ onAuthorize, sessionExpired }) {
  const { t } = useTranslation()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)

  function handleChange(event) {
    const nextPin = event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
    setPin(nextPin)
    if (error) setError(null)
  }

  function handleSubmit(event) {
    event.preventDefault()
    const result = onAuthorize(pin)

    if (!result.ok) {
      setError(result.reason)
      setPin('')
    }
  }

  const message = error ? t(`pinGate.${error}`) : null

  return (
    <main className="relative flex min-h-svh items-center justify-center px-4 py-10">
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <LanguageSelect />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[22rem] animate-rise">
        <div className="card-elevated p-7 sm:p-8">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-stone-900">
              {t('pinGate.title')}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
              {t('pinGate.subtitle')}
            </p>
          </div>

          {sessionExpired && !message && (
            <div className="mb-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800">
              {t('pinGate.sessionExpired')}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="pin" className="sr-only">
              {t('pinGate.pinLabel')}
            </label>
            <input
              id="pin"
              name="pin"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={PIN_LENGTH}
              autoFocus
              value={pin}
              onChange={handleChange}
              placeholder="••••"
              aria-invalid={Boolean(message)}
              aria-describedby={message ? 'pin-error' : undefined}
              className="field-control h-14 px-2 pl-[0.4em] text-center text-2xl font-semibold tracking-[0.4em] placeholder:tracking-[0.3em] placeholder:text-stone-300 sm:text-[26px]"
            />

            {message && (
              <p
                id="pin-error"
                role="alert"
                className="mt-3 flex min-w-0 items-start gap-1.5 text-xs leading-relaxed break-words text-red-600"
              >
                <AlertCircle
                  className="mt-px h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={pin.length !== PIN_LENGTH}
              className="btn-primary mt-5 w-full"
            >
              {t('common.signIn')}
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-relaxed text-stone-400">
            {t('pinGate.dailyNote')} <br /> {t('pinGate.askNote')}
          </p>
        </div>

        <a
          href="#/teachers"
          className="card group mt-5 flex items-center gap-3 p-3.5 transition hover:border-brand-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-500 transition group-hover:bg-brand-50 group-hover:text-brand-600">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-stone-800">
              {t('pinGate.teacherTitle')}
            </span>
            <span className="block text-xs leading-snug text-stone-400">
              {t('pinGate.teacherSubtitle')}
            </span>
          </span>
          <ArrowUpRight
            className="h-4 w-4 shrink-0 text-stone-300 transition group-hover:text-brand-600"
            aria-hidden="true"
          />
        </a>
      </div>
    </main>
  )
}
