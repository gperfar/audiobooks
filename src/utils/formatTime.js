export function formatTime(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--:--'
  }

  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// Seconds with one decimal for timing inputs, e.g. 75.25 -> "1:15.3".
export function formatPreciseTime(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—'
  }

  const minutes = Math.floor(value / 60)
  const seconds = (value % 60).toFixed(1).padStart(4, '0')

  return `${minutes}:${seconds}`
}
