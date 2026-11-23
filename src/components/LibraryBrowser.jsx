import { useCallback, useMemo, useState } from 'react'
import { LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AudioList from './AudioList.jsx'
import AudioPlayer from './AudioPlayer.jsx'
import CategorySidebar from './CategorySidebar.jsx'
import {
  CategoryError,
  EmptyState,
  ErrorState,
  LoadingState,
  SetupState,
} from './LibraryStates.jsx'
import LanguageSelect from './LanguageSelect.jsx'
import MediaTabs from './MediaTabs.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import VideoGrid from './VideoGrid.jsx'
import VideoModal from './VideoModal.jsx'
import { useAudioPlayer } from '../hooks/useAudioPlayer.js'
import { useLibrary } from '../hooks/useLibrary.js'
import { getCourseName } from '../utils/group.js'

export default function LibraryBrowser({ onLock }) {
  const { t } = useTranslation()
  const { library, error, hasData, apiConfigured, refresh } = useLibrary()
  const player = useAudioPlayer()

  const [tab, setTab] = useState('audio')
  const [selectedId, setSelectedId] = useState(null)
  const [selectedCourseName, setSelectedCourseName] = useState(null)
  const [video, setVideo] = useState(null)

  const categories = useMemo(() => {
    if (!library) return []
    return (tab === 'audio' ? library.audio : library.video) ?? []
  }, [library, tab])

  const selectedCategory =
    categories.find((category) => category.id === selectedId) ??
    categories[0] ??
    null
  const items = useMemo(() => selectedCategory?.items ?? [], [selectedCategory])

  const courses = useMemo(() => {
    const counts = new Map()
    for (const item of items) {
      const name = getCourseName(item)
      if (!name) continue
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
  }, [items])

  const selectedCourse =
    courses.find((course) => course.name === selectedCourseName)?.name ??
    courses[0]?.name ??
    null
  const courseItems = selectedCourse
    ? items.filter((item) => getCourseName(item) === selectedCourse)
    : items

  const categoryErrors = useMemo(() => {
    if (!library || !selectedCategory) return []
    return (library.errors ?? []).filter(
      (entry) =>
        entry.kind === tab && entry.category === selectedCategory.name,
    )
  }, [library, selectedCategory, tab])

  const closeVideo = useCallback(() => setVideo(null), [])

  function handleTabChange(nextTab) {
    if (nextTab === tab) return

    const nextCategories =
      (nextTab === 'audio' ? library?.audio : library?.video) ?? []

    // Preserve the currently selected category by matching its name
    const matchedCategory = selectedCategory
      ? nextCategories.find((category) => category.name === selectedCategory.name)
      : null

    const targetCategory = matchedCategory ?? nextCategories[0] ?? null

    setTab(nextTab)
    setSelectedId(targetCategory?.id ?? null)

    // Check if the current course exists in the target category
    if (targetCategory && selectedCourseName) {
      const hasCourse = targetCategory.items?.some(
        (item) => getCourseName(item) === selectedCourseName,
      )
      setSelectedCourseName(hasCourse ? selectedCourseName : null)
    } else {
      setSelectedCourseName(null)
    }

    // When switching to video, pause audio so playback doesn't cut or overlap
    if (nextTab === 'video' && player.isPlaying) {
      player.pause()
    }
  }

  function handleSelectCategory(id) {
    setSelectedId(id)
    setSelectedCourseName(null)
  }

  function handleSelectAudio(item) {
    if (player.currentTrack?.id === item.id) {
      player.toggle()
      return
    }

    player.playTrack(item, courseItems)
  }

  function handleOpenVideo(item) {
    player.pause()
    setVideo(item)
  }

  const stats = library?.stats

  return (
    <div className="min-h-svh pb-32">
      <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-end px-4 sm:px-6">
          <nav aria-label={t('common.account')} className="flex items-center gap-2">
            <LanguageSelect />
            <ThemeToggle />

            <button
              type="button"
              onClick={onLock}
              className="btn-secondary min-h-10 w-32 px-2 py-2 sm:w-36 sm:px-3"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 cursor-pointer truncate text-xs">
                {t('common.signOut')}
              </span>
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-7 sm:px-6 sm:pt-9">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-[28px]">
            {t('common.library')}
          </h1>

          <MediaTabs
            active={tab}
            onChange={handleTabChange}
            counts={{ audio: stats?.audio ?? 0, video: stats?.video ?? 0 }}
          />
        </div>

        {!apiConfigured && !hasData ? (
          <SetupState />
        ) : !hasData && !error ? (
          <LoadingState />
        ) : !hasData && error ? (
          <ErrorState onRetry={refresh} />
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            <CategorySidebar
              categories={categories}
              courses={courses}
              selectedId={selectedCategory?.id ?? null}
              selectedCourse={selectedCourse}
              onSelect={handleSelectCategory}
              onSelectCourse={setSelectedCourseName}
              kind={tab}
            />

            <section className="min-w-0 flex-1">
              {selectedCategory ? (
                <div
                  key={`${tab}-${selectedCategory.id}-${selectedCourse ?? ''}`}
                  className="animate-fade-in"
                >
                  <div className="mb-4 px-1">
                    {selectedCourse && (
                      <p className="eyebrow mb-1">{selectedCategory.name}</p>
                    )}
                    <h2 className="text-lg font-semibold tracking-tight text-stone-900">
                      {selectedCourse ?? selectedCategory.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {t('common.file', { count: courseItems.length })}
                    </p>
                  </div>

                  <CategoryError errors={categoryErrors} />

                  {courseItems.length === 0 ? (
                    <EmptyState
                        description={
                          tab === 'audio'
                            ? t('states.noAudio')
                            : t('states.noVideo')
                        }
                    />
                  ) : tab === 'audio' ? (
                    <AudioList
                      items={courseItems}
                      categoryId={selectedCategory.id}
                      course={selectedCourse}
                      currentTrack={player.currentTrack}
                      isPlaying={player.isPlaying}
                      onSelect={handleSelectAudio}
                    />
                  ) : (
                    <VideoGrid
                      items={courseItems}
                      categoryId={selectedCategory.id}
                      course={selectedCourse}
                      onSelect={handleOpenVideo}
                    />
                  )}
                </div>
              ) : (
                  <EmptyState
                    title={t('states.noSeries')}
                    description={t('states.addFolder')}
                  />
              )}
            </section>
          </div>
        )}
      </main>

      {player.currentTrack && <AudioPlayer {...player} />}

      {video && (
        <VideoModal key={video.id} item={video} onClose={closeVideo} />
      )}
    </div>
  )
}
