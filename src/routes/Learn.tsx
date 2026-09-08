import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import type { Card } from '../lib/types'
import { buildQueue, gradeAnswer, masteryOf, MASTERY_LABEL } from '../lib/srs'
import { sample, shuffle, plural, pct } from '../lib/utils'
import { speak } from '../lib/tts'
import { sfx } from '../lib/sound'
import { explainMiss, hasKey, AIError } from '../lib/ai'
import { navigate, Empty, Spinner } from '../components/ui'
import { StudyHead, Summary, useSessionLog, useCardPool } from '../components/study'
import { IBrain, ISpeaker, ISpark, ICheck, IX } from '../components/Icons'

type Kind = 'choice' | 'written'
interface Q { card: Card; kind: Kind; options: string[] }

/** Cards the user barely knows get recognition; known cards get recall. */
function kindFor(c: Card): Kind {
  return masteryOf(c) <= 1 ? 'choice' : 'written'
}

function buildQ(card: Card, pool: Card[]): Q {
  const kind = kindFor(card)
  if (kind === 'written') return { card, kind, options: [] }
  const distractors = sample(
    pool.filter(c => c.id !== card.id && c.def.trim() && c.def !== card.def),
    3,
  ).map(c => c.def)
  return { card, kind, options: shuffle([card.def, ...distractors]) }
}

export default function Learn({ id }: { id: string }) {
  const set = useStore(s => s.sets.find(x => x.id === id))
  const settings = useStore(s => s.settings)
  const review = useStore(s => s.review)
  const record = useSessionLog()

  const [nonce, setNonce] = useState(0)
  const pool = useCardPool(set?.cards, nonce)

  const [queue, setQueue] = useState<Card[]>([])
  const [done, setDone] = useState(0)
  const [right, setRight] = useState(0)
  const [asked, setAsked] = useState(0)
  const [typed, setTyped] = useState('')
  const [verdict, setVerdict] = useState<'correct' | 'close' | 'wrong' | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [coach, setCoach] = useState('')
  const [coaching, setCoaching] = useState(false)
  const [finished, setFinished] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Seed the queue from each freshly dealt pool.
  useEffect(() => {
    if (pool.length) setQueue(buildQueue(pool, settings))
    // Settings changes mid-round shouldn't re-deal the queue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool])

  const target = queue[0]
  const q = useMemo(() => (target ? buildQ(target, pool) : null), [target, pool])

  useEffect(() => {
    if (q?.kind === 'written' && !verdict) inputRef.current?.focus()
  }, [q, verdict])

  if (!set) {
    return <div className="wrap"><Empty icon={<IBrain size={22} />} title="Set not found" body=""
      action={<button className="btn" onClick={() => navigate('/')}>Home</button>} /></div>
  }

  if (pool.length < 4) {
    return (
      <div className="wrap">
        <Empty icon={<IBrain size={22} />} title="Not enough cards yet"
               body="Learn mode needs at least 4 complete cards so it can build believable wrong answers."
               action={<button className="btn" onClick={() => navigate(`/set/${set.id}/edit`)}>Add cards</button>} />
      </div>
    )
  }

  const total = asked + queue.length

  const settle = (v: 'correct' | 'close' | 'wrong', card: Card) => {
    setVerdict(v)
    setAsked(n => n + 1)
    const ok = v !== 'wrong'
    record(ok)
    if (ok) {
      setRight(n => n + 1)
      if (settings.soundEnabled) sfx.right()
      review(set.id, card.id, v === 'correct' ? 'good' : 'hard')
      setDone(n => n + 1)
    } else {
      if (settings.soundEnabled) sfx.wrong()
      review(set.id, card.id, 'again')
    }
  }

  const next = () => {
    setVerdict(null); setTyped(''); setPicked(null); setCoach('')
    setQueue(qs => {
      const [head, ...rest] = qs
      // A missed card goes to the back of the line rather than out of the round.
      const requeue = verdict === 'wrong' && head ? [...rest, head] : rest
      if (requeue.length === 0) setFinished(true)
      return requeue
    })
  }

  const submitWritten = () => {
    if (!q || verdict) return
    settle(gradeAnswer(typed, q.card.def, settings.grading), q.card)
  }

  const pick = (opt: string) => {
    if (!q || verdict) return
    setPicked(opt)
    settle(opt === q.card.def ? 'correct' : 'wrong', q.card)
  }

  const askCoach = async () => {
    if (!q) return
    setCoaching(true)
    try {
      setCoach(await explainMiss(settings.apiKey, q.card.term, q.card.def, typed || picked || ''))
    } catch (e) {
      setCoach(e instanceof AIError ? e.message : 'Could not reach Claude.')
    } finally {
      setCoaching(false)
    }
  }

  if (finished || !q) {
    return (
      <div className="study-shell">
        <StudyHead title={set.title} subtitle="Learn" value={done} max={done || 1} setId={set.id} />
        <div className="study-body">
          <Summary
            title="Round complete"
            lines={[
              { label: 'Cards learned', value: done },
              { label: 'Accuracy', value: `${pct(right, asked)}%`,
                tone: pct(right, asked) >= 80 ? 'var(--green)' : undefined },
              { label: 'Questions asked', value: asked },
            ]}
            setId={set.id}
            onAgain={() => {
              setNonce(n => n + 1)
              setDone(0); setRight(0); setAsked(0); setFinished(false)
              setVerdict(null); setTyped(''); setPicked(null); setCoach('')
            }}
            againLabel="Another round"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="study-shell">
      <StudyHead
        title={set.title} subtitle="Learn"
        value={done} max={total || 1} setId={set.id}
        right={<span className="badge">{MASTERY_LABEL[masteryOf(q.card)]}</span>}
      />

      <div className="study-body">
        <div className="study-center">
          <div className="eyebrow mb12">
            {q.kind === 'choice' ? 'Pick the definition' : 'Type the definition'}
          </div>

          <div className="card card-pad mb24" style={{ padding: '28px 26px' }}>
            <div className="row-between">
              <div className="display" style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}>
                {q.card.term}
              </div>
              {settings.ttsEnabled && (
                <button className="btn btn-ghost btn-icon" aria-label="Speak"
                        onClick={() => speak(q.card.term, set.termLang, settings.ttsRate)}>
                  <ISpeaker size={16} />
                </button>
              )}
            </div>
            {q.card.hint && <div className="hint mt8">Hint: {q.card.hint}</div>}
          </div>

          {q.kind === 'choice' ? (
            <div className="col g8">
              {q.options.map((opt, n) => {
                let state: string | undefined
                if (verdict) {
                  if (opt === q.card.def) state = 'correct'
                  else if (opt === picked) state = 'wrong'
                  else state = 'muted'
                }
                return (
                  <button key={opt} className="choice" data-state={state}
                          disabled={!!verdict} onClick={() => pick(opt)}>
                    <span className="choice-key">{n + 1}</span>
                    <span>{opt}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div>
              <input
                ref={inputRef} className="input input-lg"
                placeholder="Type what it means…" value={typed}
                disabled={!!verdict}
                onChange={e => setTyped(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') verdict ? next() : submitWritten() }}
              />
              {!verdict && (
                <div className="row g8 mt12">
                  <button className="btn btn-accent btn-lg grow" onClick={submitWritten}
                          disabled={!typed.trim()}>
                    Check answer
                  </button>
                  <button className="btn btn-lg" onClick={() => settle('wrong', q.card)}>
                    I don't know
                  </button>
                </div>
              )}
            </div>
          )}

          {verdict && (
            <div className="mt24 fade-in">
              <div className="card card-pad" style={{
                borderColor: verdict === 'wrong' ? 'var(--red-line)' : 'var(--green-line)',
                background: verdict === 'wrong' ? 'var(--red-soft)' : 'var(--green-soft)',
              }}>
                <div className="row g10 mb8">
                  {verdict === 'wrong'
                    ? <IX size={17} style={{ color: 'var(--red)' }} />
                    : <ICheck size={17} style={{ color: 'var(--green)' }} />}
                  <span className="h3" style={{
                    color: verdict === 'wrong' ? 'var(--red)' : 'var(--green)',
                  }}>
                    {verdict === 'correct' ? 'Correct'
                      : verdict === 'close' ? 'Close enough — counted' : 'Not quite'}
                  </span>
                </div>
                {verdict !== 'correct' && (
                  <div className="fs14">
                    <span className="muted">Answer: </span>{q.card.def}
                  </div>
                )}
                {verdict === 'wrong' && (
                  <div className="hint mt8">This card comes back later in the round.</div>
                )}
              </div>

              {verdict === 'wrong' && hasKey(settings.apiKey) && (
                <div className="mt12">
                  {coach ? (
                    <div className="panel fs14" style={{ padding: 14 }}>{coach}</div>
                  ) : (
                    <button className="btn btn-sm" onClick={askCoach} disabled={coaching}>
                      {coaching ? <><Spinner /> Thinking…</> : <><ISpark size={14} /> Why did I miss this?</>}
                    </button>
                  )}
                </div>
              )}

              <button className="btn btn-primary btn-lg btn-block mt16" onClick={next} autoFocus>
                Continue
              </button>
            </div>
          )}

          <div className="hint ta-c mt24">
            {plural(queue.length, 'card')} left in this round · {pct(right, asked || 1)}% correct
          </div>
        </div>
      </div>
    </div>
  )
}
