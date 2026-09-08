import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { blankCard } from '../lib/factory'
import type { Card } from '../lib/types'
import {
  COL_SEP_CHAR, DEFAULT_PARSE, detectOptions, parsePairs,
  type ColSep, type ParseOptions, type RowSep,
} from '../lib/import'
import { LANGS } from '../lib/tts'
import { defineTerms, hasAi, resolveConfig, AIError } from '../lib/ai'
import { plural } from '../lib/utils'
import { navigate, Modal, AutoText, toast, useConfirm, Spinner } from '../components/ui'
import { IPlus, ITrash, IStar, ISpark, IUp, ICheck, IList } from '../components/Icons'

/* ---------------- Paste import ---------------- */

function ImportModal({ onClose, onAdd }: { onClose: () => void; onAdd: (cards: Card[]) => void }) {
  const [text, setText] = useState('')
  const [opts, setOpts] = useState<ParseOptions>(DEFAULT_PARSE)
  const [touched, setTouched] = useState(false)

  // Guess the separators from the first paste, then stop overriding the user.
  useEffect(() => {
    if (!touched && text.trim()) setOpts(detectOptions(text))
  }, [text, touched])

  const parsed = useMemo(() => parsePairs(text, opts), [text, opts])
  const set = (patch: Partial<ParseOptions>) => { setTouched(true); setOpts(o => ({ ...o, ...patch })) }

  return (
    <Modal
      title="Import cards"
      sub="Paste from a doc, a spreadsheet, or another study app."
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" disabled={!parsed.length}
                  onClick={() => { onAdd(parsed); toast(`Added ${plural(parsed.length, 'card')}`); onClose() }}>
            Add {plural(parsed.length, 'card')}
          </button>
        </>
      }
    >
      <div className="field mb16">
        <label className="label">Paste here</label>
        <textarea
          className="textarea mono" style={{ minHeight: 170 }}
          placeholder={'Ubiquitous\tPresent everywhere\nEphemeral\tLasting a very short time'}
          value={text} onChange={e => setText(e.target.value)} autoFocus
        />
      </div>

      <div className="grid2 g12 mb16">
        <div className="field">
          <label className="label">Between term and definition</label>
          <select className="select" value={opts.col}
                  onChange={e => set({ col: e.target.value as ColSep })}>
            <option value="tab">Tab</option>
            <option value="comma">Comma</option>
            <option value="dash">Dash ( - )</option>
            <option value="equals">Equals ( = )</option>
            <option value="colon">Colon ( : )</option>
          </select>
        </div>
        <div className="field">
          <label className="label">Between cards</label>
          <select className="select" value={opts.row}
                  onChange={e => set({ row: e.target.value as RowSep })}>
            <option value="newline">New line</option>
            <option value="blankline">Blank line</option>
            <option value="semicolon">Semicolon</option>
          </select>
        </div>
      </div>

      <label className="row g8 fs14 mb16" style={{ cursor: 'pointer' }}>
        <input type="checkbox" checked={opts.swap} onChange={e => set({ swap: e.target.checked })} />
        Definition comes first
      </label>

      <div className="panel" style={{ padding: 14 }}>
        <div className="row-between mb8">
          <span className="eyebrow">Preview</span>
          <span className="fs12 muted">{plural(parsed.length, 'card')} found</span>
        </div>
        {parsed.length === 0 ? (
          <div className="hint">
            {text.trim()
              ? `No "${COL_SEP_CHAR[opts.col].trim() || 'tab'}" found on these lines — try a different separator.`
              : 'Nothing pasted yet.'}
          </div>
        ) : (
          <div className="col g6" style={{ maxHeight: 190, overflowY: 'auto' }}>
            {parsed.slice(0, 40).map((c, i) => (
              <div key={i} className="row g10 fs13">
                <span className="fw6 trunc" style={{ minWidth: 130, maxWidth: 130 }}>{c.term}</span>
                <span className="muted trunc grow">{c.def}</span>
              </div>
            ))}
            {parsed.length > 40 && <div className="hint mt4">+ {parsed.length - 40} more</div>}
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ---------------- Editor ---------------- */

export default function SetEditor({ id }: { id: string }) {
  const set = useStore(s => s.sets.find(x => x.id === id))
  const settings = useStore(s => s.settings)
  const updateSet = useStore(s => s.updateSet)
  const updateCard = useStore(s => s.updateCard)
  const removeCard = useStore(s => s.removeCard)
  const addCards = useStore(s => s.addCards)
  const toggleStar = useStore(s => s.toggleStar)
  const reorderCards = useStore(s => s.reorderCards)
  const deleteSet = useStore(s => s.deleteSet)
  const { confirm, dialog } = useConfirm()

  const [showImport, setShowImport] = useState(false)
  const [defining, setDefining] = useState(false)

  if (!set) { navigate('/'); return null }

  const blanks = set.cards.filter(c => c.term.trim() && !c.def.trim())

  const fillDefs = async () => {
    setDefining(true)
    try {
      const map = await defineTerms(resolveConfig(settings), blanks.map(c => c.term.trim()), set.subject)
      let n = 0
      for (const c of blanks) {
        const def = map.get(c.term.trim().toLowerCase())
        if (def) { updateCard(set.id, c.id, { def }); n += 1 }
      }
      toast(n ? `Filled in ${plural(n, 'definition')}` : 'No matches came back')
    } catch (e) {
      toast(e instanceof AIError ? e.message : 'Something went wrong')
    } finally {
      setDefining(false)
    }
  }

  return (
    <div className="wrap">
      <div className="row-between mb24 wrap-flex">
        <div className="h1">Edit set</div>
        <div className="row g8">
          <button className="btn" onClick={() => setShowImport(true)}>
            <IList size={15} /> Import
          </button>
          <button className="btn" onClick={() => navigate(`/create?set=${set.id}`)}>
            <ISpark size={15} /> Add with AI
          </button>
          <button className="btn btn-primary" onClick={() => navigate(`/set/${set.id}`)}>
            <ICheck size={15} /> Done
          </button>
        </div>
      </div>

      <div className="card card-pad mb24">
        <div className="field mb16">
          <label className="label">Title</label>
          <input className="input input-lg" value={set.title} placeholder="e.g. Unit 4 — The Cell"
                 onChange={e => updateSet(set.id, { title: e.target.value })} />
        </div>
        <div className="field mb16">
          <label className="label">Description</label>
          <input className="input" value={set.description} placeholder="What's this set for? (optional)"
                 onChange={e => updateSet(set.id, { description: e.target.value })} />
        </div>
        <div className="grid3 g12">
          <div className="field">
            <label className="label">Subject</label>
            <input className="input" value={set.subject} placeholder="Biology"
                   onChange={e => updateSet(set.id, { subject: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Term language</label>
            <select className="select" value={set.termLang}
                    onChange={e => updateSet(set.id, { termLang: e.target.value })}>
              {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Definition language</label>
            <select className="select" value={set.defLang}
                    onChange={e => updateSet(set.id, { defLang: e.target.value })}>
              {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {hasAi(settings) && blanks.length > 0 && (
        <div className="card card-pad mb16 row-between wrap-flex" style={{ borderColor: 'var(--accent-line)' }}>
          <div>
            <div className="h3">{plural(blanks.length, 'term')} without a definition</div>
            <div className="hint mt4">Claude can write them from the term and subject.</div>
          </div>
          <button className="btn btn-accent btn-sm" onClick={fillDefs} disabled={defining}>
            {defining ? <><Spinner /> Writing…</> : <><ISpark size={14} /> Fill them in</>}
          </button>
        </div>
      )}

      <div className="row-between mb12">
        <div className="eyebrow">{plural(set.cards.length, 'card')}</div>
        <span className="hint">Tab moves between fields</span>
      </div>

      <div className="col g8">
        {set.cards.map((c, i) => (
          <div key={c.id} className="crow">
            <div className="crow-n">{i + 1}</div>
            <AutoText
              className="cell-input" placeholder="Term" value={c.term}
              onChange={e => updateCard(set.id, c.id, { term: e.target.value })}
            />
            <AutoText
              className="cell-input" placeholder="Definition" value={c.def}
              onChange={e => updateCard(set.id, c.id, { def: e.target.value })}
            />
            <div className="row g4">
              <button className="btn btn-ghost btn-icon btn-sm" title="Star"
                      style={{ color: c.starred ? 'var(--amber)' : undefined }}
                      onClick={() => toggleStar(set.id, c.id)}>
                <IStar size={14} filled={c.starred} />
              </button>
              <button className="btn btn-ghost btn-icon btn-sm" title="Move up" disabled={i === 0}
                      onClick={() => reorderCards(set.id, i, i - 1)}>
                <IUp size={14} />
              </button>
              <button className="btn btn-ghost btn-icon btn-sm" title="Delete card"
                      onClick={() => removeCard(set.id, c.id)}>
                <ITrash size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="row g8 mt16">
        <button className="btn" onClick={() => addCards(set.id, [blankCard()])}>
          <IPlus size={15} /> Add card
        </button>
        <button className="btn btn-ghost" onClick={() =>
          addCards(set.id, Array.from({ length: 5 }, () => blankCard()))}>
          Add 5
        </button>
      </div>

      <div className="mt32">
        <button className="btn btn-danger btn-sm" onClick={() => confirm({
          title: `Delete "${set.title}"?`,
          body: "All cards and progress go with it. This can't be undone.",
          run: () => { deleteSet(set.id); toast('Set deleted'); navigate('/') },
        })}><ITrash size={14} /> Delete set</button>
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onAdd={cards => addCards(set.id, cards)}
        />
      )}
      {dialog}
    </div>
  )
}
