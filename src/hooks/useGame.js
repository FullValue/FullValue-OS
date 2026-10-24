import { useEffect, useMemo, useRef } from 'react'
import confetti from 'canvas-confetti'
import { useStore } from '@/store/useStore'
import { computeGame } from '@/lib/game'
import { localDateStr } from '@/lib/backup'
import { toast } from '@/lib/toast'
import { newlyUnlocked } from '@/lib/achievements'
import { bossStatus, BOSS_REWARD } from '@/lib/boss'
import { playSound } from '@/lib/sound'

export function useGame() {
  const { state } = useStore()
  return useMemo(() => computeGame(state), [state])
}

// Monté une fois dans App : réclame les quêtes terminées et célèbre les gains d'XP.
export function useGameNotifications() {
  const { state, dispatch } = useStore()
  const game = useGame()
  const prevRef = useRef(null)
  const soundsOn = state.settings?.sounds !== false

  // Boss de la semaine vaincu : récompense versée une seule fois.
  useEffect(() => {
    const boss = bossStatus(state)
    if (!boss.defeated || boss.claimed) return
    dispatch({ type: 'CLAIM_BOSS', payload: { week: boss.week.key, id: boss.id, ...BOSS_REWARD } })
    playSound('levelUp', soundsOn)
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#3b6ff0', '#FFD66B', '#FF8FA3', '#22a06b'] })
    toast(`${boss.emoji} ${boss.name} est vaincu !`, { description: `+${BOSS_REWARD.xp} XP · +${BOSS_REWARD.coins} pièces`, duration: 8000 })
  }, [state, dispatch, soundsOn])

  // Combos : toast quand l'enchaînement grandit.
  const comboRef = useRef(game.combo.count)
  useEffect(() => {
    if (game.combo.count >= 2 && game.combo.count > comboRef.current) {
      toast(`Combo ×${game.combo.count} 🔥`, { description: `Prochaine tâche dans l'heure : XP ×${game.combo.multiplier.toFixed(2).replace('.00', '')}`, duration: 2500 })
    }
    comboRef.current = game.combo.count
  }, [game.combo.count, game.combo.multiplier])

  // Succès : vérifiés à chaque changement, débloqués une seule fois.
  useEffect(() => {
    for (const a of newlyUnlocked(state, game)) {
      dispatch({ type: 'UNLOCK_ACHIEVEMENT', payload: { id: a.id, date: localDateStr() } })
      playSound('levelUp', soundsOn)
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 }, colors: ['#3b6ff0', '#93b4ff', '#FFD66B'] })
      toast(`${a.emoji} Succès débloqué : ${a.title}`, { description: `${a.desc} · +50 XP` })
    }
  }, [state, game, dispatch, soundsOn])

  useEffect(() => {
    for (const q of game.quests) {
      if (!q.done || q.claimed) continue
      dispatch({ type: 'CLAIM_QUEST', payload: { date: localDateStr(), id: q.id, xp: q.reward } })
      toast.success(`Quête accomplie : ${q.title}`, { description: `+${q.reward} XP` })
    }
  }, [game.quests, dispatch])

  // Les quêtes ont leur propre toast : le « +N XP » ne compte que l'XP gagnée hors quêtes.
  const earnedXp = game.xp - game.questXp
  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = { earnedXp, level: game.level }
    if (!prev) return
    if (game.level > prev.level) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#3b6ff0', '#93b4ff', '#FFD66B', '#FF8FA3'] })
      playSound('levelUp', soundsOn)
      toast(`Niveau ${game.level} atteint 🎉`, { description: `Tu es maintenant ${game.title}.` })
    } else if (earnedXp > prev.earnedXp) {
      playSound('success', soundsOn)
      toast(`+${earnedXp - prev.earnedXp} XP`, { duration: 1800 })
    }
  }, [earnedXp, game.level, game.title, soundsOn])
}
