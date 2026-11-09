import { useEffect, useState } from 'react'

function normalize(value) {
  return value.replace(/\/+$/, '')
}

function readRoute() {
  if (typeof window === 'undefined') return 'library'

  const hash = normalize(window.location.hash.replace(/^#/, '').split('?')[0])

  if (hash) {
    if (hash === '/teachers' || hash.endsWith('/teachers')) return 'teachers'
    if (hash === '/students' || hash.endsWith('/students')) return 'students'
    return 'library'
  }

  const path = normalize(window.location.pathname)
  if (/(^|\/)teachers$/.test(path)) return 'teachers'
  if (/(^|\/)students$/.test(path)) return 'students'
  return 'library'
}

export function useRoute() {
  const [route, setRoute] = useState(readRoute)

  useEffect(() => {
    const update = () => setRoute(readRoute())

    window.addEventListener('hashchange', update)
    window.addEventListener('popstate', update)

    return () => {
      window.removeEventListener('hashchange', update)
      window.removeEventListener('popstate', update)
    }
  }, [])

  return route
}
