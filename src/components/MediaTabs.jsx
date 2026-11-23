import { Film, Headphones } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const TABS = [
  { id: 'audio', Icon: Headphones },
  { id: 'video', Icon: Film },
]

export default function MediaTabs({ active, onChange, counts }) {
  const { t } = useTranslation()

  return (
    <div className="inline-flex w-full max-w-full rounded-full border border-stone-200 bg-surface p-1 shadow-sm sm:w-auto">
      {TABS.map(({ id, Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={isActive}
            className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 text-xs font-medium transition-[background-color,color,box-shadow,transform] duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 sm:h-9 sm:w-auto sm:min-w-[8rem] sm:flex-none sm:px-4 sm:text-sm ${
              isActive
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-stone-500 hover:bg-surface-raised hover:text-brand-600'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="shrink-0 whitespace-nowrap">{t(`common.${id}`)}</span>
            <span
              className={`ml-1 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
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
