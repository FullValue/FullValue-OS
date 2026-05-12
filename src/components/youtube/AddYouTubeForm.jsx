import { useState, useEffect } from 'react'
import { extractYouTubeId, isYouTubeUrl, fetchYouTubeMetadata, buildThumbnailUrl } from '@/lib/youtube'
import { Loader2 } from 'lucide-react'

export default function AddYouTubeForm({ onSubmit, onCancel, extraFields, extraDefaults = {} }) {
  const [url, setUrl] = useState('')
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!url || !isYouTubeUrl(url)) { setMetadata(null); return }
    const timer = setTimeout(async () => {
      setLoading(true); setError('')
      const data = await fetchYouTubeMetadata(url)
      setLoading(false)
      if (data) { setMetadata(data); setTitle(data.title) }
      else setError('Vidéo introuvable ou URL invalide.')
    }, 500)
    return () => clearTimeout(timer)
  }, [url])

  function handleSubmit(e) {
    e.preventDefault()
    if (!metadata || !title.trim()) return
    const youtubeId = extractYouTubeId(url)
    onSubmit({
      type: 'youtube',
      title: title.trim(),
      youtubeId,
      youtubeThumbnailUrl: metadata.thumbnail || buildThumbnailUrl(youtubeId),
      youtubeChannel: metadata.channel,
      url,
      ...extraDefaults,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="text-white/40 text-xs mb-1 block">Lien YouTube</label>
        <input
          autoFocus
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-violet/40 font-mono"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <Loader2 size={14} className="animate-spin" /> Récupération des infos…
        </div>
      )}

      {error && <p className="text-xs text-red/80">{error}</p>}

      {metadata && (
        <div className="flex gap-3 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <img
            src={metadata.thumbnail || buildThumbnailUrl(extractYouTubeId(url))}
            alt={metadata.title}
            className="w-24 h-14 object-cover rounded-lg flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/80 font-medium line-clamp-2 leading-tight">{metadata.title}</p>
            <p className="text-xs text-white/35 mt-1">{metadata.channel}</p>
          </div>
        </div>
      )}

      {metadata && (
        <>
          <div>
            <label className="text-white/40 text-xs mb-1 block">Titre *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet/40"
            />
          </div>
          {extraFields}
        </>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={!metadata || !title.trim()}
          className="flex-1 bg-red-500 hover:bg-red-500/90 text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
        >
          ▶ Ajouter la vidéo
        </button>
        <button type="button" onClick={onCancel} className="flex-1 bg-white/5 hover:bg-white/8 text-white/50 py-2.5 rounded-xl text-sm transition-colors">
          Annuler
        </button>
      </div>
    </form>
  )
}
