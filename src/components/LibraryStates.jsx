import {
  AlertCircle,
  FolderOpen,
  KeyRound,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react'

export function LoadingState({ progress }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-stone-200 bg-white/60 px-6 py-20 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-stone-800">
        Montando sua biblioteca
      </h2>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-stone-400">
        Lendo as pastas no Google Drive. Na primeira sincronização isso pode
        levar alguns segundos.
      </p>
      {progress?.folders > 0 && (
        <p className="mt-3 text-[11px] font-medium text-stone-400">
          {progress.folders}{' '}
          {progress.folders === 1 ? 'pasta verificada' : 'pastas verificadas'} ·{' '}
          {progress.files} {progress.files === 1 ? 'arquivo' : 'arquivos'}
        </p>
      )}
    </div>
  )
}

export function SetupState() {
  return (
    <div className="card mx-auto max-w-lg animate-rise p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <KeyRound className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-stone-800">
        Configuração necessária
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
        Conecte a biblioteca à Google Drive adicionando a chave da API ao
        ambiente e gerando o site novamente.
      </p>

      <div className="mt-5 overflow-x-auto rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-left">
        <code className="text-xs text-brand-700">
          VITE_GOOGLE_API_KEY=sua-chave
        </code>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-stone-400">
        Crie a chave no Google Cloud Console com a Drive API v3 habilitada. As 13
        pastas já estão configuradas em{' '}
        <code className="rounded bg-stone-100 px-1 py-0.5 text-[11px] text-stone-600">
          src/config/drive.js
        </code>
        .
      </p>
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-500">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-stone-800">
        Não foi possível carregar a biblioteca
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
        {error?.message ||
          'Verifique a conexão, a chave da API e o compartilhamento das pastas.'}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="btn-primary mt-5"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Tentar novamente
      </button>
    </div>
  )
}

export function EmptyState({
  title = 'Nada por aqui ainda',
  description = 'Esta pasta não possui arquivos de mídia.',
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-stone-200 bg-white/50 px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400">
        <FolderOpen className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-stone-700">{title}</h2>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-stone-400">
        {description}
      </p>
    </div>
  )
}

export function CategoryError({ errors }) {
  const messages = [...new Set(errors.map((error) => error.message))]

  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200/70 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-800">
      <TriangleAlert
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
        aria-hidden="true"
      />
      <div className="space-y-1">
        {messages.map((message) => (
          <p key={message}>{message}</p>
        ))}
      </div>
    </div>
  )
}

export function InlineWarning({ children, onRetry }) {
  return (
    <div className="mb-5 flex flex-col gap-2 rounded-xl border border-red-200/70 bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-700 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <AlertCircle
          className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
          aria-hidden="true"
        />
        <span>{children}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 self-start rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-medium text-red-700 shadow-sm transition hover:bg-red-100 sm:self-auto"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}
