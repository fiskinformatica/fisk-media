import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, SearchX } from 'lucide-react'

function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
}

export default function SelectMenu({
  label,
  icon: Icon,
  value,
  options,
  onChange,
  placeholder = 'Selecione',
  disabled = false,
  className = '',
  menuClassName = '',
}) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const closeTimerRef = useRef(null)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const searchRef = useRef(null)
  const listRef = useRef(null)
  const listId = useId()

  const selected = options.find((option) => option.value === value) ?? null

  const filteredOptions = useMemo(() => {
    const term = normalize(query.trim())
    if (!term) return options
    return options.filter((option) => normalize(option.label).includes(term))
  }, [options, query])

  const closeMenu = useCallback(() => {
    if (!open || closing) return
    setClosing(true)
    triggerRef.current?.focus()
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
      closeTimerRef.current = null
    }, 180)
  }, [open, closing])

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
  }, [open])

  useEffect(
    () => () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    },
    [],
  )

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) closeMenu()
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') closeMenu()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, closing, closeMenu])

  useEffect(() => {
    if (!open || !window.matchMedia('(max-width: 639px)').matches) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open, query])

  function openWith(nextQuery = '') {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setClosing(false)
    setQuery(nextQuery)
    setActiveIndex(0)
    setOpen(true)
  }

  function toggleOpen() {
    if (open) {
      closeMenu()
      return
    }
    openWith('')
  }

  function handleTriggerKeyDown(event) {
    if (disabled || event.metaKey || event.ctrlKey || event.altKey) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) openWith('')
      return
    }

    if (event.key.length === 1 && !open) {
      event.preventDefault()
      openWith(event.key)
    }
  }

  function choose(option) {
    onChange(option.value)
    closeMenu()
  }

  function handleSearchKeyDown(event) {
    const count = filteredOptions.length
    if (count === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % count)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + count) % count)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(count - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(filteredOptions[activeIndex])
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={`flex min-h-14 w-full min-w-0 items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition duration-200 ease-out active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50 sm:active:scale-100 lg:min-h-[4.5rem] lg:px-4 ${className} ${
          open
            ? 'border-brand-400 bg-white shadow-[0_8px_24px_-18px_rgba(28,25,23,0.5)] ring-4 ring-brand-500/10'
            : 'border-stone-200 bg-stone-50/60 hover:border-brand-200 hover:bg-white'
        }`}
      >
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition duration-200 lg:h-11 lg:w-11 ${
            open
              ? 'bg-brand-600 text-white'
              : 'bg-white text-brand-600 shadow-sm ring-1 ring-stone-200/80'
          }`}
        >
          <Icon className="h-[18px] w-[18px] lg:h-5 lg:w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="eyebrow block text-[10px] leading-none lg:text-[11px]">
            {label}
          </span>
          <span
            className={`mt-1 block truncate text-sm leading-tight lg:text-base ${
              selected ? 'font-semibold text-stone-900' : 'text-stone-400'
            }`}
          >
            {selected?.label ?? placeholder}
          </span>
        </span>
        {selected && (
          <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] tabular-nums text-stone-500 lg:px-2 lg:py-1 lg:text-xs">
            {selected.count}
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 lg:h-5 lg:w-5 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-stone-950/25 backdrop-blur-[2px] sm:hidden ${
              closing ? 'animate-fade-out' : 'animate-fade-in'
            }`}
            aria-hidden="true"
            onClick={closeMenu}
          />

          <div
            role="dialog"
            aria-label={label}
            className={`fixed inset-x-0 bottom-0 z-50 max-h-[85svh] rounded-t-3xl border border-stone-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-18px_50px_-25px_rgba(28,25,23,0.35)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-[calc(100%+8px)] sm:max-h-72 sm:w-80 sm:rounded-2xl sm:p-2 sm:pb-2 sm:shadow-[0_18px_50px_-25px_rgba(28,25,23,0.35)] ${
              closing
                ? 'animate-sheet-down sm:animate-menu-out'
                : 'animate-sheet-up sm:animate-menu-in'
            } ${menuClassName}`}
          >
            <div
              className="mx-auto mb-2 h-1 w-10 rounded-full bg-stone-200 sm:hidden"
              aria-hidden="true"
            />

            <div className="mb-2 flex items-center gap-2 rounded-xl bg-stone-100/80 px-3 focus-within:ring-2 focus-within:ring-brand-500/30">
              <Search
                className="h-4 w-4 shrink-0 text-stone-400"
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={handleSearchKeyDown}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={
                  filteredOptions[activeIndex]
                    ? `${listId}-${activeIndex}`
                    : undefined
                }
                aria-label={`Search ${label}`}
                placeholder={`Search ${label.toLowerCase()}...`}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                className="h-12 w-full min-w-0 bg-transparent text-[15px] text-stone-900 outline-none placeholder:text-stone-400 sm:h-11 sm:text-sm"
              />
            </div>

            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={label}
              className="max-h-[55svh] space-y-1 overflow-y-auto overscroll-contain sm:max-h-56"
            >
              {filteredOptions.map((option, index) => {
                const isSelected = option.value === value
                return (
                  <li
                    key={option.value}
                    id={`${listId}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(option)}
                    className={`flex min-h-14 cursor-pointer items-center gap-2.5 rounded-xl px-3 transition duration-150 active:bg-brand-100 sm:min-h-11 ${
                      index === activeIndex ? 'bg-brand-50' : ''
                    }`}
                  >
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                        isSelected
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <Check
                          className="h-3 w-3"
                          strokeWidth={3}
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        isSelected
                          ? 'font-semibold text-brand-700'
                          : 'text-stone-700'
                      }`}
                    >
                      {option.label}
                    </span>
                    {option.count != null && (
                      <span className="shrink-0 rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] tabular-nums text-stone-500">
                        {option.count}
                      </span>
                    )}
                  </li>
                )
              })}

              {filteredOptions.length === 0 && (
                <li className="flex flex-col items-center gap-2 px-3 py-8 text-center">
                  <SearchX className="h-6 w-6 text-stone-300" aria-hidden="true" />
                  <span className="text-sm text-stone-500">
                    No results found
                  </span>
                </li>
              )}
            </ul>

            <p className="hidden px-2 pt-1 text-[11px] leading-none text-stone-400 sm:block">
              Type to filter · Arrow keys navigate · Enter selects
            </p>
          </div>
        </>
      )}
    </div>
  )
}
