import { Film, Headphones } from 'lucide-react'

const TABS = [
  { id: 'audio', label: 'Áudios', Icon: Headphones },
  { id: 'video', label: 'Vídeos', Icon: Film },
]

export default function MediaTabs({ active, onChange, counts }) {
  return (
    <div className="inline-flex w-full rounded-full border border-stone-200 bg-white p-1 shadow-sm sm:w-auto">
      {TABS.map(({ id, label, Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={isActive}
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium transition sm:h-9 sm:flex-none ${
              isActive
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-stone-500 hover:text-brand-600'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
            <span
              className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
              }`}
            >
              {counts?.[id] ?? 0}
            </span>
          </button>
        )
      })}
    </div>
  )
}
