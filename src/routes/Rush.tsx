import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import type { Card } from '../lib/types'
import { sample, shuffle } from '../lib/utils'
import { sfx } from '../lib/sound'
import { navigate, Empty } from '../components/ui'
import { StudyHead, Summary, useCardPool } from '../components/study'
import { IGame, IBolt } from '../components/Icons'

const ROUND_MS = 60_000
const PER_Q_MS = 8_000

interface Q { card: Card; options: string[] }

export default function Rush({ id }: { id: string }) {
  const set = useStore(s => s.sets.find(x => x.id === id))
  const settings = useStore(s => s.settings)
  const addScore = useStore(s => s.addScore)
  const scores = useStore(s => s.scores)
  const review = useStore(s => s.review)

  const [nonce, setNonce] = useState(0)
  const pool = useCardPool(set?.cards, nonce)

  const [q, setQ] = useState<Q | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [asked, setAsked] = useState(0)
  const [right, setRight] = useState(0)
  const [left, setLeft] = useState(ROUND_MS)
  const [qLeft, setQLeft] = useState(PER_Q_MS)
  const [over, setOver] = useState(false)
  const deck = useRef<Card[]>([])
  const settled = useRef(false)

  const best = useMemo(() => {
    const mine = scores.filter(s => s.setId === id && s.game === 'rush')
    return mine.length ? Math.max(...mine.map(s => s.value)) : null
  }, [scores, id])

  const nextQ = () => {
    if (!deck.current.length) deck.current = shuffle(pool)
    const card = deck.current.pop()!
    const distractors = sample(pool.filter(c => c.id !== card.id && c.def !== card.def), 3).map(c => c.def)
    settled.current = false
    setQ({ card, options: shuffle([card.def, ...distractors]) })
    setPicked(null)
    setQLeft(PER_Q_MS)
  }

  useEffect(() => {
    if (pool.length < 4) return
    deck.current = shuffle(pool)
    setScore(0); setStreak(0); setBestStreak(0); setAsked(0); setRight(0)
    setLeft(ROUND_MS); setOver(false)
    nextQ()
  }, [pool]) // eslint-disable-line react-hooks/exhaustive-deps

  // Round clock. Updaters stay pure — React re-invokes them, so a setState
  // or store write in here would fire more than once per tick.
  useEffect(() => {
    if (over || !q) return
    const t = setInterval(() => setLeft(v => Math.max(0, v - 100)), 100)
    return () => clearInterval(t)
  }, [over, q])

  useEffect(() => { if (left <= 0) setOver(true) }, [left])

  // Per-question clock.
  useEffect(() => {
    if (over || !q || picked !== null) return
    const t = setInterval(() => setQLeft(v => Math.max(0, v - 100)), 100)
    return () => clearInterval(t)
  }, [over, q, picked])

  // Running out of time counts as a miss.
  useEffect(() => {
    if (qLeft <= 0 && q && picked === null && !over) answer(null)
  }, [qLeft, q, picked, over]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (over && asked > 0) {
      addScore(id, 'rush', score)
      if (settings.soundEnabled) sfx.lose()
    }
  }, [over]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!set) {
    return <div className="wrap"><Empty icon={<IGame size={22} />} title="Set not found" body=""
      action={<button className="btn" onClick={() => navigate('/')}>Home</button>} /></div>
  }
  if (pool.length < 4) {
    return <div className="wrap"><Empty icon={<IGame size={22} />} title="Need more cards"
      body="Quiz Rush needs at least four complete cards to build wrong answers."
      action={<button className="btn" onClick={() => navigate(`/set/${set.id}/edit`)}>Add cards</button>} /></div>
  }

  const answer = (opt: string | null) => {
    if (!q || settled.current || over) return
    settled.current = true
    setPicked(opt ?? '')
    setAsked(n => n + 1)
    const ok = opt === q.card.def

    if (ok) {
      const bonus = Math.round((qLeft / PER_Q_MS) * 50)   // faster is worth more
      const chain = Math.min(5, 1 + Math.floor(streak / 3)) // streak multiplier, capped
      setScore(s => s + (50 + bonus) * chain)
      setRight(n => n + 1)
      setStreak(s => { const n = s + 1; setBestStreak(b => Math.max(b, n)); return n })
      if (settings.soundEnabled) sfx.right()
      review(set.id, q.card.id, 'good')
    } else {
      setStreak(0)
      if (settings.soundEnabled) sfx.wrong()
      review(set.id, q.card.id, 'again')
    }

    setTimeout(() => { if (!over) nextQ() }, ok ? 380 : 900)
  }

  if (over) {
    return (
      <div className="study-shell">
        <StudyHead title={set.title} subtitle="Quiz Rush" value={asked} max={asked || 1} setId={set.id} />
        <div className="study-body">
          <Summary
            title={best !== null && score > best ? 'New high score' : "Time's up"}
            lines={[
              { label: 'Score', value: score, tone: 'var(--accent)' },
              { label: 'Correct', value: `${right} / ${asked}` },
              { label: 'Best streak', value: bestStreak, tone: bestStreak >= 5 ? 'var(--amber)' : undefined },
            ]}
            setId={set.id}
            onAgain={() => setNonce(n => n + 1)}
            againLabel="Play again"
          />
          {best !== null && <div className="hint ta-c mt16">Best for this set: {best}</div>}
        </div>
      </div>
    )
  }

  const secs = Math.ceil(left / 1000)

  return (
    <div className="study-shell">
      <StudyHead
        title={set.title} subtitle="Quiz Rush"
        value={asked} max={asked + 1} setId={set.id}
        right={
          <div className="row g8">
            {streak >= 3 && (
              <span className="badge badge-amber row g4">
                <IBolt size={11} /> {streak}× streak
              </span>
            )}
            <span className="badge badge-accent num">{score}</span>
            <span className={secs <= 10 ? 'badge badge-red num' : 'badge num'}>{secs}s</span>
          </div>
        }
      />
      <div className="study-body">
        <div className="study-center">
          <div className="bar mb24">
            <i style={{
              width: `${(qLeft / PER_Q_MS) * 100}%`,
              background: qLeft < 2500 ? 'var(--red)' : 'var(--accent)',
              transition: 'width .1s linear',
            }} />
          </div>

          {q && (
            <>
              <div className="card card-pad mb24 ta-c" style={{ padding: '32px 26px' }}>
                <div className="display" style={{ fontSize: 'clamp(24px, 3.4vw, 34px)' }}>
                  {q.card.term}
                </div>
              </div>

              <div className="col g8">
                {q.options.map((opt, n) => {
                  let state: string | undefined
                  if (picked !== null) {
                    if (opt === q.card.def) state = 'correct'
                    else if (opt === picked) state = 'wrong'
                    else state = 'muted'
                  }
                  return (
                    <button key={opt} className="choice" data-state={state}
                            disabled={picked !== null} onClick={() => answer(opt)}>
                      <span className="choice-key">{n + 1}</span>
                      <span>{opt}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <div className="hint ta-c mt24">
            {right} correct · answer fast and keep a streak for more points
          </div>
        </div>
      </div>
    </div>
  )
}
