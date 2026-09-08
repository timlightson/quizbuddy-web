import { useEffect, useRef, type ReactNode } from 'react'
import type { Card } from '../lib/types'
import { navigate, Bar } from './ui'
import { IX } from './Icons'
import { useStore } from '../lib/store'

export function StudyHead({
  title, subtitle, value, max, setId, right,
}: {
  title: string; subtitle?: string; value: number; max: number
  setId: string; right?: ReactNode
}) {
  return (
    <div className="study-head">
      <button className="btn btn-ghost btn-icon" aria-label="Exit"
              onClick={() => navigate(`/set/${setId}`)}>
        <IX size={17} />
      </button>
      <div style={{ minWidth: 0 }}>
        <div className="h3 trunc">{title}</div>
        {subtitle && <div className="hint">{subtitle}</div>}
      </div>
      <div className="grow" style={{ maxWidth: 340, margin: '0 auto' }}>
        <Bar value={value} max={max} />
      </div>
      <span className="mono muted nowrap num">{value} / {max}</span>
      {right}
    </div>
  )
}

/**
 * Times a study session and writes it to the day log on unmount, so a session
 * counts toward the streak even if the user navigates away mid-round.
 */
export function useSessionLog() {
  const logStudy = useStore(s => s.logStudy)
  const start = useRef(Date.now())
  const tally = useRef({ reviews: 0, correct: 0 })

  const record = (correct: boolean) => {
    tally.current.reviews += 1
    if (correct) tally.current.correct += 1
  }

  useEffect(() => {
    const t = tally.current
    const began = start.current
    return () => {
      if (t.reviews > 0) logStudy(Date.now() - began, t.reviews, t.correct)
    }
  }, [logStudy])

  return record
}

export function Summary({
  title, lines, setId, onAgain, againLabel = 'Go again',
}: {
  title: string
  lines: { label: string; value: ReactNode; tone?: string }[]
  setId: string
  onAgain?: () => void
  againLabel?: string
}) {
  return (
    <div className="study-center rise-in" style={{ paddingTop: 40 }}>
      <div className="card card-pad ta-c" style={{ padding: 40 }}>
        <div className="h1 mb24">{title}</div>
        <div className="grid3 g12 mb32">
          {lines.map(l => (
            <div key={l.label}>
              <div className="stat-v" style={l.tone ? { color: l.tone } : undefined}>{l.value}</div>
              <div className="stat-l">{l.label}</div>
            </div>
          ))}
        </div>
        <div className="row g8" style={{ justifyContent: 'center' }}>
          <button className="btn btn-lg" onClick={() => navigate(`/set/${setId}`)}>Back to set</button>
          {onAgain && <button className="btn btn-accent btn-lg" onClick={onAgain}>{againLabel}</button>}
        </div>
      </div>
    </div>
  )
}

/**
 * Freeze the set's usable cards for the duration of one session.
 *
 * Every study mode writes scheduling data back to the store on each answer,
 * which changes `set.cards`. Anything derived straight from that would be
 * rebuilt mid-round — reshuffling choices under the user's cursor, desyncing
 * positional queues, and (in the games) resetting the score. Snapshotting once
 * per round keeps a session stable; bump `nonce` to deal a fresh one.
 */
export function useCardPool(cards: Card[] | undefined, nonce: number): Card[] {
  const snap = useRef<Card[]>([])
  const key = useRef(-1)
  const usable = (cards ?? []).filter(c => c.term.trim() && c.def.trim())

  // Re-snapshot on a new round, or once the store finishes rehydrating.
  if (key.current !== nonce || (snap.current.length === 0 && usable.length > 0)) {
    key.current = nonce
    snap.current = usable
  }
  return snap.current
}
