import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { buildQueue, type Grade } from '../lib/srs'
import { speak } from '../lib/tts'
import { shuffle, plural } from '../lib/utils'
import { navigate, Empty, Chip } from '../components/ui'
import { StudyHead, Summary, useSessionLog, useCardPool } from '../components/study'
import { ICards, IStar, ISpeaker, IArrowL, IArrowR, IShuffle } from '../components/Icons'

const GRADES: { g: Grade; label: string; key: string; cls: string }[] = [
  { g: 'again', label: 'Again',  key: '1', cls: 'btn-danger' },
  { g: 'hard',  label: 'Hard',   key: '2', cls: '' },
  { g: 'good',  label: 'Good',   key: '3', cls: '' },
  { g: 'easy',  label: 'Easy',   key: '4', cls: '' },
]

export default function Flashcards({ id }: { id: string }) {
  const set = useStore(s => s.sets.find(x => x.id === id))
  const settings = useStore(s => s.settings)
  const review = useStore(s => s.review)
  const toggleStar = useStore(s => s.toggleStar)
  const record = useSessionLog()

  const [scope, setScope] = useState<'due' | 'all' | 'starred'>('due')
  const [flipped, setFlipped] = useState(false)
  const [i, setI] = useState(0)
  const [graded, setGraded] = useState(0)
  const [nonce, setNonce] = useState(0)
  const [flipFirst, setFlipFirst] = useState(settings.askWith === 'def')

  const pool = useCardPool(set?.cards, nonce)

  const queue = useMemo(() => {
    if (scope === 'starred') return shuffle(pool.filter(c => c.starred))
    if (scope === 'all') return shuffle(pool)
    const due = buildQueue(pool, settings)
    return due.length ? due : shuffle(pool)
  }, [pool, scope, settings])

  const card = queue[i]

  useEffect(() => { setFlipped(false) }, [i])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === ' ') { e.preventDefault(); setFlipped(f => !f); return }
      if (e.key === 'ArrowLeft') { setI(v => Math.max(0, v - 1)); return }
      if (e.key === 'ArrowRight') { setI(v => Math.min(queue.length, v + 1)); return }
      if (!flipped || !card || !set) return
      const g = GRADES.find(x => x.key === e.key)
      if (g) { e.preventDefault(); grade(g.g) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!set) {
    return <div className="wrap"><Empty icon={<ICards size={22} />} title="Set not found" body=""
      action={<button className="btn" onClick={() => navigate('/')}>Home</button>} /></div>
  }

  const grade = (g: Grade) => {
    if (!card) return
    review(set.id, card.id, g)
    record(g !== 'again')
    setGraded(n => n + 1)
    setI(v => v + 1)
  }

  if (queue.length === 0) {
    return (
      <div className="wrap">
        <Empty icon={<ICards size={22} />} title="No cards to show"
               body={scope === 'starred' ? 'Star some cards first.' : 'This set needs complete cards.'}
               action={<button className="btn" onClick={() => navigate(`/set/${set.id}`)}>Back to set</button>} />
      </div>
    )
  }

  if (i >= queue.length) {
    return (
      <div className="study-shell">
        <StudyHead title={set.title} subtitle="Flashcards" value={queue.length} max={queue.length} setId={set.id} />
        <div className="study-body">
          <Summary
            title="Deck finished"
            lines={[
              { label: 'Cards seen', value: queue.length },
              { label: 'Graded', value: graded },
              { label: 'Scope', value: scope === 'due' ? 'Due' : scope === 'all' ? 'All' : 'Starred' },
            ]}
            setId={set.id}
            onAgain={() => { setI(0); setGraded(0); setNonce(n => n + 1) }}
          />
        </div>
      </div>
    )
  }

  const front = flipFirst ? card.def : card.term
  const back = flipFirst ? card.term : card.def
  const frontLang = flipFirst ? set.defLang : set.termLang
  const backLang = flipFirst ? set.termLang : set.defLang

  return (
    <div className="study-shell">
      <StudyHead
        title={set.title} subtitle="Flashcards"
        value={i} max={queue.length} setId={set.id}
        right={
          <button className="btn btn-ghost btn-icon" title="Shuffle"
                  onClick={() => { setNonce(n => n + 1); setI(0) }}>
            <IShuffle size={16} />
          </button>
        }
      />

      <div className="study-body">
        <div className="study-center">
          <div className="row g6 mb16 wrap-flex" style={{ justifyContent: 'center' }}>
            <Chip on={scope === 'due'} onClick={() => { setScope('due'); setI(0) }}>Due first</Chip>
            <Chip on={scope === 'all'} onClick={() => { setScope('all'); setI(0) }}>All cards</Chip>
            <Chip on={scope === 'starred'} onClick={() => { setScope('starred'); setI(0) }}>Starred</Chip>
            <Chip on={flipFirst} onClick={() => setFlipFirst(v => !v)}>
              {flipFirst ? 'Definition first' : 'Term first'}
            </Chip>
          </div>

          <div className="flip-scene">
            <div className="flip-card" data-flipped={flipped} onClick={() => setFlipped(f => !f)}>
              <div className="flip-face">
                <span className="eyebrow flip-corner">{flipFirst ? 'Definition' : 'Term'}</span>
                <div className="flip-tools" onClick={e => e.stopPropagation()}>
                  {settings.ttsEnabled && (
                    <button className="btn btn-ghost btn-icon btn-sm" aria-label="Speak"
                            onClick={() => speak(front, frontLang, settings.ttsRate)}>
                      <ISpeaker size={15} />
                    </button>
                  )}
                  <button className="btn btn-ghost btn-icon btn-sm" aria-label="Star"
                          style={{ color: card.starred ? 'var(--amber)' : undefined }}
                          onClick={() => toggleStar(set.id, card.id)}>
                    <IStar size={15} filled={card.starred} />
                  </button>
                </div>
                <div className={front.length > 90 ? 'flip-text flip-text-sm' : 'flip-text'}>{front}</div>
                <div className="hint" style={{ position: 'absolute', bottom: 20 }}>
                  Click or press space to flip
                </div>
              </div>

              <div className="flip-face flip-back">
                <span className="eyebrow flip-corner">{flipFirst ? 'Term' : 'Definition'}</span>
                <div className="flip-tools" onClick={e => e.stopPropagation()}>
                  {settings.ttsEnabled && (
                    <button className="btn btn-ghost btn-icon btn-sm" aria-label="Speak"
                            onClick={() => speak(back, backLang, settings.ttsRate)}>
                      <ISpeaker size={15} />
                    </button>
                  )}
                </div>
                <div className={back.length > 90 ? 'flip-text flip-text-sm' : 'flip-text'}>{back}</div>
                {card.hint && <div className="hint mt16">Hint: {card.hint}</div>}
              </div>
            </div>
          </div>

          {flipped ? (
            <div className="mt24 fade-in">
              <div className="eyebrow ta-c mb8">How well did you know it?</div>
              <div className="grid4 g8">
                {GRADES.map(g => (
                  <button key={g.g} className={`btn btn-lg ${g.cls}`} onClick={() => grade(g.g)}>
                    {g.label} <span className="mono dim">{g.key}</span>
                  </button>
                ))}
              </div>
              <div className="hint ta-c mt8">
                "Again" brings it back in ten minutes. "Easy" pushes it furthest out.
              </div>
            </div>
          ) : (
            <div className="row g8 mt24" style={{ justifyContent: 'center' }}>
              <button className="btn" disabled={i === 0} onClick={() => setI(v => v - 1)}>
                <IArrowL size={15} /> Back
              </button>
              <button className="btn btn-primary btn-lg" onClick={() => setFlipped(true)}>
                Show answer
              </button>
              <button className="btn" onClick={() => setI(v => v + 1)}>
                Skip <IArrowR size={15} />
              </button>
            </div>
          )}

          <div className="hint ta-c mt16">
            {plural(queue.length - i, 'card')} left
          </div>
        </div>
      </div>
    </div>
  )
}
