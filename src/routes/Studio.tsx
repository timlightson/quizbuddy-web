import { useRef, useState } from 'react'
import { useStore } from '../lib/store'
import {
  accepts, describe, extract, ExtractError, type Source,
} from '../lib/extract'
import {
  AIError, draftsToCards, hasKey, openingAsk, studioTurn,
  type DraftCard, type StudioTurn,
} from '../lib/ai'
import { plural } from '../lib/utils'
import { navigate, toast, Spinner, Empty, AutoText } from '../components/ui'
import {
  ISpark, IUpload, IFile, IImage, IX, ISend, ICheck, ITrash, IChat, IPlus,
} from '../components/Icons'

const PROMPTS = [
  'Make them harder',
  'Focus on definitions only',
  'Add 10 more',
  'Simplify the wording',
  'Cover the parts I missed',
]

function SourceRow({ s, onRemove }: { s: Source; onRemove: () => void }) {
  const color = s.kind === 'pdf' ? 'var(--c-coral)'
    : s.kind === 'image' ? 'var(--c-sky)' : 'var(--c-mint)'
  return (
    <div className="src">
      <div className="src-ic" style={{ background: color }}>
        {s.kind === 'image' ? <IImage size={15} /> : <IFile size={15} />}
      </div>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="fs13 fw6 trunc">{s.name}</div>
        <div className="fs12 dim">{describe(s)}</div>
      </div>
      <button className="btn btn-ghost btn-icon btn-sm" onClick={onRemove} aria-label="Remove">
        <IX size={14} />
      </button>
    </div>
  )
}

export default function Studio() {
  const apiKey = useStore(s => s.settings.apiKey)
  const sets = useStore(s => s.sets)
  const createSet = useStore(s => s.createSet)
  const addCards = useStore(s => s.addCards)

  const [sources, setSources] = useState<Source[]>([])
  const [pasted, setPasted] = useState('')
  const [count, setCount] = useState(20)
  const [focus, setFocus] = useState('')
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [history, setHistory] = useState<StudioTurn[]>([])
  const [drafts, setDrafts] = useState<DraftCard[]>([])
  const [keep, setKeep] = useState<boolean[]>([])
  const [ask, setAsk] = useState('')
  const [target, setTarget] = useState<'new' | string>('new')
  const [title, setTitle] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  if (!hasKey(apiKey)) {
    return (
      <div className="wrap wrap-narrow">
        <Empty
          icon={<ISpark size={22} />}
          title="Add a key to use the AI studio"
          body="The studio reads your PDFs, slides, Word docs, and photos of handwritten notes, then builds a deck you can edit before saving. It needs your own Anthropic API key — everything else in QuizBuddy works without one."
          action={<button className="btn btn-accent btn-lg" onClick={() => navigate('/settings')}>Open settings</button>}
        />
      </div>
    )
  }

  const ingest = async (files: FileList | File[]) => {
    const added: Source[] = []
    for (const f of Array.from(files)) {
      try {
        added.push(await extract(f))
      } catch (e) {
        toast(e instanceof ExtractError ? e.message : `Could not read ${f.name}`)
      }
    }
    if (added.length) {
      setSources(v => [...v, ...added])
      toast(`Added ${plural(added.length, 'file')}`)
    }
  }

  const allSources = (): Source[] => {
    const list = [...sources]
    if (pasted.trim()) {
      list.push({
        id: 'pasted', kind: 'text', name: 'Pasted notes',
        text: pasted.trim(), size: pasted.length,
      })
    }
    return list
  }

  const run = async (question: string, isFirst: boolean) => {
    const srcs = allSources()
    if (!srcs.length) { toast('Add a file or paste some notes first'); return }

    setBusy(true); setProgress(0)
    const nextHistory: StudioTurn[] = isFirst
      ? [] : [...history, { role: 'user', text: question }]
    if (!isFirst) setHistory(nextHistory)

    try {
      const reply = await studioTurn(
        apiKey, srcs,
        isFirst ? [] : history,
        question,
        setProgress,
      )
      setHistory(h => [
        ...(isFirst ? [] : h),
        { role: 'user', text: question },
        { role: 'assistant', text: reply.message, cards: reply.cards },
      ])
      setDrafts(reply.cards)
      setKeep(reply.cards.map(() => true))
      if (!title && reply.cards.length) setTitle(suggestTitle(srcs))
      setTimeout(() => chatRef.current?.scrollTo({ top: 9e9, behavior: 'smooth' }), 60)
    } catch (e) {
      toast(e instanceof AIError ? e.message : 'Something went wrong')
      if (!isFirst) setHistory(history)
    } finally {
      setBusy(false); setProgress(0)
    }
  }

  const save = () => {
    const chosen = drafts.filter((_, i) => keep[i])
    if (!chosen.length) { toast('Nothing selected'); return }
    const cards = draftsToCards(chosen)

    if (target === 'new') {
      const id = createSet({
        title: title.trim() || 'Untitled deck',
        description: sources.length ? `Built from ${sources.map(s => s.name).join(', ')}` : '',
        cards,
      })
      toast(`Created "${title.trim() || 'Untitled deck'}"`)
      navigate(`/set/${id}`)
    } else {
      addCards(target, cards)
      toast(`Added ${plural(cards.length, 'card')}`)
      navigate(`/set/${target}`)
    }
  }

  const kept = keep.filter(Boolean).length
  const ready = allSources().length > 0

  return (
    <div className="wrap wrap-wide">
      <div className="row g12 mb4">
        <div className="action-ic" style={{ background: 'linear-gradient(140deg,#7c6cf0,#4aa8ff)', margin: 0, width: 38, height: 38 }}>
          <ISpark size={18} />
        </div>
        <div className="h1">AI Studio</div>
      </div>
      <div className="body-lg mb24">
        Drop in a lecture PDF, your slides, a Word doc, or a photo of your handwritten
        notes. Claude reads it and drafts a deck — then you tell it what to change.
      </div>

      <div className="studio">
        {/* ---------------- left: conversation + drafts ---------------- */}
        <div className="col g16">
          {history.length === 0 ? (
            <div className="card card-pad">
              <div className="h3 mb16">What should it make?</div>
              <div className="row g12 mb16 wrap-flex">
                <div className="field" style={{ maxWidth: 150 }}>
                  <label className="label">How many cards</label>
                  <input className="input num" type="number" min={5} max={80} value={count}
                         onChange={e => setCount(Math.max(5, Math.min(80, +e.target.value || 20)))} />
                </div>
                <div className="field grow">
                  <label className="label">Anything to focus on? (optional)</label>
                  <input className="input" value={focus} placeholder="e.g. only chapter 4, skip the case studies"
                         onChange={e => setFocus(e.target.value)} />
                </div>
              </div>
              <button className="btn btn-accent btn-lg btn-block"
                      disabled={!ready || busy}
                      onClick={() => run(openingAsk(count, focus), true)}>
                {busy
                  ? <><Spinner /> Reading your material… {progress > 0 && `${progress.toLocaleString()} chars`}</>
                  : <><ISpark size={16} /> Build my deck</>}
              </button>
              {!ready && <div className="hint ta-c mt8">Add a file or paste notes on the right first.</div>}
            </div>
          ) : (
            <div className="card card-pad">
              <div className="row-between mb12">
                <div className="h3 row g8"><IChat size={16} /> Conversation</div>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  setHistory([]); setDrafts([]); setKeep([])
                }}>Start over</button>
              </div>
              <div className="chat" ref={chatRef}>
                {history.map((t, i) => (
                  <div key={i} className={t.role === 'user' ? 'bubble bubble-me' : 'bubble bubble-ai'}>
                    {t.text}
                    {t.role === 'assistant' && t.cards && (
                      <div className="fs12 mt8" style={{ opacity: .7 }}>
                        {plural(t.cards.length, 'card')} drafted
                      </div>
                    )}
                  </div>
                ))}
                {busy && (
                  <div className="bubble bubble-ai row g8">
                    <Spinner /> Thinking… {progress > 0 && `${progress.toLocaleString()} chars`}
                  </div>
                )}
              </div>

              <div className="row g6 mt12 wrap-flex">
                {PROMPTS.map(p => (
                  <button key={p} className="chip" disabled={busy}
                          onClick={() => run(p, false)}>{p}</button>
                ))}
              </div>

              <div className="row g8 mt12">
                <input
                  className="input grow" value={ask} disabled={busy}
                  placeholder="Ask for a change…"
                  onChange={e => setAsk(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && ask.trim() && !busy) { run(ask.trim(), false); setAsk('') }
                  }}
                />
                <button className="btn btn-accent btn-icon" disabled={busy || !ask.trim()}
                        onClick={() => { run(ask.trim(), false); setAsk('') }}>
                  <ISend size={16} />
                </button>
              </div>
            </div>
          )}

          {drafts.length > 0 && (
            <div className="card card-pad">
              <div className="row-between mb12 wrap-flex">
                <div className="h3">{plural(drafts.length, 'draft card')}</div>
                <div className="row g8">
                  <span className="badge badge-accent">{kept} selected</span>
                  <button className="btn btn-ghost btn-sm"
                          onClick={() => setKeep(k => k.map(() => !k.every(Boolean)))}>
                    {keep.every(Boolean) ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
              </div>
              <div className="hint mb12">Edit anything before you save — this is a draft, not a commitment.</div>

              <div className="col g8" style={{ maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
                {drafts.map((d, i) => (
                  <div key={i} className="draft" data-off={!keep[i]}>
                    <button className="tick" data-on={keep[i]} aria-label="Include this card"
                            onClick={() => setKeep(k => k.map((v, n) => (n === i ? !v : v)))}>
                      <ICheck size={12} />
                    </button>
                    <AutoText
                      className="cell-input" value={d.term} placeholder="Term"
                      onChange={e => setDrafts(v => v.map((c, n) => (n === i ? { ...c, term: e.target.value } : c)))}
                    />
                    <AutoText
                      className="cell-input" value={d.def} placeholder="Definition"
                      onChange={e => setDrafts(v => v.map((c, n) => (n === i ? { ...c, def: e.target.value } : c)))}
                    />
                    <button className="btn btn-ghost btn-icon btn-sm" aria-label="Delete draft"
                            onClick={() => {
                              setDrafts(v => v.filter((_, n) => n !== i))
                              setKeep(k => k.filter((_, n) => n !== i))
                            }}>
                      <ITrash size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <hr className="divider mt16 mb16" />

              <div className="row g12 wrap-flex" style={{ alignItems: 'flex-end' }}>
                <div className="field grow" style={{ minWidth: 180 }}>
                  <label className="label">Save to</label>
                  <select className="select" value={target} onChange={e => setTarget(e.target.value)}>
                    <option value="new">A new set</option>
                    {sets.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>
                {target === 'new' && (
                  <div className="field grow" style={{ minWidth: 180 }}>
                    <label className="label">Set name</label>
                    <input className="input" value={title} placeholder="Untitled deck"
                           onChange={e => setTitle(e.target.value)} />
                  </div>
                )}
                <button className="btn btn-accent btn-lg" onClick={save} disabled={!kept}>
                  <IPlus size={16} /> Save {kept} to {target === 'new' ? 'new set' : 'set'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ---------------- right: sources ---------------- */}
        <div className="col g16">
          <div className="card card-pad">
            <div className="h3 mb12">Your material</div>

            <div
              className="drop"
              data-over={over}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setOver(true) }}
              onDragLeave={() => setOver(false)}
              onDrop={e => {
                e.preventDefault(); setOver(false)
                if (e.dataTransfer.files.length) ingest(e.dataTransfer.files)
              }}
            >
              <input
                ref={fileRef} type="file" hidden multiple accept={accepts()}
                onChange={e => { if (e.target.files) ingest(e.target.files); e.target.value = '' }}
              />
              <IUpload size={24} className="muted" />
              <div className="h3 mt8">Drop files here</div>
              <div className="hint mt4">
                PDF, Word, images, or plain text.<br />
                Photos of handwritten notes work too.
              </div>
            </div>

            {sources.length > 0 && (
              <div className="col g8 mt12">
                {sources.map(s => (
                  <SourceRow key={s.id} s={s}
                             onRemove={() => setSources(v => v.filter(x => x.id !== s.id))} />
                ))}
              </div>
            )}

            <div className="field mt16">
              <label className="label">Or paste notes</label>
              <textarea className="textarea" style={{ minHeight: 120 }}
                        placeholder="Paste anything — lecture notes, a study guide, a chapter summary…"
                        value={pasted} onChange={e => setPasted(e.target.value)} />
            </div>
          </div>

          <div className="card card-pad">
            <div className="fs13 fw6 mb8">How this works</div>
            <div className="hint">
              PDFs and images go to Claude as-is rather than being scraped for text, so
              diagrams, tables, and scanned pages come through. Nothing is stored on a
              server — files go straight from this browser to Anthropic and the drafts
              stay here until you save them.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Best-effort deck name from the first real filename. */
function suggestTitle(sources: Source[]): string {
  const file = sources.find(s => s.name && s.name !== 'Pasted notes')
  if (!file) return 'New deck'
  return file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60) || 'New deck'
}
