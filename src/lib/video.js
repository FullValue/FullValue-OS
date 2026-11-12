// Formation : détecter comment lire une ressource dans l'outil (YouTube, Vimeo, lien direct, fichier importé),
// suivre la progression de lecture et gérer les notes horodatées.
import { extractYouTubeId } from './youtube.js'

const DIRECT_VIDEO = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i
const DIRECT_AUDIO = /\.(mp3|m4a|aac|ogg|oga|wav)(\?|#|$)/i
const VIMEO = /vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-z0-9]+))?/i

export const VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/ogg']
export const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

// → { kind: 'youtube' | 'vimeo' | 'file' | 'direct', media: 'video' | 'audio', ... } ou null si rien à lire dans l'outil.
export function videoSource(resource) {
  if (!resource) return null
  const youtubeId = resource.youtubeId || extractYouTubeId(resource.url)
  if (youtubeId && (resource.type === 'youtube' || resource.type === 'video' || resource.type === 'podcast' || resource.youtubeId)) {
    return { kind: 'youtube', media: 'video', youtubeId }
  }
  const url = String(resource.url || '')
  const vimeo = VIMEO.exec(url)
  if (vimeo) return { kind: 'vimeo', media: 'video', vimeoId: vimeo[1], hash: vimeo[2] || null }
  const mime = String(resource.fileMimeType || '')
  if (resource.filePath && (mime.startsWith('video/') || mime.startsWith('audio/'))) {
    return { kind: 'file', media: mime.startsWith('audio/') ? 'audio' : 'video', filePath: resource.filePath, mime }
  }
  if (/^https?:\/\//i.test(url)) {
    if (DIRECT_VIDEO.test(url)) return { kind: 'direct', media: 'video', url }
    if (DIRECT_AUDIO.test(url)) return { kind: 'direct', media: 'audio', url }
  }
  return null
}

export function vimeoEmbedUrl(source) {
  return `https://player.vimeo.com/video/${source.vimeoId}${source.hash ? `?h=${source.hash}` : ''}`
}

// oEmbed Vimeo (CORS ouvert) : titre, auteur et miniature pour pré-remplir l'ajout.
export async function fetchVimeoMetadata(url) {
  try {
    const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const d = await res.json()
    return { title: d.title, channel: d.author_name, thumbnail: d.thumbnail_url }
  } catch {
    return null
  }
}

export function thumbnailOf(resource) {
  if (resource?.youtubeThumbnailUrl) return resource.youtubeThumbnailUrl
  const src = videoSource(resource)
  return src?.kind === 'youtube' ? `https://img.youtube.com/vi/${src.youtubeId}/hqdefault.jpg` : resource?.thumbnailUrl || null
}

// 75 → "1:15", 3725 → "1:02:05"
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

export function watchPercent(resource) {
  const d = Number(resource?.watchDuration) || 0
  if (!d) return 0
  return Math.min(100, Math.round(((Number(resource.watchTime) || 0) / d) * 100))
}

// Position de reprise : on revient quelques secondes en arrière, et pas du tout si la vidéo est quasi finie.
export function resumePoint(resource) {
  const t = Number(resource?.watchTime) || 0
  if (t < 10 || watchPercent(resource) >= 95) return 0
  return Math.max(0, t - 3)
}

// Modifs à appliquer à la ressource quand la lecture avance. Le statut ne fait qu'avancer :
// « À voir » → « En cours » dès qu'on regarde, « Vu » à 92 %. On ne rétrograde jamais un statut choisi à la main.
export function progressPatch(resource, time, duration) {
  const patch = { watchTime: Math.floor(time), watchDuration: Math.floor(duration) || resource.watchDuration || 0 }
  const pct = patch.watchDuration ? time / patch.watchDuration : 0
  if (pct >= 0.92) patch.status = 'done'
  else if (time >= 5 && (!resource.status || resource.status === 'a_voir')) patch.status = 'en_cours'
  return patch
}

export function sortTimeNotes(notes = []) {
  return [...notes].sort((a, b) => a.t - b.t)
}

export function addTimeNote(notes = [], t, text, id) {
  const clean = String(text || '').trim()
  if (!clean) return notes
  return sortTimeNotes([...notes, { id, t: Math.max(0, Math.floor(t) || 0), text: clean }])
}
