// Moteur de jeu du Cockpit : XP, niveaux, séries de jours et quêtes du jour.
// L'XP est recalculée à partir de l'historique (tâches, sessions, revues) : elle est
// rétroactive et ne stocke rien, sauf les quêtes réclamées (state.game.questClaims).

import { localDateStr } from '@/lib/backup'
import { isDue } from '@/lib/habits'
import { prayerXpByDay } from '@/lib/prayers'
import { arcInfo } from '@/lib/winterArc'

export const XP_RULES = {
  taskHigh: 30,
  taskLow: 10,
  ship80Bonus: 15,
  focusPerMinute: 1,
  focusDailyCap: 240,   // au-delà de 4 h de focus par jour, plus d'XP : on ne récompense pas l'épuisement
  dailyReview: 20,
  habit: 5,
  allHabitsBonus: 10,
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
// isValid(dateStr, day) : règle de validation d'un jour (plus exigeante pendant le Winter Arc).
export function computeStreak(days, today = localDateStr(), isValid = (_d, day) => dayValidated(day)) {
  const ok = d => isValid(d, days[d])
  let current = 0
  let cursor = ok(today) ? today : shiftDay(today, -1)
  while (ok(cursor)) {
    current++
    cursor = shiftDay(cursor, -1)
  }
  let best = 0
  let run = 0
  let prev = null
  for (const d of Object.keys(days).filter(ok).sort()) {
    run = prev && shiftDay(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return { current, best: Math.max(best, current), todayValidated: ok(today) }
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

// Bilan de l'Arc : jours écoulés et jours validés selon la règle de l'Arc.
export function arcDaysSummary(state, now = new Date()) {
  const arc = arcInfo(state, now)
  if (!arc.startDate) return { elapsed: 0, validated: 0, todayValidated: false, focusTodayMin: 0 }
  const days = activityByDay(state)
  const today = localDateStr(now)
  let validated = 0
  let elapsed = 0
  for (let d = arc.startDate; d <= today && d <= arc.endDate; d = shiftDay(d, 1)) {
    elapsed++
    if (arcDayValidated(state, d, days[d], arc.focusGoalMin)) validated++
  }
  return { elapsed, validated, todayValidated: arcDayValidated(state, today, days[today], arc.focusGoalMin), focusTodayMin: Math.round(days[today]?.focusMin || 0) }
}

// Jour d'Arc validé : objectif de focus atteint et toutes les routines prévues faites.
function arcDayValidated(state, date, day, focusGoalMin) {
  if ((day?.focusMin || 0) < focusGoalMin) return false
  const d = new Date(date + 'T12:00:00')
  const done = state.habitLogs?.[date] || []
  return (state.habits || []).filter(h => !h.archived && isDue(h, d) && (!h.createdAt || h.createdAt.slice(0, 10) <= date)).every(h => done.includes(h.id))
}

// ── Habitudes : 5 XP par case, bonus si toutes les routines prévues du jour sont faites ──

export function habitXp(state) {
  const habits = Object.fromEntries((state.habits || []).map(h => [h.id, h]))
  const out = {}
  for (const [date, ids] of Object.entries(state.habitLogs || {})) {
    const valid = ids.filter(id => habits[id])
    if (!valid.length) continue
    const d = new Date(date + 'T12:00:00')
    const due = Object.values(habits).filter(h => !h.archived && isDue(h, d) && (!h.createdAt || h.createdAt.slice(0, 10) <= date))
    const all = due.length > 0 && due.every(h => valid.includes(h.id))
    out[date] = valid.length * XP_RULES.habit + (all ? XP_RULES.allHabitsBonus : 0)
  }
  return out
}

// ── Vue d'ensemble ───────────────────────────────────────────────────────────

// Combos : des tâches terminées à moins d'une heure d'intervalle enchaînent un multiplicateur
// (+25 % par tâche, plafonné à ×2).
export const COMBO_WINDOW_MS = 60 * 60 * 1000
export function comboMultiplier(position) {
  return Math.min(2, 1 + 0.25 * position)
}

export function computeGame(state, today = localDateStr(), now = Date.now()) {
  const days = activityByDay(state)
  let xp = 0
  const xpByDay = {}
  const addDay = (d, n) => { if (d && n) xpByDay[d] = (xpByDay[d] || 0) + n }
  const xpByPole = {}
  const addPole = (poleId, n) => { if (poleId) xpByPole[poleId] = (xpByPole[poleId] || 0) + n }

  // Tâches, avec le multiplicateur de combo selon l'enchaînement
  const doneTasks = state.tasks.filter(t => t.status === 'done' && t.completedAt)
    .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
  let chain = 0
  let prevAt = null
  for (const t of doneTasks) {
    const at = new Date(t.completedAt).getTime()
    chain = prevAt !== null && at - prevAt <= COMBO_WINDOW_MS ? chain + 1 : 0
    prevAt = at
    const n = Math.round(taskXp(t) * comboMultiplier(chain))
    xp += n
    addDay(dayOf(t.completedAt), n)
    addPole(t.projectId, n)
  }
  const comboActive = prevAt !== null && now - prevAt <= COMBO_WINDOW_MS
  const combo = { count: comboActive ? chain + 1 : 0, multiplier: comboActive ? comboMultiplier(chain + 1) : 1, expiresAt: comboActive ? prevAt + COMBO_WINDOW_MS : null }

  // Le focus est plafonné par jour, puis réparti entre pôles au prorata.
  const focusByDay = {}
  for (const s of state.sessions) {
    const d = dayOf(s.date)
    if (!d) continue
    ;(focusByDay[d] ||= []).push(s)
  }
  for (const [d, list] of Object.entries(focusByDay)) {
    const total = list.reduce((sum, s) => sum + (s.duration || 0) / 60, 0)
    const earned = Math.min(XP_RULES.focusDailyCap, Math.floor(total * XP_RULES.focusPerMinute))
    xp += earned
    addDay(d, earned)
    for (const s of list) addPole(s.projectId, total ? Math.round(earned * ((s.duration || 0) / 60) / total) : 0)
  }
  for (const r of state.dailyReviews || []) if (!r.skipped) { xp += XP_RULES.dailyReview; addDay(r.date, XP_RULES.dailyReview) }

  const habitXpByDay = habitXp(state)
  for (const [d, n] of Object.entries(habitXpByDay)) { xp += n; addDay(d, n) }
  const prayerXp = prayerXpByDay(state)
  for (const [d, n] of Object.entries(prayerXp)) { xp += n; addDay(d, n) }

  // XP « bonus » (quêtes, succès, boss) : elle a son propre toast, pas de « +N XP » en double.
  const claims = state.game?.questClaims || {}
  let questXp = 0
  for (const [d, list] of Object.entries(claims)) for (const c of list) { questXp += c.xp || 0; addDay(d, c.xp || 0) }
  for (const d of Object.values(state.game?.achievements || {})) { questXp += 50; addDay(d, 50) }
  let bossCoins = 0
  for (const [weekKey, b] of Object.entries(state.game?.bossClaims || {})) { questXp += b.xp || 0; bossCoins += b.coins || 0; addDay(weekKey, b.xp || 0) }
  xp += questXp

  const quests = questsFor(today, days[today]).map(q => ({
    ...q,
    claimed: (claims[today] || []).some(c => c.id === q.id),
  }))

  // Winter Arc : chaque jour de l'Arc rapporte le double d'XP.
  const arc = arcInfo(state, new Date(now))
  let arcBonus = 0
  if (arc.startDate && state.settings?.winterArc?.active) {
    for (const [d, n] of Object.entries(xpByDay)) {
      if (arc.inArc(d)) { arcBonus += n; xpByDay[d] = n * 2 }
    }
  }
  xp += arcBonus

  // Pièces : 1 pièce pour 10 XP, plus les récompenses de boss, moins les achats en boutique.
  const spent = (state.rewardClaims || []).reduce((sum, c) => sum + (Number(c.cost) || 0), 0)
  const coins = { earned: Math.floor(xp / 10) + bossCoins, spent, balance: Math.floor(xp / 10) + bossCoins - spent }

  const level = levelFromXp(xp)
  return {
    xp,
    questXp,
    todayXp: xpByDay[today] || 0,
    xpByDay,
    combo,
    coins,
    ...level,
    title: levelTitle(level.level),
    arcBonus,
    streak: computeStreak(days, today, (d, day) => (arc.inArc?.(d) ? arcDayValidated(state, d, day, arc.focusGoalMin) : dayValidated(day))),
    quests,
    poles: Object.fromEntries(Object.entries(xpByPole).map(([id, n]) => [id, { xp: n, ...levelFromXp(n) }])),
  }
}
