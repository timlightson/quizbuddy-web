import type { Card, Settings } from './types'

export const DAY = 86_400_000

export type Grade = 'again' | 'hard' | 'good' | 'easy'

const QUALITY: Record<Grade, number> = { again: 1, hard: 3, good: 4, easy: 5 }

/**
 * SM-2 with a short relearning step. Returns the mutated fields only, so
 * callers can merge into their own card object.
 */
export function schedule(card: Card, grade: Grade, now = Date.now()): Partial<Card> {
  const q = QUALITY[grade]
  const passed = q >= 3

  let { ease, interval, reps, lapses } = card

  // Easiness factor drifts with answer quality, floored per SM-2.
  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))

  if (!passed) {
    lapses += 1
    reps = 0
    // Relearn today rather than tomorrow — 10 minutes out.
    const next: Partial<Card> = {
      ease,
      interval: 0,
      reps,
      lapses,
      due: now + 10 * 60_000,
      lastResult: 'wrong',
      seen: card.seen + 1,
    }
    return { ...next, mastery: masteryOf({ ...card, ...next } as Card) }
  }

  if (reps === 0) interval = 1
  else if (reps === 1) interval = 6
  else interval = Math.round(interval * ease)

  if (grade === 'hard') interval = Math.max(1, Math.round(interval * 0.6))
  if (grade === 'easy') interval = Math.round(interval * 1.3)

  interval = Math.min(interval, 365)
  reps += 1

  const next: Partial<Card> = {
    ease,
    interval,
    reps,
    lapses,
    due: now + interval * DAY,
    lastResult: 'right',
    seen: card.seen + 1,
    correct: card.correct + 1,
  }
  return { ...next, mastery: masteryOf({ ...card, ...next } as Card) }
}

/** 0 = new, 1 = learning, 2 = familiar, 3 = strong, 4 = mastered. */
export function masteryOf(c: Card): number {
  if (c.due === null || c.seen === 0) return 0
  if (c.interval >= 60 && c.reps >= 5) return 4
  if (c.interval >= 21 && c.reps >= 4) return 3
  if (c.interval >= 6 && c.reps >= 2) return 2
  return 1
}

export const MASTERY_LABEL = ['New', 'Learning', 'Familiar', 'Strong', 'Mastered']
export const MASTERY_VAR = ['--m0', '--m1', '--m2', '--m3', '--m4']

export function isDue(c: Card, now = Date.now()): boolean {
  return c.due === null || c.due <= now
}

/** A card that keeps being forgotten needs a different approach, not more reps. */
export function isLeech(c: Card): boolean {
  return c.lapses >= 5 && c.mastery <= 1
}

/**
 * Build a review queue: overdue cards first (most overdue leads), then new
 * cards capped at `newPerSession` so a big set doesn't dump 200 unknowns.
 */
export function buildQueue(cards: Card[], settings: Settings, now = Date.now()): Card[] {
  const due: Card[] = []
  const fresh: Card[] = []
  for (const c of cards) {
    if (c.due === null) fresh.push(c)
    else if (c.due <= now) due.push(c)
  }
  due.sort((a, b) => (a.due! - b.due!))
  return [...due, ...fresh.slice(0, Math.max(0, settings.newPerSession))]
}

export function dueCount(cards: Card[], now = Date.now()): number {
  return cards.reduce((n, c) => n + (c.due !== null && c.due <= now ? 1 : 0), 0)
}

export function newCount(cards: Card[]): number {
  return cards.reduce((n, c) => n + (c.due === null ? 1 : 0), 0)
}

/* ------------------------------------------------------------------ */
/* Answer grading                                                      */
/* ------------------------------------------------------------------ */

const ARTICLES = /^(a|an|the|to|el|la|los|las|un|una|le|les|der|die|das)\s+/i

/** Lowercase, strip accents, punctuation, and collapse whitespace. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.,!?;:"'`’“”()\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function loosen(s: string): string {
  return normalize(s).replace(ARTICLES, '')
}

/** Split an answer into acceptable alternatives on `/`, `,`, or `;`. */
function alternatives(answer: string): string[] {
  return answer
    .split(/[/;,]|\bor\b/gi)
    .map(s => s.trim())
    .filter(Boolean)
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  let prev = new Array<number>(b.length + 1)
  let cur = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j

  for (let i = 1; i <= a.length; i++) {
    cur[0] = i
    const ca = a.charCodeAt(i - 1)
    for (let j = 1; j <= b.length; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, cur] = [cur, prev]
  }
  return prev[b.length]
}

export type GradeVerdict = 'correct' | 'close' | 'wrong'

/**
 * Grade a typed answer. `close` means a typo-level miss — the UI offers it as
 * "almost", which counts as correct but shows the exact spelling.
 */
export function gradeAnswer(input: string, expected: string, mode: Settings['grading']): GradeVerdict {
  const given = normalize(input)
  if (!given) return 'wrong'

  const exact = normalize(expected)
  if (given === exact) return 'correct'

  if (mode === 'strict') {
    // Only forgive a single typo on longer answers.
    return levenshtein(given, exact) <= (exact.length > 8 ? 1 : 0) ? 'close' : 'wrong'
  }

  const givenLoose = loosen(input)
  const alts = alternatives(expected).map(loosen)
  if (alts.includes(givenLoose)) return 'correct'
  if (loosen(expected) === givenLoose) return 'correct'

  // Allow ~1 typo per 6 characters, capped.
  const tolerance = (n: number) => Math.min(mode === 'lenient' ? 3 : 2, Math.floor(n / 6) + (mode === 'lenient' ? 1 : 0))

  for (const alt of alts.length ? alts : [loosen(expected)]) {
    const d = levenshtein(givenLoose, alt)
    if (d <= tolerance(alt.length)) return 'close'
  }

  if (mode === 'lenient') {
    // Accept an answer that contains the key phrase, for definition-style cards.
    for (const alt of alts) {
      if (alt.length >= 4 && (givenLoose.includes(alt) || alt.includes(givenLoose))) {
        const ratio = Math.min(givenLoose.length, alt.length) / Math.max(givenLoose.length, alt.length)
        if (ratio >= 0.6) return 'close'
      }
    }
  }

  return 'wrong'
}
