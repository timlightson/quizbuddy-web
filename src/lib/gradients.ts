/** Deterministic cover art, so a set always looks the same without storing it. */
const RAMPS: [string, string][] = [
  ['#7c6cf0', '#4aa8ff'],
  ['#2fe0b0', '#4aa8ff'],
  ['#fb923c', '#ff6b6b'],
  ['#f472b6', '#7c6cf0'],
  ['#ffb020', '#fb923c'],
  ['#4aa8ff', '#7c6cf0'],
  ['#a3e635', '#2fe0b0'],
  ['#ff6b6b', '#f472b6'],
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function ramp(seed: string): [string, string] {
  return RAMPS[hash(seed) % RAMPS.length]
}

export function gradient(seed: string, angle = 140): string {
  const [a, b] = ramp(seed)
  return `linear-gradient(${angle}deg, ${a}, ${b})`
}

export function tint(seed: string): string {
  return ramp(seed)[0]
}

/** Two letters for a set swatch, skipping filler words. */
export function initials(title: string): string {
  const words = title
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w && !['the', 'a', 'an', 'of', 'and'].includes(w.toLowerCase()))
  if (!words.length) return '??'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
