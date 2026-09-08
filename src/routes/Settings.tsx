import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import type { AppState, Settings } from '../lib/types'
import { LANGS, speak, ttsAvailable } from '../lib/tts'
import { sfx } from '../lib/sound'
import { hasAi, resolveConfig } from '../lib/ai'
import { AiError, PROVIDERS, listModels, providerById, type ProviderId } from '../lib/providers'
import { download } from '../lib/utils'
import { toast, useConfirm, Chip, Spinner } from '../components/ui'
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
  const provider = providerById(settings.aiProvider)
  const [keyDraft, setKeyDraft] = useState(settings.aiKeys?.[settings.aiProvider] ?? '')
  const [models, setModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelError, setModelError] = useState('')

  const savedKey = settings.aiKeys?.[settings.aiProvider] ?? ''

  const fetchModels = useCallback(async () => {
    setLoadingModels(true); setModelError(''); setModels([])
    try {
      const found = await listModels(resolveConfig(settings))
      setModels(found)
      // Providers retire models; a saved name that no longer exists would fail
      // on every call with a confusing error, so move to something real.
      if (found.length && !found.includes(settings.aiModel)) {
        const def = providerById(settings.aiProvider)
        const preferred = def.models.find(m => found.includes(m)) ?? found[0]
        set({ aiModel: preferred })
        toast(`"${settings.aiModel}" isn't available — switched to ${preferred}`)
      }
    } catch (e) {
      setModelError(e instanceof AiError ? e.message : 'Could not list models.')
    } finally {
      setLoadingModels(false)
    }
  }, [settings])

  // Ask the provider what it can run as soon as we have enough to ask with.
  useEffect(() => {
    setModels([]); setModelError('')
    const def = providerById(settings.aiProvider)
    if (def.browserBlocked) return
    if (def.needsKey && !savedKey) return
    if (!def.needsKey && !(settings.aiBaseUrl || def.baseUrl)) return
    void fetchModels()
    // Re-run when the provider or its key changes, not on every settings edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.aiProvider, savedKey, settings.aiBaseUrl])
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

      <div className="eyebrow mb8 row g8"><ISpark size={13} /> AI provider (optional)</div>
      <div className="card card-pad mb24">
        <div className="hint mb16">
          Every study feature works without this. Connect any model provider and you also get
          the Create studio — decks built from your PDFs, slides, and photos — plus definition
          fill-in and miss explanations. Bring whichever provider you already pay for.
        </div>

        <div className="field mb16">
          <label className="label">Provider</label>
          <select
            className="select" value={settings.aiProvider}
            onChange={e => {
              const id = e.target.value as ProviderId
              const def = providerById(id)
              set({
                aiProvider: id,
                aiModel: def.models[0] ?? '',
                aiBaseUrl: id === 'custom' ? settings.aiBaseUrl : '',
              })
              setKeyDraft(settings.aiKeys?.[id] ?? '')
            }}
          >
            {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {provider.note && (
            <div className="hint" style={provider.browserBlocked
              ? { borderLeft: '2px solid var(--red)', paddingLeft: 10, color: 'var(--red)' }
              : undefined}>
              {provider.note}
            </div>
          )}
        </div>

        {(provider.id === 'custom' || provider.id === 'ollama') && (
          <div className="field mb16">
            <label className="label">Base URL</label>
            <input
              className="input mono" spellCheck={false}
              placeholder={provider.baseUrl || 'https://your-gateway.example.com/v1'}
              value={settings.aiBaseUrl}
              onChange={e => set({ aiBaseUrl: e.target.value.trim() })}
            />
            <div className="hint">
              Anything that speaks OpenAI&rsquo;s /chat/completions. The endpoint must send CORS
              headers for the browser to reach it.
            </div>
          </div>
        )}

        <div className="field mb16">
          <div className="row-between">
            <label className="label">Model</label>
            <button className="btn btn-ghost btn-sm" onClick={fetchModels} disabled={loadingModels}>
              {loadingModels ? <><Spinner /> Loading…</> : 'Refresh list'}
            </button>
          </div>

          {models.length > 0 ? (
            <select className="select" value={settings.aiModel}
                    onChange={e => set({ aiModel: e.target.value })}>
              {!models.includes(settings.aiModel) && settings.aiModel && (
                <option value={settings.aiModel}>{settings.aiModel} (not in list)</option>
              )}
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : (
            <>
              <input
                className="input mono" spellCheck={false} value={settings.aiModel}
                placeholder={provider.models[0] ?? 'model-name'} list="model-suggestions"
                onChange={e => set({ aiModel: e.target.value.trim() })}
              />
              <datalist id="model-suggestions">
                {provider.models.map(m => <option key={m} value={m} />)}
              </datalist>
              {provider.models.length > 0 && (
                <div className="row g6 mt4 wrap-flex">
                  {provider.models.map(m => (
                    <button key={m} className="chip" data-on={settings.aiModel === m}
                            onClick={() => set({ aiModel: m })}>
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="hint">
            {loadingModels ? 'Asking the provider what it can run…'
              : models.length > 0 ? `${models.length} models available on your key.`
              : modelError ? modelError
              : 'Suggestions only — save a key and this becomes the provider\u2019s real list.'}
          </div>
        </div>

        {provider.needsKey && (
          <>
            <div className="field mb12">
              <label className="label">{provider.name} API key</label>
              <div className="row g8">
                <input
                  className="input mono grow" type={showKey ? 'text' : 'password'}
                  placeholder="Paste your key" value={keyDraft}
                  autoComplete="off" spellCheck={false}
                  onChange={e => setKeyDraft(e.target.value)}
                />
                <button className="btn" onClick={() => setShowKey(v => !v)}>
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
              {provider.keyUrl && (
                <div className="hint">
                  <a className="lp-link" href={provider.keyUrl} target="_blank" rel="noreferrer">
                    Get a key
                  </a>
                </div>
              )}
            </div>
            <div className="row g8 wrap-flex">
              <button className="btn btn-accent btn-sm"
                      disabled={keyDraft === (settings.aiKeys?.[settings.aiProvider] ?? '')}
                      onClick={() => {
                        set({ aiKeys: { ...settings.aiKeys, [settings.aiProvider]: keyDraft.trim() } })
                        toast('Key saved')
                      }}>
                Save key
              </button>
              {(settings.aiKeys?.[settings.aiProvider] ?? '') !== '' && (
                <button className="btn btn-sm" onClick={() => {
                  set({ aiKeys: { ...settings.aiKeys, [settings.aiProvider]: '' } })
                  setKeyDraft(''); toast('Key removed')
                }}>
                  Remove
                </button>
              )}
              <span className="hint" style={{ alignSelf: 'center' }}>
                {hasAi(settings) ? 'AI features are on.' : 'AI features are hidden.'}
              </span>
            </div>
          </>
        )}

        {!provider.needsKey && (
          <div className="hint">
            {hasAi(settings)
              ? 'AI features are on — no key needed for this provider.'
              : 'Set a base URL and model above to switch AI features on.'}
          </div>
        )}

        <div className="row g8 mt16 wrap-flex">
          <span className="badge">
            {provider.pdf ? 'Reads PDFs' : 'No PDF support'}
          </span>
          <span className="badge">
            {provider.images ? 'Reads images' : 'No image support'}
          </span>
          {provider.browserBlocked && <span className="badge badge-red">Not browser-reachable</span>}
        </div>

        <div className="hint mt16" style={{ borderLeft: '2px solid var(--amber)', paddingLeft: 12 }}>
          Keys are kept in this browser&rsquo;s local storage and sent straight to the provider you
          pick. Anything running on this page could read them — fine on your own machine, worth
          knowing on a shared one. Usage bills to your own account. Keys are stored per provider,
          so switching back and forth doesn&rsquo;t lose them.
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
