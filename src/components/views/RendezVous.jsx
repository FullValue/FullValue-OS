import { useEffect, useMemo, useState } from 'react'
import { Plus, MapPin, Video, Clock, Bell, Trash2, CalendarClock, User, ChevronDown } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { localDateStr } from '@/lib/backup'
import { DEFAULT_REMINDER_MIN, DURATION_OPTIONS, REMINDER_OPTIONS, durationLabel, endOf, relativeDay, splitAppointments, startOf } from '@/lib/appointments'
import { toast, toastUndo } from '@/lib/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog'

const TITLE = 'text-[34px] font-semibold leading-tight tracking-tight text-[var(--text-primary)]'

function nextSlot() {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return { date: localDateStr(d), time: `${String(d.getHours()).padStart(2, '0')}:00` }
}

function RdvForm({ initial, onSubmit, onDelete, onClose }) {
  const { state } = useStore()
  const [slot] = useState(nextSlot)
  const [title, setTitle] = useState(initial?.title || '')
  const [date, setDate] = useState(initial?.date || slot.date)
  const [time, setTime] = useState(initial?.time || slot.time)
  const [durationMin, setDurationMin] = useState(Math.round((initial?.duration || 3600) / 60))
  const [clientId, setClientId] = useState(initial?.clientId || '')
  const [projectId, setProjectId] = useState(initial?.projectId || '')
  const [location, setLocation] = useState(initial?.location || '')
  const [link, setLink] = useState(initial?.link || '')
  const [note, setNote] = useState(initial?.note || '')
  const [reminderMin, setReminderMin] = useState(initial ? (initial.reminderMin ?? (initial.reminderMin === null ? '' : DEFAULT_REMINDER_MIN)) : DEFAULT_REMINDER_MIN)

  const durations = DURATION_OPTIONS.includes(durationMin) ? DURATION_OPTIONS : [...DURATION_OPTIONS, durationMin].sort((a, b) => a - b)
  const clients = state.clients.filter(c => c.status !== 'archived' || c.id === clientId)

  function submit(e) {
    e.preventDefault()
    if (!title.trim() || !date || !time) return
    if ('Notification' in window && Notification.permission === 'default' && reminderMin !== '') Notification.requestPermission().catch(() => {})
    onSubmit({
      title: title.trim(), date, time, duration: durationMin * 60,
      clientId: clientId || null, projectId: projectId || null,
      location: location.trim(), link: link.trim(), note: note.trim(),
      reminderMin: reminderMin === '' ? null : Number(reminderMin),
    })
  }

  return (
    <form onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>{initial ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}</DialogTitle>
        <DialogDescription>Il apparaît aussi dans le Calendrier et dans les rappels de la Journée.</DialogDescription>
      </DialogHeader>
      <DialogBody>
        <div className="flex flex-col gap-3">
          <div>
            <Label htmlFor="rdv-title">Titre *</Label>
            <Input id="rdv-title" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex. Point mensuel, médecin, appel découverte…" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="rdv-date">Date *</Label>
              <Input id="rdv-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="rdv-time">Heure *</Label>
              <Input id="rdv-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
            <div>
              <Label>Durée</Label>
              <NativeSelect value={durationMin} onChange={e => setDurationMin(Number(e.target.value))}>
                {durations.map(m => <option key={m} value={m}>{durationLabel(m * 60)}</option>)}
              </NativeSelect>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Client</Label>
              <NativeSelect value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">Aucun</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </NativeSelect>
            </div>
            <div>
              <Label>Pôle</Label>
              <NativeSelect value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">Aucun</option>
                {state.projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
              </NativeSelect>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rdv-location">Lieu</Label>
              <Input id="rdv-location" value={location} onChange={e => setLocation(e.target.value)} placeholder="Adresse ou « visio »" />
            </div>
            <div>
              <Label htmlFor="rdv-link">Lien visio</Label>
              <Input id="rdv-link" type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" />
            </div>
          </div>
          <div>
            <Label>Rappel</Label>
            <NativeSelect value={reminderMin} onChange={e => setReminderMin(e.target.value === '' ? '' : Number(e.target.value))}>
              {REMINDER_OPTIONS.map(o => <option key={o.label} value={o.value}>{o.label}</option>)}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="rdv-note">Notes</Label>
            <Textarea id="rdv-note" value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Ordre du jour, documents à apporter…" className="resize-none" />
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        {onDelete && (
          <Button type="button" variant="ghost" onClick={onDelete} className="mr-auto text-[var(--red-deep)] hover:bg-[var(--red-bg)]">
            <Trash2 size={14} /> Supprimer
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
        <Button type="submit" disabled={!title.trim() || !date || !time}>{initial ? 'Enregistrer' : 'Ajouter'}</Button>
      </DialogFooter>
    </form>
  )
}

function RdvRow({ rdv, past, onOpen }) {
  const { state } = useStore()
  const client = state.clients.find(c => c.id === rdv.clientId)
  const project = state.projects.find(p => p.id === rdv.projectId)
  const end = endOf(rdv)
  const endLabel = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
  const color = client?.accentColor || project?.color || 'var(--accent)'
  const reminder = REMINDER_OPTIONS.find(o => o.value === rdv.reminderMin)

  return (
    <Card
      hover role="button" tabIndex={0}
      onClick={() => onOpen(rdv)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(rdv) } }}
      className="flex cursor-pointer items-stretch gap-4 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      style={{ opacity: past ? 0.65 : 1 }}
    >
      <div className="w-1 shrink-0 rounded-full" style={{ background: color }} />
      <div className="w-[92px] shrink-0">
        <p className="font-mono text-lg font-semibold leading-tight text-[var(--text-primary)]">{rdv.time || '—'}</p>
        <p className="font-mono text-xs text-[var(--text-tertiary)]">→ {endLabel}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[var(--text-primary)]">{rdv.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1"><Clock size={12} /> {durationLabel(rdv.duration)}</span>
          {client && <span className="flex items-center gap-1"><User size={12} /> {client.shortName || client.name}</span>}
          {project && <span>{project.emoji} {project.name}</span>}
          {rdv.location && <span className="flex items-center gap-1"><MapPin size={12} /> {rdv.location}</span>}
          {!past && reminder && reminder.value !== '' && <span className="flex items-center gap-1"><Bell size={12} /> {reminder.label}</span>}
        </div>
        {rdv.note && <p className="mt-1.5 line-clamp-2 text-xs text-[var(--text-secondary)]">{rdv.note}</p>}
      </div>
      {rdv.link && !past && (
        <Button asChild size="sm" variant="subtle" className="shrink-0 self-center" onClick={e => e.stopPropagation()}>
          <a href={rdv.link} target="_blank" rel="noopener noreferrer"><Video size={14} /> Rejoindre</a>
        </Button>
      )}
    </Card>
  )
}

function groupByDay(list) {
  const groups = []
  for (const rdv of list) {
    const last = groups[groups.length - 1]
    if (last && last.date === rdv.date) last.items.push(rdv)
    else groups.push({ date: rdv.date, items: [rdv] })
  }
  return groups
}

export default function RendezVous() {
  const { state, dispatch } = useStore()
  const [now, setNow] = useState(() => new Date())
  const [editing, setEditing] = useState(null) // null | 'new' | rdv
  const [showPast, setShowPast] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  // Ouverture directe du formulaire depuis ⌘K (« Nouveau rendez-vous »).
  useEffect(() => {
    const open = () => setEditing('new')
    window.addEventListener('cockpit:new-rdv', open)
    return () => window.removeEventListener('cockpit:new-rdv', open)
  }, [])

  const { upcoming, past } = useMemo(() => splitAppointments(state.appointments, now), [state.appointments, now])
  const today = localDateStr(now)
  const todayCount = upcoming.filter(a => a.date === today).length
  const weekLimit = new Date(now.getTime() + 7 * 86400000)
  const weekCount = upcoming.filter(a => startOf(a) <= weekLimit).length
  const current = editing && editing !== 'new' ? state.appointments.find(a => a.id === editing.id) : null

  function save(payload) {
    if (current) {
      dispatch({ type: 'UPDATE_APPOINTMENT', payload: { id: current.id, ...payload } })
      toast.success('Rendez-vous mis à jour')
    } else {
      dispatch({ type: 'ADD_APPOINTMENT', payload })
      toast.success('Rendez-vous ajouté')
    }
    setEditing(null)
  }

  function remove() {
    const snap = current
    dispatch({ type: 'DELETE_APPOINTMENT', payload: snap.id })
    toastUndo('Rendez-vous supprimé', () => dispatch({ type: 'RESTORE_ITEMS', payload: { appointments: [snap] } }))
    setEditing(null)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={TITLE}>Rendez-vous</h1>
          <p className="mt-0.5 text-sm text-[var(--text-tertiary)]">
            {upcoming.length === 0 ? 'Aucun rendez-vous à venir.' : `${todayCount} aujourd'hui · ${weekCount} dans les 7 jours · ${upcoming.length} à venir`}
          </p>
        </div>
        <Button onClick={() => setEditing('new')}><Plus size={14} /> Nouveau rendez-vous</Button>
      </div>

      {upcoming.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Rien de prévu"
          description="Ajoute tes rendez-vous ici : ils s'affichent dans le Calendrier, la Journée, et tu reçois un rappel avant l'heure."
          action={<Button size="sm" onClick={() => setEditing('new')}><Plus size={14} /> Nouveau rendez-vous</Button>}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {groupByDay(upcoming).map(group => (
            <section key={group.date}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: group.date === today ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                {relativeDay(group.date, now)}
              </h2>
              <div className="flex flex-col gap-2">
                {group.items.map(rdv => <RdvRow key={rdv.id} rdv={rdv} onOpen={setEditing} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-8">
          <Button variant="ghost" size="sm" onClick={() => setShowPast(s => !s)} className="px-2 text-[var(--text-tertiary)]" aria-expanded={showPast}>
            <ChevronDown size={14} className="transition-transform" style={{ transform: showPast ? 'rotate(180deg)' : 'none' }} />
            {past.length} rendez-vous passé{past.length > 1 ? 's' : ''}
          </Button>
          {showPast && (
            <div className="mt-3 flex flex-col gap-5">
              {groupByDay(past.slice(0, 50)).map(group => (
                <section key={group.date}>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{relativeDay(group.date, now)}</h2>
                  <div className="flex flex-col gap-2">
                    {group.items.map(rdv => <RdvRow key={rdv.id} rdv={rdv} past onOpen={setEditing} />)}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null) }}>
        <DialogContent className="max-w-lg">
          {editing && (
            <RdvForm
              key={current?.id || 'new'}
              initial={current}
              onSubmit={save}
              onDelete={current ? remove : undefined}
              onClose={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
