export function getCourseName(item) {
  return item.path?.length > 1 ? item.path[0] : null
}

export function groupMediaByFolder(items, { pathOffset = 0 } = {}) {
  const groups = new Map()

  for (const item of items) {
    const path = (item.path ?? []).slice(pathOffset)
    const key = path.join(' / ')
    if (!groups.has(key)) {
      const isVideo =
        item.kind === 'video' || item.mimeType?.startsWith('video/')
      const name =
        path.length > 0
          ? path[path.length - 1]
          : isVideo
            ? 'No Subtitles'
            : 'Files'

      groups.set(key, {
        key,
        name,
        parent: path.length > 1 ? path.slice(0, -1).join(' / ') : '',
        items: [],
      })
    }
    groups.get(key).items.push(item)
  }

  return [...groups.values()]
}
