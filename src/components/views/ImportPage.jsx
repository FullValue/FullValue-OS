import { useState } from 'react'
import { FileJson } from 'lucide-react'
import BulkImportInterface from '@/components/import/BulkImportInterface'

export default function ImportPage({ onNavigate }) {
  const [successMsg, setSuccessMsg] = useState(null)

  function handleSuccess(count) {
    setSuccessMsg(count)
    setTimeout(() => setSuccessMsg(null), 5000)
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--violet-bg)' }}>
            <FileJson size={18} style={{ color: 'var(--violet-deep)' }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>Import bulk</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Colle du JSON généré par ton GPT, Gemini ou Claude Project pour créer tâches, notes, RDV et ressources en un clic.
            </p>
          </div>
        </div>
      </div>

      {successMsg !== null && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(168,230,189,0.1)', border: '1px solid rgba(168,230,189,0.25)', color: '#A8E6BD' }}>
          ✓ {successMsg} élément{successMsg > 1 ? 's' : ''} importé{successMsg > 1 ? 's' : ''} avec succès ! Visible immédiatement dans les pages concernées.
        </div>
      )}

      <BulkImportInterface onImportSuccess={handleSuccess} />
    </div>
  )
}
