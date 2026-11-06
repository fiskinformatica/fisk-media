import { Film, Headphones } from 'lucide-react'

export default function CategorySidebar({
  categories,
  selectedId,
  onSelect,
  kind,
}) {
  const Icon = kind === 'audio' ? Headphones : Film

  return (
    <>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        {categories.map((category) => {
          const isActive = category.id === selectedId
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                isActive
                  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
              }`}
            >
              {category.name}
              <span
                className={`tabular-nums ${
                  isActive ? 'text-white/70' : 'text-stone-400'
                }`}
              >
                {category.items.length}
              </span>
            </button>
          )
        })}
      </div>

      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="lg:sticky lg:top-24">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
            Categorias
          </p>
          <nav className="space-y-1" aria-label="Categorias">
            {categories.map((category) => {
              const isActive = category.id === selectedId
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onSelect(category.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-white/75' : 'text-stone-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate font-medium">
                    {category.name}
                  </span>
                  <span
                    className={`text-xs tabular-nums ${
                      isActive ? 'text-white/65' : 'text-stone-400'
                    }`}
                  >
                    {category.items.length}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}
