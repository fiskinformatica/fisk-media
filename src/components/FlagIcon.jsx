import { useId } from 'react'

const STARS = [
  [3, 3],
  [6, 3],
  [9, 3],
  [4.5, 5],
  [7.5, 5],
  [10.5, 5],
  [3, 7],
  [6, 7],
  [9, 7],
]

export default function FlagIcon({ country, className = '' }) {
  const rawId = useId().replace(/:/g, '')
  const clipId = `flag-${rawId}`

  return (
    <svg
      viewBox="0 0 28 20"
      role="img"
      aria-hidden="true"
      className={`block h-4 w-6 shrink-0 rounded-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.18)] ring-1 ring-black/10 ${className}`}
    >
      <defs>
        <clipPath id={clipId}>
          <rect width="28" height="20" rx="4" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {country === 'us' && (
          <>
            <rect width="28" height="20" fill="#b22234" />
            {Array.from({ length: 13 }, (_, index) =>
              index % 2 === 1 ? (
                <rect
                  key={index}
                  y={(index * 20) / 13}
                  width="28"
                  height={20 / 13}
                  fill="#ffffff"
                />
              ) : null,
            )}
            <rect width="12" height={(20 * 7) / 13} fill="#3c3b6e" />
            {STARS.map(([cx, cy], index) => (
              <circle key={index} cx={cx} cy={cy} r="0.7" fill="#ffffff" />
            ))}
          </>
        )}

        {country === 'es' && (
          <>
            <rect width="28" height="20" fill="#c60b1e" />
            <rect y="5" width="28" height="10" fill="#ffc400" />
            <rect x="5.5" y="8" width="4" height="4" rx="0.8" fill="#aa151b" />
            <rect x="6.5" y="9" width="2" height="2" rx="0.4" fill="#ffc400" />
          </>
        )}

        {country === 'br' && (
          <>
            <rect width="28" height="20" fill="#009c3b" />
            <path d="M14 1.6 26.4 10 14 18.4 1.6 10Z" fill="#ffdf00" />
            <circle cx="14" cy="10" r="4.2" fill="#002776" />
            <path
              d="M10.2 9.1c2.4 1.5 5.2 1.5 7.6 0v1.8c-2.4 1.5-5.2 1.5-7.6 0z"
              fill="#ffffff"
            />
            <circle cx="14" cy="10" r="1.1" fill="#ffffff" />
          </>
        )}
      </g>

      <rect
        x="0.5"
        y="0.5"
        width="27"
        height="19"
        rx="3.5"
        fill="none"
        stroke="rgba(0,0,0,0.12)"
      />
    </svg>
  )
}
