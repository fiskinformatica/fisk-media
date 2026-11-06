export function groupMediaByFolder(items) {
  const groups = new Map()

  for (const item of items) {
    const key = item.path.join(' / ')
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: item.path.length > 0 ? item.path[item.path.length - 1] : 'Arquivos',
        parent: item.path.length > 1 ? item.path.slice(0, -1).join(' / ') : '',
        items: [],
      })
    }
    groups.get(key).items.push(item)
  }

  return [...groups.values()]
}
