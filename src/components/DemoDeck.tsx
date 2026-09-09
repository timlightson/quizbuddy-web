import { useEffect, useState } from 'react'
import { IArrowL, IArrowR, IShuffle, ISpeaker } from './Icons'
import { speak } from '../lib/tts'

export interface DemoCard {
  term: string
  def: string
  subject?: string
  tint?: string
  lang?: string
}

/**
 * A working flashcard, small enough to sit inside the landing hero and real
 * enough to be worth clicking. Deliberately holds its own state rather than
 * touching the store — nothing here should land in someone's library.
 */
export function DemoDeck({
  cards, compact = false, onFinish,
}: {
  cards: DemoCard[]
  compact?: boolean
  onFinish?: () => void
}) {
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [order, setOrder] = useState(() => cards.map((_, n) => n))
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]))

  useEffect(() => {
    setOrder(cards.map((_, n) => n))
    setI(0); setFlipped(false); setSeen(new Set([0]))
  }, [cards])

  const card = cards[order[i]]
  if (!card) return null

  const go = (delta: number) => {
    const next = (i + delta + order.length) % order.length
    setFlipped(false)
    setI(next)
    setSeen(s => new Set(s).add(next))
    if (delta > 0 && next === 0) onFinish?.()
  }

  const shuffle = () => {
    const a = order.slice()
    for (let n = a.length - 1; n > 0; n--) {
      const m = Math.floor(Math.random() * (n + 1))
      ;[a[n], a[m]] = [a[m], a[n]]
    }
    setOrder(a); setI(0); setFlipped(false); setSeen(new Set([0]))
  }

  const face = flipped ? card.def : card.term
  const long = face.length > 78

  return (
    <div className="demo-deck">
      <div className="demo-top">
        <span className="demo-sub" style={card.tint ? { color: card.tint } : undefined}>
          {card.subject ?? 'Demo'}
        </span>
        <div className="grow" />
        <span className="demo-count num">{i + 1} / {order.length}</span>
      </div>

      <button
        className="demo-card"
        data-flipped={flipped}
        data-compact={compact}
        onClick={() => setFlipped(f => !f)}
        aria-label={flipped ? 'Show term' : 'Show definition'}
      >
        <span className="demo-side">{flipped ? 'Definition' : 'Term'}</span>
        <span className="demo-face" data-long={long}>{face}</span>
        <span className="demo-hint">
          {flipped ? 'Click to flip back' : 'Click to reveal'}
        </span>
      </button>

      <div className="demo-controls">
        <button className="btn btn-icon btn-sm" onClick={e => { e.stopPropagation(); go(-1) }}
                aria-label="Previous card">
          <IArrowL size={15} />
        </button>
        <button className="btn btn-sm grow" onClick={() => setFlipped(f => !f)}>
          {flipped ? 'Show term' : 'Show answer'}
        </button>
        {card.lang && (
          <button className="btn btn-icon btn-sm" aria-label="Speak"
                  onClick={e => { e.stopPropagation(); speak(face, card.lang!, 0.95) }}>
            <ISpeaker size={14} />
          </button>
        )}
        <button className="btn btn-icon btn-sm" onClick={shuffle} aria-label="Shuffle">
          <IShuffle size={14} />
        </button>
        <button className="btn btn-icon btn-sm" onClick={e => { e.stopPropagation(); go(1) }}
                aria-label="Next card">
          <IArrowR size={15} />
        </button>
      </div>

      <div className="demo-pips">
        {order.map((_, n) => (
          <i key={n} data-on={n === i} data-seen={seen.has(n)} />
        ))}
      </div>
    </div>
  )
}
