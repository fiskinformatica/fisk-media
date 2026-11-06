const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
})

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
})

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'

  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return `${minutes}:${String(secs).padStart(2, '0')}`
}

export function formatBytes(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return null

  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let unit = 0

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }

  const rounded = size >= 10 || unit === 0 ? Math.round(size) : size.toFixed(1)
  return `${String(rounded).replace('.', ',')} ${units[unit]}`
}

export function formatLastSync(timestamp) {
  if (!timestamp) return 'Ainda não sincronizado'

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return 'Ainda não sincronizado'

  const now = new Date()
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  return sameDay
    ? `Atualizado às ${timeFormatter.format(date)}`
    : `Atualizado em ${dateTimeFormatter.format(date)}`
}

export function formatMonthYear(date = new Date()) {
  const label = monthFormatter.format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const naturalCollator = new Intl.Collator('pt-BR', {
  numeric: true,
  sensitivity: 'base',
})

export function naturalCompare(a, b) {
  return naturalCollator.compare(a, b)
}

export function fileExtension(name = '') {
  const dot = name.lastIndexOf('.')
  if (dot < 0 || dot === name.length - 1) return ''
  return name.slice(dot + 1).toUpperCase()
}
