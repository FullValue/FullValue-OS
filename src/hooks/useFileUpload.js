import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useFileUpload(bucket) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  async function upload(file, pathPrefix) {
    setUploading(true)
    setProgress(0)
    try {
      const ext = file.name.split('.').pop()
      const fileId = crypto.randomUUID()
      const filePath = `${pathPrefix}/${fileId}.${ext}`

      const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        onUploadProgress: ({ loaded, total }) => {
          if (total) setProgress(Math.round((loaded / total) * 100))
        },
      })
      if (error) throw error

      setProgress(100)
      return { filePath, fileName: file.name, fileSizeBytes: file.size, fileMimeType: file.type }
    } finally {
      setUploading(false)
    }
  }

  async function remove(filePath) {
    const { error } = await supabase.storage.from(bucket).remove([filePath])
    if (error) throw error
  }

  async function getSignedUrl(filePath, expiresIn = 3600) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, expiresIn)
    if (error) throw error
    return data.signedUrl
  }

  return { uploading, progress, upload, remove, getSignedUrl }
}
