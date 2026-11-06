import { useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  KeyRound,
  Lock,
  LogOut,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import AdminPanel from '../components/AdminPanel.jsx'
import Brand from '../components/Brand.jsx'
import {
  OWNER_PASSWORD,
  PIN_LENGTH,
  SECRET_SALT,
  STAFF_PASSWORD,
} from '../config/access.js'
import { getAdminPinInfo } from '../services/accessService.js'

const USING_DEFAULTS =
  SECRET_SALT === 'ALTERE-ESTE-SEGREDO' ||
  STAFF_PASSWORD === '0000' ||
  OWNER_PASSWORD === '9999'

function formatValidUntil(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
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

function SecurityNote() {
  return (
    <div className="flex items-start gap-2 px-2 text-[11px] leading-relaxed text-stone-400">
      <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <p>
        Este painel é um controle casual de acesso. Como o site é estático, os
        PINs e o segredo podem ser inspecionados no navegador. Não use como
        proteção forte.
      </p>
    </div>
  )
}

export default function TeachersPage() {
  const [pin, setPin] = useState('')
  const [pinInfo, setPinInfo] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  function handleChange(event) {
    const nextPin = event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
    setPin(nextPin)
    if (error) setError(null)
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (pin !== STAFF_PASSWORD) {
      setError('PIN incorreto.')
      setPin('')
      return
    }

    setError(null)
    setPin('')
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
          <div className="flex justify-center">
            <Brand />
          </div>

          <div className="card-elevated mt-8 p-7 sm:p-8">
            <div className="mb-6 text-center">
              <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <Lock className="h-5 w-5" aria-hidden="true" />
              </span>
              <h1 className="text-xl font-semibold tracking-tight text-stone-900">
                Área do professor
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
                Digite o PIN do professor para consultar o PIN mensal dos alunos.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="teacher-pin" className="sr-only">
                PIN do professor de {PIN_LENGTH} dígitos
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
                className="field-control h-14 text-center text-[26px] font-semibold tracking-[0.55em] placeholder:tracking-[0.4em] placeholder:text-stone-300"
              />

              {error && (
                <p
                  id="teacher-pin-error"
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
                className="btn-primary mt-5 w-full"
              >
                Entrar
              </button>
            </form>

            <p className="mt-5 text-center text-[11px] leading-relaxed text-stone-400">
              Acesso exclusivo do professor. <br />
              O PIN dos alunos é renovado todo mês.
            </p>
          </div>

          <a
            href="#/"
            className="mx-auto mt-5 flex w-fit items-center justify-center gap-1.5 text-xs font-medium text-stone-400 transition hover:text-stone-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Voltar à biblioteca
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh flex-col px-4 py-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <a href="#/" aria-label="Ir para a biblioteca">
            <Brand />
          </a>
          <nav className="flex items-center gap-2" aria-label="Navegação">
            <a href="#/" className="link-muted">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Biblioteca
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-secondary"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sair
            </button>
          </nav>
        </header>

        <section className="card-elevated animate-rise p-7 sm:p-8">
          <div className="text-center">
            <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="eyebrow">PIN de acesso</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-stone-900">
              {pinInfo.monthLabel}
            </h1>
          </div>

          <div className="mt-6 flex items-center justify-center rounded-2xl border border-stone-200 bg-stone-50/70 px-5 py-6">
            <span className="text-[38px] font-semibold tracking-[0.35em] text-brand-700 tabular-nums">
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
            {copied ? 'PIN copiado' : 'Copiar PIN'}
          </button>

          <div className="mt-5 space-y-2 rounded-xl bg-stone-50 px-3.5 py-3 text-xs leading-relaxed text-stone-500">
            <p>
              Válido até {formatValidUntil(pinInfo.validUntil)}. Um novo PIN é
              gerado no início do próximo mês.
            </p>
            {pinInfo.acceptsPreviousMonth && (
              <p>
                O PIN do mês anterior também é aceito:{' '}
                <strong className="font-medium text-stone-700">
                  {pinInfo.previousPin}
                </strong>
              </p>
            )}
          </div>

          {USING_DEFAULTS && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-800">
              <TriangleAlert
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <span>
                O PIN ou o segredo padrão ainda estão em uso. Defina{' '}
                <code>VITE_SECRET_SALT</code>, <code>VITE_STAFF_PASSWORD</code>{' '}
                e <code>VITE_OWNER_PASSWORD</code> no <code>.env</code> antes de
                publicar.
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
