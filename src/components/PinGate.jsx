import { useState } from 'react'
import { AlertCircle, KeyRound, Lock } from 'lucide-react'
import Brand from './Brand.jsx'

const PIN_LENGTH = 4

const MESSAGES = {
  invalid: 'Digite os quatro números do PIN.',
  incorrect: 'PIN incorreto. Confira com o professor.',
  expired: 'Esse PIN expirou. Peça o PIN do mês atual ao professor.',
  error: 'Não foi possível validar o PIN. Verifique sua conexão.',
}

/**
 * PinGate — student login screen.
 *
 * onAuthorize(pin) must return a Promise<{ ok, reason? }>
 * because PIN validation now happens via the backend API.
 */
export default function PinGate({ onAuthorize, sessionExpired }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function handleChange(event) {
    const nextPin = event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
    setPin(nextPin)
    if (error) setError(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const result = await onAuthorize(pin)

      if (!result.ok) {
        setError(result.reason || 'incorrect')
        setPin('')
      }
    } finally {
      setLoading(false)
    }
  }

  const message = error ? (MESSAGES[error] ?? MESSAGES.incorrect) : null

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
              Acesso à biblioteca
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
              Digite o PIN fornecido pelo teacher.
            </p>
          </div>

          {sessionExpired && !message && (
            <div className="mb-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800">
              Sua sessão anterior expirou. Use o PIN do mês atual.
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="pin" className="sr-only">
              PIN de {PIN_LENGTH} dígitos
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
              disabled={loading}
              placeholder="••••"
              aria-invalid={Boolean(message)}
              aria-describedby={message ? 'pin-error' : undefined}
              className="field-control h-14 text-center text-[26px] font-semibold tracking-[0.55em] placeholder:tracking-[0.4em] placeholder:text-stone-300 disabled:opacity-50"
            />

            {message && (
              <p
                id="pin-error"
                role="alert"
                className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-red-600"
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
              disabled={pin.length !== PIN_LENGTH || loading}
              className="btn-primary mt-5 w-full"
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-stone-400">
            O PIN é renovado todo mês. <br /> Se não funcionar, peça um novo código ao
            teacher.
          </p>
        </div>

        <div className="mt-5 flex justify-center">
          <a href="#/teachers" className="btn-secondary shadow-sm">
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            Teacher's Only
          </a>
        </div>
      </div>
    </main>
  )
}
