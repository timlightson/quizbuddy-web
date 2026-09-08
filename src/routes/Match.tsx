import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { sample, shuffle, fmtClock, plural } from '../lib/utils'
import { sfx } from '../lib/sound'
import { navigate, Empty } from '../components/ui'
import { StudyHead, Summary } from '../components/study'
import { IGame } from '../components/Icons'

interface Tile { key: string; cardId: string; text: string; side: 'term' | 'def' }
type State = 'idle' | 'sel' | 'hit' | 'miss' | 'gone'

const SIZE = 6 // pairs per board

export default function Match({ id }: { id: string }) {
  const set = useStore(s => s.sets.find(x => x.id === id))
  const soundOn = useStore(s => s.settings.soundEnabled)
  const addScore = useStore(s => s.addScore)
  const scores = useStore(s => s.scores)

  const pool = useMemo(
    () => (set?.cards ?? []).filter(c => c.term.trim() && c.def.trim()),
    [set?.cards],
  )

  const [nonce, setNonce] = useState(0)
  const [tiles, setTiles] = useState<Tile[]>([])
  const [states, setStates] = useState<Record<string, State>>({})
  const [picked, setPicked] = useState<Tile | null>(null)
  const [cleared, setCleared] = useState(0)
  const [misses, setMisses] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const startedAt = useRef(0)

  const best = useMemo(() => {
    const mine = scores.filter(s => s.setId === id && s.game === 'match')
    return mine.length ? Math.min(...mine.map(s => s.value)) : null
  }, [scores, id])

  // New board whenever the round restarts.
  useEffect(() => {
    if (pool.length < 3) return
    const picks = sample(pool, Math.min(SIZE, pool.length))
    const built: Tile[] = shuffle([
      ...picks.map(c => ({ key: `t-${c.id}`, cardId: c.id, text: c.term, side: 'term' as const })),
      ...picks.map(c => ({ key: `d-${c.id}`, cardId: c.id, text: c.def, side: 'def' as const })),
    ])
    setTiles(built)
    setStates({})
    setPicked(null)
    setCleared(0)
    setMisses(0)
    setElapsed(0)
    setRunning(true)
    startedAt.current = Date.now()
  }, [pool, nonce])

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setElapsed(Date.now() - startedAt.current), 79)
    return () => clearInterval(t)
  }, [running])

  const pairs = tiles.length / 2
  const finished = pairs > 0 && cleared === pairs

  useEffect(() => {
    if (!finished || !running) return
    const ms = Date.now() - startedAt.current
    setElapsed(ms)
    setRunning(false)
    // Misses cost two seconds each, so accuracy shows up in the time.
    addScore(id, 'match', Math.round(ms / 1000) + misses * 2)
    if (soundOn) sfx.win()
  }, [finished, running, addScore, id, misses, soundOn])

  if (!set) {
    return <div className="wrap"><Empty icon={<IGame size={22} />} title="Set not found" body=""
      action={<button className="btn" onClick={() => navigate('/')}>Home</button>} /></div>
  }
  if (pool.length < 3) {
    return <div className="wrap"><Empty icon={<IGame size={22} />} title="Need more cards"
      body="Match needs at least three complete cards."
      action={<button className="btn" onClick={() => navigate(`/set/${set.id}/edit`)}>Add cards</button>} /></div>
  }

  const tap = (t: Tile) => {
    const st = states[t.key]
    if (st === 'gone' || st === 'hit' || !running) return

    if (!picked) {
      setPicked(t)
      setStates(s => ({ ...s, [t.key]: 'sel' }))
      return
    }
    if (picked.key === t.key) {
      setPicked(null)
      setStates(s => ({ ...s, [t.key]: 'idle' }))
      return
    }

    const match = picked.cardId === t.cardId && picked.side !== t.side
    if (match) {
      if (soundOn) sfx.right()
      setStates(s => ({ ...s, [picked.key]: 'hit', [t.key]: 'hit' }))
      setCleared(n => n + 1)
      setPicked(null)
      setTimeout(() => setStates(s => ({ ...s, [picked.key]: 'gone', [t.key]: 'gone' })), 260)
    } else {
      if (soundOn) sfx.wrong()
      setMisses(n => n + 1)
      const a = picked.key, b = t.key
      setStates(s => ({ ...s, [a]: 'miss', [b]: 'miss' }))
      setPicked(null)
      setTimeout(() => setStates(s => ({ ...s, [a]: 'idle', [b]: 'idle' })), 420)
    }
  }

  if (finished) {
    const total = Math.round(elapsed / 1000) + misses * 2
    return (
      <div className="study-shell">
        <StudyHead title={set.title} subtitle="Match" value={pairs} max={pairs} setId={set.id} />
        <div className="study-body">
          <Summary
            title={best !== null && total <= best ? 'New best time' : 'Board cleared'}
            lines={[
              { label: 'Time', value: fmtClock(elapsed) },
              { label: 'Misses', value: misses, tone: misses === 0 ? 'var(--green)' : undefined },
              { label: 'Score', value: `${total}s`, tone: 'var(--accent)' },
            ]}
            setId={set.id}
            onAgain={() => setNonce(n => n + 1)}
            againLabel="Play again"
          />
          {best !== null && (
            <div className="hint ta-c mt16">
              Best for this set: {best}s{misses > 0 && ' · misses add two seconds each'}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="study-shell">
      <StudyHead
        title={set.title} subtitle="Match — pair every term with its definition"
        value={cleared} max={pairs} setId={set.id}
        right={<span className="badge badge-accent mono num">{fmtClock(elapsed)}</span>}
      />
      <div className="study-body">
        <div style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
          <div className="row-between mb16 wrap-flex">
            <span className="hint">{plural(pairs - cleared, 'pair')} left</span>
            <div className="row g12">
              {misses > 0 && <span className="badge badge-red">{misses} misses</span>}
              {best !== null && <span className="badge">Best {best}s</span>}
            </div>
          </div>
          <div className="match-grid">
            {tiles.map(t => (
              <button key={t.key} className="match-tile"
                      data-state={states[t.key] ?? 'idle'}
                      onClick={() => tap(t)}>
                {t.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
