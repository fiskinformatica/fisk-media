import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock, KeyRound, Loader2, LogOut } from 'lucide-react'
import AudioList from './AudioList.jsx'
import AudioPlayer from './AudioPlayer.jsx'
import Brand from './Brand.jsx'
import CategorySidebar from './CategorySidebar.jsx'
import ChangeNotice from './ChangeNotice.jsx'
import {
  CategoryError,
  EmptyState,
  ErrorState,
  InlineWarning,
  LoadingState,
  SetupState,
} from './LibraryStates.jsx'
import MediaTabs from './MediaTabs.jsx'
import VideoGrid from './VideoGrid.jsx'
import VideoModal from './VideoModal.jsx'
import { useAudioPlayer } from '../hooks/useAudioPlayer.js'
import { useLibrary } from '../hooks/useLibrary.js'
import { formatLastSync } from '../utils/format.js'

export default function LibraryBrowser({ onLock }) {
  const {
    library,
    syncedAt,
    error,
    changes,
    progress,
    hasData,
    isSyncing,
    apiConfigured,
    refresh,
    dismissChanges,
  } = useLibrary()
  const player = useAudioPlayer()

  const [tab, setTab] = useState('audio')
  const [selectedId, setSelectedId] = useState(null)
  const [video, setVideo] = useState(null)

  const categories = useMemo(() => {
    if (!library) return []
    return (tab === 'audio' ? library.audio : library.video) ?? []
  }, [library, tab])

  useEffect(() => {
    if (!changes) return undefined

    const timeoutId = window.setTimeout(dismissChanges, 12_000)
    return () => window.clearTimeout(timeoutId)
  }, [changes, dismissChanges])

  const selectedCategory =
    categories.find((category) => category.id === selectedId) ??
    categories[0] ??
    null
  const items = selectedCategory?.items ?? []

  const categoryErrors = useMemo(() => {
    if (!library || !selectedCategory) return []
    return (library.errors ?? []).filter(
      (entry) =>
        entry.kind === tab && entry.category === selectedCategory.name,
    )
  }, [library, selectedCategory, tab])

  const closeVideo = useCallback(() => setVideo(null), [])

  function handleTabChange(nextTab) {
    setTab(nextTab)
    setSelectedId(null)
  }

  function handleSelectAudio(item) {
    if (player.currentTrack?.id === item.id) {
      player.toggle()
      return
    }

    player.playTrack(item, items)
  }

  function handleOpenVideo(item) {
    player.pause()
    setVideo(item)
  }

  const stats = library?.stats
  const statusText = isSyncing ? 'Sincronizando...' : formatLastSync(syncedAt)

  return (
    <div className="min-h-svh pb-32">
      <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-[#fbfbfb]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Brand />
          <nav className="flex items-center gap-2" aria-label="Navegação">
            <a
              href="#/teachers"
              title="Área do professor"
              aria-label="Área do professor"
              className="btn-secondary"
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Área do professor</span>
            </a>
            <button
              type="button"
              onClick={onLock}
              title="Sair da biblioteca"
              aria-label="Sair da biblioteca"
              className="btn-secondary"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-7 sm:px-6 sm:pt-9">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-[28px]">
              Biblioteca
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-400">
              {isSyncing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  {statusText}
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {statusText}
                </>
              )}
            </p>
          </div>

          <MediaTabs
            active={tab}
            onChange={handleTabChange}
            counts={{ audio: stats?.audio ?? 0, video: stats?.video ?? 0 }}
          />
        </div>

        {changes && (
          <ChangeNotice changes={changes} onDismiss={dismissChanges} />
        )}

        {!apiConfigured && hasData && (
          <InlineWarning>
            A chave da API não está configurada. A biblioteca salva está sendo
            exibida, mas a sincronização e a reprodução podem falhar.
          </InlineWarning>
        )}

        {error && hasData && (
          <InlineWarning onRetry={refresh}>
            Não foi possível atualizar agora. Exibindo a última versão salva.
          </InlineWarning>
        )}

        {!apiConfigured && !hasData ? (
          <SetupState />
        ) : !hasData && !error ? (
          <LoadingState progress={progress} />
        ) : !hasData && error ? (
          <ErrorState error={error} onRetry={refresh} />
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            <CategorySidebar
              categories={categories}
              selectedId={selectedCategory?.id ?? null}
              onSelect={setSelectedId}
              kind={tab}
            />

            <section className="min-w-0 flex-1">
              {selectedCategory ? (
                <>
                  <div className="mb-4 px-1">
                    <h2 className="text-lg font-semibold tracking-tight text-stone-900">
                      {selectedCategory.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {items.length}{' '}
                      {items.length === 1 ? 'arquivo' : 'arquivos'}
                    </p>
                  </div>

                  <CategoryError errors={categoryErrors} />

                  {items.length === 0 ? (
                    <EmptyState
                      description={`A categoria ${selectedCategory.name} não tem ${
                        tab === 'audio' ? 'áudios' : 'vídeos'
                      } no momento.`}
                    />
                  ) : tab === 'audio' ? (
                    <AudioList
                      items={items}
                      categoryId={selectedCategory.id}
                      currentTrack={player.currentTrack}
                      isPlaying={player.isPlaying}
                      onSelect={handleSelectAudio}
                    />
                  ) : (
                    <VideoGrid
                      items={items}
                      categoryId={selectedCategory.id}
                      onSelect={handleOpenVideo}
                    />
                  )}
                </>
              ) : (
                <EmptyState
                  title="Nenhuma categoria"
                  description="Adicione uma pasta em src/config/drive.js para começar."
                />
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-2 border-t border-stone-200/70 pt-5 text-[11px] text-stone-400 sm:flex-row">
          <span>Fisk Media · Biblioteca de áudios e vídeos</span>
          <a href="#/teachers" className="link-muted">
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            Área do professor
          </a>
        </div>
      </footer>

      {player.currentTrack && <AudioPlayer {...player} />}

      {video && <VideoModal item={video} onClose={closeVideo} />}
    </div>
  )
}
