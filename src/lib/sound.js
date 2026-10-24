// Petits sons générés (Web Audio) : aucun fichier à charger. Désactivables dans les réglages.
let ctx = null

function tone(freq, start, duration, gain = 0.12, type = 'sine') {
  ctx ||= new (window.AudioContext || window.webkitAudioContext)()
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0, ctx.currentTime + start)
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration)
  osc.connect(g).connect(ctx.destination)
  osc.start(ctx.currentTime + start)
  osc.stop(ctx.currentTime + start + duration + 0.05)
}

const SOUNDS = {
  tick: () => tone(880, 0, 0.08, 0.06),
  success: () => { tone(660, 0, 0.12); tone(880, 0.09, 0.18) },
  levelUp: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.25, 0.1, 'triangle')),
  bell: () => { tone(988, 0, 1.2, 0.14); tone(1319, 0.02, 1, 0.06) },
}

export function playSound(name, enabled = true) {
  if (!enabled) return
  try { SOUNDS[name]?.() } catch { /* audio indisponible : on ignore */ }
}

export function notify(title, body) {
  try {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification(title, { body, icon: '/favicon.svg' })
  } catch { /* ignore */ }
}
