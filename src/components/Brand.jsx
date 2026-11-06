import { AudioLines } from 'lucide-react'
import { LIBRARY_NAME, LIBRARY_TAGLINE } from '../config/drive.js'

export default function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0 text-brand-600">
        <AudioLines
          className={compact ? 'h-5 w-5' : 'h-6 w-6'}
          strokeWidth={2.4}
          aria-hidden="true"
        />
      </span>
      <span className="leading-tight">
        <span
          className={`block font-semibold tracking-tight text-stone-900 ${
            compact ? 'text-sm' : 'text-[15px]'
          }`}
        >
          {LIBRARY_NAME}
        </span>
        <span className="hidden text-[11px] font-medium text-stone-400 sm:block">
          {LIBRARY_TAGLINE}
        </span>
      </span>
    </div>
  )
}
