import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { useStore } from '@/store/useStore'

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

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function AddEventForm({ date, projects, onSubmit, onClose }) {
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [projectId, setProjectId] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({ title: title.trim(), date: date.toISOString().slice(0, 10), startTime, endTime, projectId: projectId || null, type: 'manual' })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
      <h3 className="text-white text-sm font-semibold mb-1">Nouvel événement — {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
      <input
        autoFocus value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Titre de l'événement"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-violet/40"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/40 text-xs mb-1 block">Début</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none font-mono" />
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1 block">Fin</label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none font-mono" />
        </div>
      </div>
      <div>
        <label className="text-white/40 text-xs mb-1 block">Projet (optionnel)</label>
        <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
          <option value="" style={{ background: '#1A1A20' }}>— Aucun projet —</option>
          {projects.map(p => <option key={p.id} value={p.id} style={{ background: '#1A1A20' }}>{p.emoji} {p.name}</option>)}
        </select>
      </div>
      <div className="flex gap-2 mt-1">
        <button type="submit" className="flex-1 bg-violet hover:bg-violet/90 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">Ajouter</button>
        <button type="button" onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/8 text-white/50 py-2.5 rounded-xl text-sm transition-colors">Annuler</button>
      </div>
    </form>
  )
}

export default function Calendrier() {
  const { state, dispatch } = useStore()
  const [referenceDate, setReferenceDate] = useState(new Date())
  const [view, setView] = useState('week')
  const [visibleProjects, setVisibleProjects] = useState(new Set(state.projects.map(p => p.id)))
  const [addingOnDate, setAddingOnDate] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)

  const weekDays = getWeekDays(referenceDate)

  function prevWeek() { const d = new Date(referenceDate); d.setDate(d.getDate() - 7); setReferenceDate(d) }
  function nextWeek() { const d = new Date(referenceDate); d.setDate(d.getDate() + 7); setReferenceDate(d) }
  function goToday() { setReferenceDate(new Date()) }

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

    // Tasks with due date
    state.tasks.filter(t => t.dueDate === iso && t.status !== 'done').forEach(t => {
      const project = getProject(t.projectId)
      if (project && !visibleProjects.has(t.projectId)) return
      events.push({ id: `task_${t.id}`, type: 'task', title: t.title, color: project?.color || '#8B7CFF', startHour: 9, durationH: 0.5, label: project?.name })
    })

    // Sessions
    state.sessions.filter(s => s.date.slice(0, 10) === iso).forEach(s => {
      const project = getProject(s.projectId)
      if (project && !visibleProjects.has(s.projectId)) return
      const startH = new Date(s.date).getHours()
      events.push({ id: `session_${s.id}`, type: 'session', title: s.note || 'Session', color: project?.color || '#8B7CFF', startHour: startH, durationH: s.duration / 3600, label: project?.name })
    })

    // Prayer blocks
    buildPrayerBlocks(state.settings?.prayerTimes).forEach(p => {
      events.push({ id: `prayer_${p.label}_${iso}`, type: 'prayer', title: p.label, color: '#FFC1E0', startHour: p.startMin / 60, durationH: p.durationMin / 60 })
    })

    // Manual events
    state.calendarEvents.filter(e => e.date === iso).forEach(e => {
      const project = e.projectId ? getProject(e.projectId) : null
      const [sh, sm] = e.startTime.split(':').map(Number)
      const [eh, em] = e.endTime.split(':').map(Number)
      events.push({ id: `manual_${e.id}`, type: 'manual', title: e.title, color: project?.color || '#A8D4F0', startHour: sh + sm / 60, durationH: (eh + em / 60) - (sh + sm / 60) })
    })

    return events
  }

  const hourLabels = Array.from({ length: HOUR_SPAN }, (_, i) => START_HOUR + i)
  const today = new Date()

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-white">Calendrier</h1>
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {['week'].map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === v ? 'bg-violet/20 text-violet' : 'text-white/40 hover:text-white/70'}`}>
                Semaine
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={goToday} className="text-xs bg-white/5 hover:bg-white/10 text-white/60 px-3 py-1.5 rounded-lg transition-colors">Aujourd'hui</button>
          <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"><ChevronLeft size={16} /></button>
          <span className="font-mono text-sm text-white/60 min-w-[120px] text-center">
            {weekDays[0].getDate()} {MONTHS_FR[weekDays[0].getMonth()]} — {weekDays[6].getDate()} {MONTHS_FR[weekDays[6].getMonth()]}
          </span>
          <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"><ChevronRight size={16} /></button>
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
              : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.25)', border: '1px solid var(--c-border)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: visibleProjects.has(p.id) ? p.color : 'rgba(255,255,255,0.2)' }} />
            {p.name}
          </button>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto rounded-2xl" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
        <div className="flex" style={{ minWidth: '700px' }}>
          {/* Time gutter */}
          <div className="w-14 flex-shrink-0 pt-10" style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            {hourLabels.map(h => (
              <div key={h} className="h-14 flex items-start justify-end pr-2 pt-1">
                <span className="font-mono text-[10px] text-white/20">{h}h</span>
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
                  onClick={() => setAddingOnDate(day)}
                >
                  <span className="text-[10px] text-white/30 uppercase">{DAYS_FR[day.getDay()]}</span>
                  <span className={`font-mono text-sm font-semibold ${isToday ? 'text-violet' : 'text-white/60'}`}>{day.getDate()}</span>
                </div>

                {/* Events area */}
                <div className="relative" style={{ height: `${HOUR_SPAN * 56}px` }}>
                  {/* Hour lines */}
                  {hourLabels.map(h => (
                    <div key={h} className="absolute w-full" style={{ top: `${(h - START_HOUR) * 56}px`, borderTop: '1px solid rgba(255,255,255,0.03)', height: '56px' }} />
                  ))}

                  {/* Events */}
                  {events.map(ev => {
                    const top = Math.max(0, (ev.startHour - START_HOUR) * 56)
                    const height = Math.max(20, Math.min(ev.durationH * 56, HOUR_SPAN * 56 - top))
                    const isPrayer = ev.type === 'prayer'
                    return (
                      <div
                        key={ev.id}
                        className="absolute left-0.5 right-0.5 rounded px-1.5 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          background: isPrayer ? `rgba(255,193,224,0.1)` : `${ev.color}22`,
                          borderLeft: `2px solid ${ev.color}`,
                          opacity: isPrayer ? 0.7 : 1,
                        }}
                        onClick={() => !isPrayer && setSelectedEvent(ev)}
                        title={ev.title}
                      >
                        {height >= 14 && (
                          <span className="text-[9px] font-medium leading-tight block pt-0.5 truncate" style={{ color: ev.color }}>
                            {ev.title}
                          </span>
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

      {/* Add event form inline */}
      {addingOnDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAddingOnDate(null)} />
          <div className="relative w-full max-w-sm rounded-2xl" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
            <button onClick={() => setAddingOnDate(null)} className="absolute right-3 top-3 p-1 text-white/30 hover:text-white/70"><X size={14} /></button>
            <AddEventForm
              date={addingOnDate}
              projects={state.projects}
              onClose={() => setAddingOnDate(null)}
              onSubmit={payload => {
                dispatch({ type: 'ADD_CALENDAR_EVENT', payload })
                setAddingOnDate(null)
              }}
            />
          </div>
        </div>
      )}

      {/* Event detail */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-5" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderLeft: `3px solid ${selectedEvent.color}` }}>
            <button onClick={() => setSelectedEvent(null)} className="absolute right-3 top-3 p-1 text-white/30 hover:text-white/70"><X size={14} /></button>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{selectedEvent.type === 'task' ? 'Tâche deadline' : selectedEvent.type === 'session' ? 'Session' : 'Événement'}</p>
            <h3 className="text-white font-semibold mb-2">{selectedEvent.title}</h3>
            {selectedEvent.label && <p className="text-sm text-white/40">{selectedEvent.label}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
