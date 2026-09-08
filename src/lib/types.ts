export type ID = string

/** A single flashcard. `term` is the prompt side, `def` the answer side. */
export interface Card {
  id: ID
  term: string
  def: string
  hint?: string
  starred: boolean
  /** SM-2 state */
  ease: number          // easiness factor, >= 1.3
  interval: number      // days until next review
  reps: number          // consecutive successful reviews
  lapses: number        // times forgotten after being learned
  due: number | null    // epoch ms; null = never studied
  mastery: number       // 0..4 derived bucket, cached for UI
  seen: number          // total times reviewed
  correct: number       // total correct
  lastResult?: 'right' | 'wrong'
}

export interface StudySet {
  id: ID
  title: string
  description: string
  subject: string
  folderId: ID | null
  cards: Card[]
  createdAt: number
  updatedAt: number
  /** Language codes for text-to-speech, per side. */
  termLang: string
  defLang: string
}

export interface Folder {
  id: ID
  name: string
  color: string
  createdAt: number
}

export type GameKind = 'match' | 'meteor' | 'rush'

export interface Score {
  id: ID
  setId: ID
  game: GameKind
  /** Seconds for match (lower better); points for meteor/rush (higher better). */
  value: number
  at: number
}

export interface TestResult {
  id: ID
  setId: ID
  score: number
  total: number
  at: number
  durationMs: number
}

/** One day of activity, keyed 'YYYY-MM-DD'. */
export interface DayLog {
  reviews: number
  correct: number
  ms: number
}

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  /** How forgiving written-answer grading is. */
  grading: 'strict' | 'normal' | 'lenient'
  dailyGoal: number
  ttsEnabled: boolean
  ttsRate: number
  autoAdvance: boolean
  /** Default prompt direction for study modes. */
  askWith: 'term' | 'def' | 'both'
  soundEnabled: boolean
  newPerSession: number
  apiKey: string
  /** Cleared once the visitor leaves the landing page for the app. */
  onboarded: boolean
}

export interface AppState {
  sets: StudySet[]
  folders: Folder[]
  scores: Score[]
  tests: TestResult[]
  days: Record<string, DayLog>
  settings: Settings
  lastStudied: Record<ID, number>
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  grading: 'normal',
  dailyGoal: 30,
  ttsEnabled: true,
  ttsRate: 0.95,
  autoAdvance: true,
  askWith: 'term',
  soundEnabled: true,
  newPerSession: 12,
  apiKey: '',
  onboarded: false,
}

export const FOLDER_COLORS = [
  '#4f46b8', '#b4720d', '#2f7d5d', '#b3453b',
  '#2b6ca3', '#7a4bb0', '#a8562f', '#3f7a7d',
]
