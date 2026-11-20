export function groupMediaByFolder(items) {
  const groups = new Map()

  for (const item of items) {
    const key = item.path.join(' / ')
    if (!groups.has(key)) {
      const isVideo =
        item.kind === 'video' || item.mimeType?.startsWith('video/')
      const name =
        item.path.length > 0
          ? item.path[item.path.length - 1]
          : isVideo
            ? 'No Subtitles'
            : 'Files'

      groups.set(key, {
        key,
        name,
        parent: item.path.length > 1 ? item.path.slice(0, -1).join(' / ') : '',
        items: [],
      })
    }
    groups.get(key).items.push(item)
  }

  return [...groups.values()]
}
