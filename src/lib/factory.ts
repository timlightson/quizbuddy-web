import type { Card, StudySet } from './types'
import { uid } from './utils'

export function blankCard(term = '', def = ''): Card {
  return {
    id: uid(), term, def, starred: false,
    ease: 2.5, interval: 0, reps: 0, lapses: 0,
    due: null, mastery: 0, seen: 0, correct: 0,
  }
}

export function blankSet(title = 'Untitled set'): StudySet {
  const now = Date.now()
  return {
    id: uid(), title, description: '', subject: '', folderId: null,
    cards: [blankCard(), blankCard(), blankCard()],
    createdAt: now, updatedAt: now,
    termLang: 'en-US', defLang: 'en-US',
  }
}

/** Strip all scheduling history, leaving content intact. */
export function freshCard(c: Card): Card {
  return {
    ...c, ease: 2.5, interval: 0, reps: 0, lapses: 0,
    due: null, mastery: 0, seen: 0, correct: 0, lastResult: undefined,
  }
}
