import { buildEmbedUrl } from '@/lib/youtube'

export default function YouTubeEmbed({ youtubeId, title }) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
      <iframe
        src={buildEmbedUrl(youtubeId)}
        title={title ?? 'YouTube'}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  )
}
