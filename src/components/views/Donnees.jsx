import { useRef, useState } from 'react'
import { Download, Upload, History, FileJson, Database, AlertTriangle } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { downloadBackup, listBackups, parseBackup, readBackup } from '@/lib/backup'
import { toast } from '@/lib/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const SECTION = 'mb-1 text-sm font-semibold text-[var(--text-primary)]'
const HINT = 'mb-4 text-xs text-[var(--text-tertiary)]'

function formatSize(chars) {
  return chars > 1024 * 1024 ? `${(chars / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(chars / 1024))} Ko`
}

export default function Donnees({ onNavigate }) {
  const { state, dispatch } = useStore()
  const fileRef = useRef(null)
  const [backups, setBackups] = useState(listBackups)

  // Avant tout remplacement, on télécharge l'état actuel : rien ne se perd même en cas d'erreur.
  function restore(data, label) {
    if (!window.confirm(`Remplacer toutes tes données par « ${label} » ?\nL'état actuel sera d'abord téléchargé en sauvegarde.`)) return
    downloadBackup(state)
    dispatch({ type: 'HYDRATE_STATE', payload: data })
    setBackups(listBackups())
    toast.success('Données restaurées')
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      restore(parseBackup(await file.text()), file.name)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const usage = (() => { try { return localStorage.getItem('cockpit_state')?.length || 0 } catch { return 0 } })()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-[var(--text-primary)]">Données</h1>
        <p className="text-sm text-[var(--text-tertiary)]">
          Tes données vivent dans ce navigateur ({formatSize(usage)}). Exporte-les régulièrement tant que la synchro Supabase n'est pas active.
        </p>
      </div>

      <Card className="p-5">
        <p className={SECTION}>Sauvegarde</p>
        <p className={HINT}>Un fichier JSON avec toutes tes tâches, projets, clients, sessions et revues.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => { downloadBackup(state); toast.success('Sauvegarde téléchargée') }}><Download size={13} /> Exporter mes données</Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload size={13} /> Restaurer un fichier</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFile} />
        </div>
      </Card>

      <Card className="p-5">
        <p className={SECTION}>Instantanés automatiques</p>
        <p className={HINT}>Le Cockpit garde une copie de tes données chaque jour (3 derniers jours) dans ce navigateur.</p>
        {backups.length ? (
          <ul className="space-y-1.5">
            {backups.map(b => (
              <li key={b.key} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-[rgba(var(--ink),0.04)]">
                {b.corrupt ? <AlertTriangle size={14} className="text-[var(--red-deep)]" /> : <History size={14} className="text-[var(--text-tertiary)]" />}
                <span className="flex-1 text-sm text-[var(--text-primary)]">{b.label}</span>
                <span className="text-xs text-[var(--text-tertiary)]">{formatSize(b.size)}</span>
                <Button size="xs" variant="subtle" onClick={() => {
                  try { restore(readBackup(b.key), b.label) } catch (err) { toast.error(err.message) }
                }}>Restaurer</Button>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-[var(--text-tertiary)]">Le premier instantané sera créé à ta prochaine modification.</p>}
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card hover className="cursor-pointer p-5" role="button" tabIndex={0} onClick={() => onNavigate('import')} onKeyDown={e => { if (e.key === 'Enter') onNavigate('import') }}>
          <FileJson size={16} className="mb-2 text-[var(--violet-deep)]" />
          <p className={SECTION}>Import bulk</p>
          <p className="text-xs text-[var(--text-tertiary)]">Colle du JSON généré par une IA pour créer tâches, notes, RDV et ressources d'un coup.</p>
        </Card>
        <Card hover className="cursor-pointer p-5" role="button" tabIndex={0} onClick={() => onNavigate('migrate')} onKeyDown={e => { if (e.key === 'Enter') onNavigate('migrate') }}>
          <Database size={16} className="mb-2 text-[var(--violet-deep)]" />
          <p className={SECTION}>Migration Supabase</p>
          <p className="text-xs text-[var(--text-tertiary)]">Envoyer ces données dans Supabase, pour la synchro multi-appareils et le MCP.</p>
        </Card>
      </div>
    </div>
  )
}
