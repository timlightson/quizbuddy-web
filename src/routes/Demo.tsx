import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { seedSets } from '../lib/seed'
import { gradient, initials } from '../lib/gradients'
import { plural } from '../lib/utils'
import { DemoDeck, type DemoCard } from '../components/DemoDeck'
import { navigate, toast } from '../components/ui'
import {
  IArrowL, ICards, IPlus, ISpark, IList, ICheck, IChevR,
} from '../components/Icons'

/** Built once — the samples are static, and this keeps card ids stable. */
const SAMPLES = seedSets()

export default function Demo() {
  const loadSamples = useStore(s => s.loadSamples)
  const mySets = useStore(s => s.sets)
  const [pick, setPick] = useState(0)

  const set = SAMPLES[pick]
  const cards: DemoCard[] = useMemo(
    () => set.cards.map(c => ({
      term: c.term, def: c.def, subject: set.subject,
      lang: set.termLang !== 'en-US' ? set.termLang : undefined,
    })),
    [set],
  )

  const alreadyHave = mySets.some(s => s.title === set.title)
  const totalCards = SAMPLES.reduce((n, s) => n + s.cards.length, 0)

  const addAll = () => {
    const n = loadSamples()
    if (!n) { toast('Those sets are already in your library'); return }
    toast(`Added ${plural(n, 'set')} to your library`)
    navigate('/')
  }

  return (
    <div className="wrap wrap-wide">
      <button className="btn btn-ghost btn-sm mb16" onClick={() => navigate('/welcome')}>
        <IArrowL size={14} /> Back
      </button>

      <div className="row-between mb8 wrap-flex">
        <div>
          <div className="h1">Demo library</div>
          <div className="body-lg mt8" style={{ maxWidth: 620 }}>
            Six ready-made sets — {totalCards} cards across science, languages and
            humanities. Flip through them here without signing up for anything or
            touching your own library.
          </div>
        </div>
        <button className="btn btn-accent btn-lg" onClick={addAll}>
          <IPlus size={16} /> Add all to my library
        </button>
      </div>

      <div className="hint mb24">
        Nothing on this page is saved anywhere until you press that button.
      </div>

      <div className="demo-layout">
        <div className="col g8">
          <div className="eyebrow mb4">Sets</div>
          {SAMPLES.map((s, n) => {
            const have = mySets.some(x => x.title === s.title)
            return (
              <button key={s.id} className="set-row" data-on={n === pick}
                      onClick={() => setPick(n)}>
                <div className="set-swatch" style={{ background: gradient(s.id) }}>
                  {initials(s.title)}
                </div>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="fs14 fw6 trunc">{s.title}</div>
                  <div className="hint mt2">
                    {plural(s.cards.length, 'card')}
                    {have && ' · in your library'}
                  </div>
                </div>
                {have
                  ? <ICheck size={15} style={{ color: 'var(--green)' }} />
                  : <IChevR size={14} className="dim" />}
              </button>
            )
          })}
        </div>

        <div className="col g16">
          <div className="card card-pad">
            <div className="row-between mb16 wrap-flex">
              <div style={{ minWidth: 0 }}>
                <div className="h3 trunc">{set.title}</div>
                <div className="hint mt2">{set.description}</div>
              </div>
              <button className="btn btn-sm" disabled={alreadyHave} onClick={() => {
                const n = loadSamples()
                toast(n ? `Added ${plural(n, 'set')}` : 'Already in your library')
              }}>
                {alreadyHave ? <><ICheck size={14} /> Added</> : <><IPlus size={14} /> Add</>}
              </button>
            </div>
            <DemoDeck cards={cards} />
          </div>

          <div className="card card-pad">
            <div className="h3 mb8">This is a preview, not the real thing</div>
            <div className="hint mb16">
              The full app schedules every card with spaced repetition, tracks what you know,
              and gives you seven study modes plus three games. None of that runs here —
              add a set to your library to get it.
            </div>
            <div className="row g8 wrap-flex">
              <button className="btn btn-accent" onClick={addAll}>
                <IPlus size={15} /> Add all {SAMPLES.length} sets
              </button>
              <button className="btn" onClick={() => navigate('/create')}>
                <ISpark size={15} /> Build my own instead
              </button>
              <button className="btn" onClick={() => navigate('/')}>
                <ICards size={15} /> Go to my library
              </button>
            </div>
          </div>

          <div className="card card-pad">
            <div className="h3 mb8 row g8"><IList size={15} /> Everything in this set</div>
            <div className="col g6" style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
              {set.cards.map((c, n) => (
                <div key={c.id} className="row g10 fs13" style={{ alignItems: 'flex-start' }}>
                  <span className="mono dim" style={{ minWidth: 22 }}>{n + 1}</span>
                  <span className="fw6" style={{ minWidth: 150, maxWidth: 150 }}>{c.term}</span>
                  <span className="muted grow">{c.def}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
