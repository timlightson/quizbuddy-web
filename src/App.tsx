import { useEffect, useMemo, useRef, useState } from 'react'
import { useRoute, navigate, ToastHost } from './components/ui'
import {
  IChart, IGear, IHome, IPlus, IFolder, IMenu, IFlame, ISpark,
  ISearch, ICards, ITrophy, ILayers, IUpload, IChevR,
} from './components/Icons'
import { useStore } from './lib/store'
import { dueCount } from './lib/srs'
import { dayKey, addDays, plural } from './lib/utils'
import { gradient, initials } from './lib/gradients'

import Landing from './routes/Landing'
import Dashboard from './routes/Dashboard'
import Studio from './routes/Studio'
import SetView from './routes/SetView'
import SetEditor from './routes/SetEditor'
import Flashcards from './routes/Flashcards'
import Learn from './routes/Learn'
import TestMode from './routes/TestMode'
import Write from './routes/Write'
import Match from './routes/Match'
import Meteor from './routes/Meteor'
import Rush from './routes/Rush'
import Stats from './routes/Stats'
import SettingsPage from './routes/Settings'

/** Consecutive days with at least one review, counting back from today. */
export function useStreak(): number {
  const days = useStore(s => s.days)
  return useMemo(() => {
    let n = 0
    const today = new Date()
    // An unstudied today shouldn't break a streak that's still live.
    let cursor = days[dayKey(today)]?.reviews ? today : addDays(today, -1)
    while (days[dayKey(cursor)]?.reviews) {
      n += 1
      cursor = addDays(cursor, -1)
    }
    return n
  }, [days])
}

/** Level curve derived from lifetime reviews — nothing extra to persist. */
export function useLevel() {
  const days = useStore(s => s.days)
  return useMemo(() => {
    const xp = Object.values(days).reduce((n, d) => n + d.reviews + d.correct, 0)
    const level = Math.floor(Math.sqrt(xp / 12)) + 1
    const floor = (level - 1) ** 2 * 12
    const ceil = level ** 2 * 12
    return { xp, level, into: xp - floor, span: ceil - floor }
  }, [days])
}

function useTheme() {
  const theme = useStore(s => s.settings.theme)
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const dark = theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      root.setAttribute('data-theme', dark ? 'dark' : 'light')
      root.style.colorScheme = dark ? 'dark' : 'light'
    }
    apply()
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

/* ---------------- global search ---------------- */

interface Hit { setId: string; setTitle: string; label: string; sub: string }

function useSearch(q: string): Hit[] {
  const sets = useStore(s => s.sets)
  return useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (needle.length < 2) return []
    const hits: Hit[] = []
    for (const s of sets) {
      if (s.title.toLowerCase().includes(needle) || s.subject.toLowerCase().includes(needle)) {
        hits.push({
          setId: s.id, setTitle: s.title, label: s.title,
          sub: `Set · ${plural(s.cards.length, 'card')}`,
        })
      }
      for (const c of s.cards) {
        if (hits.length > 40) break
        if (c.term.toLowerCase().includes(needle) || c.def.toLowerCase().includes(needle)) {
          hits.push({ setId: s.id, setTitle: s.title, label: c.term, sub: `${s.title} · ${c.def}` })
        }
      }
    }
    return hits.slice(0, 12)
  }, [sets, q])
}

function SearchBar() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const hits = useSearch(q)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const hotkey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus() }
    }
    window.addEventListener('mousedown', away)
    window.addEventListener('keydown', hotkey)
    return () => {
      window.removeEventListener('mousedown', away)
      window.removeEventListener('keydown', hotkey)
    }
  }, [])

  useEffect(() => setCursor(0), [q])

  const go = (h: Hit) => { navigate(`/set/${h.setId}`); setOpen(false); setQ('') }

  return (
    <div className="search" ref={boxRef}>
      <ISearch size={17} />
      <input
        ref={inputRef} value={q} placeholder="Search sets and cards…"
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
          if (!hits.length) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => (c + 1) % hits.length) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => (c - 1 + hits.length) % hits.length) }
          if (e.key === 'Enter') { e.preventDefault(); go(hits[cursor]) }
        }}
      />
      {open && q.trim().length >= 2 && (
        <div className="results">
          {hits.length === 0 ? (
            <div className="hint" style={{ padding: 16, textAlign: 'center' }}>
              Nothing matches "{q.trim()}".
            </div>
          ) : hits.map((h, i) => (
            <button key={i} className="result" data-on={i === cursor}
                    onMouseEnter={() => setCursor(i)} onClick={() => go(h)}>
              <div className="set-swatch" style={{
                background: gradient(h.setId), width: 32, height: 32, fontSize: 12,
              }}>
                {initials(h.setTitle)}
              </div>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="fs14 fw5 trunc">{h.label}</div>
                <div className="fs12 dim trunc">{h.sub}</div>
              </div>
              <IChevR size={14} className="dim" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------- sidebar ---------------- */

function Sidebar({ open, close }: { open: boolean; close: () => void }) {
  const [seg] = useRoute()
  const sets = useStore(s => s.sets)
  const folders = useStore(s => s.folders)
  const createSet = useStore(s => s.createSet)

  const totalDue = useMemo(() => sets.reduce((n, s) => n + dueCount(s.cards), 0), [sets])
  const at = (p: string) => (seg.length === 0 ? p === '' : seg[0] === p)
  const goTo = (to: string) => { navigate(to); close() }

  return (
    <aside className="side" data-open={open}>
      <div className="side-brand" onClick={() => goTo('/')}>
        <div className="side-logo">Q</div>
        <div className="side-word">QuizBuddy</div>
      </div>

      <div className="side-label">Main</div>
      <button className="side-item" data-on={at('')} onClick={() => goTo('/')}>
        <IHome /> Home
        {totalDue > 0 && <span className="side-tag">{totalDue}</span>}
      </button>
      <button className="side-item" data-on={at('studio')} onClick={() => goTo('/studio')}>
        <ISpark /> AI Studio
      </button>
      <button className="side-item" data-on={at('stats')} onClick={() => goTo('/stats')}>
        <IChart /> Progress
      </button>

      <div className="side-label">Library</div>
      <button className="side-item" onClick={() => goTo(`/set/${createSet()}/edit`)}>
        <IPlus /> New set
      </button>

      <div className="col g2" style={{ overflowY: 'auto', gap: 2 }}>
        {folders.map(f => {
          const inside = sets.filter(s => s.folderId === f.id)
          if (!inside.length) return null
          return (
            <div key={f.id}>
              <div className="side-label row g6" style={{ paddingBottom: 4 }}>
                <IFolder size={11} style={{ color: f.color }} />
                <span>{f.name}</span>
              </div>
              {inside.map(s => (
                <button key={s.id} className="side-item" data-on={seg[1] === s.id}
                        onClick={() => goTo(`/set/${s.id}`)}>
                  <i className="side-dot" style={{ background: gradient(s.id) }} />
                  <span className="trunc">{s.title}</span>
                </button>
              ))}
            </div>
          )
        })}
        {sets.filter(s => !s.folderId).map(s => {
          const due = dueCount(s.cards)
          return (
            <button key={s.id} className="side-item" data-on={seg[1] === s.id}
                    onClick={() => goTo(`/set/${s.id}`)}>
              <i className="side-dot" style={{ background: gradient(s.id) }} />
              <span className="trunc grow">{s.title}</span>
              {due > 0 && <span className="side-tag">{due}</span>}
            </button>
          )
        })}
        {sets.length === 0 && (
          <div className="hint" style={{ padding: '6px 11px' }}>No sets yet.</div>
        )}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 12 }}>
        <button className="side-item" data-on={at('settings')} onClick={() => goTo('/settings')}>
          <IGear /> Settings
        </button>
      </div>
    </aside>
  )
}

/* ---------------- shell ---------------- */

export default function App() {
  useTheme()
  const [seg] = useRoute()
  const [navOpen, setNavOpen] = useState(false)
  const streak = useStreak()
  const { level, into, span } = useLevel()
  const createSet = useStore(s => s.createSet)
  const onboarded = useStore(s => s.settings.onboarded)

  useEffect(() => { setNavOpen(false) }, [seg.join('/')])

  // The landing page owns the whole viewport — no sidebar, no topbar.
  const landing = seg[0] === 'welcome' || (seg.length === 0 && !onboarded)
  useEffect(() => { if (landing) window.scrollTo(0, 0) }, [landing])

  // Study screens own the full width — no topbar chrome over them.
  const studying = seg[0] === 'study'

  const view = () => {
    const [a, b, c] = seg
    if (!a) return <Dashboard />
    if (a === 'studio') return <Studio />
    if (a === 'stats') return <Stats />
    if (a === 'settings') return <SettingsPage />
    if (a === 'set' && b) return c === 'edit' ? <SetEditor id={b} /> : <SetView id={b} />
    if (a === 'study' && b && c) {
      switch (b) {
        case 'cards':  return <Flashcards id={c} />
        case 'learn':  return <Learn id={c} />
        case 'test':   return <TestMode id={c} />
        case 'write':  return <Write id={c} />
        case 'match':  return <Match id={c} />
        case 'meteor': return <Meteor id={c} />
        case 'rush':   return <Rush id={c} />
      }
    }
    return <Dashboard />
  }

  if (landing) {
    return <><Landing /><ToastHost /></>
  }

  return (
    <div className="app">
      <Sidebar open={navOpen} close={() => setNavOpen(false)} />
      {navOpen && (
        <div onClick={() => setNavOpen(false)}
             style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.45)' }} />
      )}
      <main className="main">
        <button className="btn btn-icon" onClick={() => setNavOpen(true)} aria-label="Open menu"
                style={{ position: 'fixed', top: 15, left: 14, zIndex: 40, display: 'none' }}
                data-mobile-nav>
          <IMenu />
        </button>

        {!studying && (
          <div className="top">
            <SearchBar />
            <div className="grow" />
            <button className="btn btn-accent" onClick={() => navigate('/studio')}>
              <ISpark size={15} /> AI Studio
            </button>
            <button className="btn btn-icon" aria-label="New set"
                    onClick={() => navigate(`/set/${createSet()}/edit`)}>
              <IPlus size={16} />
            </button>
            <span className="pill" title={`${streak} day streak`}>
              <IFlame size={14} style={{ color: streak > 0 ? 'var(--c-orange)' : 'var(--ink-4)' }} />
              {streak}
            </span>
            <span className="pill" title={`Level ${level} · ${into}/${span} XP`}>
              <ITrophy size={14} style={{ color: 'var(--c-amber)' }} />
              {level}
            </span>
          </div>
        )}

        {view()}
      </main>
      <ToastHost />
    </div>
  )
}

/** Shared icon set for the home action cards and set mode tiles. */
export const TILE = { ICards, ILayers, IUpload }
