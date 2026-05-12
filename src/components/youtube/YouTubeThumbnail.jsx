import { Play } from 'lucide-react'
import { buildThumbnailUrl } from '@/lib/youtube'

export default function YouTubeThumbnail({ youtubeId, title, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-xl bg-black"
      style={{ aspectRatio: '16/9' }}
    >
      <img
        src={buildThumbnailUrl(youtubeId)}
        alt={title ?? 'YouTube'}
        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
        <div className="rounded-full bg-white/90 p-2.5 shadow-lg group-hover:scale-110 transition-transform">
          <Play size={16} className="fill-red-600 text-red-600 ml-0.5" />
        </div>
      </div>
    </button>
  )
}
