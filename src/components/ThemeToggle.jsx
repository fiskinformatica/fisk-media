import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext.jsx'

export default function ThemeToggle({ className = '' }) {
  const { t } = useTranslation()
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`icon-button ${className}`}
      aria-label={isDark ? t('theme.toLight') : t('theme.toDark')}
      title={isDark ? t('theme.light') : t('theme.dark')}
    >
      {isDark ? (
        <Sun className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
    </button>
  )
}
