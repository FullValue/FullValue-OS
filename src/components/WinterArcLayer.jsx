// Ambiance Winter Arc : thème nuit sur <html> et neige qui tombe doucement (canvas, sans clic).
import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { arcInfo, arcEndDate, ARC_DEFAULT_FOCUS_MIN } from '@/lib/winterArc'
import { localDateStr } from '@/lib/backup'
import { playSound } from '@/lib/sound'
import { toast } from '@/lib/toast'

function Snow() {
  const ref = useRef(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let w = 0
    let h = 0
    let raf = 0
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight }
    resize()
    const flakes = Array.from({ length: 90 }, () => ({
      x: Math.random() * w, y: Math.random() * h, r: 0.8 + Math.random() * 2.4,
      vy: 0.25 + Math.random() * 0.7, vx: -0.2 + Math.random() * 0.4, phase: Math.random() * Math.PI * 2, a: 0.35 + Math.random() * 0.5,
    }))
    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      for (const f of flakes) {
        f.phase += 0.01
        f.y += f.vy
        f.x += f.vx + Math.sin(f.phase) * 0.3
        if (f.y > h + 5) { f.y = -5; f.x = Math.random() * w }
        if (f.x > w + 5) f.x = -5
        if (f.x < -5) f.x = w + 5
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(230,240,255,${f.a})`
        ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }
    const onVisibility = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVisibility) }
  }, [])
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[55]" />
}

export default function WinterArcLayer() {
  const { state, dispatch } = useStore()
  const arc = arcInfo(state)
  const active = arc.active
  const stored = state.settings?.winterArc

  // Fin de l'Arc atteinte sans abandon : succès, bonnet et bilan spécial de toute la période.
  useEffect(() => {
    if (!arc.finished || arc.completed) return
    dispatch({ type: 'UPDATE_SETTINGS', payload: { winterArc: { ...stored, active: false, completed: true, completedAt: localDateStr() } } })
    playSound('levelUp', state.settings?.sounds !== false)
    toast('❄️ Winter Arc terminé !', { description: 'Succès débloqué et bonnet exclusif pour ton avatar.', duration: 10000 })
    const t = setTimeout(() => window.dispatchEvent(new CustomEvent('cockpit:open-wrapped', { detail: { arc: { start: arc.startDate, end: arc.endDate } } })), 1500)
    return () => clearTimeout(t)
  }, [arc.finished, arc.completed]) // eslint-disable-line react-hooks/exhaustive-deps

  // Début novembre : on propose de lancer l'Arc (une fois par an).
  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    if (now.getMonth() !== 10 || now.getDate() > 7 || arc.active || state.settings?.winterArcPrompt === year) return
    dispatch({ type: 'UPDATE_SETTINGS', payload: { winterArcPrompt: year } })
    toast('❄️ C’est la saison du Winter Arc', {
      description: 'XP ×2, journées exigeantes, boss de glace jusqu’au 31 décembre.',
      duration: 20000,
      action: { label: 'Lancer', onClick: () => dispatch({ type: 'UPDATE_SETTINGS', payload: { winterArc: { active: true, completed: false, startDate: localDateStr(now), endDate: arcEndDate('year-end', now), focusGoalMin: ARC_DEFAULT_FOCUS_MIN, snow: true } } }) },
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const root = document.documentElement
    if (active) root.dataset.arc = 'winter'
    else delete root.dataset.arc
    return () => { delete root.dataset.arc }
  }, [active])

  return active && arc.snow ? <Snow /> : null
}
