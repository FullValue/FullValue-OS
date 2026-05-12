// Extrait l'ID YouTube depuis tous les formats d'URL connus
export function extractYouTubeId(url) {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export function isYouTubeUrl(url) {
  return extractYouTubeId(url) !== null
}

export function buildEmbedUrl(youtubeId) {
  return `https://www.youtube.com/embed/${youtubeId}?rel=0`
}

// hqdefault = 480×360, toujours disponible sans 404
export function buildThumbnailUrl(youtubeId) {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
}

// oEmbed public — pas besoin de clé API, supporte CORS navigateur
export async function fetchYouTubeMetadata(url) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    )
    if (!res.ok) return null
    const d = await res.json()
    return { title: d.title, channel: d.author_name, thumbnail: d.thumbnail_url }
  } catch {
    return null
  }
}
