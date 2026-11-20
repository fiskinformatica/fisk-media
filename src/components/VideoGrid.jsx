import { useMemo } from 'react'
import { Play } from 'lucide-react'
import FolderSection from './FolderSection.jsx'
import { readFolderOrder, sortGroupsByOrder } from '../utils/folderOrder.js'
import { fileExtension, formatBytes } from '../utils/format.js'
import { groupMediaByFolder } from '../utils/group.js'

const collator = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base',
})

export default function VideoGrid({
  items,
  categoryId,
  course = null,
  onSelect,
}) {
  const groups = useMemo(
    () =>
      sortGroupsByOrder(
        groupMediaByFolder(items, { pathOffset: course ? 1 : 0 }).sort((a, b) =>
          collator.compare(a.name, b.name),
        ),
        readFolderOrder('video', categoryId, course),
      ),
    [items, categoryId, course],
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
              const detail =
                [fileExtension(item.name), formatBytes(item.size)]
                  .filter(Boolean)
                  .join(' · ') || 'Video'

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="media-row group hover:bg-stone-50"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-500 transition-[background-color,color,transform] duration-200 ease-out group-hover:bg-brand-600 group-hover:text-white group-active:scale-95">
                    <Play
                      className="ml-0.5 h-4 w-4"
                      fill="currentColor"
                      aria-hidden="true"
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-stone-800">
                      {item.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-stone-400">
                      {detail}
                    </span>
                  </span>

                  {item.variant && (
                    <span className="shrink-0 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                      {item.variant}
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
