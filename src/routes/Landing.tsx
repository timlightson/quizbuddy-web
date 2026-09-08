import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { navigate } from '../components/ui'
import {
  ISpark, IUpload, IBrain, IGame, ICards, IChart, ICheck, IX,
  IChevR, ITarget, IList, IFlame,
} from '../components/Icons'

const REPO = 'https://github.com/timlightson/quizbuddy-web'

const FEATURES = [
  {
    icon: IUpload, color: 'linear-gradient(140deg,#7c6cf0,#4aa8ff)',
    title: 'Upload anything',
    body: 'A lecture PDF, exported slides, a Word doc, or a photo of your handwritten notes. Files go to the model as-is, so diagrams, tables and scanned pages survive.',
  },
  {
    icon: ISpark, color: 'linear-gradient(140deg,#2fe0b0,#4aa8ff)',
    title: 'Talk your deck into shape',
    body: '"Make them harder." "Focus on chapter 4." "Add ten more." Every draft lands in an editable list — nothing saves until you approve it.',
  },
  {
    icon: IBrain, color: 'linear-gradient(140deg,#fb923c,#ff6b6b)',
    title: 'Real spaced repetition',
    body: 'An SM-2 scheduler decides when each card comes back, and escalates you from multiple choice to recall as a card gets stronger.',
  },
  {
    icon: IGame, color: 'linear-gradient(140deg,#ffb020,#fb923c)',
    title: 'Games that actually count',
    body: 'Match, Meteor and Quiz Rush all feed the same scheduler, so messing around still moves your progress.',
  },
  {
    icon: IList, color: 'linear-gradient(140deg,#f472b6,#7c6cf0)',
    title: 'Seven study modes',
    body: 'Flashcards, Learn, Test, Write, and three games. Written answers are graded with typo tolerance, and you can always override the grader.',
  },
  {
    icon: IChart, color: 'linear-gradient(140deg,#a3e635,#2fe0b0)',
    title: 'Progress worth reading',
    body: 'Mastery per card, a year-long activity heatmap, streaks, levels, and a leech list of the cards that keep slipping.',
  },
]

const ROWS: [string, boolean | string, boolean | string][] = [
  ['Unlimited sets and cards', true, true],
  ['Ads', 'Free tier', false],
  ['Learn and Test modes', 'Paid', true],
  ['True spaced repetition (SM-2)', false, true],
  ['AI decks from your own PDFs and photos', 'Paid', true],
  ['Offline after first load', 'Paid', true],
  ['Your data leaves your device', 'Always', 'Never'],
  ['Price', '$35.99 / year', 'Free forever'],
]

const FAQ = [
  ['Is it really free?',
   'Yes. There is no paid tier, no account, and no ads. It is open source under the MIT license — you can read every line, fork it, or run it yourself.'],
  ['Do I need an account?',
   'No. Your sets live in your browser’s local storage. That also means clearing site data wipes them, so use Settings → Export for a backup before you do.'],
  ['Do I need an API key?',
   'Only for the AI Studio. Every other feature — all seven study modes, spaced repetition, stats, import and export — works with no key at all. If you want AI decks, you add your own Anthropic key in Settings and it bills to your account.'],
  ['Where do my uploaded files go?',
   'Straight from your browser to Anthropic, and nowhere else. There is no backend here — this site is a static page. Nothing you upload touches a server we control, because there isn’t one.'],
  ['Can I import my existing Quizlet sets?',
   'Yes. Export from Quizlet as text, then paste into any set’s Import dialog. The parser guesses your separator and splits on its first occurrence, so commas inside definitions survive.'],
]

function Mark({ v }: { v: boolean | string }) {
  if (v === true) return <><ICheck size={15} style={{ color: 'var(--green)' }} /> Yes</>
  if (v === false) return <><IX size={15} style={{ color: 'var(--ink-4)' }} /> No</>
  return <span className="muted">{v}</span>
}

/** A CSS mock of the real dashboard — no screenshot to keep in sync. */
function Preview() {
  return (
    <div className="lp-shot">
      <div className="lp-bar">
        <i className="lp-dot" style={{ background: '#ff6b6b' }} />
        <i className="lp-dot" style={{ background: '#ffb020' }} />
        <i className="lp-dot" style={{ background: '#2fe0b0' }} />
        <div className="grow" />
        <span className="fs12 dim mono">quizbuddy</span>
        <div className="grow" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '168px 1fr', minHeight: 330, textAlign: 'left' }}>
        <div style={{ borderRight: '1px solid var(--line)', padding: 14, background: 'var(--surface-2)' }}>
          <div className="row g8 mb16">
            <div className="side-logo" style={{ width: 24, height: 24, fontSize: 12, borderRadius: 8 }}>Q</div>
            <span style={{ fontWeight: 700, fontSize: 14 }}>QuizBuddy</span>
          </div>
          {[['Home', true], ['AI Studio', false], ['Progress', false]].map(([n, on]) => (
            <div key={n as string} className="side-item" style={{ height: 30, fontSize: 12.5, pointerEvents: 'none' }}
                 data-on={on}>
              <i className="side-dot" style={{ background: on ? 'var(--accent)' : 'var(--ink-4)' }} />{n}
            </div>
          ))}
          <div className="side-label" style={{ paddingTop: 12 }}>Library</div>
          {['Biology — The Cell', 'SAT Vocabulary', 'Spanish Verbs'].map((n, i) => (
            <div key={n} className="side-item" style={{ height: 28, fontSize: 12, pointerEvents: 'none' }}>
              <i className="side-dot" style={{
                background: ['linear-gradient(140deg,#7c6cf0,#4aa8ff)',
                             'linear-gradient(140deg,#2fe0b0,#4aa8ff)',
                             'linear-gradient(140deg,#fb923c,#ff6b6b)'][i],
              }} />
              <span className="trunc">{n}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, letterSpacing: '-.02em' }}>
            Good evening.
          </div>
          <div className="hint mt4 mb16">18 cards ready across 3 sets.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              ['Upload a file', 'linear-gradient(140deg,#7c6cf0,#4aa8ff)', IUpload],
              ['Build with AI', 'linear-gradient(140deg,#2fe0b0,#4aa8ff)', ISpark],
              ['Flashcards', 'linear-gradient(140deg,#fb923c,#ff6b6b)', ICards],
            ].map(([n, bg, Ic]) => {
              const I = Ic as typeof IUpload
              return (
                <div key={n as string} style={{
                  padding: 13, borderRadius: 12,
                  background: 'var(--surface)', border: '1px solid var(--line)',
                }}>
                  <div className="action-ic" style={{ background: bg as string, width: 30, height: 30, borderRadius: 9, marginBottom: 9 }}>
                    <I size={14} />
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 650 }}>{n as string}</div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 12 }}>
            {['Biology — The Cell', 'SAT Vocabulary', 'Spanish Verbs'].map((n, i) => (
              <div key={n} style={{
                borderRadius: 12, overflow: 'hidden',
                border: '1px solid var(--line)', background: 'var(--surface)',
              }}>
                <div style={{
                  height: 52, padding: 10, display: 'flex', alignItems: 'flex-end', color: '#fff',
                  background: ['linear-gradient(140deg,#7c6cf0,#4aa8ff)',
                               'linear-gradient(140deg,#2fe0b0,#4aa8ff)',
                               'linear-gradient(140deg,#fb923c,#ff6b6b)'][i],
                  fontSize: 11.5, fontWeight: 700,
                }}>
                  <span className="trunc">{n}</span>
                </div>
                <div style={{ padding: 10 }}>
                  <div className="mseg" style={{ height: 5 }}>
                    <i style={{ width: `${[62, 38, 80][i]}%`, background: 'var(--m4)' }} />
                    <i style={{ width: '22%', background: 'var(--m2)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const setSettings = useStore(s => s.setSettings)
  const sets = useStore(s => s.sets)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const el = document.querySelector('.lp')
    if (!el) return
    const on = () => setStuck(el.scrollTop > 8)
    el.addEventListener('scroll', on)
    return () => el.removeEventListener('scroll', on)
  }, [])

  const enter = () => {
    setSettings({ onboarded: true })
    navigate('/')
  }
  const toStudio = () => {
    setSettings({ onboarded: true })
    navigate('/studio')
  }

  const cards = sets.reduce((n, s) => n + s.cards.length, 0)

  return (
    <div className="lp">
      <nav className="lp-nav" data-stuck={stuck}>
        <div className="row g10">
          <div className="side-logo">Q</div>
          <span className="side-word">QuizBuddy</span>
        </div>
        <div className="grow" />
        <a className="btn btn-ghost" href={REPO} target="_blank" rel="noreferrer">GitHub</a>
        <button className="btn btn-accent" onClick={enter}>
          Start studying <IChevR size={14} />
        </button>
      </nav>

      <div className="lp-wrap">
        <header className="lp-hero">
          <div className="lp-badge">
            <b>FREE</b> No ads, no account, no paywall
          </div>
          <h1 className="lp-h1">
            Everything Quizlet charges for,<br />
            <span className="lp-grad">and the parts it never built.</span>
          </h1>
          <p className="lp-sub">
            Upload your lecture notes — even a photo of your handwriting — and get a
            deck back in seconds. Then study it with real spaced repetition, seven
            modes, and three games. All of it free, forever.
          </p>
          <div className="row g10 mt24" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-accent btn-lg" onClick={toStudio}>
              <ISpark size={16} /> Upload your notes
            </button>
            <button className="btn btn-lg" onClick={enter}>
              Explore {cards} sample cards
            </button>
          </div>
          <div className="row g16 mt16 wrap-flex" style={{ justifyContent: 'center' }}>
            <span className="hint row g6"><ICheck size={13} style={{ color: 'var(--green)' }} /> Works offline</span>
            <span className="hint row g6"><ICheck size={13} style={{ color: 'var(--green)' }} /> No sign-up</span>
            <span className="hint row g6"><ICheck size={13} style={{ color: 'var(--green)' }} /> Open source</span>
          </div>
          <Preview />
        </header>

        <section className="lp-section">
          <div className="lp-eyebrow">What you get</div>
          <h2 className="lp-h2">Built for the night before the test</h2>
          <p className="lp-lead">
            Every feature here exists because studying from a textbook at 11pm is
            miserable, not because it made a pricing page look fuller.
          </p>
          <div className="lp-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="lp-card">
                <div className="lp-ic" style={{ background: f.color }}><f.icon size={20} /></div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-eyebrow">How it works</div>
          <h2 className="lp-h2">Notes to deck in about a minute</h2>
          <div className="lp-steps">
            {[
              ['Drop in your material', 'A PDF, your slides, a Word doc, or a photo of handwritten notes. Or paste text straight in.'],
              ['Tell it what you want', 'How many cards, what to focus on. Then refine by chatting — harder, simpler, more of chapter 4.'],
              ['Check the drafts', 'Every card is editable and individually selectable. Nothing is saved until you approve it.'],
              ['Study on a schedule', 'The scheduler decides what comes back and when. Show up daily; it handles the rest.'],
            ].map(([t, b], i) => (
              <div key={t}>
                <div className="lp-step-n">{i + 1}</div>
                <div className="h3">{t}</div>
                <p className="hint mt8" style={{ fontSize: 14.5, lineHeight: 1.6 }}>{b}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-eyebrow">Comparison</div>
          <h2 className="lp-h2">Against Quizlet Plus</h2>
          <p className="lp-lead">
            Not a dig at Quizlet — it's a good product. It's just that none of this
            needs a subscription.
          </p>
          <div className="lp-table">
            <div className="lp-tr">
              <div className="lp-th">Feature</div>
              <div className="lp-th">Quizlet</div>
              <div className="lp-th lp-th">QuizBuddy</div>
            </div>
            {ROWS.map(([label, them, us]) => (
              <div key={label} className="lp-tr">
                <div>{label}</div>
                <div><Mark v={them} /></div>
                <div className="lp-ours"><Mark v={us} /></div>
              </div>
            ))}
          </div>
          <p className="hint ta-c mt12">
            Quizlet pricing as listed publicly at time of writing. Compare for yourself.
          </p>
        </section>

        <section className="lp-section">
          <div className="lp-eyebrow">Questions</div>
          <h2 className="lp-h2">The honest answers</h2>
          <div style={{ maxWidth: 720, margin: '44px auto 0' }}>
            {FAQ.map(([q, a]) => (
              <details key={q} className="lp-faq">
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="lp-cta">
          <div className="row g10 mb16" style={{ justifyContent: 'center' }}>
            <IFlame size={22} style={{ color: '#fff' }} />
            <ITarget size={22} style={{ color: '#fff' }} />
          </div>
          <h2 style={{
            fontSize: 'clamp(26px,4vw,40px)', fontWeight: 700,
            letterSpacing: '-.03em', color: '#fff',
          }}>
            Your test isn't going to study for itself.
          </h2>
          <p style={{
            color: 'rgba(255,255,255,.9)', fontSize: 17,
            maxWidth: 460, margin: '14px auto 26px', lineHeight: 1.55,
          }}>
            No account, no card, no trial that expires. Just open it.
          </p>
          <button className="btn btn-lg" onClick={enter}
                  style={{ background: '#fff', color: '#16161d', borderColor: '#fff' }}>
            Start studying free <IChevR size={15} />
          </button>
        </div>

        <footer className="lp-foot">
          <div className="row g10">
            <div className="side-logo" style={{ width: 26, height: 26, fontSize: 13, borderRadius: 8 }}>Q</div>
            <span style={{ fontWeight: 650, color: 'var(--ink-2)' }}>QuizBuddy</span>
          </div>
          <div className="grow" />
          <a className="lp-link" href={REPO} target="_blank" rel="noreferrer">Source</a>
          <a className="lp-link" href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noreferrer">MIT License</a>
          <a className="lp-link" href={`${REPO}/issues`} target="_blank" rel="noreferrer">Report a bug</a>
          <span className="dim">Runs entirely in your browser.</span>
        </footer>
      </div>
    </div>
  )
}
