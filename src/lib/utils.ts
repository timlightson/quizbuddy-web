export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 9)

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function sample<T>(arr: readonly T[], n: number): T[] {
  return shuffle(arr).slice(0, n)
}

/** Local-timezone 'YYYY-MM-DD'. Using UTC here would shift the streak. */
export function dayKey(d: Date | number = new Date()): string {
  const x = typeof d === 'number' ? new Date(d) : d
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${x.getFullYear()}-${m}-${day}`
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export function fmtClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 100))
  return `${Math.floor(total / 600)}:${String(Math.floor((total % 600) / 10)).padStart(2, '0')}.${total % 10}`
}

export function relTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const mo = Math.floor(days / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(mo / 12)}y ago`
}

/** "in 3d" / "due now" for scheduling readouts. */
export function untilTime(ts: number | null): string {
  if (ts === null) return 'new'
  const diff = ts - Date.now()
  if (diff <= 0) return 'due now'
  const mins = Math.round(diff / 60_000)
  if (mins < 60) return `in ${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `in ${hrs}h`
  const days = Math.round(hrs / 24)
  if (days < 31) return `in ${days}d`
  return `in ${Math.round(days / 30)}mo`
}

export const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100))

export const plural = (n: number, word: string, suffix = 's') =>
  `${n} ${word}${n === 1 ? '' : suffix}`

export function download(filename: string, text: string, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
