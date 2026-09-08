import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IX } from './Icons'
import { MASTERY_VAR } from '../lib/srs'

/* ---------- Router ---------- */

export function useRoute(): [string[], (to: string) => void] {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || '/')
  useEffect(() => {
    const on = () => setHash(window.location.hash.slice(1) || '/')
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = (to: string) => { window.location.hash = to }
  return [hash.split('/').filter(Boolean), go]
}

export const navigate = (to: string) => { window.location.hash = to }

/* ---------- Modal ---------- */

export function Modal({
  title, sub, children, footer, onClose, wide,
}: {
  title: string; sub?: string; children: ReactNode
  footer?: ReactNode; onClose: () => void; wide?: boolean
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={wide ? { maxWidth: 760 } : undefined} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="row-between">
            <div>
              <div className="h2">{title}</div>
              {sub && <div className="hint mt4">{sub}</div>}
            </div>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
              <IX size={16} />
            </button>
          </div>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------- Toast ---------- */

let pushToast: ((msg: string) => void) | null = null
export const toast = (msg: string) => pushToast?.(msg)

export function ToastHost() {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([])
  useEffect(() => {
    pushToast = (msg: string) => {
      const id = Date.now() + Math.random()
      setItems(v => [...v, { id, msg }])
      setTimeout(() => setItems(v => v.filter(x => x.id !== id)), 2600)
    }
    return () => { pushToast = null }
  }, [])
  return (
    <div className="toast-host" aria-live="polite">
      {items.map(t => <div key={t.id} className="toast">{t.msg}</div>)}
    </div>
  )
}

/* ---------- Bits ---------- */

export function Bar({ value, max, lg }: { value: number; max: number; lg?: boolean }) {
  const p = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return <div className={lg ? 'bar bar-lg' : 'bar'}><i style={{ width: `${p}%` }} /></div>
}

/** Stacked mastery breakdown — new through mastered, left to right. */
export function MasteryBar({ counts }: { counts: number[] }) {
  const total = counts.reduce((a, b) => a + b, 0)
  if (total === 0) return <div className="mseg" />
  return (
    <div className="mseg">
      {counts.map((n, i) =>
        n === 0 ? null : (
          <i key={i} style={{ width: `${(n / total) * 100}%`, background: `var(${MASTERY_VAR[i]})` }} />
        ))}
    </div>
  )
}

export function Empty({ icon, title, body, action }: {
  icon: ReactNode; title: string; body: string; action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty-mark">{icon}</div>
      <div className="h2">{title}</div>
      <div className="muted" style={{ maxWidth: 420 }}>{body}</div>
      {action && <div className="mt8">{action}</div>}
    </div>
  )
}

export function Stat({ value, label, tone }: { value: ReactNode; label: string; tone?: string }) {
  return (
    <div className="stat">
      <div className="stat-v" style={tone ? { color: tone } : undefined}>{value}</div>
      <div className="stat-l">{label}</div>
    </div>
  )
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return <button className="chip" data-on={on} onClick={onClick}>{children}</button>
}

export function Spinner({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         style={{ animation: 'spin .8s linear infinite' }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity=".2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

/** Textarea that grows to fit its content — used in the card editor. */
export function AutoText(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const fit = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }
  useEffect(fit, [props.value])
  return <textarea ref={ref} rows={1} {...props} onInput={fit} />
}

/** Confirm before something destructive; returns the dialog to render. */
export function useConfirm() {
  const [ask, setAsk] = useState<{ title: string; body: string; run: () => void } | null>(null)
  const dialog = ask ? (
    <Modal
      title={ask.title}
      onClose={() => setAsk(null)}
      footer={
        <>
          <button className="btn" onClick={() => setAsk(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={() => { ask.run(); setAsk(null) }}>Delete</button>
        </>
      }
    >
      <div className="body-lg">{ask.body}</div>
    </Modal>
  ) : null
  return { confirm: setAsk, dialog }
}
