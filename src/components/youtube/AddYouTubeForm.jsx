import { useState, useEffect } from 'react'
import { extractYouTubeId, isYouTubeUrl, fetchYouTubeMetadata, buildThumbnailUrl } from '@/lib/youtube'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
        <Label>Lien YouTube</Label>
        <Input
          autoFocus
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="font-mono"
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
            <Label>Titre *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          {extraFields}
        </>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={!metadata || !title.trim()} className="flex-1">
          ▶ Ajouter la vidéo
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
      </div>
    </form>
  )
}
