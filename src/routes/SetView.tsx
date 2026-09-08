import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { MASTERY_LABEL, MASTERY_VAR, dueCount, isLeech, masteryOf } from '../lib/srs'
import { plural, pct, untilTime, download } from '../lib/utils'
import { toTSV } from '../lib/import'
import { speak } from '../lib/tts'
import { navigate, MasteryBar, Empty, useConfirm, toast, Chip } from '../components/ui'
import { gradient } from '../lib/gradients'
import {
  ICards, IEdit, IStar, ISpeaker, IPen, IGame, IList,
  ITrash, ICopy, IDownload, ITarget, IBrain, ISpark, IBolt, ILayers,
} from '../components/Icons'

const MODES = [
  { key: 'cards',  name: 'Flashcards', icon: ICards, sub: 'Flip and self-grade',  color: '#7c6cf0' },
  { key: 'learn',  name: 'Learn',      icon: IBrain, sub: 'Adaptive rounds',      color: '#2fe0b0' },
  { key: 'test',   name: 'Test',       icon: IList,  sub: 'Generated exam',       color: '#4aa8ff' },
  { key: 'write',  name: 'Write',      icon: IPen,   sub: 'Type the answer',      color: '#f472b6' },
  { key: 'match',  name: 'Match',      icon: ILayers, sub: 'Beat the clock',      color: '#ffb020' },
  { key: 'meteor', name: 'Meteor',     icon: IGame,  sub: 'Type before it lands', color: '#ff6b6b' },
  { key: 'rush',   name: 'Quiz Rush',  icon: IBolt,  sub: 'Speed round',          color: '#fb923c' },
] as const

export default function SetView({ id }: { id: string }) {
  const set = useStore(s => s.sets.find(x => x.id === id))
  const settings = useStore(s => s.settings)
  const toggleStar = useStore(s => s.toggleStar)
  const deleteSet = useStore(s => s.deleteSet)
  const duplicateSet = useStore(s => s.duplicateSet)
  const resetProgress = useStore(s => s.resetProgress)
  const { confirm, dialog } = useConfirm()
  const [filter, setFilter] = useState<'all' | 'starred' | 'hard' | 'new'>('all')

  const counts = useMemo(() => {
    const c = [0, 0, 0, 0, 0]
    for (const card of set?.cards ?? []) c[masteryOf(card)] += 1
    return c
  }, [set?.cards])

  if (!set) {
    return (
      <div className="wrap">
        <Empty icon={<ICards size={22} />} title="Set not found"
               body="It may have been deleted."
               action={<button className="btn" onClick={() => navigate('/')}>Back home</button>} />
      </div>
    )
  }

  const due = dueCount(set.cards)
  const leeches = set.cards.filter(isLeech)
  const empty = set.cards.filter(c => !c.term.trim() || !c.def.trim()).length
  const ready = set.cards.length - empty

  const shown = set.cards.filter(c => {
    if (filter === 'starred') return c.starred
    if (filter === 'hard') return isLeech(c) || (c.seen > 2 && c.correct / c.seen < 0.6)
    if (filter === 'new') return c.due === null
    return true
  })

  const start = (mode: string) => {
    if (ready < 2) { toast('Add at least 2 complete cards first'); return }
    navigate(`/study/${mode}/${set.id}`)
  }

  return (
    <div className="wrap">
      <div className="cover cover-hero mb24" style={{ background: gradient(set.id) }}>
        <div style={{ position: 'relative' }}>
          <div className="row g8 mb8 wrap-flex">
            <span className="badge" style={{ background: 'rgba(0,0,0,.28)', color: '#fff' }}>
              {plural(set.cards.length, 'card')}
            </span>
            {set.subject && (
              <span className="badge" style={{ background: 'rgba(0,0,0,.28)', color: '#fff' }}>
                {set.subject}
              </span>
            )}
            {due > 0 && (
              <span className="badge" style={{ background: 'rgba(0,0,0,.28)', color: '#fff' }}>
                {due} due
              </span>
            )}
            {empty > 0 && (
              <span className="badge" style={{ background: 'rgba(0,0,0,.35)', color: '#ffd9d9' }}>
                {empty} incomplete
              </span>
            )}
          </div>
          <div className="h1" style={{ color: '#fff', fontSize: 'clamp(26px,3.6vw,40px)' }}>
            {set.title}
          </div>
          {set.description && (
            <div style={{ color: 'rgba(255,255,255,.88)', marginTop: 8, maxWidth: 620, fontSize: 15 }}>
              {set.description}
            </div>
          )}
          <div className="row g8 mt16 wrap-flex">
            <button className="btn btn-lg" onClick={() => start('learn')}
                    style={{ background: '#fff', color: '#16161d', borderColor: '#fff' }}>
              <IBolt size={16} /> Start learning
            </button>
            <button className="btn btn-lg" onClick={() => navigate(`/set/${set.id}/edit`)}
                    style={{ background: 'rgba(0,0,0,.28)', color: '#fff', borderColor: 'rgba(255,255,255,.35)' }}>
              <IEdit size={15} /> Edit
            </button>
          </div>
        </div>
      </div>

      <div className="eyebrow mb12">Study modes</div>
      <div className="mode-grid mb24">
        {MODES.map(m => (
          <button key={m.key} className="mode" onClick={() => start(m.key)}>
            <div className="mode-ic" style={{ background: m.color }}><m.icon size={17} /></div>
            <div style={{ minWidth: 0 }}>
              <div className="mode-name">{m.name}</div>
              <div className="mode-sub trunc">{m.sub}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="card card-pad mb24">
        <div className="row-between mb12 wrap-flex">
          <div className="h3">Progress</div>
          <div className="row g12 wrap-flex">
            {MASTERY_LABEL.map((label, i) => (
              <span key={label} className="row g6 fs12 muted">
                <i className="mdot" style={{ background: `var(${MASTERY_VAR[i]})` }} />
                {label} {counts[i]}
              </span>
            ))}
          </div>
        </div>
        <MasteryBar counts={counts} />
        <div className="row-between mt12">
          <span className="fs13 muted">
            {pct(counts[3] + counts[4], set.cards.length)}% at strong or better
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => confirm({
            title: 'Reset progress?',
            body: 'Every card in this set goes back to new. The cards themselves are kept.',
            run: () => { resetProgress(set.id); toast('Progress reset') },
          })}>Reset progress</button>
        </div>
      </div>

      {leeches.length > 0 && (
        <div className="card card-pad mb24" style={{ borderColor: 'var(--red-line)' }}>
          <div className="row g10 mb8">
            <ITarget size={17} style={{ color: 'var(--red)' }} />
            <div className="h3">{plural(leeches.length, 'card')} keep slipping</div>
          </div>
          <div className="hint mb12">
            You've forgotten these five or more times after learning them. More repetitions
            usually won't fix that — rewrite the definition in your own words, or add a hint.
          </div>
          <div className="col g6">
            {leeches.slice(0, 5).map(c => (
              <div key={c.id} className="row g10 fs13">
                <span className="fw6" style={{ minWidth: 120 }}>{c.term}</span>
                <span className="muted trunc grow">{c.def}</span>
                <span className="badge badge-red">{c.lapses} lapses</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="row-between mb12 wrap-flex">
        <div className="eyebrow">Cards</div>
        <div className="row g6 wrap-flex">
          {(['all', 'starred', 'hard', 'new'] as const).map(f => (
            <Chip key={f} on={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'starred' ? 'Starred' : f === 'hard' ? 'Trouble' : 'New'}
            </Chip>
          ))}
        </div>
      </div>

      <div className="col g8">
        {shown.map((c, i) => (
          <div key={c.id} className="card card-pad">
            <div className="row g12" style={{ alignItems: 'flex-start' }}>
              <span className="mono dim" style={{ minWidth: 24, paddingTop: 2 }}>{i + 1}</span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row g8 mb4">
                  <span className="fw6">{c.term || <em className="dim">empty</em>}</span>
                  <button className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => speak(c.term, set.termLang, settings.ttsRate)}
                          aria-label="Speak term">
                    <ISpeaker size={13} />
                  </button>
                </div>
                <div className="muted fs14">{c.def || <em className="dim">no definition</em>}</div>
                {c.hint && <div className="hint mt4">Hint: {c.hint}</div>}
              </div>
              <div className="row g8" style={{ alignItems: 'center' }}>
                <div className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
                  <span className="row g6 fs12 muted">
                    <i className="mdot" style={{ background: `var(${MASTERY_VAR[masteryOf(c)]})` }} />
                    {MASTERY_LABEL[masteryOf(c)]}
                  </span>
                  <span className="fs12 dim num">{untilTime(c.due)}</span>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => toggleStar(set.id, c.id)}
                        aria-label={c.starred ? 'Unstar' : 'Star'}
                        style={{ color: c.starred ? 'var(--amber)' : undefined }}>
                  <IStar size={15} filled={c.starred} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {shown.length === 0 && (
          <div className="hint ta-c" style={{ padding: 32 }}>Nothing matches this filter.</div>
        )}
      </div>

      <div className="row g8 mt32 wrap-flex">
        <button className="btn btn-sm" onClick={() => navigate('/create')}>
          <ISpark size={14} /> Add cards with AI
        </button>
        <button className="btn btn-sm" onClick={() => {
          const nid = duplicateSet(set.id)
          if (nid) { toast('Set duplicated'); navigate(`/set/${nid}`) }
        }}><ICopy size={14} /> Duplicate</button>
        <button className="btn btn-sm" onClick={() => {
          download(`${set.title.replace(/[^\w]+/g, '-').toLowerCase()}.txt`, toTSV(set.cards), 'text/plain')
          toast('Exported')
        }}><IDownload size={14} /> Export</button>
        <button className="btn btn-danger btn-sm" onClick={() => confirm({
          title: `Delete "${set.title}"?`,
          body: `All ${plural(set.cards.length, 'card')} and their progress go with it. This can't be undone.`,
          run: () => { deleteSet(set.id); toast('Set deleted'); navigate('/') },
        })}><ITrash size={14} /> Delete set</button>
      </div>

      {dialog}
    </div>
  )
}
