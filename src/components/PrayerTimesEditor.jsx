import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { NativeSelect } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { PRAYER_METHODS, prayerConfig, shiftTime } from '@/lib/prayerTimes'
import { toast } from '@/lib/toast'

const PRAYER_FIELDS = [
  { key: 'fajr',    label: 'Fajr' },
  { key: 'shuruq',  label: 'Shuruq' },
  { key: 'dhuhr',   label: 'Dhuhr' },
  { key: 'asr',     label: 'Asr' },
  { key: 'maghrib', label: 'Maghrib' },
  { key: 'isha',    label: 'Isha' },
]

export default function PrayerTimesEditor({ isOpen, onClose }) {
  const { state, dispatch } = useStore()
  const [draft, setDraft] = useState(state.settings?.prayerTimes || {})
  const [auto, setAuto] = useState(() => prayerConfig(state.settings))

  useEffect(() => {
    if (isOpen) {
      // Draft state must reset when the dialog opens or settings migrate.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(state.settings?.prayerTimes || {})
      setAuto(prayerConfig(state.settings))
    }
  }, [isOpen, state.settings])

  const savedOffsets = prayerConfig(state.settings).offsets

  function setOffset(key, value) {
    const n = Math.max(-60, Math.min(60, Math.round(Number(value) || 0)))
    setAuto(a => ({ ...a, offsets: { ...a.offsets, [key]: n } }))
  }

  // En automatique, on affiche l'horaire reçu, corrigé du décalage en cours de saisie.
  function previewTime(key) {
    const base = state.settings?.prayerTimes?.[key]
    if (!base) return '—'
    return shiftTime(base, (Number(auto.offsets[key]) || 0) - (Number(savedOffsets[key]) || 0))
  }

  function handleSave() {
    const city = auto.city.trim() || 'Cergy'
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        prayerAuto: { ...auto, city },
        ...(auto.enabled ? {} : { prayerTimes: draft, prayerTimesUpdatedAt: new Date().toISOString() }),
      },
    })
    toast.success(auto.enabled ? `Horaires automatiques · ${city}` : 'Horaires enregistrés')
    onClose()
  }

  const lastUpdated = state.settings?.prayerTimesUpdatedAt
    ? new Date(state.settings.prayerTimesUpdatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Horaires de prière</DialogTitle>
          <DialogDescription>
            {auto.enabled ? `Calculés chaque jour pour ${auto.city.trim() || 'Cergy'}` : 'Saisie manuelle'}{lastUpdated && <> · MAJ le {lastUpdated}</>}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'rgba(var(--ink),0.03)', border: '1px solid var(--c-border)' }}>
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">Mise à jour automatique</p>
              <p className="text-xs text-[var(--text-tertiary)]">Les horaires du jour sont récupérés tout seuls.</p>
            </div>
            <Switch checked={auto.enabled} onCheckedChange={enabled => setAuto(a => ({ ...a, enabled }))} aria-label="Mise à jour automatique" />
          </div>

          {auto.enabled && (
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="prayer-city">Ville</Label>
                <Input id="prayer-city" value={auto.city} onChange={e => setAuto(a => ({ ...a, city: e.target.value }))} placeholder="Cergy" />
              </div>
              <div>
                <Label>Méthode de calcul</Label>
                <NativeSelect value={auto.method} onChange={e => setAuto(a => ({ ...a, method: Number(e.target.value) }))}>
                  {PRAYER_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </NativeSelect>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {PRAYER_FIELDS.map(f => (
              <div key={f.key} className="flex items-center gap-3 rounded-xl px-3 py-2"
                style={{ background: 'rgba(var(--ink),0.03)', border: '1px solid var(--c-border)' }}>
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {f.label}
                </span>
                {auto.enabled ? (
                  <>
                    <span className="font-mono text-sm text-[var(--text-primary)]">{previewTime(f.key)}</span>
                    <Input type="number" min={-60} max={60} step={1}
                      value={auto.offsets[f.key] ?? 0}
                      onChange={e => setOffset(f.key, e.target.value)}
                      aria-label={`Décalage ${f.label} en minutes`}
                      className="h-8 w-20 font-mono text-right" />
                    <span className="text-xs text-[var(--text-tertiary)]">min</span>
                  </>
                ) : (
                  <Input type="time"
                    value={draft[f.key] || ''}
                    onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                    aria-label={`Heure ${f.label}`}
                    className="h-8 w-28 font-mono text-right" />
                )}
              </div>
            ))}
          </div>
          {auto.enabled && (
            <p className="mt-3 text-xs text-[var(--text-tertiary)]">
              Le décalage (en minutes, positif ou négatif) sert à coller aux horaires affichés par ta mosquée.
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSave} className="flex-1">
              <Check size={14} /> Enregistrer
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
