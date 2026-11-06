import { readJson, writeJson } from './storage.js'

const STORAGE_KEY = 'fisk.folderOrder.v1'

function readStore() {
  const stored = readJson(STORAGE_KEY)

  if (
    !stored ||
    stored.v !== 1 ||
    typeof stored.orders !== 'object' ||
    stored.orders === null
  ) {
    return { v: 1, orders: {} }
  }

  return stored
}

function orderId(kind, categoryId) {
  return `${kind}:${categoryId}`
}

export function readFolderOrder(kind, categoryId) {
  if (!categoryId) return []

  const order = readStore().orders[orderId(kind, categoryId)]
  return Array.isArray(order) ? order : []
}

export function saveFolderOrder(kind, categoryId, keys) {
  if (!categoryId) return

  const store = readStore()
  store.orders[orderId(kind, categoryId)] = keys
  writeJson(STORAGE_KEY, store)
}

export function clearFolderOrder(kind, categoryId) {
  if (!categoryId) return

  const store = readStore()
  delete store.orders[orderId(kind, categoryId)]
  writeJson(STORAGE_KEY, store)
}

export function sortGroupsByOrder(groups, order) {
  if (!order || order.length === 0) return groups

  const position = new Map(order.map((key, index) => [key, index]))

  return [...groups].sort((a, b) => {
    const aIndex = position.has(a.key)
      ? position.get(a.key)
      : Number.MAX_SAFE_INTEGER
    const bIndex = position.has(b.key)
      ? position.get(b.key)
      : Number.MAX_SAFE_INTEGER

    return aIndex - bIndex
  })
}
