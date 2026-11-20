export function readJson(key) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage may be full or disabled */
  }
}

export function removeStorage(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function migrateLegacyStorage() {
  try {
    const storage = window.localStorage

    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const oldKey = storage.key(index)
      if (!oldKey?.startsWith('fisk.')) continue

      const newKey = `media.${oldKey.slice(5)}`
      if (storage.getItem(newKey) === null) {
        storage.setItem(newKey, storage.getItem(oldKey))
      }
      storage.removeItem(oldKey)
    }
  } catch {
    /* ignore */
  }
}
