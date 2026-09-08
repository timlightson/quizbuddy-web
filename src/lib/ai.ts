import type { Card, Settings } from './types'
import type { Source } from './extract'
import { blankCard } from './factory'
import {
  AiError, complete, parseJson, providerById,
  type AiConfig, type AiMessage,
} from './providers'

export { AiError } from './providers'

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

export function resolveConfig(s: Settings): AiConfig {
  const def = providerById(s.aiProvider)
  return {
    provider: s.aiProvider,
    apiKey: s.aiKeys?.[s.aiProvider] ?? '',
    model: s.aiModel || def.models[0] || '',
    baseUrl: s.aiBaseUrl || def.baseUrl,
  }
}

/** Whether AI features should be offered at all. */
export function hasAi(s: Settings): boolean {
  const def = providerById(s.aiProvider)
  const cfg = resolveConfig(s)
  if (!cfg.model.trim()) return false
  if (!def.needsKey) return Boolean(cfg.baseUrl.trim())
  return Boolean(cfg.apiKey.trim())
}

/* ------------------------------------------------------------------ */
/* Shared shapes                                                       */
/* ------------------------------------------------------------------ */

export interface DraftCard { term: string; def: string; hint: string }
export interface StudioTurn { role: 'user' | 'assistant'; text: string; cards?: DraftCard[] }
export interface StudioReply { message: string; cards: DraftCard[] }

const CARD_SCHEMA = {
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

const CARD_RULES =
  'Cards: the term side is a short prompt — a word, phrase, date, or question. ' +
  'The definition side is a self-contained answer the student could be graded on, ' +
  'one or two sentences, no filler and no "this refers to". Write a hint only when ' +
  'the card is genuinely hard (a mnemonic, a word root); otherwise leave hint empty. ' +
  'Never invent facts to reach a card count — if the material only supports twelve ' +
  'good cards, make twelve and say so.\n\n' +
  'The message field is what the student reads: one or two sentences on what you made ' +
  'and anything they should know. Do not list the cards back in it — they can see them. ' +
  'When asked to revise, return the full corrected set, not a diff.\n\n' +
  'Reply with JSON only: {"message": string, "cards": [{"term","def","hint"}]}.'

/* ------------------------------------------------------------------ */
/* Card recipes — the many ways in                                     */
/* ------------------------------------------------------------------ */

export type RecipeId =
  | 'flashcards' | 'cloze' | 'glossary' | 'questions' | 'formulas'
  | 'timeline' | 'compare' | 'vocab' | 'define' | 'reverse' | 'topic'

export interface Recipe {
  id: RecipeId
  name: string
  blurb: string
  /** Needs uploaded material, versus working from typed input alone. */
  needsSources: boolean
  system: string
}

export const RECIPES: Recipe[] = [
  {
    id: 'flashcards', name: 'Standard flashcards', needsSources: true,
    blurb: 'Term on one side, definition on the other. The default.',
    system: 'You build study flashcards from a student\'s own course material. Cover the material evenly rather than exhausting the first section.',
  },
  {
    id: 'cloze', name: 'Fill in the blank', needsSources: true,
    blurb: 'Sentences from your notes with the key word removed.',
    system: 'You build cloze-deletion cards. The term side is a sentence drawn from the material with the single most important word or phrase replaced by "_____". The definition side is exactly the removed word or phrase, nothing more. Choose the word that carries the meaning, never an article or filler word.',
  },
  {
    id: 'glossary', name: 'Key terms only', needsSources: true,
    blurb: 'Pull out the vocabulary and define each one.',
    system: 'You extract the key technical vocabulary from the material and define each term. Only include terms the material actually explains. Skip common words a student at this level already knows.',
  },
  {
    id: 'questions', name: 'Exam questions', needsSources: true,
    blurb: 'Question on the front, full answer on the back.',
    system: 'You write exam-style questions from the material. The term side is a question phrased the way a teacher would ask it on a test. The definition side is a complete, gradeable answer. Favour questions that require understanding over recall of a single word.',
  },
  {
    id: 'formulas', name: 'Formulas & equations', needsSources: true,
    blurb: 'Each formula, what it computes, and what the symbols mean.',
    system: 'You extract formulas, equations, and rules from the material. The term side names the formula or asks when it applies; the definition side gives the formula in plain text along with what each symbol means. Use plain-text notation, not LaTeX.',
  },
  {
    id: 'timeline', name: 'Dates & events', needsSources: true,
    blurb: 'Built for history — what happened, when, and why it mattered.',
    system: 'You extract dates, events, and people from the material. The term side is the event or date; the definition side says what happened and why it mattered. Keep each answer to one or two sentences.',
  },
  {
    id: 'compare', name: 'Easily confused pairs', needsSources: true,
    blurb: 'The things you keep mixing up, side by side.',
    system: 'You find concepts in the material that students commonly confuse with each other. The term side names both items ("Mitosis vs. meiosis"); the definition side states the single clearest distinction between them. Only include genuine confusable pairs present in the material.',
  },
  {
    id: 'vocab', name: 'Language vocabulary', needsSources: true,
    blurb: 'Word, translation, and gender or conjugation notes.',
    system: 'You build language-learning cards. The term side is the word or phrase in the language being studied; the definition side is the translation plus any essential grammar note (gender, irregular forms, register). Keep the hint for tricky pronunciation or false friends.',
  },
  {
    id: 'topic', name: 'From a topic', needsSources: false,
    blurb: 'No notes needed — name a subject and get a deck.',
    system: 'You build study flashcards on a topic the student names, at the level they describe. Stick to well-established material a standard course would cover. If the topic is too broad for the requested count, cover the fundamentals first and say what you left out.',
  },
  {
    id: 'define', name: 'I have terms', needsSources: false,
    blurb: 'Paste your term list; get definitions written for you.',
    system: 'The student gives you a list of terms. Write a definition for each one, in the order given, echoing each term back exactly as written. Definitions are one or two sentences, concrete enough to be graded against.',
  },
  {
    id: 'reverse', name: 'I have definitions', needsSources: false,
    blurb: 'Paste definitions; get the terms they describe.',
    system: 'The student gives you a list of definitions or descriptions. For each, identify the term being described. The term side is that term; the definition side is the student\'s original text, lightly cleaned up. If a description is ambiguous, pick the most likely term and say so in the message.',
  },
]

export const recipeById = (id: RecipeId): Recipe =>
  RECIPES.find(r => r.id === id) ?? RECIPES[0]

/* ------------------------------------------------------------------ */
/* Note tools — things to do with material besides making cards        */
/* ------------------------------------------------------------------ */

export type ToolId = 'summary' | 'outline' | 'exam' | 'gaps' | 'explain' | 'mnemonics'

export interface NoteTool {
  id: ToolId
  name: string
  blurb: string
  system: string
}

export const NOTE_TOOLS: NoteTool[] = [
  {
    id: 'summary', name: 'Summarize', blurb: 'The whole thing, condensed to what matters.',
    system: 'Summarize the material for a student revising it. Lead with the single most important idea. Use short sections with headings, and keep it well under the length of the original. Markdown.',
  },
  {
    id: 'outline', name: 'Study guide', blurb: 'A structured guide you can revise from.',
    system: 'Write a study guide from the material: the main topics, the key points under each, and the terms worth memorising. Structure it so a student can work top to bottom the night before a test. Markdown with headings and bullets.',
  },
  {
    id: 'exam', name: 'Practice questions', blurb: 'Written questions with an answer key.',
    system: 'Write practice exam questions from the material — a mix of recall, application, and one or two that require synthesis. Number them, then give a separate answer key at the end. Markdown.',
  },
  {
    id: 'gaps', name: 'Find the gaps', blurb: 'What your notes skip or leave vague.',
    system: 'Read the material as an examiner would and identify what is missing, vague, or likely to be tested but under-covered. Be specific and cite what the notes do say. If the notes are actually thorough, say so plainly rather than inventing problems. Markdown.',
  },
  {
    id: 'explain', name: 'Explain simply', blurb: 'The hard parts, in plain language.',
    system: 'Identify the two or three hardest ideas in the material and explain each in plain language, using a concrete analogy where one genuinely helps. Do not oversimplify to the point of being wrong. Markdown.',
  },
  {
    id: 'mnemonics', name: 'Memory hooks', blurb: 'Mnemonics for the things that never stick.',
    system: 'Produce memory aids for the facts in this material that are hardest to retain — acronyms, word roots, vivid images, or links to familiar things. One hook per item, and only for items that genuinely need one. Markdown.',
  },
]

export const toolById = (id: ToolId): NoteTool =>
  NOTE_TOOLS.find(t => t.id === id) ?? NOTE_TOOLS[0]

/* ------------------------------------------------------------------ */
/* Calls                                                               */
/* ------------------------------------------------------------------ */

/** One turn of a card-building conversation. */
export async function studioTurn(
  cfg: AiConfig,
  sources: Source[],
  history: StudioTurn[],
  ask: string,
  recipe: RecipeId = 'flashcards',
  signal?: AbortSignal,
): Promise<StudioReply> {
  const r = recipeById(recipe)
  const messages: AiMessage[] = []
  for (const t of history) {
    messages.push({
      role: t.role,
      text: t.role === 'assistant'
        ? JSON.stringify({ message: t.text, cards: t.cards ?? [] })
        : t.text,
    })
  }
  messages.push({ role: 'user', text: ask })

  const raw = await complete({
    config: cfg,
    system: `${r.system}\n\n${CARD_RULES}`,
    messages,
    sources,
    schema: CARD_SCHEMA as unknown as Record<string, unknown>,
    signal,
  })

  const parsed = parseJson<StudioReply>(raw)
  return {
    message: parsed.message?.trim() || 'Done.',
    cards: (parsed.cards ?? [])
      .filter(c => c?.term?.trim() && c?.def?.trim())
      .map(c => ({ term: c.term.trim(), def: c.def.trim(), hint: (c.hint ?? '').trim() })),
  }
}

/** Run a note tool and get markdown back. */
export async function runNoteTool(
  cfg: AiConfig,
  sources: Source[],
  tool: ToolId,
  extra: string,
  signal?: AbortSignal,
): Promise<string> {
  const t = toolById(tool)
  return complete({
    config: cfg,
    system: t.system,
    messages: [{
      role: 'user',
      text: extra.trim() || 'Work from the material above.',
    }],
    sources,
    signal,
  })
}

/** Free-form question about the loaded material. */
export async function askAboutNotes(
  cfg: AiConfig,
  sources: Source[],
  history: AiMessage[],
  question: string,
  signal?: AbortSignal,
): Promise<string> {
  return complete({
    config: cfg,
    system:
      'You answer a student\'s questions about their own course material. Answer from the ' +
      'material where it covers the question, and say plainly when it does not and you are ' +
      'drawing on general knowledge instead. Be direct and concrete; skip preamble.',
    messages: [...history, { role: 'user', text: question }],
    sources,
    signal,
  })
}

/** Definitions for terms the user has typed but left blank. */
export async function defineTerms(
  cfg: AiConfig, terms: string[], subject: string,
): Promise<Map<string, string>> {
  const reply = await studioTurn(
    cfg, [], [],
    (subject ? `Subject: ${subject}\n\n` : '') +
    `Write a definition for each of these terms:\n${terms.map(t => `- ${t}`).join('\n')}`,
    'define',
  )
  return new Map(reply.cards.map(c => [c.term.trim().toLowerCase(), c.def]))
}

/** A memory hook for a card that keeps slipping. */
export async function mnemonicFor(cfg: AiConfig, term: string, def: string): Promise<string> {
  return complete({
    config: cfg,
    system:
      'You give a student one memory hook for a term they keep forgetting: a word-root ' +
      'breakdown, an image, or a link to something familiar. Two sentences at most. ' +
      'No preamble — start with the hook itself.',
    messages: [{ role: 'user', text: `Term: ${term}\nDefinition: ${def}` }],
    maxTokens: 600,
  })
}

/** Explain a miss, in the moment. */
export async function explainMiss(
  cfg: AiConfig, term: string, correct: string, given: string,
): Promise<string> {
  return complete({
    config: cfg,
    system:
      'A student just answered a flashcard wrong. In two or three sentences, say what their ' +
      'answer confused this with and give one concrete way to tell the two apart. Be warm ' +
      'and direct. No preamble, no restating the definition they can already see.',
    messages: [{
      role: 'user',
      text: `Term: ${term}\nCorrect: ${correct}\nThey answered: ${given || '(left blank)'}`,
    }],
    maxTokens: 600,
  })
}

export function draftsToCards(drafts: DraftCard[]): Card[] {
  return drafts.map(d => {
    const c = blankCard(d.term, d.def)
    if (d.hint) c.hint = d.hint
    return c
  })
}

/** Opening instruction for a fresh session, per recipe. */
export function openingAsk(recipe: RecipeId, count: number, focus: string, input: string): string {
  const r = recipeById(recipe)
  if (r.id === 'topic') {
    return `Make about ${count} flashcards on: ${input.trim()}` +
      (focus.trim() ? `\n\nLevel and emphasis: ${focus.trim()}` : '')
  }
  if (r.id === 'define') {
    return `Write a definition for each of these terms:\n${input.trim()}` +
      (focus.trim() ? `\n\nContext: ${focus.trim()}` : '')
  }
  if (r.id === 'reverse') {
    return `Identify the term each of these describes:\n${input.trim()}` +
      (focus.trim() ? `\n\nContext: ${focus.trim()}` : '')
  }
  const base = `Make about ${count} cards from this material.`
  return focus.trim() ? `${base} Focus on: ${focus.trim()}` : base
}

export { AiError as AIError }
