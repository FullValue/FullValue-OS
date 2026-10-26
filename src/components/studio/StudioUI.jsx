// Briques d'interface du Studio Créatif : fenêtre, panneau latéral, aperçu média, pastilles.
import { useEffect, useRef, useState } from 'react'
import { Film, Image as ImageIcon, Link2, Music, FileText, Upload, X } from 'lucide-react'
import { useMediaUrl, kindFromMime, FIELD } from '@/lib/studio'

export function Pill({ bg, color, children, className = '' }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`} style={{ background: bg, color }}>{children}</span>
}

// Échap ferme seulement la fenêtre ou le panneau au premier plan (pile des calques ouverts).
const layers = []
function useEscape(onClose) {
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })
  useEffect(() => {
    // Enregistré une seule fois à l'ouverture : l'ordre de la pile suit l'ordre d'ouverture.
    const layer = {}
    layers.push(layer)
    const onKey = e => { if (e.key === 'Escape' && layers[layers.length - 1] === layer) closeRef.current() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      layers.splice(layers.indexOf(layer), 1)
    }
  }, [])
}

export function Modal({ title, onClose, children, width = 'max-w-lg' }) {
  useEscape(onClose)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,15,18,0.45)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className={`max-h-[90vh] w-full ${width} space-y-4 overflow-y-auto rounded-3xl bg-[var(--bg-surface)] p-6`} style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.16)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.05)]" aria-label="Fermer"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function SidePanel({ onClose, children }) {
  useEscape(onClose)
  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(15,15,18,0.35)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <aside className="h-full w-full max-w-2xl space-y-5 overflow-y-auto bg-[var(--bg-surface)] p-6 animate-sheetIn" style={{ boxShadow: '-4px 0 48px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
        {children}
      </aside>
    </div>
  )
}

const KIND_ICON = { video: Film, image: ImageIcon, audio: Music, texte: FileText }

// Vignette (grilles) : image ou vidéo muette, sinon une icône du type de média.
export function MediaThumb({ item, kind, className = 'aspect-[4/5]' }) {
  const src = useMediaUrl(item)
  const type = kind || kindFromMime(item?.fileType || '')
  const Icon = KIND_ICON[type] || Link2
  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`} style={{ background: 'rgba(var(--ink),0.05)' }}>
      {src && type === 'image' && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
      {src && type === 'video' && <video src={`${src}#t=0.5`} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />}
      {!(src && (type === 'image' || type === 'video')) && <Icon size={26} className="text-[var(--text-tertiary)]" />}
    </div>
  )
}

// Aperçu complet (panneaux de détail).
export function MediaPreview({ item, kind }) {
  const src = useMediaUrl(item)
  const type = kind || kindFromMime(item?.fileType || '')
  if (!src) return null
  if (type === 'video') return <video src={src} controls playsInline className="max-h-[60vh] w-full rounded-2xl bg-black" />
  if (type === 'image') return <img src={src} alt="" className="max-h-[60vh] w-full rounded-2xl object-contain" style={{ background: 'rgba(var(--ink),0.04)' }} />
  if (type === 'audio') return <audio src={src} controls className="w-full" />
  return null
}

// Choix fichier ou lien, partagé par l'ajout de créa et d'asset.
export function FileOrLink({ mode, setMode, file, setFile, url, setUrl, canUpload, accept = 'image/*,video/*,audio/*', urlPlaceholder }) {
  const [drag, setDrag] = useState(false)
  return (
    <div className="space-y-3">
      <div className="flex gap-0.5 rounded-xl bg-[rgba(var(--ink),0.05)] p-1">
        {[['file', 'Fichier', Upload], ['link', 'Lien', Link2]].map(([m, label, Icon]) => (
          <button type="button" key={m} onClick={() => setMode(m)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[13px] font-semibold ${mode === m ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-tertiary)]'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>
      {mode === 'file' ? (
        canUpload ? (
          <label
            className="block cursor-pointer rounded-xl p-5 text-center transition-colors"
            style={{ border: `1.5px dashed ${drag ? 'var(--accent)' : 'var(--border-medium)'}`, background: drag ? 'var(--brand-100)' : 'rgba(var(--ink),0.02)' }}
            onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]) }}
          >
            <input type="file" accept={accept} className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            {file
              ? <span className="text-[13px] text-[var(--text-primary)]">{file.name} · {(file.size / 1048576).toFixed(1)} Mo</span>
              : <span className="text-[13px] text-[var(--text-tertiary)]">Glisse un fichier ici ou clique pour choisir</span>}
          </label>
        ) : (
          <p className="rounded-xl px-3 py-2.5 text-[12px]" style={{ background: 'var(--yellow-bg)', color: 'var(--yellow-deep)' }}>
            L’import de fichiers demande d’être connecté à ton compte (mode local : utilise un lien).
          </p>
        )
      ) : (
        <input className={FIELD} value={url} onChange={e => setUrl(e.target.value)} placeholder={urlPlaceholder || 'https://…'} />
      )}
    </div>
  )
}
