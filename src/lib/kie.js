// Kie.ai côté navigateur : catalogue des modèles proposés dans le Studio et appels au proxy /api/kie.
// Les champs « input » suivent la doc Kie (docs.kie.ai/market/…). Les fichiers générés ne restent
// que 14 jours chez Kie : le Studio les recopie dans le stockage du cockpit dès qu'ils sont prêts.
import { supabase } from '@/lib/supabase'

export const KIE_RETENTION_DAYS = 14

const IMAGE_RATIOS = ['9:16', '4:5', '1:1', '16:9', '3:4', '4:3']

export const KIE_VOICES = [
  ['FGY2WhTYpPnrIDTdsKH5', 'Laura'], ['TX3LPaxmHKxFdv7VOQHJ', 'Liam'], ['N2lVS1w4EtoT3dr4eOWO', 'Callum'],
  ['nPczCjzI2devNBz1zQrb', 'Brian'], ['pPdl9cQBQq4p6mRkZy2Z', 'Emma'], ['EkK5I93UQWFDigLMpZcX', 'James'],
  ['hpp4J3VqNfWAUOO0d1Us', 'Bella'], ['TC0Zp7WVFzhA8zpTlRqV', 'Aria'], ['eVItLK1UvXctxuaRV2Oq', 'Jean'],
  ['Z3R5wn05IrDiVCyEkUrK', 'Arabella'],
]

// refs : nombre d'images de référence (0 = aucune, [min, max] sinon).
export const KIE_MODELS = [
  { id: 'google/nano-banana', kind: 'image', label: 'Nano Banana', hint: 'Image rapide et polyvalente', ratios: [...IMAGE_RATIOS, 'auto'],
    build: o => ({ prompt: o.prompt, aspect_ratio: o.ratio, output_format: 'png' }) },
  { id: 'seedream/4.5-text-to-image', kind: 'image', label: 'Seedream 4.5', hint: 'Image haute qualité 2K / 4K', ratios: ['9:16', '1:1', '16:9', '3:4', '4:3', '2:3', '3:2'], quality: true,
    build: o => ({ prompt: o.prompt, aspect_ratio: o.ratio, quality: o.quality || 'basic' }) },
  { id: 'google/nano-banana-edit', kind: 'image', label: 'Nano Banana Edit', hint: 'Modifier ou combiner tes images', ratios: [...IMAGE_RATIOS, 'auto'], refs: [1, 10],
    build: o => ({ prompt: o.prompt, image_urls: o.refs, aspect_ratio: o.ratio, output_format: 'png' }) },
  { id: 'kling-2.6/text-to-video', kind: 'video', label: 'Kling 2.6 · texte → vidéo', hint: 'Vidéo de 5 ou 10 s', ratios: ['9:16', '1:1', '16:9'], duration: true, sound: true,
    build: o => ({ prompt: o.prompt, aspect_ratio: o.ratio, duration: o.duration || '5', sound: !!o.sound }) },
  { id: 'kling-2.6/image-to-video', kind: 'video', label: 'Kling 2.6 · image → vidéo', hint: 'Anime une de tes images', refs: [1, 1], duration: true, sound: true,
    build: o => ({ prompt: o.prompt, image_urls: o.refs, duration: o.duration || '5', sound: !!o.sound }) },
  { id: 'elevenlabs/text-to-speech-multilingual-v2', kind: 'audio', label: 'Voix off · ElevenLabs', hint: 'Texte → voix (multilingue, français OK)', voice: true,
    build: o => ({ text: o.prompt, voice: o.voice || KIE_VOICES[0][0], stability: 0.5, similarity_boost: 0.75, speed: 1 }) },
]

export const kieModel = id => KIE_MODELS.find(m => m.id === id)

async function call(path, init = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Connecte-toi à ton compte pour générer avec Kie.ai.')
  const res = await fetch(`/api/kie${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } })
  const body = await res.json().catch(() => ({}))
  if (res.status === 404) throw new Error('Le générateur n’est disponible que sur le site en ligne (pas en local).')
  if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`)
  return body
}

export function createKieTask(model, input) {
  return call('', { method: 'POST', body: JSON.stringify({ model, input }) })
}

export function getKieTask(taskId) {
  return call(`?taskId=${encodeURIComponent(taskId)}`)
}
