/**
 * Quick-add en langage naturel (français).
 *
 * "Relancer le client demain !haute #ulycom" →
 *   { title: 'Relancer le client', dueDate: '2026-07-11', impact: 'high', projectId: 'p1', … }
 *
 * Syntaxe reconnue :
 *   #projet          — nom de projet (préfixe, insensible aux accents)
 *   !haute !basse    — impact (alias : !high/!low/!h/!b/!!)
 *   !80              — flag « livrer à 80% »
 *   aujourd'hui, demain, après-demain, lundi…dimanche, dans N jours, 12/08(/2026)
 */

function normalize(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDays(base, n) {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d
}

const WEEKDAYS = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
}

export function parseQuickAdd(input, projects = [], now = new Date()) {
  const result = {
    title: '',
    projectId: null,
    projectName: null,
    impact: 'low',
    dueDate: null,
    dueLabel: null,
    today: false,
    ship80: false,
  }
  if (!input || !input.trim()) return result

  let text = ` ${input.trim()} `

  // ── #projet ────────────────────────────────────────────────
  text = text.replace(/\s#([\p{L}\p{N}_-]+)/gu, (match, tag) => {
    if (result.projectId) return match
    const norm = normalize(tag)
    const p = projects.find(pr => normalize(pr.name).startsWith(norm))
    if (p) {
      result.projectId = p.id
      result.projectName = p.name
      return ' '
    }
    return match
  })

  // ── impact / ship80 ────────────────────────────────────────
  text = text.replace(/\s!(haute?|high|h|!)(?=\s)/giu, () => {
    result.impact = 'high'
    return ' '
  })
  text = text.replace(/\s!(basse?|low|b)(?=\s)/giu, () => {
    result.impact = 'low'
    return ' '
  })
  text = text.replace(/\s!80(?=\s)/g, () => {
    result.ship80 = true
    return ' '
  })

  // ── dates relatives ────────────────────────────────────────
  const setDue = (date, label, isToday = false) => {
    result.dueDate = toISO(date)
    result.dueLabel = label
    if (isToday) result.today = true
  }

  text = text.replace(/\s(aujourd'?hui|auj)(?=\s)/giu, () => {
    setDue(now, "aujourd'hui", true)
    return ' '
  })
  text = text.replace(/\s(apr[eè]s[- ]demain)(?=\s)/giu, () => {
    setDue(addDays(now, 2), 'après-demain')
    return ' '
  })
  text = text.replace(/\sdemain(?=\s)/giu, () => {
    if (!result.dueDate) setDue(addDays(now, 1), 'demain')
    return ' '
  })
  text = text.replace(/\sdans\s+(\d{1,2})\s+jours?(?=\s)/giu, (m, n) => {
    setDue(addDays(now, parseInt(n, 10)), `dans ${n} jours`)
    return ' '
  })
  // jours de la semaine — prochaine occurrence
  text = text.replace(
    /\s(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?=\s)/giu,
    (m, day) => {
      const target = WEEKDAYS[normalize(day)]
      let delta = (target - now.getDay() + 7) % 7
      if (delta === 0) delta = 7
      setDue(addDays(now, delta), day.toLowerCase())
      return ' '
    }
  )
  // dates explicites 12/08 ou 12/08/2026
  text = text.replace(/\s(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/g, (m, dd, mm, yy) => {
    const day = parseInt(dd, 10)
    const month = parseInt(mm, 10) - 1
    if (month < 0 || month > 11 || day < 1 || day > 31) return m
    let year = yy ? parseInt(yy, 10) : now.getFullYear()
    if (year < 100) year += 2000
    const d = new Date(year, month, day)
    if (!yy && d < addDays(now, -1)) d.setFullYear(year + 1)
    setDue(d, `${pad(day)}/${pad(month + 1)}`)
    return ' '
  })

  result.title = text.replace(/\s+/g, ' ').trim()
  return result
}

/** Chips de prévisualisation pour la palette. */
export function parsePreview(parsed) {
  const chips = []
  if (parsed.projectName) chips.push({ type: 'project', label: parsed.projectName })
  if (parsed.dueLabel) chips.push({ type: 'date', label: parsed.dueLabel })
  if (parsed.impact === 'high') chips.push({ type: 'impact', label: 'Impact fort' })
  if (parsed.ship80) chips.push({ type: 'ship80', label: 'Ship 80%' })
  if (parsed.today) chips.push({ type: 'today', label: 'Priorité du jour' })
  return chips
}
