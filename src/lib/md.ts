/**
 * A deliberately small markdown renderer for model output.
 *
 * Escaping happens first and unconditionally, so nothing a model emits can
 * inject markup — which matters because this text is not authored by us.
 */

import { delatex } from './latex'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function inline(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
}

export function renderMd(raw: string): string {
  // Models emit LaTeX for anything scientific; turn it into Unicode before
  // rendering so `$\\text{H}_2\\text{O}$` reads as H₂O.
  const src = delatex(raw)
  const out: string[] = []
  let list: 'ul' | 'ol' | null = null
  let fence = false
  let code: string[] = []

  const closeList = () => { if (list) { out.push(`</${list}>`); list = null } }

  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trimEnd()

    if (line.trim().startsWith('```')) {
      if (fence) { out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`); code = []; fence = false }
      else { closeList(); fence = true }
      continue
    }
    if (fence) { code.push(raw); continue }

    if (!line.trim()) { closeList(); continue }

    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      closeList()
      const level = Math.min(6, h[1].length + 1)
      out.push(`<h${level}>${inline(h[2])}</h${level}>`)
      continue
    }

    if (/^\s*([-*+])\s+/.test(line)) {
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul' }
      out.push(`<li>${inline(line.replace(/^\s*[-*+]\s+/, ''))}</li>`)
      continue
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol' }
      out.push(`<li>${inline(line.replace(/^\s*\d+[.)]\s+/, ''))}</li>`)
      continue
    }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { closeList(); out.push('<hr>'); continue }

    closeList()
    out.push(`<p>${inline(line)}</p>`)
  }

  if (fence && code.length) out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`)
  closeList()
  return out.join('\n')
}
