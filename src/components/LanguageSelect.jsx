import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n/index.js'
import { LANGUAGES } from '../i18n/resources.js'
import FlagIcon from './FlagIcon.jsx'

export default function LanguageSelect({ className = '' }) {
  const { t } = useTranslation()
  const language = String(i18n.language).split('-')[0]
  const currentIndex = Math.max(
    0,
    LANGUAGES.findIndex(({ code }) => code === language),
  )
  const current = LANGUAGES[currentIndex]

  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const optionRefs = useRef([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(currentIndex)

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus()
  }, [open, activeIndex])

  function selectLanguage(code, index) {
    setActiveIndex(index)
    i18n.changeLanguage(code)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setOpen(false)
      triggerRef.current?.focus()
      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

    event.preventDefault()

    if (!open) {
      setOpen(true)
      setActiveIndex(currentIndex)
      return
    }

    const delta = event.key === 'ArrowDown' ? 1 : -1
    const nextIndex =
      (activeIndex + delta + LANGUAGES.length) % LANGUAGES.length

    setActiveIndex(nextIndex)
    optionRefs.current[nextIndex]?.focus()
  }

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex min-w-0 ${className}`}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('common.language')}: ${current.label}`}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-surface px-2 text-stone-500 transition duration-200 ease-out hover:border-stone-300 hover:text-ink hover:shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      >
        <FlagIcon country={current.country} />
        <span className="hidden text-[11px] font-semibold tracking-wide sm:inline">
          {current.code.toUpperCase()}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-stone-200 bg-surface p-1 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.4)]">
          <div
            role="listbox"
            aria-label={t('common.language')}
            className="flex flex-col gap-0.5"
          >
            {LANGUAGES.map(({ code, label, country }, index) => {
              const selected = code === language

              return (
                <button
                  key={code}
                  ref={(node) => {
                    optionRefs.current[index] = node
                  }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => selectLanguage(code, index)}
                  className={`flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                    selected
                      ? 'bg-brand-50 font-semibold text-brand-700'
                      : 'text-stone-600 hover:bg-surface hover:text-ink'
                  }`}
                >
                  <FlagIcon country={country} />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {selected && (
                    <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
