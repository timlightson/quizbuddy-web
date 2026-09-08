import { useRef, useState } from 'react'
import { useStore } from '../lib/store'
import type { AppState, Settings } from '../lib/types'
import { LANGS, speak, ttsAvailable } from '../lib/tts'
import { sfx } from '../lib/sound'
import { hasKey } from '../lib/ai'
import { download } from '../lib/utils'
import { toast, useConfirm, Chip } from '../components/ui'
import { ISun, IMoon, IGear, ISpeaker, IDownload, ITrash, ISpark } from '../components/Icons'

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="row-between wrap-flex" style={{ padding: '14px 0', alignItems: 'flex-start' }}>
      <div style={{ maxWidth: 400 }}>
        <div className="fw5 fs14">{title}</div>
        {hint && <div className="hint mt4">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const settings = useStore(s => s.settings)
  const setSettings = useStore(s => s.setSettings)
  const importState = useStore(s => s.importState)
  const resetAll = useStore(s => s.resetAll)
  const sets = useStore(s => s.sets)
  const folders = useStore(s => s.folders)
  const scores = useStore(s => s.scores)
  const tests = useStore(s => s.tests)
  const days = useStore(s => s.days)
  const { confirm, dialog } = useConfirm()
  const [keyDraft, setKeyDraft] = useState(settings.apiKey)
  const [showKey, setShowKey] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (patch: Partial<Settings>) => setSettings(patch)

  const exportAll = () => {
    const payload: Partial<AppState> = { sets, folders, scores, tests, days, settings }
    download(`quizbuddy-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2))
    toast('Backup downloaded')
  }

  const importFile = (f: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as Partial<AppState>
        if (!Array.isArray(data.sets)) throw new Error('no sets in file')
        importState(data)
        toast(`Restored ${data.sets.length} sets`)
      } catch {
        toast("That file doesn't look like a QuizBuddy backup")
      }
    }
    reader.readAsText(f)
  }

  return (
    <div className="wrap wrap-narrow">
      <div className="h1 mb4">Settings</div>
      <div className="body-lg mb32">
        Everything is stored on this device. Nothing is uploaded and there is no account.
      </div>

      <div className="eyebrow mb8">Appearance</div>
      <div className="card card-pad mb24">
        <Row title="Theme">
          <div className="row g6">
            <Chip on={settings.theme === 'light'} onClick={() => set({ theme: 'light' })}>
              <ISun size={13} /> Light
            </Chip>
            <Chip on={settings.theme === 'dark'} onClick={() => set({ theme: 'dark' })}>
              <IMoon size={13} /> Dark
            </Chip>
            <Chip on={settings.theme === 'system'} onClick={() => set({ theme: 'system' })}>
              <IGear size={13} /> System
            </Chip>
          </div>
        </Row>
      </div>

      <div className="eyebrow mb8">Studying</div>
      <div className="card card-pad mb24">
        <Row title="Daily goal" hint="Reviews per day. Shown on the home screen and used for your streak bars.">
          <input className="input num" type="number" min={5} max={500} style={{ width: 100 }}
                 value={settings.dailyGoal}
                 onChange={e => set({ dailyGoal: Math.max(5, +e.target.value || 30) })} />
        </Row>
        <hr className="divider" />
        <Row title="New cards per session"
             hint="Caps how many unseen cards enter a Learn round, so a big set doesn't dump everything at once.">
          <input className="input num" type="number" min={0} max={100} style={{ width: 100 }}
                 value={settings.newPerSession}
                 onChange={e => set({ newPerSession: Math.max(0, +e.target.value || 0) })} />
        </Row>
        <hr className="divider" />
        <Row title="Typed answer grading"
             hint="Strict wants near-exact spelling. Normal forgives typos and articles. Lenient accepts an answer that contains the key idea.">
          <div className="row g6">
            {(['strict', 'normal', 'lenient'] as const).map(g => (
              <Chip key={g} on={settings.grading === g} onClick={() => set({ grading: g })}>
                {g[0].toUpperCase() + g.slice(1)}
              </Chip>
            ))}
          </div>
        </Row>
        <hr className="divider" />
        <Row title="Default prompt side" hint="Which side of the card study modes show first.">
          <div className="row g6">
            <Chip on={settings.askWith === 'term'} onClick={() => set({ askWith: 'term' })}>Term</Chip>
            <Chip on={settings.askWith === 'def'} onClick={() => set({ askWith: 'def' })}>Definition</Chip>
          </div>
        </Row>
      </div>

      <div className="eyebrow mb8">Sound</div>
      <div className="card card-pad mb24">
        <Row title="Answer sounds" hint="Short tones when you get something right or wrong.">
          <div className="row g8">
            <Chip on={settings.soundEnabled} onClick={() => set({ soundEnabled: !settings.soundEnabled })}>
              {settings.soundEnabled ? 'On' : 'Off'}
            </Chip>
            <button className="btn btn-sm" onClick={() => sfx.right()}>Test</button>
          </div>
        </Row>
        <hr className="divider" />
        <Row title="Read cards aloud"
             hint={ttsAvailable()
               ? 'Adds a speaker button to cards, using your system voices.'
               : 'Your browser does not offer speech synthesis.'}>
          <Chip on={settings.ttsEnabled} onClick={() => set({ ttsEnabled: !settings.ttsEnabled })}>
            {settings.ttsEnabled ? 'On' : 'Off'}
          </Chip>
        </Row>
        {settings.ttsEnabled && ttsAvailable() && (
          <>
            <hr className="divider" />
            <Row title="Speech rate">
              <div className="row g10">
                <input type="range" min={0.5} max={1.5} step={0.05} value={settings.ttsRate}
                       onChange={e => set({ ttsRate: +e.target.value })} style={{ width: 150 }} />
                <span className="mono muted num" style={{ minWidth: 34 }}>{settings.ttsRate.toFixed(2)}</span>
                <button className="btn btn-sm btn-icon"
                        onClick={() => speak('The mitochondrion is the powerhouse of the cell.',
                                            LANGS[0].code, settings.ttsRate)}>
                  <ISpeaker size={14} />
                </button>
              </div>
            </Row>
          </>
        )}
      </div>

      <div className="eyebrow mb8 row g8"><ISpark size={13} /> AI features (optional)</div>
      <div className="card card-pad mb24">
        <div className="hint mb16">
          QuizBuddy works fully without this. Add an Anthropic API key and you also get:
          generating cards from pasted notes, filling in missing definitions, and an
          explanation when you miss a card in Learn.
        </div>
        <div className="field mb12">
          <label className="label">Anthropic API key</label>
          <div className="row g8">
            <input
              className="input mono grow" type={showKey ? 'text' : 'password'}
              placeholder="sk-ant-…" value={keyDraft} autoComplete="off" spellCheck={false}
              onChange={e => setKeyDraft(e.target.value)}
            />
            <button className="btn" onClick={() => setShowKey(v => !v)}>
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div className="row g8">
          <button className="btn btn-accent btn-sm"
                  disabled={keyDraft === settings.apiKey}
                  onClick={() => { set({ apiKey: keyDraft.trim() }); toast('Key saved') }}>
            Save key
          </button>
          {hasKey(settings.apiKey) && (
            <button className="btn btn-sm" onClick={() => { set({ apiKey: '' }); setKeyDraft(''); toast('Key removed') }}>
              Remove
            </button>
          )}
          <span className="hint" style={{ alignSelf: 'center' }}>
            {hasKey(settings.apiKey) ? 'AI features are on.' : 'AI features are hidden.'}
          </span>
        </div>
        <div className="hint mt16" style={{ borderLeft: '2px solid var(--amber)', paddingLeft: 12 }}>
          The key is kept in this browser's local storage and sent straight to Anthropic when you
          use an AI feature. That means anything running on this page could read it — fine for
          your own machine, worth knowing before you use a shared computer. Usage is billed to
          your own Anthropic account.
        </div>
      </div>

      <div className="eyebrow mb8">Your data</div>
      <div className="card card-pad mb32">
        <Row title="Back up everything"
             hint={`${sets.length} sets, ${sets.reduce((n, s) => n + s.cards.length, 0)} cards, plus all progress and scores.`}>
          <button className="btn btn-sm" onClick={exportAll}><IDownload size={14} /> Export JSON</button>
        </Row>
        <hr className="divider" />
        <Row title="Restore from a backup" hint="Replaces your current sets with the ones in the file.">
          <>
            <input ref={fileRef} type="file" accept="application/json" hidden
                   onChange={e => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = '' }} />
            <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>Choose file…</button>
          </>
        </Row>
        <hr className="divider" />
        <Row title="Start over" hint="Deletes every set, all progress, and all scores. Your settings are kept.">
          <button className="btn btn-danger btn-sm" onClick={() => confirm({
            title: 'Delete everything?',
            body: 'All your sets, progress, and scores are removed and the starter sets come back. Export a backup first if you might want any of it.',
            run: () => { resetAll(); toast('Reset complete') },
          })}><ITrash size={14} /> Reset app</button>
        </Row>
      </div>

      <div className="hint ta-c">QuizBuddy · local-first · no ads, no accounts, no paywall</div>
      {dialog}
    </div>
  )
}
