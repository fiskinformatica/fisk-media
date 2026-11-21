import { BookOpen, Film, Headphones } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import SelectMenu from './SelectMenu.jsx'

export default function CategorySidebar({
  categories,
  courses,
  selectedId,
  selectedCourse,
  onSelect,
  onSelectCourse,
  kind,
}) {
  const { t } = useTranslation()
  const SeriesIcon = kind === 'audio' ? Headphones : Film

  const seriesOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
    count: category.items.length,
  }))

  const courseOptions = courses.map((course) => ({
    value: course.name,
    label: course.name,
    count: course.count,
  }))

  return (
    <div className="mb-5 min-w-0 lg:mb-0 lg:w-72 lg:shrink-0 xl:w-80">
      <div className="lg:sticky lg:top-24">
        <div className="mb-3 flex items-center gap-3 px-1">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-stone-900">
              {t('select.chooseTitle')}
            </p>
            <p className="truncate text-xs text-stone-400">
              {t('select.chooseSubtitle')}
            </p>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
          <SelectMenu
            label={t('select.series')}
            icon={SeriesIcon}
            value={selectedId ?? ''}
            options={seriesOptions}
            onChange={onSelect}
            placeholder={t('select.chooseSeries')}
            menuClassName="lg:w-80"
          />
          <SelectMenu
            label={t('select.book')}
            icon={BookOpen}
            value={selectedCourse ?? ''}
            options={courseOptions}
            onChange={onSelectCourse}
            placeholder={t('select.chooseBook')}
            disabled={courseOptions.length === 0}
            menuClassName="lg:w-80"
          />
        </div>
      </div>
    </div>
  )
}
