import type AnthropicSDK from '@anthropic-ai/sdk'
import type { Card } from './types'
import type { Source } from './extract'
import { blankCard } from './factory'

/**
 * Optional AI features. The app is fully usable without a key — every call
 * site checks `hasKey()` first and hides the feature when it's absent.
 *
 * The key is the user's own, stored locally and sent straight to Anthropic
 * from the browser. That means any script running on this page could read it,
 * which is an acceptable trade for a local-first personal app but is the
 * reason we never ship a key of our own here.
 */

const MODEL = 'claude-opus-5'

// The SDK is ~60% of the app's JS. Loading it on first use keeps it out of the
// initial bundle for the many users who never turn AI features on.
type SDKModule = typeof import('@anthropic-ai/sdk')
let sdk: SDKModule | null = null

async function client(apiKey: string): Promise<AnthropicSDK> {
  if (!sdk) sdk = await import('@anthropic-ai/sdk')
  return new sdk.default({ apiKey, dangerouslyAllowBrowser: true })
}

export function hasKey(apiKey: string): boolean {
  return apiKey.trim().length > 0
}

export class AIError extends Error {}

/** Pull the text out of a response, refusing loudly rather than returning junk. */
function textOf(res: AnthropicSDK.Message): string {
  if (res.stop_reason === 'refusal') {
    throw new AIError('Claude declined this request. Try rephrasing the source material.')
  }
  const out = res.content
    .filter((b): b is AnthropicSDK.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
  if (!out.trim()) throw new AIError('Claude returned an empty response. Try again.')
  return out
}

function wrap(err: unknown): AIError {
  if (err instanceof AIError) return err
  // `sdk` is always loaded by the time a request can fail.
  const A = sdk?.default
  if (A) {
    if (err instanceof A.AuthenticationError) {
      return new AIError('That API key was rejected. Check it in Settings.')
    }
    if (err instanceof A.RateLimitError) {
      return new AIError('Rate limited by the API. Wait a moment and try again.')
    }
    if (err instanceof A.APIConnectionError) {
      return new AIError('Could not reach the API. Check your connection.')
    }
    if (err instanceof A.APIError) {
      return new AIError(`API error ${err.status}: ${err.message}`)
    }
  }
  return new AIError(err instanceof Error ? err.message : 'Something went wrong.')
}

const CARDS_SCHEMA = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          term: { type: 'string' },
          def: { type: 'string' },
        },
        required: ['term', 'def'],
        additionalProperties: false,
      },
    },
  },
  required: ['cards'],
  additionalProperties: false,
} as const

/** Turn pasted notes into a deck. */
export async function cardsFromNotes(
  apiKey: string,
  notes: string,
  count: number,
  subject: string,
): Promise<Card[]> {
  try {
    const res = await (await client(apiKey)).messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: CARDS_SCHEMA },
      },
      system:
        'You build study flashcards from source material. Terms are short prompts — a word, ' +
        'phrase, date, or question. Definitions are self-contained answers a student could ' +
        'recall and be graded on: one or two sentences, no filler, no "this refers to". ' +
        'Cover the material evenly rather than exhausting the first paragraph. Never invent ' +
        'facts that are not supported by the source.',
      messages: [
        {
          role: 'user',
          content:
            `Make about ${count} flashcards from these notes` +
            (subject ? ` (subject: ${subject})` : '') +
            `.\n\n---\n${notes}`,
        },
      ],
    })
    const parsed = JSON.parse(textOf(res)) as { cards: { term: string; def: string }[] }
    return parsed.cards
      .filter(c => c.term?.trim() && c.def?.trim())
      .map(c => blankCard(c.term.trim(), c.def.trim()))
  } catch (err) {
    throw wrap(err)
  }
}

/** Fill in definitions for terms the user has typed but left blank. */
export async function defineTerms(
  apiKey: string,
  terms: string[],
  subject: string,
): Promise<Map<string, string>> {
  try {
    const res = await (await client(apiKey)).messages.create({
      model: MODEL,
      max_tokens: 8000,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: CARDS_SCHEMA },
      },
      system:
        'You write flashcard definitions. Each definition is one or two sentences, concrete ' +
        'enough to be graded against, phrased the way a good textbook glossary would. Echo ' +
        'each term back exactly as given so the caller can match them up.',
      messages: [
        {
          role: 'user',
          content:
            (subject ? `Subject: ${subject}\n\n` : '') +
            `Write a definition for each term:\n${terms.map(t => `- ${t}`).join('\n')}`,
        },
      ],
    })
    const parsed = JSON.parse(textOf(res)) as { cards: { term: string; def: string }[] }
    return new Map(parsed.cards.map(c => [c.term.trim().toLowerCase(), c.def.trim()]))
  } catch (err) {
    throw wrap(err)
  }
}

/** A memory hook for a card the user keeps missing. */
export async function mnemonicFor(apiKey: string, term: string, def: string): Promise<string> {
  try {
    const res = await (await client(apiKey)).messages.create({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: 'low' },
      system:
        'You give a student one memory hook for a term they keep forgetting: a word-root ' +
        'breakdown, an image, or a link to something familiar. Two sentences at most. No ' +
        'preamble — start with the hook itself.',
      messages: [{ role: 'user', content: `Term: ${term}\nDefinition: ${def}` }],
    })
    return textOf(res).trim()
  } catch (err) {
    throw wrap(err)
  }
}

/** Explain a miss, in the moment, without re-teaching the whole subject. */
export async function explainMiss(
  apiKey: string,
  term: string,
  correct: string,
  given: string,
): Promise<string> {
  try {
    const res = await (await client(apiKey)).messages.create({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: 'low' },
      system:
        'A student just answered a flashcard wrong. In two or three sentences, say what their ' +
        'answer confused this with and give one concrete way to tell the two apart. Be warm ' +
        'and direct. No preamble, no restating the definition they can already see.',
      messages: [
        {
          role: 'user',
          content: `Term: ${term}\nCorrect: ${correct}\nThey answered: ${given || '(left blank)'}`,
        },
      ],
    })
    return textOf(res).trim()
  } catch (err) {
    throw wrap(err)
  }
}


/* ------------------------------------------------------------------ */
/* Studio — conversational deck building from uploaded material        */
/* ------------------------------------------------------------------ */

export interface DraftCard { term: string; def: string; hint: string }
export interface StudioTurn { role: 'user' | 'assistant'; text: string; cards?: DraftCard[] }

const STUDIO_SCHEMA = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          term: { type: 'string' },
          def: { type: 'string' },
          hint: { type: 'string' },
        },
        required: ['term', 'def', 'hint'],
        additionalProperties: false,
      },
    },
  },
  required: ['message', 'cards'],
  additionalProperties: false,
} as const

const STUDIO_SYSTEM =
  'You help a student turn their own course material into flashcards.\n\n' +
  'Cards: the term side is a short prompt — a word, phrase, date, or question. ' +
  'The definition side is a self-contained answer they could be graded on, one or ' +
  'two sentences, no filler and no "this refers to". Write a short hint only when ' +
  'the card is genuinely hard (a mnemonic, a word root); otherwise leave hint empty.\n\n' +
  'Only use what is in the provided material. Never invent facts to reach a card ' +
  'count — if the material only supports twelve good cards, make twelve and say so. ' +
  'Cover the material evenly rather than exhausting the first section.\n\n' +
  'The message field is what the student reads: one or two sentences on what you ' +
  'made and anything they should know. Do not list the cards back in it — they can ' +
  'see them. When they ask you to revise, return the full corrected set, not a diff.'

/** Sources become content blocks; PDFs and images go to the model as-is. */
function sourceBlocks(sources: Source[]): unknown[] {
  const blocks: unknown[] = []
  for (const s of sources) {
    if (s.kind === 'pdf') {
      blocks.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: s.data },
        title: s.name,
      })
    } else if (s.kind === 'image') {
      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: s.mediaType, data: s.data },
      })
    } else {
      blocks.push({ type: 'text', text: `--- ${s.name} ---\n${s.text}` })
    }
  }
  return blocks
}

export interface StudioReply { message: string; cards: DraftCard[] }

/**
 * One turn of the studio conversation. The material is replayed on every turn
 * so follow-ups ("focus on chapter 3", "make these harder") can see it; the
 * cache breakpoint on the last source block keeps that from being expensive.
 */
export async function studioTurn(
  apiKey: string,
  sources: Source[],
  history: StudioTurn[],
  ask: string,
  onProgress?: (chars: number) => void,
): Promise<StudioReply> {
  try {
    const anthropic = await client(apiKey)

    const blocks = sourceBlocks(sources)
    if (blocks.length) {
      // Everything above this point is stable across turns.
      ;(blocks[blocks.length - 1] as Record<string, unknown>).cache_control = { type: 'ephemeral' }
    }

    const messages: unknown[] = []
    if (blocks.length) {
      messages.push({
        role: 'user',
        content: [...blocks, { type: 'text', text: 'This is my course material.' }],
      })
      messages.push({
        role: 'assistant',
        content: [{ type: 'text', text: 'Got it — I have read through it. What would you like?' }],
      })
    }
    for (const t of history) {
      messages.push({
        role: t.role,
        content: t.role === 'assistant'
          ? JSON.stringify({ message: t.text, cards: t.cards ?? [] })
          : t.text,
      })
    }
    messages.push({ role: 'user', content: ask })

    // Streaming keeps a large deck from hitting the request timeout, and gives
    // the UI something to show while the model works.
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      system: STUDIO_SYSTEM,
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: STUDIO_SCHEMA },
      },
      messages: messages as never,
    })

    if (onProgress) {
      let n = 0
      stream.on('text', (delta: string) => { n += delta.length; onProgress(n) })
    }

    const res = await stream.finalMessage()
    const parsed = JSON.parse(textOf(res)) as StudioReply
    return {
      message: parsed.message?.trim() || 'Done.',
      cards: (parsed.cards ?? [])
        .filter(c => c.term?.trim() && c.def?.trim())
        .map(c => ({ term: c.term.trim(), def: c.def.trim(), hint: (c.hint ?? '').trim() })),
    }
  } catch (err) {
    throw wrap(err)
  }
}

export function draftsToCards(drafts: DraftCard[]): Card[] {
  return drafts.map(d => {
    const c = blankCard(d.term, d.def)
    if (d.hint) c.hint = d.hint
    return c
  })
}

/** Opening instruction for a fresh studio session. */
export function openingAsk(count: number, focus: string): string {
  const base = `Make about ${count} flashcards from this material.`
  return focus.trim() ? `${base} Focus on: ${focus.trim()}` : base
}
