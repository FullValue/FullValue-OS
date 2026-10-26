// Studio Créatif : constantes et helpers partagés (veille concurrents, assets, montages).
// Les métadonnées vivent dans le store (creatives, creativeAssets, montages) ; les fichiers
// dans Supabase Storage, bucket « creative-files », dossier <user_id>/ (migration 008).
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export const CREATIVE_BUCKET = 'creative-files'

// Classes communes des champs de formulaire du Studio (FIELD_BASE : sans largeur, pour les filtres).
export const FIELD_BASE = 'rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]'
export const FIELD = `w-full ${FIELD_BASE}`
export const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]'

export const PLATFORMS = {
  meta: 'Meta Ads', tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', linkedin: 'LinkedIn',
  snapchat: 'Snapchat', x: 'X', google: 'Google Ads', autre: 'Autre',
}
export const FORMATS = { video: 'Vidéo', image: 'Image', carrousel: 'Carrousel', story: 'Story', autre: 'Autre' }

export const VERDICTS = {
  dupliquer: { label: 'Dupliquer', bg: 'var(--green-bg)', color: 'var(--green-deep)' },
  adapter:   { label: 'Adapter',   bg: 'var(--brand-100)', color: 'var(--accent)' },
  ignorer:   { label: 'Ignorer',   bg: 'rgba(var(--ink),0.06)', color: 'var(--text-tertiary)' },
}
export const CREATIVE_STATUS = { a_analyser: 'À analyser', analysee: 'Analysée', dupliquee: 'Dupliquée', ignoree: 'Ignorée' }

export const ASSET_KINDS = { video: 'Vidéo', image: 'Image', audio: 'Audio', texte: 'Texte / script' }
export const ASSET_SOURCES = { upload: 'Import', lien: 'Lien', kie: 'Kie.ai', mcp: 'Claude (MCP)' }

export const ASPECTS = ['9:16', '4:5', '1:1', '16:9']
export const MONTAGE_STATUS = {
  brief:     { label: 'Brief',      bg: 'rgba(var(--ink),0.06)', color: 'var(--text-secondary)' },
  en_cours:  { label: 'En montage', bg: '#E5F1FB',               color: '#2470B0' },
  a_valider: { label: 'À valider',  bg: '#FFF3D1',               color: '#C8930F' },
  livre:     { label: 'Livré',      bg: 'var(--green-bg)',       color: 'var(--green-deep)' },
}

// Connecteurs prévus : affichés dans le Studio, branchés au fur et à mesure.
export const STUDIO_CONNECTORS = [
  { id: 'kie', name: 'Kie.ai', role: 'Génération d’assets (images, vidéos, voix)' },
  { id: 'claude', name: 'Claude Opus 5.5 · MCP', role: 'Montage, reprise et assemblage des assets' },
  { id: 'gemini', name: 'Gemini', role: 'Analyse des créas (verdict, angle, accroche)' },
  { id: 'meta', name: 'Meta · Bibliothèque publicitaire', role: 'Toutes les créas et données des concurrents' },
]

export function guessPlatform(url = '') {
  const u = url.toLowerCase()
  if (u.includes('facebook.com/ads') || u.includes('facebook') || u.includes('fb.')) return 'meta'
  if (u.includes('tiktok')) return 'tiktok'
  if (u.includes('instagram')) return 'instagram'
  if (u.includes('youtu')) return 'youtube'
  if (u.includes('linkedin')) return 'linkedin'
  if (u.includes('snapchat')) return 'snapchat'
  if (u.includes('x.com') || u.includes('twitter')) return 'x'
  return 'autre'
}

export function kindFromMime(type = '') {
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('audio/')) return 'audio'
  return 'texte'
}

export async function uploadCreativeFile(file, userId, folder) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(CREATIVE_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) {
    if (/bucket not found/i.test(error.message)) throw new Error('Stockage du Studio absent : exécute la migration 008 dans Supabase.')
    if (/exceeded|too large|413|size/i.test(error.message)) throw new Error('Fichier trop lourd : ajoute-le plutôt par lien (Drive, Dropbox…).')
    throw error
  }
  return path
}

export async function removeCreativeFiles(paths) {
  const list = paths.filter(Boolean)
  if (list.length) await supabase.storage.from(CREATIVE_BUCKET).remove(list)
}

// URL lisible d'un média : lien direct, ou URL signée (1 h) pour un fichier du bucket.
export function useMediaUrl(item) {
  const path = item?.filePath
  const [signed, setSigned] = useState({ path: null, url: null })
  useEffect(() => {
    if (!path) return
    let alive = true
    supabase.storage.from(CREATIVE_BUCKET).createSignedUrl(path, 3600)
      .then(({ data }) => { if (alive) setSigned({ path, url: data?.signedUrl || null }) })
      .catch(() => {})
    return () => { alive = false }
  }, [path])
  if (path) return signed.path === path ? signed.url : null
  return item?.url || null
}

// Un lien peut être affiché directement s'il pointe vers un fichier média.
export function isDirectMedia(url = '') {
  return /\.(mp4|mov|webm|m4v|jpe?g|png|gif|webp|avif|mp3|wav|m4a)(\?|$)/i.test(url)
}

// Chiffres de la veille : angles regroupés (les plus utilisés d'abord), créas à arbitrer, à dupliquer.
export function veilleStats(items = []) {
  const angles = new Map()
  for (const c of items) if (c.angle?.trim()) angles.set(c.angle.trim(), [...(angles.get(c.angle.trim()) || []), c])
  return {
    angles: [...angles.entries()].sort((a, b) => b[1].length - a[1].length),
    todo: items.filter(c => !c.verdict && c.status !== 'ignoree').length,
    dup: items.filter(c => c.verdict === 'dupliquer').length,
  }
}
