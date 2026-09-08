/**
 * Tiny WebAudio blips for answer feedback. Synthesized rather than shipped as
 * assets so the app stays dependency-free and offline.
 */
declare global {
  interface Window { webkitAudioContext?: typeof AudioContext }
}

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? window.webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, start: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  const ac = audio()
  if (!ac) return
  const osc = ac.createOscillator()
  const amp = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ac.currentTime + start)
  amp.gain.setValueAtTime(0, ac.currentTime + start)
  amp.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.012)
  amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur)
  osc.connect(amp).connect(ac.destination)
  osc.start(ac.currentTime + start)
  osc.stop(ac.currentTime + start + dur + 0.02)
}

export const sfx = {
  right: () => { tone(660, 0, 0.13, 0.07); tone(990, 0.07, 0.16, 0.05) },
  wrong: () => { tone(200, 0, 0.2, 0.07, 'triangle') },
  tick:  () => { tone(880, 0, 0.05, 0.03) },
  win:   () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.28, 0.06)) },
  lose:  () => { [392, 330, 262].forEach((f, i) => tone(f, i * 0.12, 0.3, 0.06, 'triangle')) },
}
