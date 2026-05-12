import { useState, useEffect } from 'react'
import { Download, Trash2, FileText, FileCode, Image, File } from 'lucide-react'
import { useFileUpload } from '@/hooks/useFileUpload'

function getFileIcon(mimeType) {
  if (!mimeType) return { Icon: File, color: '#9B9895' }
  if (mimeType.startsWith('image/'))        return { Icon: Image,    color: '#8B7CFF' }
  if (mimeType === 'application/pdf')       return { Icon: FileText, color: '#F87171' }
  if (mimeType.includes('word'))            return { Icon: FileText, color: '#60A5FA' }
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return { Icon: FileCode, color: '#34D399' }
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return { Icon: FileText, color: '#FB923C' }
  return { Icon: File, color: '#9B9895' }
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export default function FilePreview({ bucket, filePath, fileName, fileSizeBytes, fileMimeType, onDelete }) {
  const { remove, getSignedUrl } = useFileUpload(bucket)
  const [signedUrl, setSignedUrl] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!filePath) return
    getSignedUrl(filePath).then(setSignedUrl).catch(() => {})
  }, [filePath])

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await remove(filePath)
    } catch {
      // file may already be gone
    } finally {
      onDelete?.()
    }
  }

  const { Icon, color } = getFileIcon(fileMimeType)
  const isImage = fileMimeType?.startsWith('image/')

  return (
    <div
      className="rounded-xl flex items-center gap-3 px-4 py-3"
      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-soft)' }}
    >
      {/* Thumbnail or icon */}
      {isImage && signedUrl ? (
        <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
          <img src={signedUrl} alt={fileName} className="w-10 h-10 rounded-lg object-cover" />
        </a>
      ) : (
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '18' }}>
          <Icon size={18} style={{ color }} strokeWidth={1.5} />
        </div>
      )}

      {/* Name + size */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{fileName}</p>
        {fileSizeBytes && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatBytes(fileSizeBytes)}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {signedUrl && (
          <a
            href={signedUrl}
            download={fileName}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            title="Télécharger"
          >
            <Download size={14} />
          </a>
        )}
        {onDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs"
            style={{ color: confirmDelete ? 'var(--red-deep)' : 'var(--text-tertiary)', background: confirmDelete ? 'var(--red-bg)' : 'transparent' }}
            title={confirmDelete ? 'Cliquer pour confirmer' : 'Supprimer'}
          >
            <Trash2 size={13} />
            {confirmDelete && 'Confirmer'}
          </button>
        )}
      </div>
    </div>
  )
}
