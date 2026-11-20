import { ChevronDown, Film, Headphones } from 'lucide-react'

export default function CategorySidebar({
  categories,
  courses,
  selectedId,
  selectedCourse,
  onSelect,
  onSelectCourse,
  kind,
}) {
  const Icon = kind === 'audio' ? Headphones : Film

  return (
    <>
      <div className="mb-4 lg:hidden">
        <label className="block">
          <span className="eyebrow mb-1.5 block">Series</span>
          <span className="relative block">
            <select
              value={selectedId ?? ''}
              onChange={(event) => onSelect(event.target.value)}
              aria-label="Series"
              className="field-control h-10 min-w-0 appearance-none px-3 pr-10 text-sm"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.items.length})
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
              aria-hidden="true"
            />
          </span>
        </label>

        {courses.length > 0 && (
          <label className="mt-3 block">
            <span className="eyebrow mb-1.5 block">Course</span>
            <span className="relative block">
              <select
                value={selectedCourse ?? ''}
                onChange={(event) => onSelectCourse(event.target.value)}
                aria-label="Course"
                className="field-control h-10 min-w-0 appearance-none px-3 pr-10 text-sm"
              >
                {courses.map((course) => (
                  <option key={course.name} value={course.name}>
                    {course.name} ({course.count})
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                aria-hidden="true"
              />
            </span>
          </label>
        )}
      </div>

      <aside className="hidden w-60 shrink-0 lg:block xl:w-64">
        <div className="lg:sticky lg:top-24">
          <p className="eyebrow mb-2 px-3">Series</p>
          <nav className="space-y-1" aria-label="Series">
            {categories.map((category) => {
              const isActive = category.id === selectedId
              return (
                <div key={category.id}>
                  <button
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
                    <span className="min-w-0 flex-1 leading-tight font-medium line-clamp-2 break-words">
                      {category.name}
                    </span>
                    <span
                      className={`shrink-0 text-xs tabular-nums ${
                        isActive ? 'text-white/65' : 'text-stone-400'
                      }`}
                    >
                      {category.items.length}
                    </span>
                  </button>

                  {isActive && courses.length > 0 && (
                    <div className="mt-1 space-y-1 pl-4">
                      {courses.map((course) => {
                        const isCourseActive = course.name === selectedCourse
                        return (
                          <button
                            key={course.name}
                            type="button"
                            onClick={() => onSelectCourse(course.name)}
                            aria-current={isCourseActive ? 'page' : undefined}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                              isCourseActive
                                ? 'bg-brand-50 font-semibold text-brand-700'
                                : 'text-stone-500 hover:bg-stone-100'
                            }`}
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {course.name}
                            </span>
                            <span className="shrink-0 tabular-nums text-stone-400">
                              {course.count}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}
