import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Folder,
  FolderCog,
  RotateCcw,
} from 'lucide-react'
import MediaTabs from './MediaTabs.jsx'
import {
  clearFolderOrder,
  readFolderOrder,
  saveFolderOrder,
  sortGroupsByOrder,
} from '../utils/folderOrder.js'
import { getCourseName, groupMediaByFolder } from '../utils/group.js'

export default function FolderOrderPanel({ library }) {
  const [kind, setKind] = useState('audio')
  const [categoryId, setCategoryId] = useState('')
  const [selectedCourseName, setSelectedCourseName] = useState(null)
  const [draft, setDraft] = useState({ id: null, keys: [] })

  const categories = library?.[kind] ?? []
  const activeCategory =
    categories.find((category) => category.id === categoryId) ??
    categories[0] ??
    null

  const courses = useMemo(() => {
    const counts = new Map()
    for (const item of activeCategory?.items ?? []) {
      const name = getCourseName(item)
      if (!name) continue
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
  }, [activeCategory])

  const activeCourse =
    courses.find((course) => course.name === selectedCourseName)?.name ??
    courses[0]?.name ??
    null
  const courseItems = useMemo(
    () =>
      activeCourse
        ? (activeCategory?.items ?? []).filter(
            (item) => getCourseName(item) === activeCourse,
          )
        : (activeCategory?.items ?? []),
    [activeCategory, activeCourse],
  )

  const courseOrderId = activeCategory ? `${kind}:${activeCategory.id}` : null
  const lessonOrderId =
    activeCategory && activeCourse
      ? `${kind}:${activeCategory.id}:${activeCourse}`
      : null

  const courseGroups = useMemo(
    () =>
      courses.map((course) => ({
        key: course.name,
        name: course.name,
        count: course.count,
      })),
    [courses],
  )
  const lessonGroups = useMemo(
    () => groupMediaByFolder(courseItems, { pathOffset: activeCourse ? 1 : 0 }),
    [courseItems, activeCourse],
  )

  const storedCourseOrder = useMemo(
    () => (activeCategory ? readFolderOrder(kind, activeCategory.id) : []),
    [kind, activeCategory],
  )
  const storedLessonOrder = useMemo(
    () =>
      activeCategory
        ? readFolderOrder(kind, activeCategory.id, activeCourse)
        : [],
    [kind, activeCategory, activeCourse],
  )

  const courseOrder = draft.id === courseOrderId ? draft.keys : storedCourseOrder
  const lessonOrder = draft.id === lessonOrderId ? draft.keys : storedLessonOrder

  const orderedCourseGroups = useMemo(
    () => sortGroupsByOrder(courseGroups, courseOrder),
    [courseGroups, courseOrder],
  )
  const orderedLessonGroups = useMemo(
    () => sortGroupsByOrder(lessonGroups, lessonOrder),
    [lessonGroups, lessonOrder],
  )

  function handleKindChange(nextKind) {
    setKind(nextKind)
    setCategoryId('')
    setSelectedCourseName(null)
  }

  function moveGroup(groups, orderId, index, offset, save) {
    if (!orderId) return

    const target = index + offset
    const keys = groups.map((group) => group.key)
    if (target < 0 || target >= keys.length) return

    ;[keys[index], keys[target]] = [keys[target], keys[index]]
    setDraft({ id: orderId, keys })
    save(keys)
  }

  function moveCourse(index, offset) {
    if (!activeCategory) return

    moveGroup(orderedCourseGroups, courseOrderId, index, offset, (keys) =>
      saveFolderOrder(kind, activeCategory.id, keys),
    )
  }

  function moveLesson(index, offset) {
    if (!activeCategory) return

    moveGroup(orderedLessonGroups, lessonOrderId, index, offset, (keys) =>
      saveFolderOrder(kind, activeCategory.id, keys, activeCourse),
    )
  }

  function resetOrder() {
    if (!activeCategory) return

    clearFolderOrder(kind, activeCategory.id)
    if (activeCourse) clearFolderOrder(kind, activeCategory.id, activeCourse)
    setDraft({ id: null, keys: [] })
  }

  function renderGroup(group, index, groups, onMove) {
    const count = group.items?.length ?? group.count ?? 0

    return (
      <li
        key={group.key || 'root'}
        className="flex items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
          <Folder className="h-3.5 w-3.5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm leading-tight font-medium break-words text-stone-800 line-clamp-2">
            {group.name}
          </p>
          <p className="text-xs leading-snug break-words text-stone-400 line-clamp-2">
            {group.parent ? `${group.parent} · ` : ''}
            {count} {count === 1 ? 'file' : 'files'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            aria-label={`Move ${group.name} up`}
            className="icon-button h-8 w-8 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 1)}
            disabled={index === groups.length - 1}
            aria-label={`Move ${group.name} down`}
            className="icon-button h-8 w-8 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </li>
    )
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <FolderCog className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-tight text-stone-900">
            Folder order
          </h3>
          <p className="mt-0.5 text-sm leading-relaxed text-stone-500">
            Set the order folders appear in the library.
          </p>
        </div>
      </div>

      {!library ? (
        <p className="mt-4 rounded-xl bg-stone-50 px-3.5 py-3 text-xs leading-relaxed text-stone-500">
          Sync the library to load folders.
        </p>
      ) : categories.length === 0 ? (
        <p className="mt-4 rounded-xl bg-stone-50 px-3.5 py-3 text-xs leading-relaxed text-stone-500">
          No folders for this media type.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <MediaTabs
              active={kind}
              onChange={handleKindChange}
              counts={{
                audio: library?.stats?.audio ?? 0,
                video: library?.stats?.video ?? 0,
              }}
            />

            <select
              value={activeCategory?.id ?? ''}
              onChange={(event) => {
                setCategoryId(event.target.value)
                setSelectedCourseName(null)
              }}
              aria-label="Series"
              className="field-control h-10 min-w-0 px-3 text-sm sm:w-56"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {courses.length > 0 && (
            <label className="mt-2 block sm:ml-auto sm:w-56">
              <span className="sr-only">Course</span>
              <select
                value={activeCourse ?? ''}
                onChange={(event) => setSelectedCourseName(event.target.value)}
                aria-label="Course"
                className="field-control h-10 w-full px-3 text-sm"
              >
                {courses.map((course) => (
                  <option key={course.name} value={course.name}>
                    {course.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {orderedCourseGroups.length > 0 && (
            <div className="mt-5">
              <p className="eyebrow mb-2">Course order</p>
              <ul className="space-y-2">
                {orderedCourseGroups.map((group, index) =>
                  renderGroup(group, index, orderedCourseGroups, moveCourse),
                )}
              </ul>
            </div>
          )}

          {orderedLessonGroups.length === 0 ? (
            <p className="mt-4 rounded-xl bg-stone-50 px-3.5 py-3 text-xs leading-relaxed text-stone-500">
              No subfolders to arrange.
            </p>
          ) : (
            <div className="mt-5">
              <p className="eyebrow mb-2">Lesson order</p>
              <ul className="space-y-2">
                {orderedLessonGroups.map((group, index) =>
                  renderGroup(group, index, orderedLessonGroups, moveLesson),
                )}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed break-words text-stone-400">
              Saved in this browser.
            </p>
            <button
              type="button"
              onClick={resetOrder}
              className="btn-secondary min-h-9 py-2 text-xs sm:text-sm"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Reset
            </button>
          </div>
        </>
      )}
    </div>
  )
}
