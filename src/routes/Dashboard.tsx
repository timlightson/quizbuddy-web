import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { dueCount, masteryOf, newCount } from '../lib/srs'
import { dayKey, plural, pct, relTime } from '../lib/utils'
import { gradient, initials } from '../lib/gradients'
import { navigate, Bar, MasteryBar, Empty } from '../components/ui'
import {
  ICards, IPlus, IFlame, IBolt, IClock, IUpload, ISpark, IList, IGame, ITarget, IChevR,
} from '../components/Icons'
import { useStreak, useLevel } from '../App'

const ACTIONS = [
  {
    name: 'Upload a file', icon: IUpload, color: 'linear-gradient(140deg,#7c6cf0,#4aa8ff)',
    desc: 'Turn a PDF, doc, or photo of your notes into a deck.', cta: 'Upload', to: '/create',
  },
  {
    name: 'Build with AI', icon: ISpark, color: 'linear-gradient(140deg,#2fe0b0,#4aa8ff)',
    desc: 'Chat your way to the deck you want, then edit it.', cta: 'Create', to: '/create',
  },
  {
    name: 'Flashcards', icon: ICards, color: 'linear-gradient(140deg,#fb923c,#ff6b6b)',
    desc: 'Write your own cards and start studying.', cta: 'Create', to: 'new',
  },
  {
    name: 'Practice test', icon: IList, color: 'linear-gradient(140deg,#f472b6,#7c6cf0)',
    desc: 'Generate an exam from any set you own.', cta: 'Start', to: 'test',
  },
  {
    name: 'Play a game', icon: IGame, color: 'linear-gradient(140deg,#ffb020,#fb923c)',
    desc: 'Match, Meteor, or Quiz Rush — all count toward your schedule.', cta: 'Play', to: 'game',
  },
]

function SetCard({ id }: { id: string }) {
  const set = useStore(s => s.sets.find(x => x.id === id))!
  const lastAt = useStore(s => s.lastStudied[id])
  const due = dueCount(set.cards)
  const counts = useMemo(() => {
    const c = [0, 0, 0, 0, 0]
    for (const card of set.cards) c[masteryOf(card)] += 1
    return c
  }, [set.cards])
  const strong = counts[3] + counts[4]

  return (
    <button className="card card-hover" style={{ overflow: 'hidden', textAlign: 'left', padding: 0 }}
            onClick={() => navigate(`/set/${set.id}`)}>
      <div className="cover" style={{ background: gradient(set.id), borderRadius: 0, minHeight: 88 }}>
        <div style={{ position: 'relative' }}>
          <div className="fs12" style={{ opacity: .85, fontWeight: 600 }}>
            {set.subject || 'General'}
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.02em', marginTop: 2 }}
               className="trunc">
            {set.title}
          </div>
        </div>
        {due > 0 && (
          <span style={{
            position: 'absolute', top: 14, right: 14, zIndex: 1,
            background: 'rgba(0,0,0,.32)', color: '#fff',
            padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700,
          }}>
            {due} due
          </span>
        )}
      </div>
      <div style={{ padding: 16 }}>
        <MasteryBar counts={counts} />
        <div className="row-between mt10">
          <span className="fs12 muted">{pct(strong, set.cards.length)}% strong</span>
          <span className="fs12 dim">
            {plural(set.cards.length, 'card')}{lastAt && ` · ${relTime(lastAt)}`}
          </span>
        </div>
      </div>
    </button>
  )
}

export default function Dashboard() {
  const sets = useStore(s => s.sets)
  const days = useStore(s => s.days)
  const goal = useStore(s => s.settings.dailyGoal)
  const createSet = useStore(s => s.createSet)
  const streak = useStreak()
  const { level, into, span } = useLevel()

  const today = days[dayKey()] ?? { reviews: 0, correct: 0, ms: 0 }
  const totalDue = sets.reduce((n, s) => n + dueCount(s.cards), 0)
  const totalNew = sets.reduce((n, s) => n + newCount(s.cards), 0)
  const totalCards = sets.reduce((n, s) => n + s.cards.length, 0)

  const dueSets = sets
    .map(s => ({ set: s, due: dueCount(s.cards) }))
    .filter(x => x.due > 0)
    .sort((a, b) => b.due - a.due)

  const hour = new Date().getHours()
  const greeting = hour < 5 ? 'Still up' : hour < 12 ? 'Good morning'
    : hour < 18 ? 'Good afternoon' : 'Good evening'

  const act = (to: string) => {
    if (to === 'new') { navigate(`/set/${createSet()}/edit`); return }
    if (to === 'test' || to === 'game') {
      const first = dueSets[0]?.set ?? sets[0]
      if (!first) { navigate(`/set/${createSet()}/edit`); return }
      navigate(to === 'test' ? `/study/test/${first.id}` : `/study/match/${first.id}`)
      return
    }
    navigate(to)
  }

  if (sets.length === 0) {
    return (
      <div className="wrap">
        <Empty
          icon={<ICards size={22} />}
          title="Let's make your first deck"
          body="Upload a PDF or a photo of your notes and let AI draft the cards, or write them yourself. Everything stays on this device."
          action={
            <div className="row g8">
              <button className="btn btn-accent btn-lg" onClick={() => navigate('/create')}>
                <ISpark size={16} /> Upload notes
              </button>
              <button className="btn btn-lg" onClick={() => navigate(`/set/${createSet()}/edit`)}>
                <IPlus size={16} /> Start blank
              </button>
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className="wrap wrap-wide">
      <div className="h1 mb4">{greeting}.</div>
      <div className="body-lg mb24">
        {totalDue > 0
          ? `${plural(totalDue, 'card')} ready across ${plural(dueSets.length, 'set')}.`
          : totalNew > 0
            ? `Nothing due — ${plural(totalNew, 'card')} you haven't started yet.`
            : 'All caught up. Nothing is due right now.'}
      </div>

      <div className="actions mb32">
        {ACTIONS.map(a => (
          <button key={a.name} className="action" onClick={() => act(a.to)}>
            <div className="action-ic" style={{ background: a.color }}><a.icon size={20} /></div>
            <div className="action-name">{a.name}</div>
            <div className="action-desc">{a.desc}</div>
            <span className="action-go">{a.cta} <IChevR size={13} /></span>
          </button>
        ))}
      </div>

      <div className="grid3 g12 mb32">
        <div className="card card-pad row g14">
          <div className="ring" style={{ ['--p' as string]: Math.min(100, pct(today.reviews, goal)) }}>
            <span>{Math.min(100, pct(today.reviews, goal))}%</span>
          </div>
          <div className="grow">
            <div className="h3">Daily goal</div>
            <div className="hint mt4">
              {today.reviews >= goal
                ? `Hit it — ${today.reviews} of ${goal}.`
                : `${today.reviews} of ${goal} reviews`}
            </div>
          </div>
        </div>

        <div className="card card-pad row g14">
          <div className="action-ic" style={{
            margin: 0, width: 46, height: 46,
            background: streak > 0 ? 'linear-gradient(140deg,#ffb020,#fb923c)' : 'var(--surface-3)',
          }}>
            <IFlame size={20} />
          </div>
          <div className="grow">
            <div className="stat-v" style={{ fontSize: 24 }}>{streak}</div>
            <div className="stat-l">{streak === 1 ? 'day streak' : 'day streak'}</div>
          </div>
        </div>

        <div className="card card-pad">
          <div className="row-between mb8">
            <div className="h3">Level {level}</div>
            <span className="fs12 dim num">{into} / {span} XP</span>
          </div>
          <Bar value={into} max={span} lg />
          <div className="hint mt8">{totalCards} cards in your library</div>
        </div>
      </div>

      {dueSets.length > 0 && (
        <>
          <div className="eyebrow mb12">Ready for review</div>
          <div className="col g8 mb32">
            {dueSets.slice(0, 5).map(({ set, due }) => (
              <div key={set.id} className="set-row" onClick={() => navigate(`/set/${set.id}`)}>
                <div className="set-swatch" style={{ background: gradient(set.id) }}>
                  {initials(set.title)}
                </div>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="fs15 fw6 trunc">{set.title}</div>
                  <div className="hint mt2">{plural(due, 'card')} due · {set.cards.length} total</div>
                </div>
                <div className="row g8" onClick={e => e.stopPropagation()}>
                  <button className="btn btn-sm" onClick={() => navigate(`/study/cards/${set.id}`)}>
                    <IClock size={14} /> Review
                  </button>
                  <button className="btn btn-accent btn-sm" onClick={() => navigate(`/study/learn/${set.id}`)}>
                    <IBolt size={14} /> Learn
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="row-between mb12">
        <div className="eyebrow">Your sets</div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/set/${createSet()}/edit`)}>
          <IPlus size={14} /> New set
        </button>
      </div>
      <div className="grid-auto g14">
        {sets.map(s => <SetCard key={s.id} id={s.id} />)}
      </div>

      {totalDue === 0 && totalNew === 0 && totalCards > 0 && (
        <div className="card card-pad mt32 row g12">
          <ITarget size={20} className="muted" />
          <div>
            <div className="h3">Everything is scheduled</div>
            <div className="hint mt4">
              Spaced repetition spreads reviews out on purpose — coming back before a card
              is due doesn't help it stick. Play a game or add new material instead.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
