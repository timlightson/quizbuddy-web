/**
 * Provider-agnostic model access.
 *
 * Three wire formats cover almost everything people actually use:
 *   - Anthropic's Messages API
 *   - Google's generateContent
 *   - OpenAI's /chat/completions, which OpenRouter, Groq, DeepSeek, Together,
 *     Mistral, Ollama, LM Studio and vLLM all speak too
 *
 * So "custom" isn't a lesser option here — point it at any OpenAI-compatible
 * base URL and it's a first-class provider.
 */

import type { Source } from './extract'

export type ProviderId =
  | 'anthropic' | 'openai' | 'google' | 'openrouter'
  | 'groq' | 'deepseek' | 'mistral' | 'ollama' | 'custom'

export type Wire = 'anthropic' | 'openai' | 'google'

export interface ProviderDef {
  id: ProviderId
  name: string
  wire: Wire
  baseUrl: string
  models: string[]
  /** Where to get a key. Empty for local runtimes that need none. */
  keyUrl: string
  needsKey: boolean
  pdf: boolean
  images: boolean
  /** Verified: this host sends no CORS headers, so a browser cannot call it. */
  browserBlocked?: boolean
  note?: string
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'anthropic', name: 'Anthropic (Claude)', wire: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5'],
    keyUrl: 'https://console.anthropic.com/settings/keys',
    needsKey: true, pdf: true, images: true,
    note: 'Best at reading messy scans and handwriting.',
  },
  {
    id: 'openai', name: 'OpenAI', wire: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-5.1', 'gpt-5.1-mini', 'gpt-4.1', 'gpt-4o', 'gpt-4o-mini'],
    keyUrl: 'https://platform.openai.com/api-keys',
    needsKey: true, pdf: true, images: true, browserBlocked: true,
    note: 'OpenAI does not allow direct browser calls. Reach GPT models through OpenRouter, or point Custom at your own proxy.',
  },
  {
    id: 'google', name: 'Google (Gemini)', wire: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
    keyUrl: 'https://aistudio.google.com/apikey',
    needsKey: true, pdf: true, images: true,
    note: 'Generous free tier.',
  },
  {
    id: 'openrouter', name: 'OpenRouter', wire: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      'anthropic/claude-sonnet-5', 'openai/gpt-5.1', 'google/gemini-2.5-pro',
      'meta-llama/llama-3.3-70b-instruct', 'deepseek/deepseek-chat',
    ],
    keyUrl: 'https://openrouter.ai/keys',
    needsKey: true, pdf: true, images: true,
    note: 'One key, hundreds of models.',
  },
  {
    id: 'groq', name: 'Groq', wire: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    keyUrl: 'https://console.groq.com/keys',
    needsKey: true, pdf: false, images: false,
    note: 'Very fast. Text only.',
  },
  {
    id: 'deepseek', name: 'DeepSeek', wire: 'openai',
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    keyUrl: 'https://platform.deepseek.com/api_keys',
    needsKey: true, pdf: false, images: false,
  },
  {
    id: 'mistral', name: 'Mistral', wire: 'openai',
    baseUrl: 'https://api.mistral.ai/v1',
    models: ['mistral-large-latest', 'mistral-small-latest'],
    keyUrl: 'https://console.mistral.ai/api-keys',
    needsKey: true, pdf: false, images: true,
  },
  {
    id: 'ollama', name: 'Ollama (local)', wire: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    models: ['llama3.2', 'qwen2.5', 'mistral', 'gemma2'],
    keyUrl: 'https://ollama.com/download',
    needsKey: false, pdf: false, images: false,
    note: 'Runs on your machine — nothing leaves it. Start it with OLLAMA_ORIGINS="*" so the browser can reach it.',
  },
  {
    id: 'custom', name: 'Custom (OpenAI-compatible)', wire: 'openai',
    baseUrl: '',
    models: [],
    keyUrl: '',
    needsKey: false, pdf: false, images: false,
    note: 'Any endpoint speaking /chat/completions — LM Studio, vLLM, a company gateway.',
  },
]

export const providerById = (id: ProviderId): ProviderDef =>
  PROVIDERS.find(p => p.id === id) ?? PROVIDERS[0]

/* ------------------------------------------------------------------ */

export interface AiMessage { role: 'user' | 'assistant'; text: string }

export interface AiConfig {
  provider: ProviderId
  apiKey: string
  model: string
  baseUrl: string
}

export interface AiRequest {
  config: AiConfig
  system: string
  messages: AiMessage[]
  /** Attached to the first user message. */
  sources?: Source[]
  /** When set, the reply is JSON matching this schema. */
  schema?: Record<string, unknown>
  maxTokens?: number
  signal?: AbortSignal
}

export class AiError extends Error {}

function friendly(status: number, body: string): AiError {
  const snippet = body.slice(0, 300)
  if (status === 401 || status === 403) {
    return new AiError('That API key was rejected. Check it in Settings.')
  }
  if (status === 429) {
    return new AiError('Rate limited or out of credit. Wait a moment, or check your billing.')
  }
  if (status === 404) {
    return new AiError('That model name was not found for this provider. Pick another in Settings.')
  }
  if (status >= 500) return new AiError('The provider had a server error. Try again.')
  return new AiError(`Request failed (${status}). ${snippet}`)
}

async function readError(res: Response): Promise<AiError> {
  let body = ''
  try { body = await res.text() } catch { /* body already consumed */ }
  try {
    const j = JSON.parse(body)
    const msg = j?.error?.message ?? j?.message ?? j?.error
    if (typeof msg === 'string') {
      if (res.status === 401 || res.status === 403) return friendly(res.status, '')
      return new AiError(msg.slice(0, 300))
    }
  } catch { /* not JSON */ }
  return friendly(res.status, body)
}

/** Network failures in the browser are usually CORS, and the fix differs. */
function networkError(e: unknown, cfg: AiConfig): AiError {
  const def = providerById(cfg.provider)
  if (def.browserBlocked) {
    return new AiError(
      `${def.name} blocks requests made straight from a browser, so QuizBuddy cannot reach it ` +
      'directly. Use OpenRouter to get the same models, or set Custom to your own proxy.',
    )
  }
  if (cfg.provider === 'ollama') {
    return new AiError(
      'Could not reach Ollama. Make sure it is running and started with OLLAMA_ORIGINS="*" so the browser is allowed to call it.',
    )
  }
  if (cfg.provider === 'custom') {
    return new AiError(
      `Could not reach ${cfg.baseUrl || 'that endpoint'}. Check the URL, and that it sends CORS headers for browser requests.`,
    )
  }
  return new AiError(`Could not reach ${def.name}. Check your connection.${e instanceof Error ? ` (${e.message})` : ''}`)
}

/* ---------- schema helpers ---------- */

/** Gemini rejects additionalProperties; strip it everywhere. */
function forGoogle(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(forGoogle)
  if (schema && typeof schema === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
      if (k === 'additionalProperties') continue
      out[k] = forGoogle(v)
    }
    return out
  }
  return schema
}

/** Models sometimes wrap JSON in prose or a fence despite being asked not to. */
export function parseJson<T>(raw: string): T {
  const text = raw.trim()
  try { return JSON.parse(text) as T } catch { /* try harder */ }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()) as T } catch { /* keep going */ }
  }
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first !== -1 && last > first) {
    try { return JSON.parse(text.slice(first, last + 1)) as T } catch { /* give up */ }
  }
  throw new AiError('The model did not return usable JSON. Try again, or switch to a stronger model.')
}

/* ---------- per-wire request builders ---------- */

function anthropicBody(req: AiRequest) {
  const content: unknown[] = []
  for (const s of req.sources ?? []) {
    if (s.kind === 'pdf') {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: s.data },
        title: s.name,
      })
    } else if (s.kind === 'image') {
      content.push({ type: 'image', source: { type: 'base64', media_type: s.mediaType, data: s.data } })
    } else {
      content.push({ type: 'text', text: `--- ${s.name} ---\n${s.text}` })
    }
  }
  if (content.length) {
    ;(content[content.length - 1] as Record<string, unknown>).cache_control = { type: 'ephemeral' }
  }

  const messages: unknown[] = []
  req.messages.forEach((m, i) => {
    const first = i === 0 && m.role === 'user' && content.length > 0
    messages.push({
      role: m.role,
      content: first ? [...content, { type: 'text', text: m.text }] : m.text,
    })
  })

  const body: Record<string, unknown> = {
    model: req.config.model,
    max_tokens: req.maxTokens ?? 16000,
    system: req.system,
    messages,
  }
  if (req.schema) {
    body.output_config = { effort: 'medium', format: { type: 'json_schema', schema: req.schema } }
  }
  return body
}

function openaiBody(req: AiRequest) {
  const parts: unknown[] = []
  for (const s of req.sources ?? []) {
    if (s.kind === 'image') {
      parts.push({ type: 'image_url', image_url: { url: `data:${s.mediaType};base64,${s.data}` } })
    } else if (s.kind === 'pdf') {
      parts.push({
        type: 'file',
        file: { filename: s.name, file_data: `data:application/pdf;base64,${s.data}` },
      })
    } else {
      parts.push({ type: 'text', text: `--- ${s.name} ---\n${s.text}` })
    }
  }

  const messages: unknown[] = [{ role: 'system', content: req.system }]
  req.messages.forEach((m, i) => {
    const first = i === 0 && m.role === 'user' && parts.length > 0
    messages.push({
      role: m.role,
      content: first ? [...parts, { type: 'text', text: m.text }] : m.text,
    })
  })

  const body: Record<string, unknown> = {
    model: req.config.model,
    messages,
    max_tokens: req.maxTokens ?? 16000,
  }
  if (req.schema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: { name: 'result', schema: req.schema, strict: false },
    }
  }
  return body
}

function googleBody(req: AiRequest) {
  const parts: unknown[] = []
  for (const s of req.sources ?? []) {
    if (s.kind === 'text') parts.push({ text: `--- ${s.name} ---\n${s.text}` })
    else {
      parts.push({
        inlineData: {
          mimeType: s.kind === 'pdf' ? 'application/pdf' : s.mediaType,
          data: s.data,
        },
      })
    }
  }

  const contents: unknown[] = []
  req.messages.forEach((m, i) => {
    const first = i === 0 && m.role === 'user' && parts.length > 0
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: first ? [...parts, { text: m.text }] : [{ text: m.text }],
    })
  })

  const body: Record<string, unknown> = {
    contents,
    systemInstruction: { parts: [{ text: req.system }] },
    generationConfig: {
      maxOutputTokens: req.maxTokens ?? 16000,
      ...(req.schema
        ? { responseMimeType: 'application/json', responseSchema: forGoogle(req.schema) }
        : {}),
    },
  }
  return body
}

/* ---------- the one call everything goes through ---------- */

export async function complete(req: AiRequest): Promise<string> {
  const cfg = req.config
  const def = providerById(cfg.provider)
  const base = (cfg.baseUrl || def.baseUrl).replace(/\/+$/, '')

  if (!base) throw new AiError('No endpoint set for this provider. Add a base URL in Settings.')
  if (def.needsKey && !cfg.apiKey.trim()) throw new AiError(`${def.name} needs an API key. Add one in Settings.`)
  if (!cfg.model.trim()) throw new AiError('No model selected. Pick one in Settings.')

  let url: string
  let headers: Record<string, string>
  let body: unknown

  if (def.wire === 'anthropic') {
    url = `${base}/v1/messages`
    headers = {
      'content-type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }
    body = anthropicBody(req)
  } else if (def.wire === 'google') {
    url = `${base}/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`
    headers = { 'content-type': 'application/json' }
    body = googleBody(req)
  } else {
    url = `${base}/chat/completions`
    headers = { 'content-type': 'application/json' }
    if (cfg.apiKey.trim()) headers.authorization = `Bearer ${cfg.apiKey}`
    if (cfg.provider === 'openrouter') {
      headers['HTTP-Referer'] = location.origin
      headers['X-Title'] = 'QuizBuddy'
    }
    body = openaiBody(req)
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST', headers, body: JSON.stringify(body), signal: req.signal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw networkError(e, cfg)
  }

  if (!res.ok) throw await readError(res)

  const json = await res.json() as Record<string, never>

  if (def.wire === 'anthropic') {
    const stop = (json as { stop_reason?: string }).stop_reason
    if (stop === 'refusal') throw new AiError('The model declined this request. Try rephrasing the material.')
    const blocks = (json as { content?: { type: string; text?: string }[] }).content ?? []
    const text = blocks.filter(b => b.type === 'text').map(b => b.text ?? '').join('')
    if (!text.trim()) throw new AiError('Empty response. Try again.')
    return text
  }

  if (def.wire === 'google') {
    const cands = (json as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates ?? []
    const text = (cands[0]?.content?.parts ?? []).map(p => p.text ?? '').join('')
    if (!text.trim()) throw new AiError('Empty response — the model may have blocked the content. Try again.')
    return text
  }

  const choices = (json as { choices?: { message?: { content?: string } }[] }).choices ?? []
  const text = choices[0]?.message?.content ?? ''
  if (!text.trim()) throw new AiError('Empty response. Try again.')
  return text
}

/** What the current provider can actually read, for honest UI. */
export function capabilities(id: ProviderId) {
  const d = providerById(id)
  return { pdf: d.pdf, images: d.images, name: d.name }
}
