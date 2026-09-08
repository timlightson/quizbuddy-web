import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { buildQueue, gradeAnswer } from '../lib/srs'
import { shuffle, pct, plural } from '../lib/utils'
import { speak } from '../lib/tts'
import { sfx } from '../lib/sound'
import { navigate, Empty, Chip } from '../components/ui'
import { StudyHead, Summary, useSessionLog, useCardPool } from '../components/study'
import { IPen, ISpeaker, ICheck, IX } from '../components/Icons'

export default function Write({ id }: { id: string }) {
  const set = useStore(s => s.sets.find(x => x.id === id))
  const settings = useStore(s => s.settings)
  const review = useStore(s => s.review)
  const record = useSessionLog()

  const [scope, setScope] = useState<'due' | 'all'>('due')
  const [i, setI] = useState(0)
  const [typed, setTyped] = useState('')
  const [verdict, setVerdict] = useState<'correct' | 'close' | 'wrong' | null>(null)
  const [right, setRight] = useState(0)
  const [nonce, setNonce] = useState(0)
  const [askDef, setAskDef] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const pool = useCardPool(set?.cards, nonce)

  const queue = useMemo(() => {
    if (!pool.length) return []
    if (scope === 'all') return shuffle(pool)
    const due = buildQueue(pool, settings)
    return due.length ? due : shuffle(pool)
  }, [pool, scope, settings])

  const card = queue[i]

  useEffect(() => { if (!verdict) inputRef.current?.focus() }, [i, verdict])

  if (!set) {
    return <div className="wrap"><Empty icon={<IPen size={22} />} title="Set not found" body=""
      action={<button className="btn" onClick={() => navigate('/')}>Home</button>} /></div>
  }
  if (!pool.length) {
    return <div className="wrap"><Empty icon={<IPen size={22} />} title="No complete cards"
      body="Every card needs both a term and a definition."
      action={<button className="btn" onClick={() => navigate(`/set/${set.id}/edit`)}>Add cards</button>} /></div>
  }

  // Which side we show, and therefore which side they type.
  const prompt = askDef ? card?.def : card?.term
  const answer = askDef ? card?.term : card?.def

  const check = () => {
    if (!card || verdict) return
    const v = gradeAnswer(typed, answer!, settings.grading)
    setVerdict(v)
    const ok = v !== 'wrong'
    record(ok)
    if (ok) setRight(n => n + 1)
    if (settings.soundEnabled) (ok ? sfx.right : sfx.wrong)()
    review(set.id, card.id, v === 'correct' ? 'good' : v === 'close' ? 'hard' : 'again')
  }

  /** Grader was too strict — the user is the authority on their own answer. */
  const override = () => {
    if (!card) return
    setVerdict('correct')
    setRight(n => n + 1)
    review(set.id, card.id, 'good')
  }

  const next = () => { setVerdict(null); setTyped(''); setI(v => v + 1) }

  if (i >= queue.length) {
    return (
      <div className="study-shell">
        <StudyHead title={set.title} subtitle="Write" value={queue.length} max={queue.length} setId={set.id} />
        <div className="study-body">
          <Summary
            title={pct(right, queue.length) >= 80 ? 'Strong round' : 'Round finished'}
            lines={[
              { label: 'Correct', value: `${right} / ${queue.length}` },
              { label: 'Accuracy', value: `${pct(right, queue.length)}%`,
                tone: pct(right, queue.length) >= 80 ? 'var(--green)' : 'var(--amber)' },
              { label: 'Grading', value: settings.grading },
            ]}
            setId={set.id}
            onAgain={() => { setI(0); setRight(0); setNonce(n => n + 1); setVerdict(null); setTyped('') }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="study-shell">
      <StudyHead title={set.title} subtitle="Write" value={i} max={queue.length} setId={set.id} />
      <div className="study-body">
        <div className="study-center">
          <div className="row g6 mb16" style={{ justifyContent: 'center' }}>
            <Chip on={scope === 'due'} onClick={() => { setScope('due'); setI(0) }}>Due first</Chip>
            <Chip on={scope === 'all'} onClick={() => { setScope('all'); setI(0) }}>All cards</Chip>
            <Chip on={askDef} onClick={() => { setAskDef(v => !v); setI(0); setVerdict(null); setTyped('') }}>
              {askDef ? 'Type the term' : 'Type the definition'}
            </Chip>
          </div>

          <div className="eyebrow mb12">{askDef ? 'Definition' : 'Term'}</div>
          <div className="card card-pad mb24" style={{ padding: '30px 26px' }}>
            <div className="row-between">
              <div className="display" style={{ fontSize: 'clamp(20px, 2.8vw, 28px)' }}>{prompt}</div>
              {settings.ttsEnabled && (
                <button className="btn btn-ghost btn-icon" aria-label="Speak"
                        onClick={() => speak(prompt!, askDef ? set.defLang : set.termLang, settings.ttsRate)}>
                  <ISpeaker size={16} />
                </button>
              )}
            </div>
          </div>

          <input
            ref={inputRef} className="input input-lg" value={typed} disabled={!!verdict}
            placeholder={askDef ? 'What term is this?' : 'What does it mean?'}
            onChange={e => setTyped(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') verdict ? next() : check() }}
          />

          {!verdict ? (
            <div className="row g8 mt12">
              <button className="btn btn-accent btn-lg grow" onClick={check} disabled={!typed.trim()}>
                Check
              </button>
              <button className="btn btn-lg" onClick={() => {
                setVerdict('wrong'); record(false)
                if (card) review(set.id, card.id, 'again')
              }}>
                Skip
              </button>
            </div>
          ) : (
            <div className="mt16 fade-in">
              <div className="card card-pad" style={{
                borderColor: verdict === 'wrong' ? 'var(--red-line)' : 'var(--green-line)',
                background: verdict === 'wrong' ? 'var(--red-soft)' : 'var(--green-soft)',
              }}>
                <div className="row g10 mb8">
                  {verdict === 'wrong'
                    ? <IX size={17} style={{ color: 'var(--red)' }} />
                    : <ICheck size={17} style={{ color: 'var(--green)' }} />}
                  <span className="h3" style={{ color: verdict === 'wrong' ? 'var(--red)' : 'var(--green)' }}>
                    {verdict === 'correct' ? 'Correct'
                      : verdict === 'close' ? 'Close enough' : 'Not quite'}
                  </span>
                </div>
                {verdict !== 'correct' && (
                  <div className="fs14 mb4"><span className="muted">Answer: </span>{answer}</div>
                )}
                {verdict === 'close' && typed.trim() && (
                  <div className="hint">You wrote "{typed.trim()}" — spelling counts on a test, so note the difference.</div>
                )}
              </div>

              <div className="row g8 mt12">
                <button className="btn btn-primary btn-lg grow" onClick={next} autoFocus>Continue</button>
                {verdict === 'wrong' && (
                  <button className="btn btn-lg" onClick={override} title="Count this as correct">
                    I was right
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="hint ta-c mt24">
            {plural(queue.length - i, 'card')} left · {pct(right, i || 1)}% so far
          </div>
        </div>
      </div>
    </div>
  )
}
