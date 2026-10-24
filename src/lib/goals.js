// Objectifs trimestriels : progression calculée depuis les jalons et les tâches liées,
// et North Star d'un pôle = moyenne de ses objectifs du trimestre en cours.

export function quarterOf(date = new Date()) {
  return `${date.getFullYear()}-T${Math.floor(date.getMonth() / 3) + 1}`
}

export function shiftQuarter(q, delta) {
  const [y, t] = q.split('-T').map(Number)
  const idx = y * 4 + (t - 1) + delta
  return `${Math.floor(idx / 4)}-T${(idx % 4) + 1}`
}

export function quarterLabel(q) {
  const [y, t] = q.split('-T')
  const months = ['janv. – mars', 'avr. – juin', 'juil. – sept.', 'oct. – déc.'][Number(t) - 1]
  return `T${t} ${y} · ${months}`
}

// Chaque jalon et chaque tâche liée compte pour une unité.
export function goalProgress(goal, tasks) {
  const linked = tasks.filter(t => t.goalId === goal.id)
  const milestones = goal.milestones || []
  const total = linked.length + milestones.length
  if (!total) return { pct: 0, done: 0, total: 0, linked }
  const done = linked.filter(t => t.status === 'done').length + milestones.filter(m => m.done).length
  return { pct: Math.round((done / total) * 100), done, total, linked }
}

// null si le pôle n'a pas d'objectif ce trimestre : on garde alors la progression saisie à la main.
export function poleProgress(project, state, quarter = quarterOf()) {
  const goals = (state.goals || []).filter(g => g.projectId === project.id && g.quarter === quarter)
  if (!goals.length) return null
  return Math.round(goals.reduce((sum, g) => sum + goalProgress(g, state.tasks).pct, 0) / goals.length)
}

export function northStarOf(project, state) {
  const auto = poleProgress(project, state)
  return { pct: auto ?? (project.northStarProgress || 0), auto: auto !== null }
}
