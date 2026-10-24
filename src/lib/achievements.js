// Succès : débloqués une fois pour toutes (state.game.achievements), +50 XP chacun.
import { totals } from '@/lib/billing'
import { goalProgress } from '@/lib/goals'
import { habitStreak } from '@/lib/habits'

export const ACHIEVEMENT_XP = 50

const done = s => s.tasks.filter(t => t.status === 'done' && t.completedAt)
const focusHours = s => s.sessions.reduce((sum, x) => sum + (x.duration || 0), 0) / 3600
const paid = s => (s.clientInvoices || []).filter(i => i.kind !== 'quote' && i.status === 'paid')
const won = s => (s.deals || []).filter(d => d.stage === 'won')

export const ACHIEVEMENTS = [
  { id: 'first-task', emoji: '✅', title: 'Premier pas', desc: 'Terminer une première tâche', check: s => done(s).length >= 1 },
  { id: 'tasks-50', emoji: '🏗️', title: 'Bâtisseur', desc: '50 tâches terminées', check: s => done(s).length >= 50 },
  { id: 'tasks-250', emoji: '🏛️', title: 'Bâtisseur d’empire', desc: '250 tâches terminées', check: s => done(s).length >= 250 },
  { id: 'early-bird', emoji: '🌅', title: 'Lève-tôt', desc: 'Terminer une tâche avant 8 h', check: s => done(s).some(t => new Date(t.completedAt).getHours() < 8) },
  { id: 'streak-7', emoji: '🔥', title: 'Une semaine en feu', desc: '7 jours validés d’affilée', check: (s, g) => g.streak.best >= 7 },
  { id: 'streak-30', emoji: '☄️', title: 'Inarrêtable', desc: '30 jours validés d’affilée', check: (s, g) => g.streak.best >= 30 },
  { id: 'focus-10', emoji: '🎯', title: 'Concentré', desc: '10 h de focus chronométré', check: s => focusHours(s) >= 10 },
  { id: 'focus-100', emoji: '🧘', title: 'Moine du focus', desc: '100 h de focus chronométré', check: s => focusHours(s) >= 100 },
  { id: 'pomodoro-10', emoji: '🍅', title: 'Récolte de tomates', desc: '10 séances Pomodoro', check: s => s.sessions.filter(x => x.pomodoro).length >= 10 },
  { id: 'habit-21', emoji: '🌱', title: 'Habitude ancrée', desc: 'Tenir une habitude 21 jours de suite', check: s => (s.habits || []).some(h => habitStreak(h, s.habitLogs) >= 21) },
  { id: 'closer-7', emoji: '🌙', title: 'Rituel du soir', desc: 'Clôturer 7 journées', check: s => (s.dailyReviews || []).filter(r => !r.skipped).length >= 7 },
  { id: 'first-deal', emoji: '🤝', title: 'Premier contrat', desc: 'Gagner une affaire dans le pipeline', check: s => won(s).length >= 1 },
  { id: 'deals-10', emoji: '💼', title: 'Machine commerciale', desc: '10 affaires gagnées', check: s => won(s).length >= 10 },
  { id: 'first-paid', emoji: '💶', title: 'Premier encaissement', desc: 'Une facture payée', check: s => paid(s).length >= 1 },
  { id: 'revenue-10k', emoji: '💰', title: '10 K', desc: '10 000 € encaissés', check: s => paid(s).reduce((sum, i) => sum + totals(i).ttc, 0) >= 10000 },
  { id: 'goal-100', emoji: '🏆', title: 'Objectif atteint', desc: 'Un objectif trimestriel à 100 %', check: s => (s.goals || []).some(g => { const p = goalProgress(g, s.tasks); return p.total > 0 && p.pct === 100 }) },
  { id: 'level-5', emoji: '⭐', title: 'Pilote confirmé', desc: 'Atteindre le niveau 5', check: (s, g) => g.level >= 5 },
  { id: 'level-10', emoji: '🌟', title: 'Commandant', desc: 'Atteindre le niveau 10', check: (s, g) => g.level >= 10 },
]

// Succès remplis mais pas encore enregistrés.
export function newlyUnlocked(state, game) {
  const have = state.game?.achievements || {}
  return ACHIEVEMENTS.filter(a => !have[a.id] && a.check(state, game))
}
