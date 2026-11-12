// Lecteur intégré : YouTube (API iframe), Vimeo (iframe), lien direct ou fichier importé (<video> / <audio>).
// Le parent pilote la lecture par ref : getTime(), seek(t), setSpeed(v) ; la progression remonte par onProgress.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { vimeoEmbedUrl } from '@/lib/video'

const ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen'
let youtubeApi = null

// L'API iframe de YouTube se charge une seule fois pour toute l'application.
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!youtubeApi) {
    youtubeApi = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(window.YT) }
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.onerror = () => { youtubeApi = null; reject(new Error('API YouTube inaccessible')) }
      document.head.appendChild(script)
    })
  }
  return youtubeApi
}

const Frame = ({ children }) => (
  <div className="relative w-full overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '16/9' }}>{children}</div>
)

function YouTubePlayer({ source, title, startAt, onProgress, apiRef }) {
  const hostRef = useRef(null)
  const playerRef = useRef(null)
  const [failed, setFailed] = useState(false)
  const cbRef = useRef(onProgress)
  useEffect(() => { cbRef.current = onProgress })

  useEffect(() => {
    let cancelled = false
    let timer = null
    const node = document.createElement('div')
    node.className = 'absolute inset-0 h-full w-full'
    hostRef.current.appendChild(node)

    const report = final => {
      const p = playerRef.current
      if (p?.getCurrentTime) cbRef.current?.(p.getCurrentTime(), p.getDuration?.() || 0, !!final)
    }
    loadYouTubeApi().then(YT => {
      if (cancelled) return
      playerRef.current = new YT.Player(node, {
        videoId: source.youtubeId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, start: Math.floor(startAt) || 0 },
        events: {
          onStateChange: e => {
            clearInterval(timer)
            if (e.data === YT.PlayerState.PLAYING) timer = setInterval(() => report(false), 5000)
            else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) report(true)
          },
        },
      })
    }).catch(() => setFailed(true))

    apiRef.current = {
      getTime: () => playerRef.current?.getCurrentTime?.() ?? null,
      seek: t => { playerRef.current?.seekTo?.(t, true); playerRef.current?.playVideo?.() },
      setSpeed: v => playerRef.current?.setPlaybackRate?.(v),
    }
    return () => {
      cancelled = true
      clearInterval(timer)
      report(true)
      try { playerRef.current?.destroy?.() } catch { /* lecteur déjà détruit */ }
      playerRef.current = null
      node.remove()
    }
  }, [source.youtubeId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) {
    return (
      <Frame>
        <iframe src={`https://www.youtube.com/embed/${source.youtubeId}?rel=0`} title={title || 'YouTube'} className="absolute inset-0 h-full w-full" allow={ALLOW} allowFullScreen />
      </Frame>
    )
  }
  return <Frame><div ref={hostRef} className="absolute inset-0" /></Frame>
}

function MediaPlayer({ src, media, startAt, onProgress, apiRef }) {
  const ref = useRef(null)
  const lastReport = useRef(0)

  useEffect(() => {
    apiRef.current = {
      getTime: () => ref.current?.currentTime ?? null,
      seek: t => { if (ref.current) { ref.current.currentTime = t; ref.current.play().catch(() => {}) } },
      setSpeed: v => { if (ref.current) ref.current.playbackRate = v },
    }
  })

  const report = force => {
    const el = ref.current
    if (!el || !el.duration || !isFinite(el.duration)) return
    const now = Date.now()
    if (!force && now - lastReport.current < 5000) return
    lastReport.current = now
    onProgress?.(el.currentTime, el.duration, !!force)
  }

  useEffect(() => () => report(true), []) // eslint-disable-line react-hooks/exhaustive-deps

  const props = {
    ref, src, controls: true, preload: 'metadata', playsInline: true,
    onLoadedMetadata: () => { if (startAt && ref.current) ref.current.currentTime = startAt },
    onTimeUpdate: () => report(false),
    onPause: () => report(true),
    onEnded: () => report(true),
  }
  return media === 'audio'
    ? <audio {...props} className="w-full" />
    : <Frame><video {...props} className="absolute inset-0 h-full w-full bg-black" /></Frame>
}

const VideoPlayer = forwardRef(function VideoPlayer({ source, title, url, startAt = 0, onProgress, error }, ref) {
  const apiRef = useRef({})
  useImperativeHandle(ref, () => ({
    getTime: () => apiRef.current.getTime?.() ?? null,
    seek: t => apiRef.current.seek?.(t),
    setSpeed: v => apiRef.current.setSpeed?.(v),
    canTimestamp: source.kind !== 'vimeo',
  }), [source.kind])

  if (source.kind === 'youtube') return <YouTubePlayer source={source} title={title} startAt={startAt} onProgress={onProgress} apiRef={apiRef} />
  if (source.kind === 'vimeo') {
    return (
      <Frame>
        <iframe src={vimeoEmbedUrl(source)} title={title || 'Vimeo'} className="absolute inset-0 h-full w-full" allow={ALLOW} allowFullScreen />
      </Frame>
    )
  }
  if (!url) {
    return (
      <Frame>
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/70">{error || 'Chargement de la vidéo…'}</p>
      </Frame>
    )
  }
  return <MediaPlayer key={url} src={url} media={source.media} startAt={startAt} onProgress={onProgress} apiRef={apiRef} />
})

export default VideoPlayer
