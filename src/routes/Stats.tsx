import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { masteryOf, isLeech, MASTERY_LABEL, MASTERY_VAR } from '../lib/srs'
import { dayKey, addDays, fmtDuration, pct, plural, relTime } from '../lib/utils'
import { MasteryBar, Stat, Empty, navigate } from '../components/ui'
import { IChart, IFlame, IClock, ITarget } from '../components/Icons'
import { useStreak } from '../App'

const WEEKS = 26

export default function Stats() {
  const sets = useStore(s => s.sets)
  const days = useStore(s => s.days)
  const tests = useStore(s => s.tests)
  const scores = useStore(s => s.scores)
  const goal = useStore(s => s.settings.dailyGoal)
  const streak = useStreak()

  const allCards = useMemo(() => sets.flatMap(s => s.cards), [sets])

  const counts = useMemo(() => {
    const c = [0, 0, 0, 0, 0]
    for (const card of allCards) c[masteryOf(card)] += 1
    return c
  }, [allCards])

  const totals = useMemo(() => {
    let reviews = 0, correct = 0, ms = 0
    for (const d of Object.values(days)) { reviews += d.reviews; correct += d.correct; ms += d.ms }
    return { reviews, correct, ms }
  }, [days])

  // Calendar grid, Sunday-first columns, oldest week on the left.
  const grid = useMemo(() => {
    const today = new Date()
    const end = addDays(today, 6 - today.getDay()) // pad to end of this week
    const cells: { key: string; date: Date; n: number }[] = []
    for (let i = WEEKS * 7 - 1; i >= 0; i--) {
      const date = addDays(end, -i)
      const key = dayKey(date)
      cells.push({ key, date, n: days[key]?.reviews ?? 0 })
    }
    return cells
  }, [days])

  const peak = Math.max(1, ...grid.map(c => c.n))
  const level = (n: number) =>
    n === 0 ? 0 : n >= peak * 0.75 ? 4 : n >= peak * 0.5 ? 3 : n >= peak * 0.25 ? 2 : 1

  const leeches = useMemo(
    () => sets.flatMap(s => s.cards.filter(isLeech).map(c => ({ set: s, card: c }))),
    [sets],
  )

  const activeDays = Object.values(days).filter(d => d.reviews > 0).length

  if (allCards.length === 0) {
    return (
      <div className="wrap">
        <Empty icon={<IChart size={22} />} title="No data yet"
               body="Study something and your progress shows up here — streaks, accuracy, and which cards keep tripping you up."
               action={<button className="btn btn-accent" onClick={() => navigate('/')}>Go to your sets</button>} />
      </div>
    )
  }

  return (
    <div className="wrap wrap-wide">
      <div className="h1 mb4">Progress</div>
      <div className="body-lg mb24">
        {totals.reviews.toLocaleString()} reviews across {plural(activeDays, 'day')} of studying.
      </div>

      <div className="grid4 g12 mb32">
        <Stat value={<span className="row g6">{streak}<IFlame size={19} /></span>}
              label="Day streak" tone={streak > 0 ? 'var(--amber)' : undefined} />
        <Stat value={`${pct(totals.correct, totals.reviews)}%`} label="Lifetime accuracy"
              tone={pct(totals.correct, totals.reviews) >= 80 ? 'var(--green)' : undefined} />
        <Stat value={fmtDuration(totals.ms)} label="Time studied" />
        <Stat value={counts[3] + counts[4]} label={`Cards strong of ${allCards.length}`} />
      </div>

      <div className="card card-pad mb32">
        <div className="row-between mb16 wrap-flex">
          <div>
            <div className="h3">Activity</div>
            <div className="hint mt4">Last {WEEKS} weeks · darker means more reviews</div>
          </div>
          <div className="row g6 fs12 muted">
            less
            {[0, 1, 2, 3, 4].map(l => <i key={l} className="heat-cell" data-lv={l} />)}
            more
          </div>
        </div>
        <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
          <div className="heat">
            {grid.map(c => (
              <div key={c.key} className="heat-cell" data-lv={level(c.n)}
                   title={`${c.key} — ${plural(c.n, 'review')}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid2 g16 mb32">
        <div className="card card-pad">
          <div className="h3 mb12">Mastery across all sets</div>
          <MasteryBar counts={counts} />
          <div className="col g8 mt16">
            {MASTERY_LABEL.map((label, i) => (
              <div key={label} className="row-between fs14">
                <span className="row g8">
                  <i className="mdot" style={{ background: `var(${MASTERY_VAR[i]})` }} />
                  {label}
                </span>
                <span className="num muted">{counts[i]} · {pct(counts[i], allCards.length)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad">
          <div className="h3 mb12">Recent tests</div>
          {tests.length === 0 ? (
            <div className="hint">No tests taken yet.</div>
          ) : (
            <div className="col g10">
              {tests.slice(0, 7).map(t => {
                const s = sets.find(x => x.id === t.setId)
                const p = pct(t.score, t.total)
                return (
                  <div key={t.id} className="row-between fs14">
                    <span className="trunc grow">{s?.title ?? 'Deleted set'}</span>
                    <span className="row g10 nowrap">
                      <span className="dim fs12">{relTime(t.at)}</span>
                      <span className="badge num" style={{
                        background: p >= 80 ? 'var(--green-soft)' : p >= 60 ? 'var(--amber-soft)' : 'var(--red-soft)',
                        color: p >= 80 ? 'var(--green)' : p >= 60 ? 'var(--amber)' : 'var(--red)',
                      }}>{p}%</span>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid2 g16 mb32">
        <div className="card card-pad">
          <div className="h3 mb12 row g8"><ITarget size={16} /> Cards that keep slipping</div>
          {leeches.length === 0 ? (
            <div className="hint">
              Nothing yet. A card lands here after you forget it five or more times.
            </div>
          ) : (
            <div className="col g10">
              {leeches.slice(0, 8).map(({ set, card }) => (
                <div key={card.id} className="row-between fs14">
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="fw6 trunc">{card.term}</div>
                    <div className="dim fs12 trunc">{set.title}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm nowrap"
                          onClick={() => navigate(`/set/${set.id}/edit`)}>
                    {card.lapses} lapses · fix
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div className="h3 mb12">Game bests</div>
          {scores.length === 0 ? (
            <div className="hint">No games played yet.</div>
          ) : (
            <div className="col g10">
              {sets.map(s => {
                const mine = scores.filter(x => x.setId === s.id)
                if (!mine.length) return null
                const match = mine.filter(x => x.game === 'match').map(x => x.value)
                const meteor = mine.filter(x => x.game === 'meteor').map(x => x.value)
                const rush = mine.filter(x => x.game === 'rush').map(x => x.value)
                return (
                  <div key={s.id}>
                    <div className="fw6 fs14 trunc mb4">{s.title}</div>
                    <div className="row g8 wrap-flex">
                      {match.length > 0 && <span className="badge">Match {Math.min(...match)}s</span>}
                      {meteor.length > 0 && <span className="badge">Meteor {Math.max(...meteor)}</span>}
                      {rush.length > 0 && <span className="badge">Rush {Math.max(...rush)}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card card-pad">
        <div className="h3 mb12 row g8"><IClock size={16} /> Last two weeks</div>
        <div className="col g6">
          {Array.from({ length: 14 }, (_, i) => {
            const d = addDays(new Date(), -13 + i)
            const log = days[dayKey(d)] ?? { reviews: 0, correct: 0, ms: 0 }
            const hit = log.reviews >= goal
            return (
              <div key={i} className="row g12 fs13">
                <span className="dim num" style={{ minWidth: 54 }}>
                  {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                <div className="bar grow">
                  <i style={{
                    width: `${Math.min(100, (log.reviews / Math.max(goal, 1)) * 100)}%`,
                    background: hit ? 'var(--green)' : 'var(--accent)',
                  }} />
                </div>
                <span className="num muted" style={{ minWidth: 76, textAlign: 'right' }}>
                  {log.reviews > 0 ? `${log.reviews} · ${pct(log.correct, log.reviews)}%` : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
