import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import type { Card } from '../lib/types'
import { gradeAnswer } from '../lib/srs'
import { sample, shuffle, pct, plural, fmtDuration } from '../lib/utils'
import { navigate, Empty, Chip, Modal } from '../components/ui'
import { StudyHead, useSessionLog } from '../components/study'
import { IList, ICheck, IX } from '../components/Icons'

type QType = 'choice' | 'truefalse' | 'written' | 'match'

interface Choice   { type: 'choice';    card: Card; options: string[] }
interface TrueF    { type: 'truefalse'; card: Card; shown: string; isTrue: boolean }
interface Written  { type: 'written';   card: Card }
interface Matching { type: 'match';     cards: Card[]; defs: string[] }
type Question = Choice | TrueF | Written | Matching

type Answer = string | Record<string, string> | null

const ALL_TYPES: { key: QType; label: string }[] = [
  { key: 'choice', label: 'Multiple choice' },
  { key: 'truefalse', label: 'True / false' },
  { key: 'written', label: 'Written' },
  { key: 'match', label: 'Matching' },
]

function build(pool: Card[], count: number, types: QType[]): Question[] {
  const picks = sample(pool, Math.min(count, pool.length))
  const out: Question[] = []
  const usable = types.length ? types : (['choice'] as QType[])

  for (const card of picks) {
    // Matching is handled as one grouped question at the end.
    const t = usable.filter(x => x !== 'match')[Math.floor(Math.random() * Math.max(1, usable.filter(x => x !== 'match').length))]
    if (!t) break

    if (t === 'choice') {
      const distractors = sample(pool.filter(c => c.id !== card.id && c.def !== card.def), 3).map(c => c.def)
      if (distractors.length < 2) { out.push({ type: 'written', card }); continue }
      out.push({ type: 'choice', card, options: shuffle([card.def, ...distractors]) })
    } else if (t === 'truefalse') {
      const lie = sample(pool.filter(c => c.id !== card.id && c.def !== card.def), 1)[0]
      const isTrue = !lie || Math.random() < 0.5
      out.push({ type: 'truefalse', card, shown: isTrue ? card.def : lie.def, isTrue })
    } else {
      out.push({ type: 'written', card })
    }
  }

  if (usable.includes('match') && pool.length >= 4) {
    const group = sample(pool, Math.min(5, pool.length))
    out.push({ type: 'match', cards: group, defs: shuffle(group.map(c => c.def)) })
  }

  return shuffle(out)
}

function isRight(q: Question, a: Answer, mode: 'strict' | 'normal' | 'lenient'): boolean {
  if (a === null) return false
  if (q.type === 'choice') return a === q.card.def
  if (q.type === 'truefalse') return a === String(q.isTrue)
  if (q.type === 'written') return gradeAnswer(a as string, q.card.def, mode) !== 'wrong'
  const map = a as Record<string, string>
  return q.cards.every(c => map[c.id] === c.def)
}

export default function TestMode({ id }: { id: string }) {
  const set = useStore(s => s.sets.find(x => x.id === id))
  const settings = useStore(s => s.settings)
  const addTest = useStore(s => s.addTest)
  const review = useStore(s => s.review)
  const record = useSessionLog()

  const pool = useMemo(
    () => (set?.cards ?? []).filter(c => c.term.trim() && c.def.trim()),
    [set?.cards],
  )

  const [setup, setSetup] = useState(true)
  const [count, setCount] = useState(10)
  const [types, setTypes] = useState<QType[]>(['choice', 'truefalse', 'written'])
  const [qs, setQs] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [graded, setGraded] = useState(false)
  const [began, setBegan] = useState(0)
  const [took, setTook] = useState(0)
  const [review0, setReview0] = useState(false)

  if (!set) {
    return <div className="wrap"><Empty icon={<IList size={22} />} title="Set not found" body=""
      action={<button className="btn" onClick={() => navigate('/')}>Home</button>} /></div>
  }
  if (pool.length < 2) {
    return <div className="wrap"><Empty icon={<IList size={22} />} title="Not enough cards"
      body="A test needs at least two complete cards."
      action={<button className="btn" onClick={() => navigate(`/set/${set.id}/edit`)}>Add cards</button>} /></div>
  }

  const start = () => {
    const built = build(pool, count, types)
    setQs(built)
    setAnswers(built.map(q => (q.type === 'match' ? {} : null)))
    setGraded(false)
    setSetup(false)
    setBegan(Date.now())
  }

  const submit = () => {
    const ms = Date.now() - began
    setTook(ms)
    setGraded(true)
    let score = 0
    qs.forEach((q, n) => {
      const ok = isRight(q, answers[n], settings.grading)
      if (ok) score += 1
      const cards = q.type === 'match' ? q.cards : [q.card]
      for (const c of cards) {
        record(ok)
        review(set.id, c.id, ok ? 'good' : 'again')
      }
    })
    addTest({ setId: set.id, score, total: qs.length, durationMs: ms })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const setAnswer = (n: number, v: Answer) =>
    setAnswers(a => a.map((x, k) => (k === n ? v : x)))

  const score = graded ? qs.filter((q, n) => isRight(q, answers[n], settings.grading)).length : 0
  const answered = answers.filter((a, n) =>
    qs[n]?.type === 'match'
      ? Object.keys((a as Record<string, string>) ?? {}).length === (qs[n] as Matching).cards.length
      : a !== null).length

  if (setup) {
    return (
      <Modal
        title="Set up your test"
        sub={`Drawing from ${plural(pool.length, 'card')} in ${set.title}.`}
        onClose={() => navigate(`/set/${set.id}`)}
        footer={
          <>
            <button className="btn" onClick={() => navigate(`/set/${set.id}`)}>Cancel</button>
            <button className="btn btn-accent" onClick={start} disabled={!types.length}>
              Start test
            </button>
          </>
        }
      >
        <div className="field mb20">
          <label className="label">Questions</label>
          <input className="input num" type="number" min={1} max={pool.length}
                 value={count}
                 onChange={e => setCount(Math.max(1, Math.min(pool.length, +e.target.value || 10)))} />
          <div className="hint">Up to {pool.length} available.</div>
        </div>
        <div className="field">
          <label className="label">Question types</label>
          <div className="row g8 wrap-flex mt4">
            {ALL_TYPES.map(t => (
              <Chip key={t.key} on={types.includes(t.key)}
                    onClick={() => setTypes(v =>
                      v.includes(t.key) ? v.filter(x => x !== t.key) : [...v, t.key])}>
                {t.label}
              </Chip>
            ))}
          </div>
          {!types.length && <div className="hint" style={{ color: 'var(--red)' }}>Pick at least one.</div>}
          {types.includes('match') && (
            <div className="hint mt8">Matching is added as one grouped question of up to five pairs.</div>
          )}
        </div>
      </Modal>
    )
  }

  const wrong = qs.filter((q, n) => !isRight(q, answers[n], settings.grading))

  return (
    <div className="study-shell">
      <StudyHead
        title={set.title}
        subtitle={graded ? 'Test results' : 'Test'}
        value={graded ? qs.length : answered} max={qs.length} setId={set.id}
      />

      <div className="study-body">
        <div className="study-center">
          {graded && (
            <div className="card card-pad mb32 ta-c rise-in" style={{ padding: 32 }}>
              <div className="eyebrow mb8">Your score</div>
              <div className="h1" style={{
                fontSize: 52,
                color: pct(score, qs.length) >= 80 ? 'var(--green)'
                  : pct(score, qs.length) >= 60 ? 'var(--amber)' : 'var(--red)',
              }}>
                {pct(score, qs.length)}%
              </div>
              <div className="body-lg mt8">
                {score} of {qs.length} correct · {fmtDuration(took)}
              </div>
              <div className="row g8 mt24" style={{ justifyContent: 'center' }}>
                <button className="btn btn-lg" onClick={() => navigate(`/set/${set.id}`)}>Back to set</button>
                {wrong.length > 0 && (
                  <button className="btn btn-lg" onClick={() => setReview0(v => !v)}>
                    {review0 ? 'Hide' : 'Review'} {plural(wrong.length, 'miss', 'es')}
                  </button>
                )}
                <button className="btn btn-accent btn-lg" onClick={() => setSetup(true)}>New test</button>
              </div>
            </div>
          )}

          {graded && review0 && (
            <div className="card card-pad mb32">
              <div className="h3 mb12">What you missed</div>
              <div className="col g12">
                {wrong.map((q, n) => (
                  <div key={n} className="fs14">
                    {q.type === 'match' ? (
                      <div>
                        <div className="fw6 mb4">Matching set</div>
                        {q.cards.map(c => (
                          <div key={c.id} className="muted">{c.term} → {c.def}</div>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <div className="fw6">{q.card.term}</div>
                        <div className="muted">{q.card.def}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="col g16">
            {qs.map((q, n) => {
              const a = answers[n]
              const ok = graded && isRight(q, a, settings.grading)
              return (
                <div key={n} className="card card-pad" style={graded ? {
                  borderColor: ok ? 'var(--green-line)' : 'var(--red-line)',
                } : undefined}>
                  <div className="row-between mb12">
                    <span className="eyebrow">
                      Question {n + 1} · {q.type === 'truefalse' ? 'True or false'
                        : q.type === 'choice' ? 'Multiple choice'
                        : q.type === 'match' ? 'Matching' : 'Written'}
                    </span>
                    {graded && (ok
                      ? <ICheck size={17} style={{ color: 'var(--green)' }} />
                      : <IX size={17} style={{ color: 'var(--red)' }} />)}
                  </div>

                  {q.type === 'choice' && (
                    <>
                      <div className="h2 mb16">{q.card.term}</div>
                      <div className="col g8">
                        {q.options.map((opt, k) => {
                          let state: string | undefined
                          if (graded) {
                            if (opt === q.card.def) state = 'correct'
                            else if (opt === a) state = 'wrong'
                            else state = 'muted'
                          }
                          return (
                            <button key={opt} className="choice" data-state={state}
                                    disabled={graded}
                                    style={!graded && a === opt
                                      ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' }
                                      : undefined}
                                    onClick={() => setAnswer(n, opt)}>
                              <span className="choice-key">{String.fromCharCode(65 + k)}</span>
                              <span>{opt}</span>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {q.type === 'truefalse' && (
                    <>
                      <div className="body-lg mb4"><b>{q.card.term}</b></div>
                      <div className="body-lg mb16">means: <i>{q.shown}</i></div>
                      <div className="row g8">
                        {['true', 'false'].map(v => {
                          let state: string | undefined
                          if (graded) {
                            if (v === String(q.isTrue)) state = 'correct'
                            else if (v === a) state = 'wrong'
                            else state = 'muted'
                          }
                          return (
                            <button key={v} className="choice grow" data-state={state} disabled={graded}
                                    style={!graded && a === v
                                      ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' }
                                      : undefined}
                                    onClick={() => setAnswer(n, v)}>
                              <span className="choice-key">{v === 'true' ? 'T' : 'F'}</span>
                              <span style={{ textTransform: 'capitalize' }}>{v}</span>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {q.type === 'written' && (
                    <>
                      <div className="h2 mb16">{q.card.term}</div>
                      <input className="input input-lg" disabled={graded}
                             placeholder="Your answer…"
                             value={(a as string) ?? ''}
                             onChange={e => setAnswer(n, e.target.value)} />
                      {graded && !ok && (
                        <div className="hint mt8">
                          <span className="muted">Expected: </span>{q.card.def}
                        </div>
                      )}
                    </>
                  )}

                  {q.type === 'match' && (
                    <div className="col g8">
                      <div className="hint mb4">Pick the definition for each term.</div>
                      {q.cards.map(c => {
                        const map = (a as Record<string, string>) ?? {}
                        const chosen = map[c.id] ?? ''
                        const cok = chosen === c.def
                        return (
                          <div key={c.id} className="row g12 wrap-flex">
                            <span className="fw6" style={{ minWidth: 130 }}>{c.term}</span>
                            <select
                              className="select grow" value={chosen} disabled={graded}
                              style={graded ? {
                                borderColor: cok ? 'var(--green)' : 'var(--red)',
                                background: cok ? 'var(--green-soft)' : 'var(--red-soft)',
                              } : undefined}
                              onChange={e => setAnswer(n, { ...map, [c.id]: e.target.value })}
                            >
                              <option value="">— choose —</option>
                              {q.defs.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {!graded && (
            <div className="mt24">
              <button className="btn btn-accent btn-lg btn-block" onClick={submit}>
                Submit test ({answered} of {qs.length} answered)
              </button>
              {answered < qs.length && (
                <div className="hint ta-c mt8">Unanswered questions are marked wrong.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
