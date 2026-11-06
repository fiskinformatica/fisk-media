import { useMemo } from 'react'
import { Play } from 'lucide-react'
import FolderSection from './FolderSection.jsx'
import { readFolderOrder, sortGroupsByOrder } from '../utils/folderOrder.js'
import { fileExtension, formatBytes } from '../utils/format.js'
import { groupMediaByFolder } from '../utils/group.js'

function Equalizer() {
  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden="true">
      {[9, 14, 7].map((height, index) => (
        <span
          key={height}
          className="equalizer-bar w-0.5 rounded-full bg-current"
          style={{
            height: `${height}px`,
            animationDelay: `${index * 0.12}s`,
          }}
        />
      ))}
    </span>
  )
}

export default function AudioList({
  items,
  categoryId,
  currentTrack,
  isPlaying,
  onSelect,
}) {
  const groups = useMemo(
    () =>
      sortGroupsByOrder(
        groupMediaByFolder(items),
        readFolderOrder('audio', categoryId),
      ),
    [items, categoryId],
  )

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <FolderSection
          key={group.key || 'root'}
          name={group.name}
          parent={group.parent}
          count={group.items.length}
        >
          <div className="divide-y divide-stone-100">
            {group.items.map((item) => {
              const isActive = currentTrack?.id === item.id
              const detail =
                [fileExtension(item.name), formatBytes(item.size)]
                  .filter(Boolean)
                  .join(' · ') || 'Áudio'

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className={`group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors sm:px-4 sm:py-3 ${
                    isActive ? 'bg-brand-50/60' : 'hover:bg-stone-50'
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition ${
                      isActive
                        ? 'bg-brand-600 text-white'
                        : 'bg-stone-100 text-stone-500 group-hover:bg-brand-600 group-hover:text-white'
                    }`}
                  >
                    {isActive && isPlaying ? (
                      <Equalizer />
                    ) : (
                      <Play
                        className="ml-0.5 h-4 w-4"
                        fill="currentColor"
                        aria-hidden="true"
                      />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm ${
                        isActive
                          ? 'font-semibold text-brand-900'
                          : 'font-medium text-stone-800'
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-stone-400">
                      {detail}
                    </span>
                  </span>

                  {isActive && (
                    <span className="hidden shrink-0 items-center gap-1.5 text-[11px] font-medium text-brand-600 sm:flex">
                      {isPlaying ? 'Tocando' : 'Pausado'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </FolderSection>
      ))}
    </div>
  )
}
