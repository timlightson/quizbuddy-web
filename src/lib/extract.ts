/**
 * Turning whatever a student drops in into something Claude can read.
 *
 * PDFs and images are handed to the model natively rather than scraped for
 * text — that way a scanned handout, a lecture slide with diagrams, or a photo
 * of handwritten notes all work, which text extraction would lose.
 */

export type Source =
  | { id: string; kind: 'text';  name: string; text: string;  size: number }
  | { id: string; kind: 'pdf';   name: string; data: string;  size: number }
  | { id: string; kind: 'image'; name: string; data: string;  size: number; mediaType: string }

export const MAX_BYTES = 24 * 1024 * 1024      // request cap is 32MB; leave headroom
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export class ExtractError extends Error {}

const uid = () => Math.random().toString(36).slice(2, 10)

function readAs(file: File, how: 'text' | 'dataURL' | 'buffer'): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(new ExtractError(`Could not read ${file.name}`))
    r.onload = () => resolve(r.result as string | ArrayBuffer)
    if (how === 'text') r.readAsText(file)
    else if (how === 'dataURL') r.readAsDataURL(file)
    else r.readAsArrayBuffer(file)
  })
}

/** data: URLs carry a `data:<type>;base64,` prefix the API doesn't want. */
async function base64(file: File): Promise<string> {
  const url = (await readAs(file, 'dataURL')) as string
  const comma = url.indexOf(',')
  return comma === -1 ? url : url.slice(comma + 1)
}

const ext = (name: string) => name.slice(name.lastIndexOf('.') + 1).toLowerCase()

const TEXTY = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'rtf', 'json',
  'html', 'htm', 'tex', 'org', 'rst',
])

export function accepts(): string {
  return '.pdf,.docx,.txt,.md,.markdown,.csv,.tsv,.rtf,.html,.htm,.tex,image/*'
}

export async function extract(file: File): Promise<Source> {
  if (file.size > MAX_BYTES) {
    throw new ExtractError(
      `${file.name} is ${(file.size / 1048576).toFixed(1)}MB — the limit is ${MAX_BYTES / 1048576}MB.`,
    )
  }
  if (file.size === 0) throw new ExtractError(`${file.name} is empty.`)

  const e = ext(file.name)
  const base = { id: uid(), name: file.name, size: file.size }

  if (file.type === 'application/pdf' || e === 'pdf') {
    return { ...base, kind: 'pdf', data: await base64(file) }
  }

  if (file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(e)) {
    const mediaType = IMAGE_TYPES.includes(file.type)
      ? file.type
      : e === 'png' ? 'image/png'
      : e === 'gif' ? 'image/gif'
      : e === 'webp' ? 'image/webp'
      : 'image/jpeg'
    return { ...base, kind: 'image', data: await base64(file), mediaType }
  }

  if (e === 'docx') {
    // ~200KB of parser, pulled in only when someone actually drops a .docx.
    const mammoth = await import('mammoth/mammoth.browser')
    const buffer = (await readAs(file, 'buffer')) as ArrayBuffer
    const { value } = await mammoth.extractRawText({ arrayBuffer: buffer })
    if (!value.trim()) throw new ExtractError(`${file.name} has no readable text.`)
    return { ...base, kind: 'text', text: value }
  }

  if (e === 'doc') {
    throw new ExtractError('Legacy .doc isn\'t supported — save it as .docx or PDF first.')
  }

  if (TEXTY.has(e) || file.type.startsWith('text/')) {
    const text = (await readAs(file, 'text')) as string
    if (!text.trim()) throw new ExtractError(`${file.name} has no readable text.`)
    return { ...base, kind: 'text', text }
  }

  throw new ExtractError(`Can't read .${e} files. Try a PDF, Word doc, image, or plain text.`)
}

export function describe(s: Source): string {
  const kb = s.size < 1024 * 1024
    ? `${Math.max(1, Math.round(s.size / 1024))} KB`
    : `${(s.size / 1048576).toFixed(1)} MB`
  if (s.kind === 'text') return `${s.text.length.toLocaleString()} characters`
  if (s.kind === 'pdf') return `PDF · ${kb}`
  return `Image · ${kb}`
}
