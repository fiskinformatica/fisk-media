import { readJson, removeStorage, writeJson } from './storage.js'

const STORAGE_KEY = 'media.folderOrder.v2'

let sharedOrders = {}

export function setSharedOrders(orders) {
  sharedOrders = orders && typeof orders === 'object' ? { ...orders } : {}
}

export function getSharedOrders() {
  return { ...sharedOrders }
}

export function exportFolderOrders() {
  return { ...sharedOrders, ...readStore().orders }
}

export function resetLocalOrders() {
  removeStorage(STORAGE_KEY)
}

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

function orderId(kind, categoryId, course = null) {
  return `${kind}:${categoryId}${course ? `:${course}` : ''}`
}

export function readFolderOrder(kind, categoryId, course = null) {
  if (!categoryId) return []

  const key = orderId(kind, categoryId, course)
  const order = readStore().orders[key]
  if (Array.isArray(order)) return order

  return Array.isArray(sharedOrders[key]) ? sharedOrders[key] : []
}

export function saveFolderOrder(kind, categoryId, keys, course = null) {
  if (!categoryId) return

  const key = orderId(kind, categoryId, course)
  const store = readStore()
  store.orders[key] = keys
  sharedOrders[key] = keys
  writeJson(STORAGE_KEY, store)
}

export function clearFolderOrder(kind, categoryId, course = null) {
  if (!categoryId) return

  const key = orderId(kind, categoryId, course)
  const store = readStore()
  delete store.orders[key]
  delete sharedOrders[key]
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
