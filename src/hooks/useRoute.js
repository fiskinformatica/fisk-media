import { useEffect, useState } from 'react'

function normalize(value) {
  return value.replace(/\/+$/, '')
}

function readRoute() {
  if (typeof window === 'undefined') return 'library'

  const hash = normalize(window.location.hash.replace(/^#/, '').split('?')[0])

  if (hash) {
    return hash === '/teachers' || hash.endsWith('/teachers')
      ? 'teachers'
      : 'library'
  }

  const path = normalize(window.location.pathname)
  return /(^|\/)teachers$/.test(path) ? 'teachers' : 'library'
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
