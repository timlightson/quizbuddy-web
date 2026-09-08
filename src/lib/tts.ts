let voices: SpeechSynthesisVoice[] = []

function loadVoices() {
  if (typeof speechSynthesis === 'undefined') return
  voices = speechSynthesis.getVoices()
}

if (typeof speechSynthesis !== 'undefined') {
  loadVoices()
  speechSynthesis.addEventListener('voiceschanged', loadVoices)
}

export function ttsAvailable(): boolean {
  return typeof speechSynthesis !== 'undefined'
}

/** Best voice for a BCP-47 tag, preferring an exact match then the language. */
function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (!voices.length) loadVoices()
  const base = lang.split('-')[0]
  return (
    voices.find(v => v.lang === lang) ??
    voices.find(v => v.lang.replace('_', '-') === lang) ??
    voices.find(v => v.lang.startsWith(base))
  )
}

export function speak(text: string, lang = 'en-US', rate = 0.95) {
  if (!ttsAvailable() || !text.trim()) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = rate
  const v = pickVoice(lang)
  if (v) u.voice = v
  speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (ttsAvailable()) speechSynthesis.cancel()
}

export const LANGS: { code: string; label: string }[] = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-ES', label: 'Spanish (Spain)' },
  { code: 'es-MX', label: 'Spanish (Mexico)' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'it-IT', label: 'Italian' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'ko-KR', label: 'Korean' },
  { code: 'zh-CN', label: 'Chinese (Mandarin)' },
  { code: 'ru-RU', label: 'Russian' },
  { code: 'ar-SA', label: 'Arabic' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'la', label: 'Latin' },
]
