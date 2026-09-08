import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import type { Card } from '../lib/types'
import { gradeAnswer } from '../lib/srs'
import { shuffle, plural } from '../lib/utils'
import { sfx } from '../lib/sound'
import { navigate, Empty } from '../components/ui'
import { StudyHead, Summary, useCardPool } from '../components/study'
import { IGame } from '../components/Icons'

interface Rock { id: number; card: Card; x: number; y: number; speed: number }

const TICK = 50          // ms per frame
const FLOOR = 92         // % of field height where a rock is lost
const LIVES = 3

export default function Meteor({ id }: { id: string }) {
  const set = useStore(s => s.sets.find(x => x.id === id))
  const settings = useStore(s => s.settings)
  const addScore = useStore(s => s.addScore)
  const scores = useStore(s => s.scores)
  const review = useStore(s => s.review)

  const [nonce, setNonce] = useState(0)
  const pool = useCardPool(set?.cards, nonce)

  const [rocks, setRocks] = useState<Rock[]>([])
  const [typed, setTyped] = useState('')
  const [lives, setLives] = useState(LIVES)
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [hits, setHits] = useState(0)
  const [over, setOver] = useState(false)
  const nextId = useRef(0)
  const deck = useRef<Card[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const best = useMemo(() => {
    const mine = scores.filter(s => s.setId === id && s.game === 'meteor')
    return mine.length ? Math.max(...mine.map(s => s.value)) : null
  }, [scores, id])

  // Reset for a fresh run.
  useEffect(() => {
    if (!pool.length) return
    deck.current = shuffle(pool)
    setRocks([]); setTyped(''); setLives(LIVES)
    setScore(0); setLevel(1); setHits(0); setOver(false)
    nextId.current = 0
    inputRef.current?.focus()
  }, [pool])

  const draw = (): Card => {
    if (!deck.current.length) deck.current = shuffle(pool)
    return deck.current.pop()!
  }

  // Fall. The updater is kept pure — React re-invokes updaters, so spawning
  // or scoring in here would double-count.
  useEffect(() => {
    if (over || !pool.length) return
    const speedUp = 1 + (level - 1) * 0.22
    const t = setInterval(() => {
      setRocks(prev => prev.map(r => ({ ...r, y: r.y + r.speed * speedUp })))
    }, TICK)
    return () => clearInterval(t)
  }, [over, level, pool])

  // Spawn, keeping a couple of rocks in the air and more as levels climb.
  useEffect(() => {
    if (over || !pool.length) return
    const want = Math.min(4, 1 + Math.floor(level / 2))
    if (rocks.length >= want) return
    const t = setTimeout(() => {
      const rock: Rock = {
        id: nextId.current++,
        card: draw(),
        x: 12 + Math.random() * 76,
        y: 0,
        speed: 0.55 + Math.random() * 0.3,
      }
      setRocks(rs => (rs.length < want ? [...rs, rock] : rs))
    }, 500 + Math.random() * 800)
    return () => clearTimeout(t)
  }, [rocks.length, over, level, pool]) // eslint-disable-line react-hooks/exhaustive-deps

  // Anything that reaches the floor costs a life.
  useEffect(() => {
    if (over) return
    const landed = rocks.filter(r => r.y >= FLOOR)
    if (!landed.length) return
    setRocks(rs => rs.filter(r => r.y < FLOOR))
    setLives(l => Math.max(0, l - landed.length))
    if (settings.soundEnabled) sfx.wrong()
    if (set) for (const r of landed) review(set.id, r.card.id, 'again')
  }, [rocks]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (lives <= 0) setOver(true) }, [lives])

  if (!set) {
    return <div className="wrap"><Empty icon={<IGame size={22} />} title="Set not found" body=""
      action={<button className="btn" onClick={() => navigate('/')}>Home</button>} /></div>
  }
  if (pool.length < 2) {
    return <div className="wrap"><Empty icon={<IGame size={22} />} title="Need more cards"
      body="Meteor needs at least two complete cards."
      action={<button className="btn" onClick={() => navigate(`/set/${set.id}/edit`)}>Add cards</button>} /></div>
  }

  const fire = () => {
    if (!typed.trim() || over) return
    // Lowest rock first — that's the one about to land.
    const ordered = [...rocks].sort((a, b) => b.y - a.y)
    const hit = ordered.find(r => gradeAnswer(typed, r.card.def, settings.grading) !== 'wrong')

    if (hit) {
      if (settings.soundEnabled) sfx.right()
      setRocks(rs => rs.filter(r => r.id !== hit.id))
      // Higher rocks are worth more — you caught it early.
      setScore(s => s + Math.max(10, Math.round((FLOOR - hit.y) * 1.4)))
      setHits(h => {
        const n = h + 1
        if (n % 6 === 0) setLevel(l => l + 1)
        return n
      })
      review(set.id, hit.card.id, 'good')
      setTyped('')
    } else {
      if (settings.soundEnabled) sfx.tick()
      setTyped('')
    }
  }

  useEffect(() => {
    if (over && hits > 0) addScore(id, 'meteor', score)
    if (over && settings.soundEnabled) sfx.lose()
  }, [over]) // eslint-disable-line react-hooks/exhaustive-deps

  if (over) {
    return (
      <div className="study-shell">
        <StudyHead title={set.title} subtitle="Meteor" value={hits} max={hits || 1} setId={set.id} />
        <div className="study-body">
          <Summary
            title={best !== null && score > best ? 'New high score' : 'Game over'}
            lines={[
              { label: 'Score', value: score, tone: 'var(--accent)' },
              { label: 'Destroyed', value: hits },
              { label: 'Level reached', value: level },
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

  return (
    <div className="study-shell">
      <StudyHead
        title={set.title} subtitle="Meteor — type the definition before it lands"
        value={hits} max={hits + rocks.length || 1} setId={set.id}
        right={
          <div className="row g12">
            <span className="row g4">
              {Array.from({ length: LIVES }, (_, n) => (
                <i key={n} className="life" data-lost={n >= lives} />
              ))}
            </span>
            <span className="badge badge-accent num">{score}</span>
          </div>
        }
      />
      <div className="study-body">
        <div style={{ maxWidth: 820, margin: '0 auto', width: '100%' }}>
          <div className="row-between mb12">
            <span className="hint">Level {level}</span>
            {best !== null && <span className="hint">Best {best}</span>}
          </div>

          <div className="meteor-field">
            {rocks.map(r => (
              <div key={r.id} className="meteor"
                   data-near={r.y > FLOOR - 22}
                   style={{ left: `${r.x}%`, top: `${r.y}%` }}>
                {r.card.term}
              </div>
            ))}
            <div className="meteor-floor" />
            {rocks.length === 0 && (
              <div className="hint" style={{
                position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
              }}>
                Incoming…
              </div>
            )}
          </div>

          <input
            ref={inputRef} className="input input-lg mt16" autoFocus
            placeholder="Type the definition and hit enter…"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') fire() }}
          />
          <div className="hint ta-c mt8">
            {plural(rocks.length, 'term')} falling · catch them high for more points
          </div>
        </div>
      </div>
    </div>
  )
}
