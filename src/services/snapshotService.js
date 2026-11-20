const SNAPSHOT_FILE = 'library.json'
const BASE_URL = import.meta.env.BASE_URL || './'

export const SNAPSHOT_URL = new URL(
  `${BASE_URL}${SNAPSHOT_FILE}`,
  window.location.href,
).href

function isValidLibrary(library) {
  return Boolean(
    library &&
      Array.isArray(library.audio) &&
      Array.isArray(library.video),
  )
}

export async function fetchSnapshot({ signal } = {}) {
  try {
    const response = await fetch(SNAPSHOT_URL, {
      signal,
      cache: 'no-cache',
    })
    if (!response.ok) return null

    const snapshot = await response.json()
    if (snapshot?.v !== 1 || !isValidLibrary(snapshot.library)) return null

    return snapshot
  } catch {
    return null
  }
}

export function buildSnapshot({ library, folderOrder }) {
  return {
    v: 1,
    publishedAt: new Date().toISOString(),
    library,
    folderOrder:
      folderOrder && typeof folderOrder === 'object' ? folderOrder : {},
  }
}

export function downloadSnapshot(snapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = SNAPSHOT_FILE
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
