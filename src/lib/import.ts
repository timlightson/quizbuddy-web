import type { Card } from './types'
import { blankCard } from './factory'

export type RowSep = 'newline' | 'semicolon' | 'blankline'
export type ColSep = 'tab' | 'comma' | 'dash' | 'equals' | 'colon'

export const COL_SEP_CHAR: Record<ColSep, string> = {
  tab: '\t', comma: ',', dash: ' - ', equals: '=', colon: ':',
}

export interface ParseOptions {
  row: RowSep
  col: ColSep
  swap: boolean
}

export const DEFAULT_PARSE: ParseOptions = { row: 'newline', col: 'tab', swap: false }

function splitRows(text: string, sep: RowSep): string[] {
  if (sep === 'semicolon') return text.split(';')
  if (sep === 'blankline') return text.split(/\n\s*\n/)
  return text.split(/\r?\n/)
}

/**
 * Split a row on the first occurrence of the separator only — definitions
 * routinely contain commas and colons, and eating them loses content.
 */
function splitCols(row: string, sep: ColSep): [string, string] | null {
  const token = COL_SEP_CHAR[sep]
  const i = row.indexOf(token)
  if (i === -1) return null
  return [row.slice(0, i), row.slice(i + token.length)]
}

export function parsePairs(text: string, opts: ParseOptions): Card[] {
  const out: Card[] = []
  for (const raw of splitRows(text, opts.row)) {
    const row = raw.trim()
    if (!row) continue
    const cols = splitCols(row, opts.col)
    if (!cols) continue
    let [term, def] = cols.map(s => s.trim())
    if (opts.swap) [term, def] = [def, term]
    if (!term || !def) continue
    out.push(blankCard(term, def))
  }
  return out
}

/** Preview count without building card objects. */
export function countPairs(text: string, opts: ParseOptions): number {
  return parsePairs(text, opts).length
}

/**
 * Guess the column separator so paste-from-anywhere usually just works.
 * Tab wins when present since spreadsheet and Quizlet exports use it.
 */
export function detectOptions(text: string): ParseOptions {
  const lines = text.split(/\r?\n/).filter(l => l.trim()).slice(0, 25)
  if (!lines.length) return DEFAULT_PARSE

  const score = (sep: ColSep) =>
    lines.filter(l => l.includes(COL_SEP_CHAR[sep])).length

  const order: ColSep[] = ['tab', 'dash', 'comma', 'equals', 'colon']
  let best: ColSep = 'tab'
  let bestScore = 0
  for (const sep of order) {
    const s = score(sep)
    if (s > bestScore) { bestScore = s; best = sep }
  }
  // Require the separator to appear on most lines before trusting it.
  if (bestScore < lines.length * 0.6) return DEFAULT_PARSE
  return { row: 'newline', col: best, swap: false }
}

export function toTSV(cards: Card[]): string {
  return cards.map(c => `${c.term}\t${c.def}`).join('\n')
}

export function toCSV(cards: Card[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
  return ['term,definition', ...cards.map(c => `${esc(c.term)},${esc(c.def)}`)].join('\n')
}


/** Read a text-ish file and parse it as term/definition pairs, no model needed. */
export async function pairsFromFile(file: File): Promise<{ cards: Card[]; opts: ParseOptions }> {
  const text = await file.text()
  const opts = detectOptions(text)
  return { cards: parsePairs(text, opts), opts }
}
