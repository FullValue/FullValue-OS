// Cartes du tableau de bord (DA « Donezo ») : toutes calculées depuis le store local.
import { useState } from 'react'
import { ArrowUpRight, Plus, CalendarDays, Play, Pause, Square, Video } from 'lucide-react'
import { localDateStr } from '@/lib/backup'
import { initials } from '@/lib/priorities'
import { toast } from '@/lib/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const DAY = 86400000
const TITLE = 'text-[17px] font-semibold tracking-tight text-[var(--text-primary)]'
const STRIPES = 'repeating-linear-gradient(135deg, rgba(var(--ink),0.28) 0 2px, transparent 2px 7px)'

function ArrowButton({ onClick, light, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform hover:rotate-45"
      style={light
        ? { background: '#fff', color: 'var(--brand-900)' }
        : { border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
    >
      <ArrowUpRight size={16} />
    </button>
  )
}

function weekStart(offsetWeeks = 0) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offsetWeeks * 7)
  return d
}

// ── Statistiques ─────────────────────────────────────────────────────────────

export function StatCards({ state, onNavigate }) {
  const [now] = useState(() => Date.now())
  const today = localDateStr()
  const open = state.tasks.filter(t => t.status !== 'done')
  const doneIn = (from, to) => state.tasks.filter(t => t.completedAt && new Date(t.completedAt).getTime() >= from && new Date(t.completedAt).getTime() < to).length
  const doneWeek = doneIn(now - 7 * DAY, now + DAY)
  const donePrev = doneIn(now - 14 * DAY, now - 7 * DAY)
  const inprogress = open.filter(t => t.status === 'inprogress')
  const overdue = open.filter(t => t.dueDate && t.dueDate < today)
  const high = open.filter(t => t.impact === 'high').length
  const delta = doneWeek - donePrev

  const cards = [
    { label: 'Tâches ouvertes', value: open.length, foot: `${high} à fort impact`, chip: high, to: 'taches', hero: true },
    { label: 'Terminées · 7 jours', value: doneWeek, foot: delta >= 0 ? 'de plus que la semaine passée' : 'de moins que la semaine passée', chip: `${delta >= 0 ? '+' : ''}${delta}`, to: 'revue' },
    { label: 'En cours', value: inprogress.length, foot: `sur ${new Set(inprogress.map(t => t.projectId)).size} pôle(s)`, to: 'taches' },
    { label: 'En retard', value: overdue.length, foot: overdue.length ? 'À trier dans la revue hebdo' : 'Rien en retard', to: 'revue', alert: overdue.length > 0 },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {cards.map(c => (
        <Card
          key={c.label}
          className="relative flex min-h-[170px] flex-col justify-between overflow-hidden border-0 p-5"
          style={c.hero ? { background: 'var(--hero-gradient)', color: '#fff' } : undefined}
        >
          <div className="flex items-start justify-between gap-2">
            <p className={`text-[15px] font-medium ${c.hero ? 'text-white' : 'text-[var(--text-primary)]'}`}>{c.label}</p>
            <ArrowButton light={c.hero} onClick={() => onNavigate(c.to)} label={`Ouvrir ${c.label}`} />
          </div>
          <p className="text-[52px] font-semibold leading-none tracking-tight" style={{ color: c.hero ? '#fff' : c.alert ? 'var(--red-deep)' : 'var(--text-primary)' }}>{c.value}</p>
          <p className={`flex items-center gap-1.5 text-xs ${c.hero ? 'text-[var(--brand-300)]' : 'text-[var(--accent)]'}`}>
            {c.chip !== undefined && (
              <span className="rounded-md border px-1 text-[10px] font-semibold" style={{ borderColor: 'currentColor' }}>{c.chip}</span>
            )}
            <span className={c.alert ? 'text-[var(--red-deep)]' : ''}>{c.foot}</span>
          </p>
        </Card>
      ))}
    </div>
  )
}

// ── Focus de la semaine (barres en pilule, jours à venir hachurés) ────────────

export function FocusChart({ state }) {
  const start = weekStart()
  const todayIdx = (new Date().getDay() + 6) % 7
  const days = Array.from({ length: 7 }, (_, i) => {
    const from = start.getTime() + i * DAY
    const minutes = state.sessions
      .filter(s => { const t = new Date(s.date).getTime(); return t >= from && t < from + DAY })
      .reduce((sum, s) => sum + (s.duration || 0) / 60, 0)
    return { label: 'LMMJVSD'[i], minutes: Math.round(minutes), future: i > todayIdx, isToday: i === todayIdx }
  })
  const max = Math.max(60, ...days.map(d => d.minutes))
  const best = days.reduce((a, b) => (b.minutes > a.minutes ? b : a), days[0])
  const total = days.reduce((s, d) => s + d.minutes, 0)
  const fmt = m => (m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m} min`)

  return (
    <Card className="flex h-full flex-col border-0 p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <p className={TITLE}>Focus de la semaine</p>
        <span className="text-xs text-[var(--text-tertiary)]">{fmt(total)} au total</span>
      </div>
      <div className="flex flex-1 items-end justify-between gap-2.5" style={{ minHeight: 170 }}>
        {days.map(d => {
          const h = d.future || !d.minutes ? 0.55 + (d.future ? 0.25 : 0) : Math.max(0.25, d.minutes / max)
          const bg = d.future || !d.minutes
            ? STRIPES
            : d === best ? 'var(--brand-900)' : d.isToday ? 'var(--brand-300)' : 'var(--brand-700)'
          return (
            <div key={d.label + d.isToday} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div className="relative flex w-full max-w-[64px] flex-1 items-end">
                {d.isToday && d.minutes > 0 && (
                  <span className="absolute left-1/2 -translate-x-1/2 rounded-md border border-[var(--border-medium)] bg-[var(--bg-card)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]" style={{ bottom: `calc(${h * 100}% + 6px)` }}>
                    {fmt(d.minutes)}
                  </span>
                )}
                <div className="w-full rounded-full" style={{ height: `${h * 100}%`, background: bg }} title={`${fmt(d.minutes)} de focus`} />
              </div>
              <span className={`text-xs ${d.isToday ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>{d.label}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Rappels : prochain rendez-vous, sinon prochaine prière ───────────────────

function hhmm(min) {
  return `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

export function RemindersCard({ state, nextPrayer, onNavigate }) {
  const [now] = useState(() => new Date())
  const today = localDateStr(now)
  const tomorrow = localDateStr(new Date(now.getTime() + DAY))
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const toMin = s => { const [h, m] = (s || '00:00').split(':').map(Number); return h * 60 + (m || 0) }

  const events = [
    ...state.calendarEvents.map(e => ({ title: e.title, date: e.date, start: e.startTime, end: e.endTime })),
    ...state.appointments.map(a => ({ title: a.title, date: a.date, start: a.time, end: a.time && a.duration ? hhmm(toMin(a.time) + Math.round(a.duration / 60)) : null, client: a.clientId })),
  ]
    .filter(e => (e.date === today && toMin(e.start) >= nowMin) || e.date === tomorrow)
    .sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')))
  const next = events[0]

  return (
    <Card className="flex h-full flex-col border-0 p-5">
      <p className={`${TITLE} mb-4`}>Rappels</p>
      {next ? (
        <>
          <p className="text-[26px] font-semibold leading-tight tracking-tight text-[var(--brand-700)]">{next.title}</p>
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            {next.date === today ? "Aujourd'hui" : 'Demain'}{next.start ? ` · ${next.start}${next.end ? ` – ${next.end}` : ''}` : ''}
          </p>
          <Button size="lg" className="mt-auto w-full" onClick={() => onNavigate('calendrier')}>
            <Video size={16} /> Voir le calendrier
          </Button>
        </>
      ) : (
        <>
          <p className="text-[24px] font-semibold leading-tight tracking-tight text-[var(--brand-700)]">
            {nextPrayer ? `${nextPrayer.label} à ${hhmm(nextPrayer.startMin)}` : 'Aucun rendez-vous'}
          </p>
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            {nextPrayer ? `Prochaine prière, dans ${nextPrayer.until}. Aucun rendez-vous prévu d'ici demain.` : "Rien de prévu d'ici demain."}
          </p>
          <Button size="lg" className="mt-auto w-full" onClick={() => onNavigate('sessions')}>
            <Play size={16} /> Lancer un focus
          </Button>
        </>
      )}
    </Card>
  )
}

// ── Pôles ────────────────────────────────────────────────────────────────────

export function PolesCard({ state, onNavigate }) {
  const today = localDateStr()
  return (
    <Card className="flex h-full flex-col border-0 p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className={TITLE}>Projets</p>
        <Button size="sm" variant="outline" onClick={() => onNavigate('open-space')}><Plus size={13} /> Open space</Button>
      </div>
      <ul className="space-y-1">
        {state.projects.map(p => {
          const next = state.tasks
            .filter(t => t.projectId === p.id && t.status !== 'done' && t.dueDate)
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
          return (
            <li key={p.id}>
              <button type="button" onClick={() => onNavigate('projet_' + p.id)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-[rgba(var(--ink),0.04)]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: `${p.color}33` }}>{p.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[var(--text-primary)]">{p.name}</span>
                  <span className={`block truncate text-[11px] ${next && next.dueDate < today ? 'text-[var(--red-deep)]' : 'text-[var(--text-tertiary)]'}`}>
                    {next ? `Échéance : ${new Date(next.dueDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${next.title}` : p.northStar || 'Aucune échéance'}
                  </span>
                </span>
                <span className="text-xs font-semibold text-[var(--text-secondary)]">{p.northStarProgress || 0}%</span>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

// ── Clients (équivalent « Team Collaboration ») ──────────────────────────────

const CLIENT_STATUS = {
  active: ['Actif', 'var(--green-bg)', 'var(--green-deep)'],
  onboarding: ['Onboarding', 'var(--yellow-bg)', 'var(--yellow-deep)'],
  prospect: ['Prospect', 'var(--blue-bg)', 'var(--blue-deep)'],
  paused: ['En pause', 'rgba(var(--ink),0.06)', 'var(--text-tertiary)'],
  completed: ['Terminé', 'rgba(var(--ink),0.06)', 'var(--text-tertiary)'],
}

export function ClientsCard({ state, onNavigate }) {
  const clients = state.clients.filter(c => c.status !== 'archived').slice(0, 4)
  return (
    <Card className="flex h-full flex-col border-0 p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className={TITLE}>Clients</p>
        <Button size="sm" variant="outline" onClick={() => onNavigate('ulycom_clients')}><Plus size={13} /> Ajouter</Button>
      </div>
      {clients.length ? (
        <ul className="space-y-3">
          {clients.map(c => {
            const task = state.tasks.find(t => t.clientId === c.id && t.status !== 'done')
            const [label, bg, fg] = CLIENT_STATUS[c.status] || CLIENT_STATUS.active
            return (
              <li key={c.id} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: `${c.accentColor || '#2f8f5b'}33`, color: 'var(--text-primary)' }}>{initials(c.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[var(--text-primary)]">{c.name}</span>
                  <span className="block truncate text-[11px] text-[var(--text-tertiary)]">
                    {task ? <>En cours : <b className="font-medium text-[var(--text-secondary)]">{task.title}</b></> : 'Aucune tâche ouverte'}
                  </span>
                </span>
                <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ background: bg, color: fg }}>{label}</span>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-start justify-center gap-3">
          <p className="text-sm text-[var(--text-tertiary)]">Aucun client actif pour l'instant. Ajoute-les pour suivre leurs projets ici et dans l'open space.</p>
          <Button size="sm" onClick={() => onNavigate('ulycom_clients')}>Ouvrir l'espace clients</Button>
        </div>
      )}
    </Card>
  )
}

// ── Jauge de progression de la semaine ───────────────────────────────────────

export function ProgressGauge({ state }) {
  const start = weekStart().getTime()
  const end = start + 7 * DAY
  const endStr = localDateStr(new Date(end - DAY))
  const done = state.tasks.filter(t => t.completedAt && new Date(t.completedAt).getTime() >= start).length
  const open = state.tasks.filter(t => t.status !== 'done' && (t.today || (t.dueDate && t.dueDate <= endStr)))
  const inprogress = open.filter(t => t.status === 'inprogress').length
  const pending = open.length - inprogress
  const total = done + inprogress + pending
  const pct = total ? Math.round((done / total) * 100) : 0

  const R = 80
  const L = Math.PI * R
  const seg = n => (total ? (n / total) * L : 0)
  const arc = 'M 20 100 A 80 80 0 0 1 180 100'
  const parts = [
    { len: seg(done), stroke: 'var(--brand-700)' },
    { len: seg(inprogress), stroke: 'var(--brand-900)' },
    { len: seg(pending) || (total ? 0 : L), stroke: 'url(#gauge-stripes)' },
  ]
  let offset = 0

  return (
    <Card className="flex h-full flex-col border-0 p-5">
      <p className={TITLE}>Progression de la semaine</p>
      <div className="relative mx-auto mt-2 w-full max-w-[260px]">
        <svg viewBox="0 0 200 112" className="w-full">
          <defs>
            <pattern id="gauge-stripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="transparent" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(var(--ink),0.35)" strokeWidth="2.5" />
            </pattern>
          </defs>
          {parts.map((p, i) => {
            const el = p.len > 0 && (
              <path key={i} d={arc} fill="none" stroke={p.stroke} strokeWidth="26" strokeLinecap="butt"
                strokeDasharray={`${p.len} ${L}`} strokeDashoffset={-offset} />
            )
            offset += p.len
            return el
          })}
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <p className="text-[40px] font-semibold leading-none tracking-tight text-[var(--text-primary)]">{pct}%</p>
          <p className="text-xs text-[var(--text-tertiary)]">terminé</p>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap justify-center gap-x-4 gap-y-1 pt-4 text-[11px] text-[var(--text-secondary)]">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-700)]" /> Terminées {done}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-900)]" /> En cours {inprogress}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STRIPES }} /> À faire {pending}</span>
      </div>
    </Card>
  )
}

// ── Chrono (carte vert foncé) ────────────────────────────────────────────────

export function TimeTrackerCard({ timer, state, dispatch, onNavigate }) {
  const fmt = s => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(n => String(n).padStart(2, '0')).join(':')
  const task = state.tasks.find(t => t.id === timer.task)
  const project = state.projects.find(p => p.id === timer.project)
  const active = timer.running || timer.paused

  // Arrêter enregistre la session : le temps n'est jamais perdu.
  function stop() {
    if (timer.elapsed > 0) {
      dispatch({
        type: 'LOG_SESSION',
        payload: { projectId: timer.project || state.projects[0]?.id, taskId: timer.task || undefined, duration: timer.elapsed, note: task?.title || 'Focus depuis le tableau de bord' },
      })
      toast.success(`Session enregistrée — ${fmt(timer.elapsed)}`)
    }
    timer.stop()
  }

  return (
    <Card className="relative flex h-full min-h-[200px] flex-col overflow-hidden border-0 p-5 text-white" style={{ background: 'radial-gradient(130% 120% at 100% 0%, #2f8f5b 0%, #0f4a2e 45%, #08261a 100%)' }}>
      <span className="pointer-events-none absolute -bottom-16 -right-10 h-48 w-48 rounded-full border-[22px] border-white/5" />
      <p className="text-[17px] font-semibold">Chrono</p>
      <p className="mt-1 truncate text-xs text-white/60">{active ? `${project ? `${project.emoji} ${project.name}` : 'Sans projet'}${task ? ` · ${task.title}` : ''}` : 'Aucune session en cours'}</p>
      <p className="my-auto py-3 text-center font-mono text-[44px] font-semibold tracking-tight tabular-nums">{fmt(timer.elapsed)}</p>
      <div className="flex justify-center gap-3">
        {!active && (
          <button type="button" onClick={() => onNavigate('sessions')} aria-label="Démarrer une session" className="flex h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[var(--brand-900)]">
            <Play size={16} fill="currentColor" /> Démarrer
          </button>
        )}
        {active && (
          <button type="button" onClick={timer.running ? timer.pause : timer.resume} aria-label={timer.running ? 'Pause' : 'Reprendre'} className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[var(--brand-900)]">
            {timer.running ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
        )}
        {active && (
          <button type="button" onClick={stop} aria-label="Arrêter et enregistrer" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e5484d] text-white">
            <Square size={16} fill="currentColor" />
          </button>
        )}
      </div>
    </Card>
  )
}

export function DashboardHeaderDate() {
  const [now] = useState(() => new Date())
  return (
    <span className="inline-flex items-center gap-1.5">
      <CalendarDays size={14} />
      {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
    </span>
  )
}
