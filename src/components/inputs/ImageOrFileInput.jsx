import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Link, X, Image, ChevronDown, ChevronUp } from 'lucide-react'
import { useFileUpload } from '@/hooks/useFileUpload'
import { useAuth } from '@/contexts/AuthContext'

const IMAGES_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
const ALL_MIME = [
  ...IMAGES_MIME,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/csv',
]

/**
 * Unified image/file input with upload-first UX and optional URL fallback.
 *
 * value: { type: 'upload', filePath, fileName, signedUrl? } | { type: 'url', url } | null
 * onChange: called with the same shape or null when cleared
 */
export default function ImageOrFileInput({
  value,
  onChange,
  bucket,
  pathPrefix = '',
  acceptedTypes = 'all',
  label,
  maxSizeMb = 50,
}) {
  const { user } = useAuth()
  const { uploading, progress, upload, remove, getSignedUrl } = useFileUpload(bucket)
  const [showUrl, setShowUrl] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState(null)

  const mimeTypes = acceptedTypes === 'images' ? IMAGES_MIME : ALL_MIME

  async function handleDrop(files) {
    const file = files[0]
    if (!file) return
    setError(null)

    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`Fichier trop volumineux (max ${maxSizeMb} MB)`)
      return
    }
    if (!mimeTypes.includes(file.type)) {
      setError('Type de fichier non supporté')
      return
    }

    try {
      const prefix = [user?.id, pathPrefix].filter(Boolean).join('/')
      const result = await upload(file, prefix)
      const signedUrl = await getSignedUrl(result.filePath, 3600)
      onChange({ type: 'upload', filePath: result.filePath, fileName: result.fileName, signedUrl })
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRemove() {
    if (value?.type === 'upload' && value.filePath) {
      try { await remove(value.filePath) } catch (_) {}
    }
    onChange(null)
    setUrlInput('')
  }

  function handleUrlSubmit() {
    const url = urlInput.trim()
    if (!url) return
    onChange({ type: 'url', url })
    setShowUrl(false)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    multiple: false,
    disabled: uploading || !!value,
    accept: mimeTypes.reduce((acc, m) => ({ ...acc, [m]: [] }), {}),
  })

  // ── Already has a value — show preview ───────────────────────────────────
  if (value) {
    const isImage = value.type === 'upload'
      ? value.fileName && /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(value.fileName)
      : true // assume URL is image in this context

    const previewUrl = value.type === 'upload' ? value.signedUrl : value.url

    return (
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
        {previewUrl && isImage && (
          <div className="relative">
            <img
              src={previewUrl}
              alt={value.fileName || 'Cover'}
              className="w-full object-cover"
              style={{ maxHeight: 120 }}
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-2">
          {value.type === 'upload'
            ? <Image size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            : <Link size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
          <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
            {value.type === 'upload' ? value.fileName : value.url}
          </span>
          <button
            onClick={handleRemove}
            className="text-[10px] px-2 py-0.5 rounded-lg flex-shrink-0 transition-colors"
            style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171' }}
          >
            Retirer
          </button>
        </div>
      </div>
    )
  }

  // ── Empty state: dropzone + optional URL ─────────────────────────────────
  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className="rounded-xl p-4 text-center transition-all"
        style={{
          border: `2px dashed ${isDragActive ? 'var(--violet-deep, #8B7CFF)' : 'var(--c-border)'}`,
          background: isDragActive ? 'rgba(139,124,255,0.06)' : 'rgba(255,255,255,0.03)',
          cursor: uploading ? 'not-allowed' : 'pointer',
          opacity: uploading ? 0.7 : 1,
        }}
      >
        <input {...getInputProps()} />
        <Upload size={20} strokeWidth={1.5} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />

        {uploading ? (
          <div className="space-y-2">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Upload en cours… {progress}%</p>
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--c-border)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--violet-deep, #8B7CFF)' }} />
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {isDragActive ? 'Lâche ici' : 'Glisse une image ou clique pour parcourir'}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {acceptedTypes === 'images' ? 'PNG, JPG, WebP, GIF' : 'Images, PDF, docs'} · max {maxSizeMb} MB
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-[10px] px-1" style={{ color: '#F87171' }}>{error}</p>
      )}

      {/* Advanced: URL input */}
      <button
        onClick={() => setShowUrl(v => !v)}
        className="flex items-center gap-1 text-[10px] transition-colors"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {showUrl ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        Options avancées (URL externe)
      </button>

      {showUrl && (
        <div className="flex gap-1.5">
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
            placeholder="https://..."
            className="flex-1 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--c-border)', color: 'var(--text-secondary)' }}
          />
          <button
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
            style={{ background: 'var(--violet-deep, #8B7CFF)', color: '#fff' }}
          >
            OK
          </button>
        </div>
      )}
    </div>
  )
}
