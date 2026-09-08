import { useMemo, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import {
  accepts, describe, extract, ExtractError, type Source,
} from '../lib/extract'
import {
  AiError, NOTE_TOOLS, RECIPES, askAboutNotes, draftsToCards, hasAi, openingAsk,
  recipeById, resolveConfig, runNoteTool, studioTurn, toolById,
  type DraftCard, type RecipeId, type StudioTurn, type ToolId,
} from '../lib/ai'
import { providerById } from '../lib/providers'
import { parsePairs, detectOptions, pairsFromFile, COL_SEP_CHAR, type ParseOptions } from '../lib/import'
import { renderMd } from '../lib/md'
import { plural, download } from '../lib/utils'
import { navigate, toast, Spinner, AutoText } from '../components/ui'
import {
  ISpark, IUpload, IFile, IImage, IX, ISend, ICheck, ITrash, IPlus,
  ICards, IList, IPen, IBrain, IClock, ILayers, ITarget, IChat, IDownload, ICopy,
} from '../components/Icons'

type Tab = 'cards' | 'tools' | 'ask'

/** Icon + colour per recipe, kept out of lib so the data layer stays view-free. */
const RECIPE_LOOK: Record<RecipeId, { icon: typeof ICards; color: string }> = {
  flashcards: { icon: ICards,   color: '#7c6cf0' },
  cloze:      { icon: IPen,     color: '#4aa8ff' },
  glossary:   { icon: IList,    color: '#2fe0b0' },
  questions:  { icon: IBrain,   color: '#f472b6' },
  formulas:   { icon: ITarget,  color: '#fb923c' },
  timeline:   { icon: IClock,   color: '#ffb020' },
  compare:    { icon: ILayers,  color: '#ff6b6b' },
  vocab:      { icon: IChat,    color: '#a3e635' },
  topic:      { icon: ISpark,   color: '#7c6cf0' },
  define:     { icon: IPen,     color: '#2fe0b0' },
  reverse:    { icon: ILayers,  color: '#4aa8ff' },
}

const QUICK = ['Make them harder', 'Add 10 more', 'Simplify the wording', 'Shorter answers', 'Cover what I missed']

function SourceRow({ s, onRemove }: { s: Source; onRemove: () => void }) {
  const color = s.kind === 'pdf' ? 'var(--c-coral)' : s.kind === 'image' ? 'var(--c-sky)' : 'var(--c-mint)'
  return (
    <div className="src">
      <div className="src-ic" style={{ background: color }}>
        {s.kind === 'image' ? <IImage size={15} /> : <IFile size={15} />}
      </div>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="fs13 fw6 trunc">{s.name}</div>
        <div className="fs12 dim">{describe(s)}</div>
      </div>
      <button className="btn btn-ghost btn-icon btn-sm" onClick={onRemove} aria-label="Remove"><IX size={14} /></button>
    </div>
  )
}

export default function Create() {
  const settings = useStore(s => s.settings)
  const sets = useStore(s => s.sets)
  const createSet = useStore(s => s.createSet)
  const addCards = useStore(s => s.addCards)

  const preselect = new URLSearchParams(location.hash.split('?')[1] ?? '').get('set')
  const ai = hasAi(settings)
  const provider = providerById(settings.aiProvider)

  const [tab, setTab] = useState<Tab>('cards')
  const [recipe, setRecipe] = useState<RecipeId | 'own'>('flashcards')
  const [sources, setSources] = useState<Source[]>([])
  const [pasted, setPasted] = useState('')
  const [typed, setTyped] = useState('')
  const [count, setCount] = useState(20)
  const [focus, setFocus] = useState('')
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)

  const [history, setHistory] = useState<StudioTurn[]>([])
  const [drafts, setDrafts] = useState<DraftCard[]>([])
  const [keep, setKeep] = useState<boolean[]>([])
  const [ask, setAsk] = useState('')

  const [tool, setTool] = useState<ToolId>('summary')
  const [doc, setDoc] = useState('')
  const [qa, setQa] = useState<{ role: 'user' | 'assistant'; text: string }[]>([])
  const [question, setQuestion] = useState('')

  const [target, setTarget] = useState<'new' | string>(preselect ?? 'new')
  const [title, setTitle] = useState('')
  const [importOpts, setImportOpts] = useState<ParseOptions | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const pairsRef = useRef<HTMLInputElement>(null)

  const cfg = useMemo(() => resolveConfig(settings), [settings])
  const isOwn = recipe === 'own'
  const rec = isOwn ? null : recipeById(recipe as RecipeId)
  const needsSources = rec?.needsSources ?? false

  const ingest = async (files: FileList | File[]) => {
    const added: Source[] = []
    for (const f of Array.from(files)) {
      try { added.push(await extract(f)) }
      catch (e) { toast(e instanceof ExtractError ? e.message : `Could not read ${f.name}`) }
    }
    if (added.length) { setSources(v => [...v, ...added]); toast(`Added ${plural(added.length, 'file')}`) }
  }

  const allSources = (): Source[] => {
    const list = [...sources]
    if (pasted.trim()) {
      list.push({ id: 'pasted', kind: 'text', name: 'Pasted notes', text: pasted.trim(), size: pasted.length })
    }
    return list
  }

  const setDraftList = (cards: DraftCard[]) => {
    setDrafts(cards); setKeep(cards.map(() => true))
    if (!title && cards.length) setTitle(suggestTitle(sources, rec?.name ?? 'New deck'))
  }

  /* ---------- no-AI: bring your own pairs ---------- */

  const parseOwn = (text: string, opts?: ParseOptions) => {
    const o = opts ?? detectOptions(text)
    setImportOpts(o)
    const cards = parsePairs(text, o)
    if (!cards.length) { toast('No pairs found — try a different separator'); return }
    setDraftList(cards.map(c => ({ term: c.term, def: c.def, hint: '' })))
    toast(`Found ${plural(cards.length, 'card')}`)
  }

  const ingestPairsFile = async (file: File) => {
    try {
      const { cards, opts } = await pairsFromFile(file)
      setImportOpts(opts)
      if (!cards.length) { toast(`No term/definition pairs found in ${file.name}`); return }
      setTyped(await file.text())
      setDraftList(cards.map(c => ({ term: c.term, def: c.def, hint: '' })))
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim())
      toast(`Imported ${plural(cards.length, 'card')}`)
    } catch {
      toast(`Could not read ${file.name}`)
    }
  }

  /* ---------- AI runs ---------- */

  const run = async (question: string, first: boolean) => {
    if (!ai) { toast('Connect a provider in Settings first'); return }
    const srcs = needsSources ? allSources() : []
    if (needsSources && !srcs.length) { toast('Add a file or paste some notes first'); return }
    if (!needsSources && first && !typed.trim()) { toast('Type something to work from first'); return }

    setBusy(true)
    try {
      const reply = await studioTurn(cfg, srcs, first ? [] : history, question, recipe as RecipeId)
      setHistory(h => [
        ...(first ? [] : h),
        { role: 'user', text: question },
        { role: 'assistant', text: reply.message, cards: reply.cards },
      ])
      setDraftList(reply.cards)
    } catch (e) {
      toast(e instanceof AiError ? e.message : 'Something went wrong')
    } finally { setBusy(false) }
  }

  const runTool = async () => {
    const srcs = allSources()
    if (!srcs.length) { toast('Add material first'); return }
    setBusy(true); setDoc('')
    try {
      setDoc(await runNoteTool(cfg, srcs, tool, focus))
    } catch (e) {
      toast(e instanceof AiError ? e.message : 'Something went wrong')
    } finally { setBusy(false) }
  }

  const sendQuestion = async () => {
    const srcs = allSources()
    if (!srcs.length) { toast('Add material first'); return }
    if (!question.trim()) return
    const q = question.trim()
    setQuestion(''); setQa(v => [...v, { role: 'user', text: q }]); setBusy(true)
    try {
      const answer = await askAboutNotes(cfg, srcs, qa, q)
      setQa(v => [...v, { role: 'assistant', text: answer }])
    } catch (e) {
      toast(e instanceof AiError ? e.message : 'Something went wrong')
      setQa(v => v.slice(0, -1))
    } finally { setBusy(false) }
  }

  const save = () => {
    const chosen = drafts.filter((_, i) => keep[i])
    if (!chosen.length) { toast('Nothing selected'); return }
    const cards = draftsToCards(chosen)
    if (target === 'new') {
      const name = title.trim() || 'Untitled deck'
      const id = createSet({ title: name, cards })
      toast(`Created "${name}"`); navigate(`/set/${id}`)
    } else {
      addCards(target, cards)
      toast(`Added ${plural(cards.length, 'card')}`); navigate(`/set/${target}`)
    }
  }

  const kept = keep.filter(Boolean).length

  /* ---------- render ---------- */

  const sourcePanel = (
    <div className="card card-pad">
      <div className="h3 mb12">Your material</div>
      <div
        className="drop" data-over={over}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) ingest(e.dataTransfer.files) }}
      >
        <input ref={fileRef} type="file" hidden multiple accept={accepts()}
               onChange={e => { if (e.target.files) ingest(e.target.files); e.target.value = '' }} />
        <IUpload size={24} className="muted" />
        <div className="h3 mt8">Drop files here</div>
        <div className="hint mt4">
          {provider.pdf ? 'PDF, Word, images, or text.' : 'Word or text files.'}<br />
          {provider.images ? 'Photos of handwritten notes work too.' : `${provider.name} can’t read images — text only.`}
        </div>
      </div>

      {sources.length > 0 && (
        <div className="col g8 mt12">
          {sources.map(s => (
            <SourceRow key={s.id} s={s} onRemove={() => setSources(v => v.filter(x => x.id !== s.id))} />
          ))}
        </div>
      )}

      <div className="field mt16">
        <label className="label">Or paste notes</label>
        <textarea className="textarea" style={{ minHeight: 120 }}
                  placeholder="Paste lecture notes, a study guide, a chapter summary…"
                  value={pasted} onChange={e => setPasted(e.target.value)} />
      </div>
    </div>
  )

  return (
    <div className="wrap wrap-wide">
      <div className="row g12 mb4">
        <div className="action-ic" style={{ background: 'linear-gradient(140deg,#7c6cf0,#4aa8ff)', margin: 0, width: 38, height: 38 }}>
          <ISpark size={18} />
        </div>
        <div className="h1">Create</div>
      </div>
      <div className="body-lg mb20">
        However your material already exists — a PDF, a photo of your handwriting, a list you
        typed years ago, or nothing but a topic in your head — there's a way in here.
      </div>

      {!ai && (
        <div className="card card-pad mb20 row-between wrap-flex" style={{ borderColor: 'var(--amber-line)' }}>
          <div>
            <div className="h3">No AI provider connected</div>
            <div className="hint mt4">
              Importing your own terms and definitions works right now. For everything else,
              connect any provider — Anthropic, OpenAI, Gemini, OpenRouter, or a local model.
            </div>
          </div>
          <button className="btn btn-accent btn-sm" onClick={() => navigate('/settings')}>Connect one</button>
        </div>
      )}

      <div className="tabs">
        <button className="tab" data-on={tab === 'cards'} onClick={() => setTab('cards')}>Make cards</button>
        <button className="tab" data-on={tab === 'tools'} onClick={() => setTab('tools')}>Study tools</button>
        <button className="tab" data-on={tab === 'ask'} onClick={() => setTab('ask')}>Ask your notes</button>
      </div>

      <div className="studio">
        <div className="col g16">
          {/* ---------------- make cards ---------------- */}
          {tab === 'cards' && (
            <>
              <div className="card card-pad">
                <div className="h3 mb4">How do you want to build them?</div>
                <div className="hint mb12">Twelve ways in. Pick whichever matches what you already have.</div>
                <div className="grid3 g8" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))' }}>
                  <button className="recipe" data-on={isOwn} onClick={() => { setRecipe('own'); setHistory([]) }}>
                    <div className="recipe-top">
                      <div className="recipe-ic" style={{ background: '#8a8a9a' }}><IUpload size={14} /></div>
                      <span className="recipe-name">I already have them</span>
                    </div>
                    <span className="recipe-blurb">Paste or upload your own list. No AI involved.</span>
                  </button>
                  {RECIPES.map(r => {
                    const look = RECIPE_LOOK[r.id]
                    return (
                      <button key={r.id} className="recipe" data-on={recipe === r.id}
                              disabled={!ai}
                              onClick={() => { setRecipe(r.id); setHistory([]) }}>
                        <div className="recipe-top">
                          <div className="recipe-ic" style={{ background: look.color }}><look.icon size={14} /></div>
                          <span className="recipe-name">{r.name}</span>
                        </div>
                        <span className="recipe-blurb">{r.blurb}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {isOwn ? (
                <div className="card card-pad">
                  <div className="h3 mb4">Your terms and definitions</div>
                  <div className="hint mb12">
                    One card per line. The separator is detected automatically — tab, comma, dash,
                    colon, or equals — and only the first one on each line is split, so commas
                    inside definitions survive.
                  </div>
                  <div className="row g8 mb12 wrap-flex">
                    <button className="btn btn-sm" onClick={() => pairsRef.current?.click()}>
                      <IUpload size={14} /> Upload a list
                    </button>
                    <input ref={pairsRef} type="file" hidden accept=".txt,.csv,.tsv,.md,text/*"
                           onChange={e => { const f = e.target.files?.[0]; if (f) ingestPairsFile(f); e.target.value = '' }} />
                    <span className="hint" style={{ alignSelf: 'center' }}>
                      .txt, .csv or .tsv — a Quizlet or Anki export works
                    </span>
                  </div>
                  <textarea
                    className="textarea mono" style={{ minHeight: 200 }}
                    placeholder={'Mitochondrion\tProduces ATP through cellular respiration\nRibosome\tSite of protein synthesis'}
                    value={typed}
                    onChange={e => { setTyped(e.target.value); if (e.target.value.trim()) parseOwn(e.target.value) }}
                  />
                  {importOpts && typed.trim() && (
                    <div className="row g8 mt12 wrap-flex">
                      <span className="hint" style={{ alignSelf: 'center' }}>Split on:</span>
                      {(['tab', 'comma', 'dash', 'equals', 'colon'] as const).map(c => (
                        <button key={c} className="chip" data-on={importOpts.col === c}
                                onClick={() => parseOwn(typed, { ...importOpts, col: c })}>
                          {c === 'tab' ? 'Tab' : COL_SEP_CHAR[c].trim()}
                        </button>
                      ))}
                      <button className="chip" data-on={importOpts.swap}
                              onClick={() => parseOwn(typed, { ...importOpts, swap: !importOpts.swap })}>
                        Definition first
                      </button>
                    </div>
                  )}
                </div>
              ) : history.length === 0 ? (
                <div className="card card-pad">
                  <div className="h3 mb12">{rec?.name}</div>
                  {!needsSources && (
                    <div className="field mb12">
                      <label className="label">
                        {recipe === 'topic' ? 'What topic?'
                          : recipe === 'define' ? 'Your terms, one per line'
                          : 'Your definitions, one per line'}
                      </label>
                      {recipe === 'topic' ? (
                        <input className="input" value={typed} placeholder="The Krebs cycle, for AP Biology"
                               onChange={e => setTyped(e.target.value)} />
                      ) : (
                        <textarea className="textarea" style={{ minHeight: 150 }} value={typed}
                                  placeholder={recipe === 'define' ? 'Osmosis\nDiffusion\nActive transport' : 'The movement of water across a membrane…'}
                                  onChange={e => setTyped(e.target.value)} />
                      )}
                    </div>
                  )}
                  <div className="row g12 mb16 wrap-flex">
                    {recipe !== 'define' && recipe !== 'reverse' && (
                      <div className="field" style={{ maxWidth: 150 }}>
                        <label className="label">How many cards</label>
                        <input className="input num" type="number" min={5} max={80} value={count}
                               onChange={e => setCount(Math.max(5, Math.min(80, +e.target.value || 20)))} />
                      </div>
                    )}
                    <div className="field grow">
                      <label className="label">Focus or level (optional)</label>
                      <input className="input" value={focus} placeholder="e.g. only chapter 4, undergraduate level"
                             onChange={e => setFocus(e.target.value)} />
                    </div>
                  </div>
                  <button className="btn btn-accent btn-lg btn-block" disabled={!ai || busy}
                          onClick={() => run(openingAsk(recipe as RecipeId, count, focus, typed), true)}>
                    {busy ? <><Spinner /> Working…</> : <><ISpark size={16} /> Build my cards</>}
                  </button>
                  {needsSources && !allSources().length && (
                    <div className="hint ta-c mt8">Add a file or paste notes on the right first.</div>
                  )}
                </div>
              ) : (
                <div className="card card-pad">
                  <div className="row-between mb12">
                    <div className="h3 row g8"><IChat size={16} /> Refine</div>
                    <button className="btn btn-ghost btn-sm"
                            onClick={() => { setHistory([]); setDrafts([]); setKeep([]) }}>Start over</button>
                  </div>
                  <div className="chat">
                    {history.map((t, i) => (
                      <div key={i} className={t.role === 'user' ? 'bubble bubble-me' : 'bubble bubble-ai'}>
                        {t.text}
                        {t.role === 'assistant' && t.cards && (
                          <div className="fs12 mt8" style={{ opacity: .7 }}>{plural(t.cards.length, 'card')} drafted</div>
                        )}
                      </div>
                    ))}
                    {busy && <div className="bubble bubble-ai row g8"><Spinner /> Thinking…</div>}
                  </div>
                  <div className="row g6 mt12 wrap-flex">
                    {QUICK.map(p => (
                      <button key={p} className="chip" disabled={busy} onClick={() => run(p, false)}>{p}</button>
                    ))}
                  </div>
                  <div className="row g8 mt12">
                    <input className="input grow" value={ask} disabled={busy} placeholder="Ask for a change…"
                           onChange={e => setAsk(e.target.value)}
                           onKeyDown={e => { if (e.key === 'Enter' && ask.trim() && !busy) { run(ask.trim(), false); setAsk('') } }} />
                    <button className="btn btn-accent btn-icon" disabled={busy || !ask.trim()}
                            onClick={() => { run(ask.trim(), false); setAsk('') }}><ISend size={16} /></button>
                  </div>
                </div>
              )}

              {drafts.length > 0 && (
                <div className="card card-pad">
                  <div className="row-between mb12 wrap-flex">
                    <div className="h3">{plural(drafts.length, 'card')} ready</div>
                    <div className="row g8">
                      <span className="badge badge-accent">{kept} selected</span>
                      <button className="btn btn-ghost btn-sm"
                              onClick={() => setKeep(k => k.map(() => !k.every(Boolean)))}>
                        {keep.every(Boolean) ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                  </div>
                  <div className="col g8" style={{ maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
                    {drafts.map((d, i) => (
                      <div key={i} className="draft" data-off={!keep[i]}>
                        <button className="tick" data-on={keep[i]} aria-label="Include"
                                onClick={() => setKeep(k => k.map((v, n) => (n === i ? !v : v)))}>
                          <ICheck size={12} />
                        </button>
                        <AutoText className="cell-input" value={d.term} placeholder="Term"
                                  onChange={e => setDrafts(v => v.map((c, n) => (n === i ? { ...c, term: e.target.value } : c)))} />
                        <AutoText className="cell-input" value={d.def} placeholder="Definition"
                                  onChange={e => setDrafts(v => v.map((c, n) => (n === i ? { ...c, def: e.target.value } : c)))} />
                        <button className="btn btn-ghost btn-icon btn-sm" aria-label="Delete"
                                onClick={() => { setDrafts(v => v.filter((_, n) => n !== i)); setKeep(k => k.filter((_, n) => n !== i)) }}>
                          <ITrash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <hr className="divider mt16 mb16" />
                  <div className="row g12 wrap-flex" style={{ alignItems: 'flex-end' }}>
                    <div className="field grow" style={{ minWidth: 170 }}>
                      <label className="label">Save to</label>
                      <select className="select" value={target} onChange={e => setTarget(e.target.value)}>
                        <option value="new">A new set</option>
                        {sets.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                      </select>
                    </div>
                    {target === 'new' && (
                      <div className="field grow" style={{ minWidth: 170 }}>
                        <label className="label">Set name</label>
                        <input className="input" value={title} placeholder="Untitled deck"
                               onChange={e => setTitle(e.target.value)} />
                      </div>
                    )}
                    <button className="btn btn-accent btn-lg" onClick={save} disabled={!kept}>
                      <IPlus size={16} /> Save {kept}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ---------------- study tools ---------------- */}
          {tab === 'tools' && (
            <>
              <div className="card card-pad">
                <div className="h3 mb4">What should it do with your notes?</div>
                <div className="hint mb12">Cards aren't the only useful thing to make from material.</div>
                <div className="grid3 g8" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))' }}>
                  {NOTE_TOOLS.map(t => (
                    <button key={t.id} className="recipe" data-on={tool === t.id} disabled={!ai}
                            onClick={() => { setTool(t.id); setDoc('') }}>
                      <div className="recipe-top"><span className="recipe-name">{t.name}</span></div>
                      <span className="recipe-blurb">{t.blurb}</span>
                    </button>
                  ))}
                </div>
                <div className="field mt16">
                  <label className="label">Anything specific? (optional)</label>
                  <input className="input" value={focus} placeholder="e.g. focus on the second half"
                         onChange={e => setFocus(e.target.value)} />
                </div>
                <button className="btn btn-accent btn-lg btn-block mt12" onClick={runTool} disabled={!ai || busy}>
                  {busy ? <><Spinner /> Working…</> : <>{toolById(tool).name}</>}
                </button>
              </div>

              {doc && (
                <div className="card card-pad">
                  <div className="row-between mb12 wrap-flex">
                    <div className="h3">{toolById(tool).name}</div>
                    <div className="row g8">
                      <button className="btn btn-sm" onClick={() => {
                        navigator.clipboard?.writeText(doc); toast('Copied')
                      }}><ICopy size={14} /> Copy</button>
                      <button className="btn btn-sm" onClick={() => {
                        download(`${toolById(tool).id}.md`, doc, 'text/markdown'); toast('Downloaded')
                      }}><IDownload size={14} /> Save</button>
                    </div>
                  </div>
                  <div className="doc" dangerouslySetInnerHTML={{ __html: renderMd(doc) }} />
                </div>
              )}
            </>
          )}

          {/* ---------------- ask ---------------- */}
          {tab === 'ask' && (
            <div className="card card-pad">
              <div className="h3 mb4">Ask about your material</div>
              <div className="hint mb12">
                Questions answered from what you uploaded. It says so when it's drawing on
                general knowledge instead.
              </div>
              <div className="chat" style={{ maxHeight: 420 }}>
                {qa.length === 0 && !busy && (
                  <div className="hint ta-c" style={{ padding: 24 }}>
                    Nothing asked yet. Try "what's the difference between X and Y?"
                  </div>
                )}
                {qa.map((m, i) => (
                  <div key={i} className={m.role === 'user' ? 'bubble bubble-me' : 'bubble bubble-ai'}>
                    {m.role === 'assistant'
                      ? <div className="doc" style={{ maxHeight: 'none' }} dangerouslySetInnerHTML={{ __html: renderMd(m.text) }} />
                      : m.text}
                  </div>
                ))}
                {busy && <div className="bubble bubble-ai row g8"><Spinner /> Thinking…</div>}
              </div>
              <div className="row g8 mt12">
                <input className="input grow" value={question} disabled={!ai || busy}
                       placeholder="Ask anything about your notes…"
                       onChange={e => setQuestion(e.target.value)}
                       onKeyDown={e => { if (e.key === 'Enter') sendQuestion() }} />
                <button className="btn btn-accent btn-icon" disabled={!ai || busy || !question.trim()}
                        onClick={sendQuestion}><ISend size={16} /></button>
              </div>
            </div>
          )}
        </div>

        {/* ---------------- sources ---------------- */}
        <div className="col g16">
          {(tab !== 'cards' || needsSources) && sourcePanel}
          <div className="card card-pad">
            <div className="fs13 fw6 mb8">
              {ai ? `Using ${provider.name}` : 'How this works'}
            </div>
            <div className="hint">
              {ai ? (
                <>
                  Model <span className="mono">{cfg.model}</span>.{' '}
                  {provider.pdf
                    ? 'PDFs and images go to the model as-is, so diagrams and scans come through.'
                    : 'This provider reads text only — PDFs and images will not be understood.'}{' '}
                  Nothing is stored on a server; files go straight from this browser to the provider.
                </>
              ) : (
                <>
                  Importing your own lists needs no provider and no network. AI features work with
                  Anthropic, OpenAI, Gemini, OpenRouter, Groq, DeepSeek, Mistral, or any local
                  model through Ollama.
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function suggestTitle(sources: Source[], fallback: string): string {
  const file = sources.find(s => s.name && s.name !== 'Pasted notes')
  if (!file) return fallback
  return file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || fallback
}
