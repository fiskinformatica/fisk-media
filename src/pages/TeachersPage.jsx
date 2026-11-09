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
} from 'lucide-react'
import AdminPanel from '../components/AdminPanel.jsx'
import Brand from '../components/Brand.jsx'
import {
  adminLogin,
  clearAdminToken,
  getAdminPinInfo,
} from '../services/apiService.js'

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

export default function TeachersPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
      const loginResult = await adminLogin(username.trim(), password)

      if (!loginResult.ok) {
        setError(loginResult.error || 'Usuário ou senha incorretos.')
        setPassword('')
        return
      }

      // Fetch PIN info after successful login
      const pinResult = await getAdminPinInfo()

      if (pinResult.ok) {
        setPinInfo(pinResult.data)
      } else {
        // Logged in but couldn't fetch PIN — still proceed
        setPinInfo({ currentPin: '----', previousPin: '----', monthLabel: 'Carregando...', validUntil: null })
      }
    } catch (err) {
      setError(err.message || 'Erro ao conectar ao servidor.')
    } finally {
      setLoading(false)
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

  function handleLogout() {
    clearAdminToken()
    setPinInfo(null)
    setUsername('')
    setPassword('')
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
                Área do professor
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
                Entre com suas credenciais de administrador.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-3">
                <div>
                  <label htmlFor="teacher-username" className="sr-only">
                    Usuário
                  </label>
                  <input
                    id="teacher-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value)
                      if (error) setError(null)
                    }}
                    placeholder="Usuário"
                    disabled={loading}
                    className="field-control h-12"
                  />
                </div>

                <div>
                  <label htmlFor="teacher-password" className="sr-only">
                    Senha
                  </label>
                  <input
                    id="teacher-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (error) setError(null)
                    }}
                    placeholder="Senha"
                    disabled={loading}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'teacher-login-error' : undefined}
                    className="field-control h-12"
                  />
                </div>
              </div>

              {error && (
                <p
                  id="teacher-login-error"
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
                disabled={!username || !password || loading}
                className="btn-primary mt-5 w-full"
              >
                {loading ? 'Entrando...' : 'Entrar'}
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
            {pinInfo.validUntil && (
              <p>
                Válido até {formatValidUntil(pinInfo.validUntil)}. Um novo PIN é
                gerado no início do próximo mês.
              </p>
            )}
            {pinInfo.previousPin && pinInfo.previousPin !== '----' && (
              <p>
                O PIN do mês anterior também é aceito:{' '}
                <strong className="font-medium text-stone-700">
                  {pinInfo.previousPin}
                </strong>
              </p>
            )}
          </div>
        </section>

        <AdminPanel />

        <div className="flex items-start gap-2 px-2 text-[11px] leading-relaxed text-stone-400">
          <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <p>
            Este painel é protegido por autenticação via backend. As credenciais
            não ficam expostas no navegador.
          </p>
        </div>
      </div>
    </main>
  )
}
