import { Film, Headphones } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const TABS = [
  { id: 'audio', Icon: Headphones },
  { id: 'video', Icon: Film },
]

export default function MediaTabs({ active, onChange }) {
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
            className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold transition-[background-color,color,box-shadow,transform] duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 sm:h-9 sm:w-32 sm:flex-none sm:text-sm ${
              isActive
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-stone-500 hover:bg-surface-raised hover:text-brand-600'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="shrink-0 whitespace-nowrap">{t(`common.${id}`)}</span>
          </button>
        )
      })}
    </div>
  )
}
