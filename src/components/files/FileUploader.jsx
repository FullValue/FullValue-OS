import { useDropzone } from 'react-dropzone'
import { Upload } from 'lucide-react'
import { useFileUpload } from '@/hooks/useFileUpload'
import { useAuth } from '@/contexts/AuthContext'

const MAX_MB = 50
const ACCEPTED_MIME = [
  'image/png','image/jpeg','image/webp','image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain','text/csv','application/zip',
]

export default function FileUploader({ bucket, subPath = '', onSuccess, onError }) {
  const { user } = useAuth()
  const { uploading, progress, upload } = useFileUpload(bucket)

  async function handleFile(file) {
    if (!file) return
    if (file.size > MAX_MB * 1024 * 1024) { onError?.(`Fichier trop volumineux (max ${MAX_MB} MB)`); return }
    if (!ACCEPTED_MIME.includes(file.type)) { onError?.('Type de fichier non autorisé'); return }

    try {
      const pathPrefix = [user.id, subPath].filter(Boolean).join('/')
      const result = await upload(file, pathPrefix)
      onSuccess(result)
    } catch (err) {
      onError?.(err.message)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: files => handleFile(files[0]),
    multiple: false,
    disabled: uploading,
  })

  return (
    <div
      {...getRootProps()}
      className="rounded-2xl p-8 text-center cursor-pointer transition-all"
      style={{
        border: `2px dashed ${isDragActive ? 'var(--violet-deep)' : 'var(--border-medium)'}`,
        background: isDragActive ? 'var(--violet-bg)' : 'var(--bg-input)',
        opacity: uploading ? 0.7 : 1,
        cursor: uploading ? 'not-allowed' : 'pointer',
      }}
    >
      <input {...getInputProps()} />
      <Upload size={28} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />

      {uploading ? (
        <div className="space-y-3">
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Upload en cours… {progress}%</p>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-medium)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: 'var(--violet-deep)' }}
            />
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            {isDragActive ? 'Lâche le fichier ici' : 'Glisse un fichier ici ou clique pour parcourir'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            PDF, images, documents Office · max {MAX_MB} MB
          </p>
        </>
      )}
    </div>
  )
}
