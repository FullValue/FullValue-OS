// Génère un flux iCalendar (.ics) à partir du state du Cockpit, pour l'abonnement Apple Calendar.
// Heures « flottantes » (sans fuseau) : l'iPhone les affiche à l'heure locale de l'appareil.

function esc(text = '') {
  return String(text).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

// Découpe les lignes trop longues (RFC 5545 : 75 octets, suite préfixée d'un espace).
function fold(line) {
  const out = []
  let rest = line
  while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = ' ' + rest.slice(74) }
  out.push(rest)
  return out.join('\r\n')
}

const ymd = d => d.replace(/-/g, '')
const hm = t => (t || '09:00').replace(':', '') + '00'

function addMinutes(date, time, minutes) {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = (time || '09:00').split(':').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, hh, mm + minutes))
  const iso = dt.toISOString()
  return `${iso.slice(0, 10).replace(/-/g, '')}T${iso.slice(11, 13)}${iso.slice(14, 16)}00`
}

function nextDay(date) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10).replace(/-/g, '')
}

export function buildIcs(state, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const projects = Object.fromEntries((state.projects || []).map(p => [p.id, p]))
  const events = []

  for (const t of state.tasks || []) {
    if (t.status === 'done' || !t.dueDate) continue
    const p = projects[t.projectId]
    events.push([
      `UID:task-${t.id}@cockpit`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(t.dueDate)}`, `DTEND;VALUE=DATE:${nextDay(t.dueDate)}`,
      `SUMMARY:${esc(`📌 ${t.title}`)}`,
      `DESCRIPTION:${esc(`Échéance${p ? ` · ${p.name}` : ''}${t.notes ? `\n${t.notes}` : ''}`)}`,
    ])
  }
  for (const e of state.calendarEvents || []) {
    if (!e.date) continue
    events.push([
      `UID:event-${e.id}@cockpit`, `DTSTAMP:${stamp}`,
      `DTSTART:${ymd(e.date)}T${hm(e.startTime)}`, `DTEND:${ymd(e.date)}T${hm(e.endTime || e.startTime)}`,
      `SUMMARY:${esc(e.title)}`,
      ...(e.notes ? [`DESCRIPTION:${esc(e.notes)}`] : []),
    ])
  }
  for (const a of state.appointments || []) {
    if (!a.date) continue
    const client = (state.clients || []).find(c => c.id === a.clientId)
    events.push([
      `UID:appointment-${a.id}@cockpit`, `DTSTAMP:${stamp}`,
      `DTSTART:${ymd(a.date)}T${hm(a.time)}`, `DTEND:${addMinutes(a.date, a.time, Math.round((a.duration || 3600) / 60))}`,
      `SUMMARY:${esc(`👤 ${a.title}`)}`,
      ...(client ? [`DESCRIPTION:${esc(`RDV client · ${client.name}`)}`] : []),
    ])
  }

  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FullValue//Cockpit//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Cockpit', 'X-PUBLISHED-TTL:PT15M', 'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    ...events.flatMap(ev => ['BEGIN:VEVENT', ...ev, 'END:VEVENT']),
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}
