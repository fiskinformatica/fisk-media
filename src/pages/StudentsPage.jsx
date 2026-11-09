import { useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Lock,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import Brand from '../components/Brand.jsx'
import { validatePin } from '../services/apiService.js'

const PIN_LENGTH = 4

function formatValidUntil(isoDate) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(isoDate))
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

export default function StudentsPage() {
  const [pin, setPin] = useState('')
  const [pinInfo, setPinInfo] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const result = await validatePin(pin.trim())

      if (!result.ok) {
        setError(result.error || 'PIN incorreto.')
        setPin('')
        return
      }

      // Store PIN info for display
      setPinInfo({
        pin: pin.trim(),
        matched: result.data?.matched || 'current',
        expiresAt: result.data?.expiresAt,
        period: result.data?.period,
        monthLabel: new Intl.DateTimeFormat('pt-BR', { 
          month: 'long', 
          year: 'numeric' 
        }).format(new Date()),
      })
    } catch (err) {
      setError(err.message || 'Erro ao conectar ao servidor.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!pinInfo) return

    try {
      await navigator.clipboard.writeText(pinInfo.pin)
    } catch {
      fallbackCopy(pinInfo.pin)
    }

    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  function handleLogout() {
    setPinInfo(null)
    setPin('')
    setError(null)
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
                Área do aluno
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
                Digite o PIN de 4 dígitos fornecido pelo professor.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="student-pin" className="sr-only">
                  PIN de acesso
                </label>
                <input
                  id="student-pin"
                  name="pin"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={PIN_LENGTH}
                  autoComplete="off"
                  autoFocus
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    setPin(value)
                    if (error) setError(null)
                  }}
                  placeholder="••••"
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'student-pin-error' : undefined}
                  className="field-control h-14 text-center text-2xl font-medium tracking-[0.5em] tabular-nums"
                />
              </div>

              {error && (
                <p
                  id="student-pin-error"
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
                disabled={pin.length !== PIN_LENGTH || loading}
                className="btn-primary mt-5 w-full"
              >
                {loading ? 'Verificando...' : 'Verificar PIN'}
              </button>
            </form>

            <p className="mt-5 text-center text-[11px] leading-relaxed text-stone-400">
              Caso não tenha o PIN, solicite ao seu professor. <br />
              O PIN é renovado mensalmente.
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
            <p className="eyebrow">PIN verificado</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-stone-900">
              {pinInfo.monthLabel}
            </h1>
          </div>

          <div className="mt-6 flex items-center justify-center rounded-2xl border border-stone-200 bg-stone-50/70 px-5 py-6">
            <span className="text-[38px] font-semibold tracking-[0.35em] text-brand-700 tabular-nums">
              {pinInfo.pin}
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
            {pinInfo.expiresAt && (
              <p>
                Válido até {formatValidUntil(pinInfo.expiresAt)}. Um novo PIN será
                gerado no início do próximo mês.
              </p>
            )}
            {pinInfo.matched === 'previous' && (
              <p className="text-amber-600">
                <strong className="font-medium">Atenção:</strong> Este é o PIN do mês anterior.
                Solicite o PIN atual ao professor.
              </p>
            )}
          </div>
        </section>

        <div className="card-elevated animate-rise p-7 sm:p-8">
          <div className="space-y-4 text-sm leading-relaxed text-stone-600">
            <p>
              <strong className="font-semibold text-stone-900">Seu acesso está confirmado!</strong>
            </p>
            <p>
              Você pode agora acessar todos os conteúdos disponíveis na biblioteca.
              Retorne à página principal para começar a explorar os materiais.
            </p>
            <p className="text-xs text-stone-500">
              Guarde este PIN em um local seguro. Você precisará dele para acessar
              a biblioteca durante todo o mês.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
