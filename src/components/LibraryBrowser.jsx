import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock, Loader2, LogOut } from 'lucide-react'
import AudioList from './AudioList.jsx'
import AudioPlayer from './AudioPlayer.jsx'
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
  const statusText = isSyncing ? 'Syncing…' : formatLastSync(syncedAt)

  return (
    <div className="min-h-svh pb-32">
      <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-[#fbfbfb]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-end px-4 sm:px-6">
          <nav aria-label="Account">
            <button
              type="button"
              onClick={onLock}
              className="btn-secondary min-h-10 px-2 py-2 sm:px-3"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="cursor-pointer text-xs">Sign out</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-7 sm:px-6 sm:pt-9">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-[28px]">
              Library
            </h1>
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs leading-snug break-words text-stone-400">
              {isSyncing ? (
                <>
                  <Loader2
                    className="h-3.5 w-3.5 shrink-0 animate-spin"
                    aria-hidden="true"
                  />
                  {statusText}
                </>
              ) : (
                <>
                  <Clock
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
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
            API key missing. Showing the saved library; sync and playback may
            fail.
          </InlineWarning>
        )}

        {error && hasData && (
          <InlineWarning onRetry={refresh}>
            Couldn't update. Showing the saved version.
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
                      {items.length} {items.length === 1 ? 'file' : 'files'}
                    </p>
                  </div>

                  <CategoryError errors={categoryErrors} />

                  {items.length === 0 ? (
                    <EmptyState
                      description={
                        tab === 'audio'
                          ? 'No audio files here yet.'
                          : 'No videos here yet.'
                      }
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
                  title="No books"
                  description="Add a folder in src/config/drive.js to get started."
                />
              )}
            </section>
          </div>
        )}
      </main>

      {player.currentTrack && <AudioPlayer {...player} />}

      {video && <VideoModal item={video} onClose={closeVideo} />}
    </div>
  )
}
