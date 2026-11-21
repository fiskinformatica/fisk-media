import { useState } from 'react'
import { ChevronDown, Folder } from 'lucide-react'

export default function FolderSection({ name, parent, count, children }) {
  const [open, setOpen] = useState(false)

  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={`group flex w-full items-center gap-2 bg-stone-50/60 px-3 py-2.5 text-left transition-colors duration-200 ease-out hover:bg-stone-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/30 sm:px-4 ${
          open ? 'border-b border-stone-100' : ''
        }`}
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 transition-colors duration-200 group-hover:bg-brand-100">
          <Folder className="h-3.5 w-3.5" aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-stone-700 sm:text-sm">
            {name}
          </span>
          {parent && (
              <span className="block truncate text-xs text-stone-400">
              {parent}
            </span>
          )}
        </span>

        <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium tabular-nums text-stone-400 ring-1 ring-stone-200/70 transition-colors duration-200 group-hover:text-brand-600">
          {count}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ease-out ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && <div className="animate-list-in">{children}</div>}
    </section>
  )
}
