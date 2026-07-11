import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X, Trash2, PanelRight, PanelRightClose } from 'lucide-react'
import { useStore } from '@/store/useStore'
import ImageOrFileInput from '@/components/inputs/ImageOrFileInput'
import BulkImportInterface from '@/components/import/BulkImportInterface'
import PlanMyDayModal from '@/components/PlanMyDayModal'
import { Zap, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { toast, toastUndo } from '@/lib/toast'

export const EVENT_TYPES = {
  meeting:        { label: 'Meeting',    emoji: '🤝', color: '#A8D4F0' },
  focus:          { label: 'Deep work',  emoji: '🎯', color: '#8B7CFF' },
  admin:          { label: 'Admin',      emoji: '📋', color: '#FFD66B' },
  personnel:      { label: 'Personnel',  emoji: '🌿', color: '#A8E6BD' },
  client_meeting: { label: 'RDV client', emoji: '👤', color: '#FFC1E0' },
}

const TYPE_ORDER = ['meeting', 'focus', 'admin', 'personnel', 'client_meeting']

function WeekRecapSidebar({ weekDays, state, getProject }) {
  const weekIsoSet = new Set(weekDays.map(d => d.toISOString().slice(0, 10)))

  // Aggregate hours by project across all sources
  const byProject = new Map()
  let totalHours = 0
  let appointmentCount = 0
  let deadlineCount = 0
  let eventCount = 0
  let sessionsHours = 0

  function addToProject(projectId, hours) {
    const cur = byProject.get(projectId || '_none') || 0
    byProject.set(projectId || '_none', cur + hours)
    totalHours += hours
  }

  state.calendarEvents.forEach(e => {
    if (!weekIsoSet.has(e.date)) return
    const [sh, sm] = e.startTime.split(':').map(Number)
    const [eh, em] = e.endTime.split(':').map(Number)
    const h = (eh + em/60) - (sh + sm/60)
    addToProject(e.projectId, h)
    eventCount++
  })
  state.appointments.forEach(a => {
    if (!weekIsoSet.has(a.date)) return
    const h = (a.duration || 3600) / 3600
    addToProject(a.projectId, h)
    appointmentCount++
  })
  state.sessions.forEach(s => {
    const iso = s.date.slice(0, 10)
    if (!weekIsoSet.has(iso)) return
    const h = s.duration / 3600
    addToProject(s.projectId, h)
    sessionsHours += h
  })
  state.tasks.forEach(t => {
    if (t.dueDate && weekIsoSet.has(t.dueDate) && t.status !== 'done') deadlineCount++
  })

  // Capacity = daily * 5 working days
  const dailyCap = (state.settings?.dailyCapacityMinutes || 480) / 60
  const weekCap = dailyCap * 5
  const usedPct = Math.min(100, (totalHours / weekCap) * 100)
  const overload = totalHours > weekCap

  // Project breakdown sorted descending
  const breakdown = Array.from(byProject.entries())
    .map(([id, hours]) => ({ id, hours, project: id === '_none' ? null : getProject(id) }))
    .sort((a, b) => b.hours - a.hours)
  const maxProjectHours = breakdown[0]?.hours || 1

  return (
    <div className="w-full lg:w-64 flex-shrink-0 overflow-y-auto rounded-2xl p-4 space-y-4 shadow-[var(--shadow-card)]"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: 'var(--text-tertiary)' }}>Cette semaine</p>

        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="font-mono text-2xl font-bold tabular"
            style={{ color: overload ? '#F87171' : 'var(--text-primary)' }}>
            {totalHours.toFixed(1)}h
          </span>
          <span className="text-xs tabular" style={{ color: 'var(--text-tertiary)' }}>
            / {weekCap.toFixed(0)}h
          </span>
        </div>

        <div className="h-2 rounded-full overflow-hidden mb-1"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="h-full transition-all"
            style={{
              width: `${usedPct}%`,
              background: overload ? '#F87171' : usedPct > 80 ? '#FFD66B' : 'var(--violet-deep)',
            }} />
        </div>
        <p className="text-[10px] tabular" style={{ color: 'var(--text-tertiary)' }}>
          {overload ? `+${(totalHours - weekCap).toFixed(1)}h au-delà` : `${(weekCap - totalHours).toFixed(1)}h restantes`}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SidebarStat label="Events" value={eventCount} />
        <SidebarStat label="RDV" value={appointmentCount} />
        <SidebarStat label="Deadlines" value={deadlineCount} color={deadlineCount > 0 ? '#F87171' : undefined} />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: 'var(--text-tertiary)' }}>Par projet</p>
        {breakdown.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</p>
        ) : (
          <div className="space-y-1.5">
            {breakdown.map(b => {
              const color = b.project?.color || '#5C5A58'
              const label = b.project?.name || 'Sans projet'
              return (
                <div key={b.id}>
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span style={{ color: 'var(--text-secondary)' }} className="truncate flex-1">
                      {b.project?.emoji} {label}
                    </span>
                    <span className="font-mono tabular-nums ml-2" style={{ color: 'var(--text-tertiary)' }}>
                      {b.hours.toFixed(1)}h
                    </span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="h-full" style={{ width: `${(b.hours / maxProjectHours) * 100}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="pt-2" style={{ borderTop: '1px solid var(--border-soft)' }}>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: 'var(--text-tertiary)' }}>Sessions loggées</p>
        <p className="font-mono text-sm tabular" style={{ color: 'var(--text-secondary)' }}>
          {sessionsHours.toFixed(1)}h
        </p>
      </div>
    </div>
  )
}

function SidebarStat({ label, value, color }) {
  return (
    <div className="rounded-xl p-2 text-center"
      style={{ background: 'rgba(255,255,255,0.03)' }}>
      <p className="font-mono text-lg font-semibold leading-none mb-1 tabular"
        style={{ color: color || 'var(--text-secondary)' }}>{value}</p>
      <p className="text-[9px] uppercase tracking-wider"
        style={{ color: 'var(--text-tertiary)' }}>{label}</p>
    </div>
  )
}

function hhmmToMin(s) {
  if (!s || typeof s !== 'string') return 0
  const [h, m] = s.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function buildPrayerBlocks(prayerTimes) {
  return [
    { label: 'Fajr',    startMin: hhmmToMin(prayerTimes?.fajr    || '05:30'), durationMin: 30 },
    { label: 'Dhuhr',   startMin: hhmmToMin(prayerTimes?.dhuhr   || '13:15'), durationMin: 30 },
    { label: 'Asr',     startMin: hhmmToMin(prayerTimes?.asr     || '17:00'), durationMin: 30 },
    { label: 'Maghrib', startMin: hhmmToMin(prayerTimes?.maghrib || '20:30'), durationMin: 20 },
    { label: 'Isha',    startMin: hhmmToMin(prayerTimes?.isha    || '21:30'), durationMin: 30 },
  ]
}

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

const START_HOUR = 6
const END_HOUR = 22
const HOUR_SPAN = END_HOUR - START_HOUR // 16

function getWeekDays(referenceDate) {
  const d = new Date(referenceDate)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return date
  })
}

function getMonthGridDays(referenceDate) {
  // 6 weeks (42 days) starting Monday of the week containing the 1st of the month
  const first = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
  const dow = first.getDay()
  const offsetToMonday = dow === 0 ? -6 : 1 - dow
  const start = new Date(first)
  start.setDate(first.getDate() + offsetToMonday)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function EventForm({ initial, date, projects, clients, onSubmit, onClose, onDelete }) {
  const isEdit = !!initial
  const [title, setTitle]         = useState(initial?.title || '')
  const [startTime, setStartTime] = useState(initial?.startTime || '09:00')
  const [endTime, setEndTime]     = useState(initial?.endTime || '10:00')
  const [projectId, setProjectId] = useState(initial?.projectId || '')
  const [clientId, setClientId]   = useState(initial?.clientId || '')
  const [type, setType]           = useState(initial?.eventType || 'meeting')
  const [notes, setNotes]         = useState(initial?.notes || '')
  const [emoji, setEmoji]         = useState(initial?.emoji || '')
  const [imageUrl, setImageUrl]   = useState(initial?.imageUrl || '')
  const [imagePath, setImagePath] = useState(initial?.imagePath || '')
  const [imageName, setImageName] = useState(initial?.imageName || '')

  const isAppointment = type === 'client_meeting'

  function handleImageChange(val) {
    if (!val) { setImageUrl(''); setImagePath(''); setImageName(''); return }
    if (val.type === 'upload') {
      setImageUrl(val.signedUrl || ''); setImagePath(val.filePath); setImageName(val.fileName || '')
    } else if (val.type === 'url') {
      setImageUrl(val.url || ''); setImagePath(''); setImageName('')
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    const dateStr = (initial?.date) || date.toISOString().slice(0, 10)
    onSubmit({
      title: title.trim(),
      date: dateStr,
      startTime,
      endTime,
      projectId: projectId || null,
      clientId: clientId || null,
      eventType: type,
      emoji: emoji || EVENT_TYPES[type]?.emoji || '',
      notes: notes.trim() || '',
      imageUrl: imageUrl || null,
      imagePath: imagePath || null,
      imageName: imageName || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        {isEdit ? 'Modifier l\'événement' : `Nouvel événement`}
        <span className="ml-2 font-normal text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {(initial?.date ? new Date(initial.date + 'T12:00:00') : date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </h3>

      {/* Type selector */}
      <div>
        <Label>Type</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {TYPE_ORDER.map(t => {
            const cfg = EVENT_TYPES[t]
            const active = type === t
            return (
              <button key={t} type="button" onClick={() => setType(t)}
                className="flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all active:scale-[0.98]"
                style={active
                  ? { background: cfg.color + '22', border: `1px solid ${cfg.color}50`, color: cfg.color }
                  : { background: 'rgba(var(--ink),0.03)', border: '1px solid var(--border-soft)', color: 'var(--text-tertiary)' }}>
                <span className="text-base leading-none">{cfg.emoji}</span>
                <span className="text-[9px] leading-none">{cfg.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-stretch gap-2">
        <Input value={emoji} onChange={e => setEmoji(e.target.value.slice(0, 2))}
          placeholder={EVENT_TYPES[type]?.emoji || '🤝'}
          className="w-12 flex-shrink-0 px-2 text-center text-base"
          title="Emoji custom (optionnel)" />
        <Input autoFocus value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Titre…"
          className="flex-1" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Début</Label>
          <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
            className="font-mono tabular" />
        </div>
        <div>
          <Label>Fin</Label>
          <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
            className="font-mono tabular" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Projet</Label>
          <NativeSelect value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">— Aucun —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
          </NativeSelect>
        </div>
        <div>
          <Label>
            Client {isAppointment && <span style={{ color: '#F87171' }}>*</span>}
          </Label>
          <NativeSelect value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">— Aucun —</option>
            {clients.filter(c => c.status !== 'archived').map(c => (
              <option key={c.id} value={c.id}>{c.shortName || c.name}</option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div>
        <Label>Image (optionnel)</Label>
        <ImageOrFileInput
          bucket="task-attachments"
          pathPrefix={`event_${initial?.id || 'new'}`}
          acceptedTypes="images"
          value={
            imagePath ? { type: 'upload', filePath: imagePath, fileName: imageName, signedUrl: imageUrl }
            : imageUrl ? { type: 'url', url: imageUrl }
            : null
          }
          onChange={handleImageChange}
        />
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Notes (optionnel)…" className="min-h-[60px] text-xs" />
      </div>

      <div className="flex items-center gap-2 mt-1">
        {isEdit && onDelete && (
          <Button type="button" variant="danger" size="icon" onClick={onDelete} title="Supprimer">
            <Trash2 size={13} />
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" className="flex-1">
          {isEdit ? 'Enregistrer' : 'Ajouter'}
        </Button>
      </div>
    </form>
  )
}

function ReadOnlyEventCard({ event, onClose }) {
  return (
    <div className="p-5">
      <div className="flex items-start gap-2 mb-3">
        <span className="text-xl">{event.emoji || '📅'}</span>
        <div className="flex-1 min-w-0">
          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-tertiary)' }}>
            {event.kindLabel}
          </p>
          <h3 className="font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{event.title}</h3>
          {event.label && <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>{event.label}</p>}
        </div>
      </div>
      <Button variant="subtle" size="sm" className="w-full" onClick={onClose}>
        Fermer
      </Button>
    </div>
  )
}

const HOUR_PX = 56

function snap15(hour) {
  return Math.round(hour * 4) / 4
}

function hourToHHMM(h) {
  const total = Math.round(h * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export default function Calendrier() {
  const { state, dispatch } = useStore()
  const [referenceDate, setReferenceDate] = useState(new Date())
  const [view, setView] = useState('week')
  const [visibleProjects, setVisibleProjects] = useState(new Set(state.projects.map(p => p.id)))
  const [addingOnDate, setAddingOnDate] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [dragState, setDragState] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [recapOpen, setRecapOpen] = useState(() => {
    try { return localStorage.getItem('cockpit:cal:recap') !== 'false' } catch { return true }
  })

  function toggleRecap() {
    setRecapOpen(v => {
      const next = !v
      try { localStorage.setItem('cockpit:cal:recap', String(next)) } catch {}
      return next
    })
  }

  const gridRef = useRef(null)
  const weekDays = getWeekDays(referenceDate)

  // ─── Drag/resize handling ────────────────────────────────────────────────
  useEffect(() => {
    if (!dragState) return

    function onMove(e) {
      const dx = e.clientX - dragState.origMouseX
      const dy = e.clientY - dragState.origMouseY
      setDragState(s => s && ({
        ...s,
        deltaX: dx,
        deltaY: dy,
        hasMoved: s.hasMoved || Math.abs(dx) > 4 || Math.abs(dy) > 4,
      }))
    }

    function onUp(e) {
      const ds = dragState
      if (!ds.hasMoved) {
        // It was a click → open detail
        setSelectedEvent(ds.event)
      } else {
        // Commit changes
        if (ds.type === 'move') {
          const newStartHour = snap15(Math.max(0, Math.min(24 - ds.origDurationH, ds.origStartHour + ds.deltaY / HOUR_PX)))
          const newDayIdx = getDayIdxAtX(e.clientX)
          const targetDay = (newDayIdx != null) ? weekDays[newDayIdx] : weekDays[ds.origDayIdx]
          const newDate = targetDay.toISOString().slice(0, 10)
          const endHour = newStartHour + ds.origDurationH
          commitMove(ds, newDate, newStartHour, endHour)
        } else if (ds.type === 'resize') {
          const newDuration = Math.max(0.25, snap15(ds.origDurationH + ds.deltaY / HOUR_PX))
          const endHour = ds.origStartHour + newDuration
          commitResize(ds, ds.origStartHour, endHour)
        }
      }
      setDragState(null)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragState])

  function getDayIdxAtX(x) {
    if (!gridRef.current) return null
    const rect = gridRef.current.getBoundingClientRect()
    const gutterW = 56
    const relX = x - rect.left - gutterW
    if (relX < 0 || relX > rect.width - gutterW) return null
    const colW = (rect.width - gutterW) / 7
    return Math.max(0, Math.min(6, Math.floor(relX / colW)))
  }

  function startDrag(e, event, dayIdx, type) {
    if (event.source !== 'manual' && event.source !== 'appointment') return
    e.preventDefault()
    e.stopPropagation()
    setDragState({
      event, type,
      origMouseX: e.clientX, origMouseY: e.clientY,
      origStartHour: event.startHour,
      origDurationH: event.durationH,
      origDayIdx: dayIdx,
      deltaX: 0, deltaY: 0,
      hasMoved: false,
    })
  }

  function commitMove(ds, newDate, newStartHour, endHour) {
    if (ds.event.source === 'manual') {
      dispatch({
        type: 'UPDATE_CALENDAR_EVENT',
        payload: {
          id: ds.event.raw.id,
          date: newDate,
          startTime: hourToHHMM(newStartHour),
          endTime: hourToHHMM(endHour),
        },
      })
    } else if (ds.event.source === 'appointment') {
      dispatch({
        type: 'UPDATE_APPOINTMENT',
        payload: {
          id: ds.event.raw.id,
          date: newDate,
          time: hourToHHMM(newStartHour),
          duration: Math.round((endHour - newStartHour) * 3600),
        },
      })
    }
  }

  function commitResize(ds, startHour, endHour) {
    if (ds.event.source === 'manual') {
      dispatch({
        type: 'UPDATE_CALENDAR_EVENT',
        payload: {
          id: ds.event.raw.id,
          startTime: hourToHHMM(startHour),
          endTime: hourToHHMM(endHour),
        },
      })
    } else if (ds.event.source === 'appointment') {
      dispatch({
        type: 'UPDATE_APPOINTMENT',
        payload: {
          id: ds.event.raw.id,
          duration: Math.round((endHour - startHour) * 3600),
        },
      })
    }
  }

  function prevPeriod() {
    const d = new Date(referenceDate)
    if (view === 'month') d.setMonth(d.getMonth() - 1)
    else d.setDate(d.getDate() - 7)
    setReferenceDate(d)
  }
  function nextPeriod() {
    const d = new Date(referenceDate)
    if (view === 'month') d.setMonth(d.getMonth() + 1)
    else d.setDate(d.getDate() + 7)
    setReferenceDate(d)
  }
  function goToday() { setReferenceDate(new Date()) }

  // Compute daily occupancy in hours (for heatmap in month view)
  function getDayOccupancy(date) {
    const iso = date.toISOString().slice(0, 10)
    let h = 0, count = 0
    state.calendarEvents.filter(e => e.date === iso).forEach(e => {
      const [sh, sm] = e.startTime.split(':').map(Number)
      const [eh, em] = e.endTime.split(':').map(Number)
      h += (eh + em/60) - (sh + sm/60); count++
    })
    state.appointments.filter(a => a.date === iso).forEach(a => {
      h += (a.duration || 3600) / 3600; count++
    })
    state.sessions.filter(s => s.date.slice(0, 10) === iso).forEach(s => {
      h += s.duration / 3600; count++
    })
    const deadlines = state.tasks.filter(t => t.dueDate === iso && t.status !== 'done').length
    return { hours: h, eventCount: count, deadlineCount: deadlines }
  }

  function toggleProject(id) {
    setVisibleProjects(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function getProject(id) { return state.projects.find(p => p.id === id) }

  // Build events for the week
  function getEventsForDay(date) {
    const iso = date.toISOString().slice(0, 10)
    const events = []

    // Tasks with due date — all-day style, top of column
    state.tasks.filter(t => t.dueDate === iso && t.status !== 'done').forEach(t => {
      const project = getProject(t.projectId)
      if (project && !visibleProjects.has(t.projectId)) return
      events.push({
        id: `task_${t.id}`, source: 'task', title: t.title, emoji: '📌',
        color: project?.color || '#8B7CFF',
        startHour: 9, durationH: 0.5, label: project?.name,
        kindLabel: 'Tâche · deadline',
      })
    })

    // Sessions
    state.sessions.filter(s => s.date.slice(0, 10) === iso).forEach(s => {
      const project = getProject(s.projectId)
      if (project && !visibleProjects.has(s.projectId)) return
      const startH = new Date(s.date).getHours()
      events.push({
        id: `session_${s.id}`, source: 'session', title: s.note || 'Session', emoji: '⏱',
        color: project?.color || '#8B7CFF',
        startHour: startH, durationH: s.duration / 3600, label: project?.name,
        kindLabel: 'Session',
      })
    })

    // Prayer blocks
    buildPrayerBlocks(state.settings?.prayerTimes).forEach(p => {
      events.push({
        id: `prayer_${p.label}_${iso}`, source: 'prayer', title: p.label, emoji: '🕌',
        color: '#FFC1E0',
        startHour: p.startMin / 60, durationH: p.durationMin / 60,
        kindLabel: 'Prière',
      })
    })

    // Manual calendar events
    state.calendarEvents.filter(e => e.date === iso).forEach(e => {
      const project = e.projectId ? getProject(e.projectId) : null
      const typeCfg = EVENT_TYPES[e.eventType || 'meeting'] || EVENT_TYPES.meeting
      const [sh, sm] = e.startTime.split(':').map(Number)
      const [eh, em] = e.endTime.split(':').map(Number)
      events.push({
        id: `manual_${e.id}`, source: 'manual', raw: e,
        title: e.title, emoji: e.emoji || typeCfg.emoji,
        color: project?.color || typeCfg.color,
        startHour: sh + sm / 60, durationH: (eh + em / 60) - (sh + sm / 60),
        label: project?.name,
        kindLabel: typeCfg.label,
        imageUrl: e.imageUrl || null,
      })
    })

    // Appointments (RDV clients)
    state.appointments.filter(a => a.date === iso).forEach(a => {
      const client = state.clients.find(c => c.id === a.clientId)
      const project = a.projectId ? getProject(a.projectId) : null
      const [sh, sm] = (a.time || '09:00').split(':').map(Number)
      const durationH = a.duration ? (a.duration / 3600) : 1
      events.push({
        id: `apt_${a.id}`, source: 'appointment', raw: a,
        title: a.title, emoji: '👤',
        color: client?.accentColor || '#FFC1E0',
        startHour: sh + sm / 60, durationH,
        label: client?.shortName || client?.name,
        kindLabel: 'RDV client',
      })
    })

    return events
  }

  const hourLabels = Array.from({ length: HOUR_SPAN }, (_, i) => START_HOUR + i)
  const today = new Date()

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--text-primary)]">Calendrier</h1>
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {[
              { id: 'week', label: 'Semaine' },
              { id: 'month', label: 'Mois' },
            ].map(v => (
              <button key={v.id} onClick={() => setView(v.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === v.id ? 'bg-violet/20 text-violet' : 'text-white/40 hover:text-white/70'}`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {view === 'week' && (
            <Button variant="ghost" size="icon-sm" onClick={toggleRecap}
              style={recapOpen ? { color: 'var(--violet-deep)' } : undefined}
              title={recapOpen ? 'Masquer le récap' : 'Afficher le récap'}>
              {recapOpen ? <PanelRightClose size={14} /> : <PanelRight size={14} />}
            </Button>
          )}
          <Button size="sm" onClick={() => setPlanOpen(true)}>
            <Sparkles size={11} /> <span className="hidden sm:inline">Plan ma journée</span><span className="sm:hidden">Plan</span>
          </Button>
          <Button variant="subtle" size="sm" onClick={() => setImportOpen(true)}>
            <Zap size={11} /> Import
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday}>
            <span className="hidden sm:inline">Aujourd'hui</span><span className="sm:hidden">Aujd</span>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={prevPeriod}><ChevronLeft size={16} /></Button>
          <span className="font-mono text-sm tabular min-w-[140px] text-center" style={{ color: 'var(--text-secondary)' }}>
            {view === 'month'
              ? `${MONTHS_FR[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`
              : `${weekDays[0].getDate()} ${MONTHS_FR[weekDays[0].getMonth()]} — ${weekDays[6].getDate()} ${MONTHS_FR[weekDays[6].getMonth()]}`}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={nextPeriod}><ChevronRight size={16} /></Button>
        </div>
      </div>

      {/* Project filters */}
      <div className="flex items-center gap-2 mb-4 flex-shrink-0 flex-wrap">
        {state.projects.map(p => (
          <button
            key={p.id}
            onClick={() => toggleProject(p.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={visibleProjects.has(p.id)
              ? { background: p.color + '20', color: p.color, border: `1px solid ${p.color}40` }
              : { background: 'rgba(var(--ink),0.03)', color: 'var(--text-tertiary)', border: '1px solid var(--border-soft)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: visibleProjects.has(p.id) ? p.color : 'rgba(255,255,255,0.2)' }} />
            {p.name}
          </button>
        ))}
      </div>

      {/* Calendar grid */}
      {view === 'month' ? (
        <div className="flex-1 overflow-auto rounded-2xl p-3 shadow-[var(--shadow-card)]"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
          {(() => {
            const days = getMonthGridDays(referenceDate)
            const month = referenceDate.getMonth()
            // Find max hours for scale
            const dayData = days.map(d => ({ date: d, ...getDayOccupancy(d) }))
            const maxHours = Math.max(8, ...dayData.map(x => x.hours))
            return (
              <>
                {/* Day-of-week header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'].map(d => (
                    <div key={d} className="text-center text-[10px] font-semibold tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}>{d}</div>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                  {dayData.map((d, i) => {
                    const inMonth = d.date.getMonth() === month
                    const isToday = isSameDay(d.date, today)
                    const intensity = Math.min(1, d.hours / maxHours)
                    return (
                      <button key={i}
                        onClick={() => { setReferenceDate(d.date); setView('week') }}
                        className="aspect-square rounded-xl p-2 text-left transition-all hover:scale-[1.03] flex flex-col"
                        style={{
                          background: isToday
                            ? 'rgba(139,124,255,0.18)'
                            : `rgba(139,124,255,${0.04 + intensity * 0.22})`,
                          border: isToday
                            ? '1px solid var(--violet-deep)'
                            : `1px solid rgba(255,255,255,${0.04 + intensity * 0.08})`,
                          opacity: inMonth ? 1 : 0.35,
                        }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-sm font-semibold tabular"
                            style={{ color: isToday ? 'var(--violet-deep)' : 'var(--text-secondary)' }}>
                            {d.date.getDate()}
                          </span>
                          {d.deadlineCount > 0 && (
                            <span className="text-[9px] px-1 rounded font-semibold tabular"
                              style={{ background: 'rgba(248,113,113,0.18)', color: '#F87171' }}>
                              {d.deadlineCount}
                            </span>
                          )}
                        </div>
                        {d.hours > 0 && (
                          <p className="font-mono text-[10px] mt-auto tabular" style={{ color: 'var(--text-tertiary)' }}>
                            {d.hours.toFixed(1)}h
                          </p>
                        )}
                        {d.eventCount > 0 && (
                          <p className="text-[9px] tabular" style={{ color: 'var(--text-tertiary)' }}>
                            {d.eventCount} event{d.eventCount > 1 ? 's' : ''}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>
      ) : (
      <div className="flex-1 flex flex-col lg:flex-row gap-3 overflow-hidden">
      <div className="flex-1 overflow-auto rounded-2xl shadow-[var(--shadow-card)]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
        <div ref={gridRef} className="flex sm:min-w-[700px]">
          {/* Time gutter */}
          <div className="w-14 flex-shrink-0 pt-10" style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            {hourLabels.map(h => (
              <div key={h} className="h-14 flex items-start justify-end pr-2 pt-1">
                <span className="font-mono text-[10px] tabular text-white/20">{h}h</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, di) => {
            const isToday = isSameDay(day, today)
            const events = getEventsForDay(day)
            return (
              <div key={di} className="flex-1 min-w-0" style={{ borderRight: di < 6 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                {/* Day header */}
                <div
                  className={`h-10 flex flex-col items-center justify-center border-b cursor-pointer hover:bg-white/2 transition-colors ${isToday ? '' : ''}`}
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                  onClick={() => setAddingOnDate({ date: day, startTime: '09:00', endTime: '10:00' })}
                >
                  <span className="text-[10px] text-white/30 uppercase">{DAYS_FR[day.getDay()]}</span>
                  <span className={`font-mono text-sm font-semibold tabular ${isToday ? 'text-violet' : 'text-white/60'}`}>{day.getDate()}</span>
                </div>

                {/* Events area */}
                <div className="relative" style={{ height: `${HOUR_SPAN * 56}px` }}>
                  {/* Hour lines — clickable to create event at that hour */}
                  {hourLabels.map(h => (
                    <div key={h}
                      className="absolute w-full cursor-pointer hover:bg-white/3 transition-colors"
                      style={{ top: `${(h - START_HOUR) * 56}px`, borderTop: '1px solid rgba(255,255,255,0.03)', height: '56px' }}
                      onClick={e => {
                        if (e.target !== e.currentTarget) return
                        const endH = Math.min(END_HOUR, h + 1)
                        setAddingOnDate({ date: day, startTime: `${String(h).padStart(2,'0')}:00`, endTime: `${String(endH).padStart(2,'0')}:00` })
                      }} />
                  ))}

                  {/* Events */}
                  {events.map(ev => {
                    const top = Math.max(0, (ev.startHour - START_HOUR) * HOUR_PX)
                    const baseHeight = Math.max(20, Math.min(ev.durationH * HOUR_PX, HOUR_SPAN * HOUR_PX - top))
                    const isPrayer = ev.source === 'prayer'
                    const isDraggable = ev.source === 'manual' || ev.source === 'appointment'
                    const isBeingDragged = dragState?.event?.id === ev.id && dragState?.hasMoved
                    const dragTransform = isBeingDragged && dragState.type === 'move'
                      ? `translate(${dragState.deltaX}px, ${dragState.deltaY}px)`
                      : null
                    const dragHeight = isBeingDragged && dragState.type === 'resize'
                      ? Math.max(20, baseHeight + dragState.deltaY)
                      : baseHeight
                    return (
                      <div
                        key={ev.id}
                        className={`absolute left-0.5 right-0.5 rounded overflow-hidden transition-opacity ${isDraggable ? 'cursor-grab' : 'cursor-pointer'} ${isBeingDragged ? 'z-30 shadow-2xl' : ''}`}
                        style={{
                          top: `${top}px`,
                          height: `${dragHeight}px`,
                          background: isPrayer ? `rgba(255,193,224,0.08)` : `${ev.color}22`,
                          borderLeft: `2px solid ${ev.color}`,
                          opacity: isPrayer ? 0.6 : 1,
                          transform: dragTransform,
                          userSelect: 'none',
                        }}
                        onMouseDown={isDraggable
                          ? (e) => startDrag(e, ev, di, 'move')
                          : undefined}
                        onClick={!isDraggable ? () => setSelectedEvent(ev) : undefined}
                        title={ev.title}
                      >
                        {/* Image background */}
                        {ev.imageUrl && (
                          <div className="absolute inset-0 pointer-events-none"
                            style={{
                              backgroundImage: `url(${ev.imageUrl})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              opacity: 0.35,
                            }} />
                        )}
                        <div className="relative px-1.5">
                        {dragHeight >= 14 && (
                          <span className="text-[9px] font-medium leading-tight flex items-center gap-1 pt-0.5 truncate" style={{ color: ev.color }}>
                            <span className="text-[10px] flex-shrink-0">{ev.emoji}</span>
                            <span className="truncate">{ev.title}</span>
                          </span>
                        )}
                        </div>
                        {/* Resize handle */}
                        {isDraggable && dragHeight >= 24 && (
                          <div
                            className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize flex items-center justify-center hover:bg-white/10"
                            onMouseDown={(e) => startDrag(e, ev, di, 'resize')}>
                            <div className="w-6 h-0.5 rounded-full" style={{ background: ev.color, opacity: 0.5 }} />
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Now indicator */}
                  {isToday && (() => {
                    const now = new Date()
                    const nowH = now.getHours() + now.getMinutes() / 60
                    if (nowH < START_HOUR || nowH > END_HOUR) return null
                    return (
                      <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: `${(nowH - START_HOUR) * 56}px` }}>
                        <div className="relative">
                          <div className="absolute left-0 w-2 h-2 rounded-full -translate-y-1/2" style={{ background: '#8B7CFF' }} />
                          <div className="ml-2 h-px" style={{ background: 'rgba(139,124,255,0.5)' }} />
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {recapOpen && <WeekRecapSidebar weekDays={weekDays} state={state} getProject={getProject} />}
      </div>
      )}

      {/* Add event modal */}
      {addingOnDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAddingOnDate(null)} />
          <div className="relative w-full max-w-md rounded-2xl shadow-[var(--shadow-modal)]" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}>
            <Button variant="ghost" size="icon-sm" onClick={() => setAddingOnDate(null)} className="absolute right-3 top-3 z-10"><X size={14} /></Button>
            <EventForm
              date={addingOnDate.date}
              initial={addingOnDate.startTime ? { startTime: addingOnDate.startTime, endTime: addingOnDate.endTime } : null}
              projects={state.projects}
              clients={state.clients}
              onClose={() => setAddingOnDate(null)}
              onSubmit={payload => {
                if (payload.eventType === 'client_meeting' && payload.clientId) {
                  // Create an appointment instead of a calendar event
                  const [sh, sm] = payload.startTime.split(':').map(Number)
                  const [eh, em] = payload.endTime.split(':').map(Number)
                  const durationSec = ((eh * 60 + em) - (sh * 60 + sm)) * 60
                  dispatch({
                    type: 'ADD_APPOINTMENT',
                    payload: {
                      title: payload.title,
                      date: payload.date,
                      time: payload.startTime,
                      duration: durationSec,
                      projectId: payload.projectId,
                      clientId: payload.clientId,
                      note: payload.notes,
                    },
                  })
                  toast.success('Rendez-vous ajouté')
                } else {
                  dispatch({ type: 'ADD_CALENDAR_EVENT', payload })
                  toast.success('Événement ajouté')
                }
                setAddingOnDate(null)
              }}
            />
          </div>
        </div>
      )}

      {/* Event detail / edit modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
          <div className="relative w-full max-w-md rounded-2xl shadow-[var(--shadow-modal)]" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', borderLeft: `3px solid ${selectedEvent.color}` }}>
            <Button variant="ghost" size="icon-sm" onClick={() => setSelectedEvent(null)} className="absolute right-3 top-3 z-10"><X size={14} /></Button>
            {selectedEvent.source === 'manual' ? (
              <EventForm
                initial={{ ...selectedEvent.raw, emoji: selectedEvent.raw.emoji, eventType: selectedEvent.raw.eventType || 'meeting' }}
                projects={state.projects}
                clients={state.clients}
                onClose={() => setSelectedEvent(null)}
                onSubmit={payload => {
                  dispatch({ type: 'UPDATE_CALENDAR_EVENT', payload: { id: selectedEvent.raw.id, ...payload } })
                  toast.success('Événement mis à jour')
                  setSelectedEvent(null)
                }}
                onDelete={() => {
                  const snap = selectedEvent.raw
                  dispatch({ type: 'DELETE_CALENDAR_EVENT', payload: selectedEvent.raw.id })
                  toastUndo('Événement supprimé', () => dispatch({ type: 'RESTORE_ITEMS', payload: { calendarEvents: [snap] } }))
                  setSelectedEvent(null)
                }}
              />
            ) : selectedEvent.source === 'appointment' ? (
              <EventForm
                initial={{
                  title: selectedEvent.raw.title,
                  date: selectedEvent.raw.date,
                  startTime: selectedEvent.raw.time,
                  endTime: (() => {
                    const [sh, sm] = (selectedEvent.raw.time || '09:00').split(':').map(Number)
                    const total = sh * 60 + sm + Math.round((selectedEvent.raw.duration || 3600) / 60)
                    return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`
                  })(),
                  projectId: selectedEvent.raw.projectId,
                  clientId: selectedEvent.raw.clientId,
                  eventType: 'client_meeting',
                  notes: selectedEvent.raw.note,
                }}
                projects={state.projects}
                clients={state.clients}
                onClose={() => setSelectedEvent(null)}
                onSubmit={payload => {
                  const [sh, sm] = payload.startTime.split(':').map(Number)
                  const [eh, em] = payload.endTime.split(':').map(Number)
                  const durationSec = ((eh * 60 + em) - (sh * 60 + sm)) * 60
                  dispatch({
                    type: 'UPDATE_APPOINTMENT',
                    payload: {
                      id: selectedEvent.raw.id,
                      title: payload.title,
                      date: payload.date,
                      time: payload.startTime,
                      duration: durationSec,
                      projectId: payload.projectId,
                      clientId: payload.clientId,
                      note: payload.notes,
                    },
                  })
                  toast.success('Rendez-vous mis à jour')
                  setSelectedEvent(null)
                }}
                onDelete={() => {
                  const snap = selectedEvent.raw
                  dispatch({ type: 'DELETE_APPOINTMENT', payload: selectedEvent.raw.id })
                  toastUndo('Rendez-vous supprimé', () => dispatch({ type: 'RESTORE_ITEMS', payload: { appointments: [snap] } }))
                  setSelectedEvent(null)
                }}
              />
            ) : (
              <ReadOnlyEventCard event={selectedEvent} onClose={() => setSelectedEvent(null)} />
            )}
          </div>
        </div>
      )}

      <PlanMyDayModal isOpen={planOpen} onClose={() => setPlanOpen(false)} />

      {/* Bulk import modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setImportOpen(false)} />
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 shadow-[var(--shadow-modal)]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}>
            <Button variant="ghost" size="icon-sm" onClick={() => setImportOpen(false)} className="absolute right-3 top-3 z-10">
              <X size={14} />
            </Button>
            <h2 className="text-lg font-semibold tracking-tight mb-4" style={{ color: 'var(--text-primary)' }}>Import bulk — événements calendrier</h2>
            <BulkImportInterface
              onImportSuccess={() => setImportOpen(false)}
              onCancel={() => setImportOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
