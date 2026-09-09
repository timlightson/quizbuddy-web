import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppState, Card, Folder, GameKind, ID, Settings, StudySet, TestResult } from './types'
import { DEFAULT_SETTINGS } from './types'
import { masteryOf, schedule, type Grade } from './srs'
import { delatex } from './latex'
import { dayKey, uid } from './utils'
import { blankCard, blankSet, freshCard } from './factory'
import { seedFolders, seedSets } from './seed'

export { blankCard, blankSet }

interface Actions {
  createSet: (partial?: Partial<StudySet>) => ID
  updateSet: (id: ID, patch: Partial<StudySet>) => void
  deleteSet: (id: ID) => void
  duplicateSet: (id: ID) => ID | null

  addCards: (setId: ID, cards: Card[]) => void
  updateCard: (setId: ID, cardId: ID, patch: Partial<Card>) => void
  removeCard: (setId: ID, cardId: ID) => void
  toggleStar: (setId: ID, cardId: ID) => void
  reorderCards: (setId: ID, from: number, to: number) => void
  resetProgress: (setId: ID, onlyIds?: ID[]) => void

  review: (setId: ID, cardId: ID, grade: Grade) => void
  logStudy: (ms: number, reviews: number, correct: number) => void

  createFolder: (name: string, color: string) => ID
  updateFolder: (id: ID, patch: Partial<Folder>) => void
  deleteFolder: (id: ID) => void

  addScore: (setId: ID, game: GameKind, value: number) => void
  addTest: (r: Omit<TestResult, 'id' | 'at'>) => void

  setSettings: (patch: Partial<Settings>) => void
  loadSamples: () => number
  importState: (data: Partial<AppState>) => void
  resetAll: () => void
}

const emptyState: AppState = {
  sets: [], folders: [], scores: [], tests: [], days: {},
  settings: DEFAULT_SETTINGS, lastStudied: {},
}

export const useStore = create<AppState & Actions>()(
  persist(
    (set, get) => ({
      ...emptyState,

      /* ---------- sets ---------- */
      createSet: (partial) => {
        const s = { ...blankSet(), ...partial, id: uid() }
        set(st => ({ sets: [s, ...st.sets] }))
        return s.id
      },

      updateSet: (id, patch) =>
        set(st => ({
          sets: st.sets.map(s => (s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s)),
        })),

      deleteSet: (id) =>
        set(st => ({
          sets: st.sets.filter(s => s.id !== id),
          scores: st.scores.filter(x => x.setId !== id),
          tests: st.tests.filter(x => x.setId !== id),
        })),

      duplicateSet: (id) => {
        const src = get().sets.find(s => s.id === id)
        if (!src) return null
        const copy: StudySet = {
          ...src,
          id: uid(),
          title: `${src.title} (copy)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          // A duplicate is a fresh start — carrying scheduling over would lie
          // about how well the user knows the new copy.
          cards: src.cards.map(c => ({ ...freshCard(c), id: uid() })),
        }
        set(st => ({ sets: [copy, ...st.sets] }))
        return copy.id
      },

      /* ---------- cards ---------- */
      addCards: (setId, cards) =>
        set(st => ({
          sets: st.sets.map(s =>
            s.id === setId ? { ...s, cards: [...s.cards, ...cards], updatedAt: Date.now() } : s),
        })),

      updateCard: (setId, cardId, patch) =>
        set(st => ({
          sets: st.sets.map(s =>
            s.id !== setId ? s : {
              ...s, updatedAt: Date.now(),
              cards: s.cards.map(c => (c.id === cardId ? { ...c, ...patch } : c)),
            }),
        })),

      removeCard: (setId, cardId) =>
        set(st => ({
          sets: st.sets.map(s =>
            s.id !== setId ? s : {
              ...s, updatedAt: Date.now(),
              cards: s.cards.filter(c => c.id !== cardId),
            }),
        })),

      toggleStar: (setId, cardId) =>
        set(st => ({
          sets: st.sets.map(s =>
            s.id !== setId ? s : {
              ...s,
              cards: s.cards.map(c => (c.id === cardId ? { ...c, starred: !c.starred } : c)),
            }),
        })),

      reorderCards: (setId, from, to) =>
        set(st => ({
          sets: st.sets.map(s => {
            if (s.id !== setId) return s
            const cards = s.cards.slice()
            const [moved] = cards.splice(from, 1)
            if (!moved) return s
            cards.splice(to, 0, moved)
            return { ...s, cards, updatedAt: Date.now() }
          }),
        })),

      resetProgress: (setId, onlyIds) =>
        set(st => ({
          sets: st.sets.map(s =>
            s.id !== setId ? s : {
              ...s, updatedAt: Date.now(),
              cards: s.cards.map(c =>
                onlyIds && !onlyIds.includes(c.id) ? c : freshCard(c)),
            }),
        })),

      /* ---------- studying ---------- */
      review: (setId, cardId, grade) =>
        set(st => ({
          lastStudied: { ...st.lastStudied, [setId]: Date.now() },
          sets: st.sets.map(s =>
            s.id !== setId ? s : {
              ...s,
              cards: s.cards.map(c => (c.id === cardId ? { ...c, ...schedule(c, grade) } : c)),
            }),
        })),

      logStudy: (ms, reviews, correct) =>
        set(st => {
          const k = dayKey()
          const prev = st.days[k] ?? { reviews: 0, correct: 0, ms: 0 }
          return {
            days: {
              ...st.days,
              [k]: { reviews: prev.reviews + reviews, correct: prev.correct + correct, ms: prev.ms + ms },
            },
          }
        }),

      /* ---------- folders ---------- */
      createFolder: (name, color) => {
        const f: Folder = { id: uid(), name, color, createdAt: Date.now() }
        set(st => ({ folders: [...st.folders, f] }))
        return f.id
      },

      updateFolder: (id, patch) =>
        set(st => ({ folders: st.folders.map(f => (f.id === id ? { ...f, ...patch } : f)) })),

      deleteFolder: (id) =>
        set(st => ({
          folders: st.folders.filter(f => f.id !== id),
          // Sets outlive their folder; they just become unfiled.
          sets: st.sets.map(s => (s.folderId === id ? { ...s, folderId: null } : s)),
        })),

      /* ---------- results ---------- */
      addScore: (setId, game, value) =>
        set(st => ({ scores: [{ id: uid(), setId, game, value, at: Date.now() }, ...st.scores].slice(0, 400) })),

      addTest: (r) =>
        set(st => ({ tests: [{ ...r, id: uid(), at: Date.now() }, ...st.tests].slice(0, 200) })),

      /* ---------- meta ---------- */
      setSettings: (patch) => set(st => ({ settings: { ...st.settings, ...patch } })),

      /** Copy the demo library in, skipping anything already added. */
      loadSamples: () => {
        const existing = new Set(get().sets.map(s => s.title))
        const fresh = seedSets().filter(s => !existing.has(s.title))
        if (!fresh.length) return 0
        const folderIds = new Set(fresh.map(s => s.folderId).filter(Boolean) as string[])
        set(st => ({
          sets: [...fresh, ...st.sets],
          folders: [
            ...st.folders,
            ...seedFolders().filter(f => folderIds.has(f.id) && !st.folders.some(x => x.id === f.id)),
          ],
        }))
        return fresh.length
      },

      importState: (data) =>
        set(st => ({
          sets: data.sets ?? st.sets,
          folders: data.folders ?? st.folders,
          scores: data.scores ?? st.scores,
          tests: data.tests ?? st.tests,
          days: data.days ?? st.days,
          settings: { ...st.settings, ...(data.settings ?? {}) },
        })),

      resetAll: () => set({ ...emptyState }),
    }),
    {
      name: 'quizbuddy:v1',
      version: 1,
      // Recompute cached mastery on load so a schema tweak can't leave stale badges.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>
        const merged = { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) } }
        // Older saves stored a single Anthropic key; fold it into the keyring.
        const st = merged.settings
        st.aiKeys = { ...(st.aiKeys ?? {}) }
        if (st.apiKey && !st.aiKeys.anthropic) st.aiKeys.anthropic = st.apiKey
        merged.sets = (merged.sets ?? []).map(s => ({
          ...s,
          cards: (s.cards ?? []).map(c => {
            // Decks generated before LaTeX was normalised still carry raw
            // markup; delatex leaves anything else exactly as written.
            const term = delatex(c.term)
            const def = delatex(c.def)
            const hint = c.hint ? delatex(c.hint) : c.hint
            return { ...c, term, def, hint, mastery: masteryOf(c) }
          }),
        }))
        return merged
      },
    },
  ),
)

/* ---------- selectors ---------- */
export const useSet = (id: ID | null) =>
  useStore(s => (id ? s.sets.find(x => x.id === id) ?? null : null))

export const useSettings = () => useStore(s => s.settings)
