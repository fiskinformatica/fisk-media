const collator = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base',
})

function getVariant(name) {
  const value = String(name ?? '')
    .trim()
    .toLowerCase()

  if (/^(no\s+)?sub-?titles?$/.test(value)) {
    return value.startsWith('no ') ? 'No Subtitle' : 'Subtitle'
  }
  if (value === 'questions' || value === 'exercises') return 'Questions'
  return null
}

function stripExtension(name) {
  return String(name ?? '').replace(/\.[a-z0-9]{2,5}$/i, '')
}

function getVariantFromName(name) {
  const suffix = String(name ?? '').match(
    /\s+-\s+((?:no\s+)?sub-?titles?|questions)$/i,
  )?.[1]
  return suffix ? getVariant(suffix) : null
}

function cleanLesson(name) {
  return String(name ?? '')
    .replace(/\s+-\s+(?:(?:no\s+)?sub-?titles?|questions)$/i, '')
    .trim()
}

export function normalizeVideoItem(item) {
  const path = Array.isArray(item.path) ? item.path : []
  const course = path[0] ?? item.categoryName ?? 'Lessons'
  const rest = path.slice(1)
  const variant =
    item.variant ??
    rest.map(getVariant).find(Boolean) ??
    getVariantFromName(item.name) ??
    null
  const lessonFolders = rest.filter((segment) => !getVariant(segment))
  const lesson = cleanLesson(lessonFolders.at(-1) ?? stripExtension(item.name))

  return {
    ...item,
    path: [course, lesson],
    variant,
  }
}

function compareVideos(a, b) {
  return (
    collator.compare(a.path.join('\u0000'), b.path.join('\u0000')) ||
    collator.compare(a.variant ?? '', b.variant ?? '') ||
    collator.compare(a.name, b.name)
  )
}

export function normalizeLibrary(library) {
  if (!library || !Array.isArray(library.video)) return library

  return {
    ...library,
    video: library.video.map((category) => ({
      ...category,
      items: [...(category.items ?? [])]
        .map(normalizeVideoItem)
        .sort(compareVideos),
    })),
  }
}
