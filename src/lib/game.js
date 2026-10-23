// Moteur de jeu du Cockpit : XP, niveaux, séries de jours et quêtes du jour.
// L'XP est recalculée à partir de l'historique (tâches, sessions, revues) : elle est
// rétroactive et ne stocke rien, sauf les quêtes réclamées (state.game.questClaims).

import { localDateStr } from '@/lib/backup'

export const XP_RULES = {
  taskHigh: 30,
  taskLow: 10,
  ship80Bonus: 15,
  focusPerMinute: 1,
  focusDailyCap: 240,   // au-delà de 4 h de focus par jour, plus d'XP : on ne récompense pas l'épuisement
  dailyReview: 20,
}

// Un jour compte pour la série s'il contient une vraie avancée.
const STREAK_FOCUS_MIN = 60
const STREAK_TASKS = 3

// ── Niveaux : passer du niveau L au niveau L+1 coûte 100 × L XP ─────────────

export function levelFromXp(xp) {
  let level = 1
  let floor = 0
  while (xp >= floor + 100 * level) {
    floor += 100 * level
    level++
  }
  const need = 100 * level
  return { level, current: xp - floor, need, progress: (xp - floor) / need }
}

export const LEVEL_TITLES = ['Stagiaire', 'Opérateur', 'Pilote', 'Chef d’escadrille', 'Commandant', 'Architecte', 'Visionnaire', 'Légende']

export function levelTitle(level) {
  return LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((level - 1) / 3))]
}

// ── Agrégation par jour ──────────────────────────────────────────────────────

function dayOf(iso) {
  return iso ? localDateStr(new Date(iso)) : null
}

function taskXp(task) {
  return (task.impact === 'high' ? XP_RULES.taskHigh : XP_RULES.taskLow) + (task.ship80Delivered ? XP_RULES.ship80Bonus : 0)
}

// Regroupe l'activité par jour : { [date]: { tasks: [], highDone, focusMin, reviewed } }
export function activityByDay(state) {
  const days = {}
  const get = d => (days[d] ||= { tasks: [], highDone: 0, focusMin: 0, reviewed: false })
  for (const t of state.tasks) {
    if (t.status !== 'done' || !t.completedAt) continue
    const day = get(dayOf(t.completedAt))
    day.tasks.push(t)
    if (t.impact === 'high') day.highDone++
  }
  for (const s of state.sessions) {
    if (s.date) get(dayOf(s.date)).focusMin += (s.duration || 0) / 60
  }
  for (const r of state.dailyReviews || []) {
    if (!r.skipped && r.date) get(r.date).reviewed = true
  }
  return days
}

function dayValidated(day) {
  return !!day && (day.highDone > 0 || day.focusMin >= STREAK_FOCUS_MIN || day.tasks.length >= STREAK_TASKS)
}

function shiftDay(dateStr, delta) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return localDateStr(d)
}

// Série en cours : aujourd'hui pas encore validé ne casse pas la série d'hier.
export function computeStreak(days, today = localDateStr()) {
  let current = 0
  let cursor = dayValidated(days[today]) ? today : shiftDay(today, -1)
  while (dayValidated(days[cursor])) {
    current++
    cursor = shiftDay(cursor, -1)
  }
  let best = 0
  let run = 0
  let prev = null
  for (const d of Object.keys(days).filter(k => dayValidated(days[k])).sort()) {
    run = prev && shiftDay(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return { current, best: Math.max(best, current), todayValidated: dayValidated(days[today]) }
}

// ── Quêtes du jour : deux fixes, une qui tourne selon le jour ───────────────

const ROTATING_QUESTS = [
  { id: 'close-day',   title: 'Clôturer ta journée',           reward: 30, goal: 1, measure: d => (d.reviewed ? 1 : 0) },
  { id: 'three-tasks', title: 'Terminer 3 tâches',             reward: 35, goal: 3, measure: d => d.tasks.length },
  { id: 'client',      title: 'Faire avancer un client',       reward: 35, goal: 1, measure: d => d.tasks.filter(t => t.clientId).length },
  { id: 'ship80',      title: 'Livrer une tâche « Ship 80 % »', reward: 40, goal: 1, measure: d => d.tasks.filter(t => t.ship80Delivered).length },
]

function dayIndex(dateStr) {
  return Math.floor(new Date(dateStr + 'T12:00:00').getTime() / 86400000)
}

export function questsFor(dateStr, day) {
  const d = day || { tasks: [], highDone: 0, focusMin: 0, reviewed: false }
  const list = [
    { id: 'high-impact', title: 'Terminer 1 tâche à fort impact', reward: 40, goal: 1, value: d.highDone },
    { id: 'focus-60',    title: '60 min de focus chronométré',    reward: 30, goal: 60, value: Math.floor(d.focusMin), unit: 'min' },
  ]
  const rot = ROTATING_QUESTS[dayIndex(dateStr) % ROTATING_QUESTS.length]
  list.push({ id: rot.id, title: rot.title, reward: rot.reward, goal: rot.goal, value: rot.measure(d) })
  return list.map(q => ({ ...q, done: q.value >= q.goal }))
}

// ── Vue d'ensemble ───────────────────────────────────────────────────────────

export function computeGame(state, today = localDateStr()) {
  const days = activityByDay(state)
  let xp = 0
  const xpByPole = {}
  const addPole = (poleId, n) => { if (poleId) xpByPole[poleId] = (xpByPole[poleId] || 0) + n }

  for (const t of state.tasks) {
    if (t.status !== 'done' || !t.completedAt) continue
    const n = taskXp(t)
    xp += n
    addPole(t.projectId, n)
  }
  // Le focus est plafonné par jour, puis réparti entre pôles au prorata.
  const focusByDay = {}
  for (const s of state.sessions) {
    const d = dayOf(s.date)
    if (!d) continue
    ;(focusByDay[d] ||= []).push(s)
  }
  for (const list of Object.values(focusByDay)) {
    const total = list.reduce((sum, s) => sum + (s.duration || 0) / 60, 0)
    const earned = Math.min(XP_RULES.focusDailyCap, Math.floor(total * XP_RULES.focusPerMinute))
    xp += earned
    for (const s of list) addPole(s.projectId, total ? Math.round(earned * ((s.duration || 0) / 60) / total) : 0)
  }
  for (const r of state.dailyReviews || []) if (!r.skipped) xp += XP_RULES.dailyReview

  const claims = state.game?.questClaims || {}
  let questXp = 0
  for (const list of Object.values(claims)) for (const c of list) questXp += c.xp || 0
  xp += questXp

  const quests = questsFor(today, days[today]).map(q => ({
    ...q,
    claimed: (claims[today] || []).some(c => c.id === q.id),
  }))
  const todayXp = (days[today]?.tasks || []).reduce((s, t) => s + taskXp(t), 0)
    + Math.min(XP_RULES.focusDailyCap, Math.floor(days[today]?.focusMin || 0))
    + (days[today]?.reviewed ? XP_RULES.dailyReview : 0)
    + (claims[today] || []).reduce((s, c) => s + (c.xp || 0), 0)

  const level = levelFromXp(xp)
  return {
    xp,
    questXp,
    todayXp,
    ...level,
    title: levelTitle(level.level),
    streak: computeStreak(days, today),
    quests,
    poles: Object.fromEntries(Object.entries(xpByPole).map(([id, n]) => [id, { xp: n, ...levelFromXp(n) }])),
  }
}
