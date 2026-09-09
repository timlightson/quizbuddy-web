/**
 * LaTeX -> Unicode.
 *
 * Models reach for LaTeX whenever they write science, so `$\text{H}_2\text{O}$`
 * turns up in study guides and on flashcards. Rendering a full math engine for
 * this would be overkill: what students actually get is subscripts,
 * superscripts, Greek letters, and arrows, all of which Unicode already has.
 * Anything genuinely beyond that degrades to readable plain text rather than
 * showing its own source.
 */

const SUB: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆',
  '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  a: 'ₐ', e: 'ₑ', o: 'ₒ', x: 'ₓ', h: 'ₕ', k: 'ₖ', l: 'ₗ', m: 'ₘ',
  n: 'ₙ', p: 'ₚ', s: 'ₛ', t: 'ₜ', i: 'ᵢ', j: 'ⱼ', r: 'ᵣ', u: 'ᵤ', v: 'ᵥ',
}

const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶',
  '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  n: 'ⁿ', i: 'ⁱ', a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', x: 'ˣ',
  o: 'ᵒ', t: 'ᵗ', h: 'ʰ', k: 'ᵏ', m: 'ᵐ', p: 'ᵖ', r: 'ʳ', s: 'ˢ', l: 'ˡ',
}

/** Longest names first so \Delta is matched before \De. */
const SYMBOLS: [string, string][] = [
  ['\\rightarrow', '→'], ['\\leftarrow', '←'], ['\\leftrightarrow', '↔'],
  ['\\Rightarrow', '⇒'], ['\\Leftarrow', '⇐'], ['\\Leftrightarrow', '⇔'],
  ['\\rightleftharpoons', '⇌'], ['\\to', '→'], ['\\gets', '←'],
  ['\\uparrow', '↑'], ['\\downarrow', '↓'],
  ['\\alpha', 'α'], ['\\beta', 'β'], ['\\gamma', 'γ'], ['\\delta', 'δ'],
  ['\\epsilon', 'ε'], ['\\varepsilon', 'ε'], ['\\zeta', 'ζ'], ['\\eta', 'η'],
  ['\\theta', 'θ'], ['\\vartheta', 'ϑ'], ['\\iota', 'ι'], ['\\kappa', 'κ'],
  ['\\lambda', 'λ'], ['\\mu', 'μ'], ['\\nu', 'ν'], ['\\xi', 'ξ'],
  ['\\pi', 'π'], ['\\rho', 'ρ'], ['\\sigma', 'σ'], ['\\tau', 'τ'],
  ['\\upsilon', 'υ'], ['\\phi', 'φ'], ['\\varphi', 'φ'], ['\\chi', 'χ'],
  ['\\psi', 'ψ'], ['\\omega', 'ω'],
  ['\\Gamma', 'Γ'], ['\\Delta', 'Δ'], ['\\Theta', 'Θ'], ['\\Lambda', 'Λ'],
  ['\\Xi', 'Ξ'], ['\\Pi', 'Π'], ['\\Sigma', 'Σ'], ['\\Phi', 'Φ'],
  ['\\Psi', 'Ψ'], ['\\Omega', 'Ω'],
  ['\\times', '×'], ['\\div', '÷'], ['\\cdot', '·'], ['\\pm', '±'], ['\\mp', '∓'],
  ['\\leq', '≤'], ['\\le', '≤'], ['\\geq', '≥'], ['\\ge', '≥'],
  ['\\neq', '≠'], ['\\ne', '≠'], ['\\approx', '≈'], ['\\equiv', '≡'],
  ['\\sim', '∼'], ['\\propto', '∝'], ['\\infty', '∞'],
  ['\\sum', '∑'], ['\\prod', '∏'], ['\\int', '∫'], ['\\partial', '∂'],
  ['\\nabla', '∇'], ['\\sqrt', '√'], ['\\angle', '∠'], ['\\degree', '°'],
  ['\\circ', '°'], ['\\percent', '%'],
  ['\\in', '∈'], ['\\notin', '∉'], ['\\subset', '⊂'], ['\\subseteq', '⊆'],
  ['\\cup', '∪'], ['\\cap', '∩'], ['\\emptyset', '∅'], ['\\forall', '∀'],
  ['\\exists', '∃'], ['\\therefore', '∴'], ['\\because', '∵'],
  ['\\ldots', '…'], ['\\dots', '…'], ['\\cdots', '⋯'],
  ['\\prime', '′'], ['\\ell', 'ℓ'], ['\\hbar', 'ℏ'],
  ['\\Alpha', 'Α'], ['\\Beta', 'Β'], ['\\Epsilon', 'Ε'], ['\\Zeta', 'Ζ'],
  ['\\Eta', 'Η'], ['\\Iota', 'Ι'], ['\\Kappa', 'Κ'], ['\\Mu', 'Μ'],
  ['\\Nu', 'Ν'], ['\\Rho', 'Ρ'], ['\\Tau', 'Τ'], ['\\Chi', 'Χ'],
  ['\\quad', ' '], ['\\qquad', '  '], ['\\,', ' '], ['\;', ' '], ['\\:', ' '],
  ['\\!', ''], ['\\\\', ' '], ['\\left', ''], ['\\right', ''],
]

/** Map a run of characters to sub/superscript, or bail if any char is missing. */
function shift(body: string, table: Record<string, string>): string | null {
  let out = ''
  for (const ch of body) {
    const m = table[ch]
    if (!m) return null
    out += m
  }
  return out
}

/** Strip one balanced {...} group starting at `open`, returning its body. */
function group(src: string, open: number): { body: string; end: number } | null {
  if (src[open] !== '{') return null
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') {
      depth--
      if (depth === 0) return { body: src.slice(open + 1, i), end: i + 1 }
    }
  }
  return null
}

/** Unwrap \text{...}, \mathrm{...} and friends, recursively. */
function unwrapFonts(s: string): string {
  const cmd = /\\(?:text|mathrm|mathbf|mathit|mathsf|mathtt|textbf|textit|operatorname|bm|boldsymbol)\s*\{/
  let out = s
  for (let guard = 0; guard < 40; guard++) {
    const m = out.match(cmd)
    if (!m || m.index === undefined) break
    const braceAt = m.index + m[0].length - 1
    const g = group(out, braceAt)
    if (!g) break
    out = out.slice(0, m.index) + g.body + out.slice(g.end)
  }
  return out
}

function unwrapFracs(s: string): string {
  let out = s
  for (let guard = 0; guard < 40; guard++) {
    const m = out.match(/\\(?:frac|dfrac|tfrac)\s*\{/)
    if (!m || m.index === undefined) break
    const a = group(out, m.index + m[0].length - 1)
    if (!a) break
    const b = group(out, a.end)
    if (!b) break
    const wrap = (t: string) => (/^[\w.]+$/.test(t.trim()) ? t.trim() : `(${t.trim()})`)
    out = out.slice(0, m.index) + `${wrap(a.body)}/${wrap(b.body)}` + out.slice(b.end)
  }
  return out
}

function scripts(s: string): string {
  let out = s
  // Braced first: x^{2n} before x^2.
  for (const [marker, table] of [['^', SUP], ['_', SUB]] as const) {
    for (let guard = 0; guard < 60; guard++) {
      const at = out.indexOf(`${marker}{`)
      if (at === -1) break
      const g = group(out, at + 1)
      if (!g) break
      const mapped = shift(g.body, table)
      out = out.slice(0, at) + (mapped ?? g.body) + out.slice(g.end)
    }
  }
  // Then the single-character form.
  out = out.replace(/\^(.)/g, (m, c: string) => SUP[c] ?? m)
  out = out.replace(/_(.)/g, (m, c: string) => SUB[c] ?? m)
  return out
}

/**
 * `gobble` follows LaTeX's rule that a space terminates a control word, so
 * `\Delta G` is one symbol then G. In prose the space is usually a real word
 * break (`\alpha helix`), so callers outside math keep it.
 */
function symbols(s: string, gobble: boolean): string {
  let out = s
  for (const [tex, uni] of SYMBOLS) {
    // Only letter-like symbols swallow the space: `\Delta G` is one quantity,
    // but `A \rightarrow B` needs its spacing to stay readable.
    const swallow = gobble && /\p{L}/u.test(uni)
    out = out.split(tex + ' ').join(swallow ? uni : uni + ' ')
    // Guard against \pi matching inside \pion; require a non-letter boundary.
    out = out.replace(new RegExp(tex.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&') + '(?![a-zA-Z])', 'g'), uni)
  }
  return out
}

/** Convert one stretch of math source to Unicode. */
function convert(math: string): string {
  let out = unwrapFonts(math)
  out = unwrapFracs(out)
  out = symbols(out, true)
  out = scripts(out)
  out = out.replace(/[{}]/g, '')
  return out.replace(/\s{2,}/g, ' ').trim()
}

/** Does this look like math rather than a dollar amount? */
const mathy = (s: string) => /[\\^_{}]/.test(s)

/**
 * Replace LaTeX in a block of text with Unicode equivalents.
 * Currency is left alone — "$35.99" must survive untouched.
 */
export function delatex(input: string): string {
  if (!input) return input
  if (!/[\\$]/.test(input)) return input

  let out = input

  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (m, body: string) => (mathy(body) ? convert(body) : m))
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_m, body: string) => convert(body))
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_m, body: string) => convert(body))
  // Single $…$, but only when it reads as math and not as "$5 to $10".
  out = out.replace(/\$([^$\n]+?)\$/g, (m, body: string) => (mathy(body) ? convert(body) : m))

  // Commands that escaped their delimiters entirely.
  if (/\\[a-zA-Z]/.test(out)) out = symbols(out, false)
  if (/\\(?:text|mathrm|mathbf|frac)/.test(out)) out = unwrapFracs(unwrapFonts(out))

  return out
}
