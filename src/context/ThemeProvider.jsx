import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeContext } from './ThemeContext.jsx'

const THEME_STORAGE_KEY = 'media.theme.v1'
const DARK = 'dark'
const LIGHT = 'light'

function readTheme() {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === LIGHT ? LIGHT : DARK
  } catch {
    return DARK
  }
}

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.style.colorScheme = theme

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', theme === DARK ? '#0c0a09' : '#fbfbfb')
    }

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      /* localStorage may be unavailable */
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === DARK ? LIGHT : DARK))
  }, [])

  const value = useMemo(
    () => ({ theme, isDark: theme === DARK, toggleTheme }),
    [theme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
