// Lecture minimale d'un flux iCalendar : événements simples (sans expansion des récurrences).

function unfold(text) {
  return text.replace(/\r?\n[ \t]/g, '')
}

function unescape(v = '') {
  return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1')
}

// DTSTART;VALUE=DATE:20261024 | DTSTART:20261024T090000Z | DTSTART;TZID=Europe/Paris:20261024T090000
function parseDate(params, value) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value || '')
  if (!m) return null
  const [, y, mo, d, h, mi, , z] = m
  if (!h) return { date: new Date(+y, +mo - 1, +d), allDay: true }
  if (z) return { date: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi)), allDay: false }
  // Heure locale ou avec TZID : on l'affiche telle quelle (cas courant : même fuseau que l'utilisateur).
  return { date: new Date(+y, +mo - 1, +d, +h, +mi), allDay: params.includes('VALUE=DATE') }
}

export function parseIcs(text) {
  const events = []
  let cur = null
  for (const raw of unfold(text).split(/\r?\n/)) {
    if (raw === 'BEGIN:VEVENT') { cur = {}; continue }
    if (raw === 'END:VEVENT') {
      if (cur?.start) events.push(cur)
      cur = null
      continue
    }
    if (!cur) continue
    const idx = raw.indexOf(':')
    if (idx < 0) continue
    const [name, ...params] = raw.slice(0, idx).split(';')
    const value = raw.slice(idx + 1)
    const p = params.join(';')
    if (name === 'UID') cur.uid = value
    else if (name === 'SUMMARY') cur.title = unescape(value)
    else if (name === 'LOCATION') cur.location = unescape(value)
    else if (name === 'DTSTART') { const r = parseDate(p, value); if (r) { cur.start = r.date; cur.allDay = r.allDay } }
    else if (name === 'DTEND') { const r = parseDate(p, value); if (r) cur.end = r.date }
  }
  return events.map(e => ({
    uid: e.uid || `${e.title}-${e.start.getTime()}`,
    title: e.title || '(sans titre)',
    location: e.location || '',
    start: e.start,
    end: e.end && e.end > e.start ? e.end : new Date(e.start.getTime() + (e.allDay ? 86400000 : 3600000)),
    allDay: !!e.allDay,
  }))
}
