import { useMemo, useState } from 'react'
import { Play, Video } from 'lucide-react'
import FolderSection from './FolderSection.jsx'
import { getThumbnailUrl } from '../services/apiService.js'
import { readFolderOrder, sortGroupsByOrder } from '../utils/folderOrder.js'
import { fileExtension, formatBytes } from '../utils/format.js'
import { groupMediaByFolder } from '../utils/group.js'

function VideoCard({ item, onSelect }) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false)
  const detail =
    [fileExtension(item.name), formatBytes(item.size)].filter(Boolean).join(' · ') ||
    'Vídeo'

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="group overflow-hidden rounded-xl border border-stone-100 bg-white text-left transition duration-200 hover:border-brand-200 hover:shadow-[0_12px_28px_-22px_rgba(28,25,23,0.4)]"
    >
      <div className="relative aspect-video overflow-hidden bg-stone-100">
        {!thumbnailFailed ? (
          <img
            src={getThumbnailUrl(item.id, 480)}
            alt=""
            loading="lazy"
            onError={() => setThumbnailFailed(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center text-stone-300">
            <Video className="h-6 w-6" aria-hidden="true" />
          </div>
        )}

        <div className="absolute inset-0 bg-stone-950/0 transition-colors group-hover:bg-stone-950/10" />

        <span className="absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-brand-700 shadow-sm transition-transform duration-300 group-hover:scale-105 sm:h-10 sm:w-10">
          <Play
            className="ml-0.5 h-4 w-4 sm:h-4.5 sm:w-4.5"
            fill="currentColor"
            aria-hidden="true"
          />
        </span>
      </div>

      <div className="px-2 py-2 sm:px-2.5 sm:py-2.5">
        <p className="line-clamp-2 text-[11px] font-medium leading-snug text-stone-800 sm:text-xs">
          {item.name}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-stone-400">{detail}</p>
      </div>
    </button>
  )
}

export default function VideoGrid({ items, categoryId, onSelect }) {
  const groups = useMemo(
    () =>
      sortGroupsByOrder(
        groupMediaByFolder(items),
        readFolderOrder('video', categoryId),
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
          <div className="grid grid-cols-2 gap-2.5 p-2.5 sm:gap-3 sm:p-3 md:grid-cols-3">
            {group.items.map((item) => (
              <VideoCard key={item.id} item={item} onSelect={onSelect} />
            ))}
          </div>
        </FolderSection>
      ))}
    </div>
  )
}
