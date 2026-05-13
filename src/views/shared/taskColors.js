export const TAG_PALETTE = [
  { name: 'violet', bg: 'rgba(139,124,255,0.18)', text: '#8B7CFF' },
  { name: 'green',  bg: 'rgba(168,230,189,0.18)', text: '#5DAA7C' },
  { name: 'yellow', bg: 'rgba(255,214,107,0.18)', text: '#C8930F' },
  { name: 'orange', bg: 'rgba(255,176,136,0.18)', text: '#CC7A45' },
  { name: 'red',    bg: 'rgba(248,113,113,0.18)', text: '#E05555' },
  { name: 'rose',   bg: 'rgba(255,193,224,0.18)', text: '#CC6699' },
  { name: 'blue',   bg: 'rgba(168,212,240,0.18)', text: '#5A9EC4' },
  { name: 'neutral',bg: 'rgba(160,155,150,0.15)', text: '#9B9895' },
]

export function getTagColor(tagStyles, tag) {
  const colorName = tagStyles?.[tag]
  return TAG_PALETTE.find(c => c.name === colorName) || TAG_PALETTE[7]
}

export function computeProgress(task) {
  if (task.checklist && task.checklist.length > 0) {
    const done = task.checklist.filter(i => i.done).length
    return Math.round((done / task.checklist.length) * 100)
  }
  return task.progressPercentage ?? 0
}

export const URGENCY_OPTIONS = [
  { value: null,          label: '· Aucune' },
  { value: 'urgent',      label: '⚡ Urgent' },
  { value: 'very-urgent', label: '🔥 Très urgent' },
  { value: 'critical',    label: '🚨 Critique' },
]

// Returns { bg, text, label } for a given urgency level.
// For 'urgent', derives color from project base color shifted toward orange.
export function getUrgencyStyle(urgency, projectColor) {
  if (urgency === 'critical')    return { bg: 'rgba(220,38,38,0.16)',  text: '#DC2626', label: '🚨 Critique' }
  if (urgency === 'very-urgent') return { bg: 'rgba(204,85,0,0.16)',   text: '#CC5500', label: '🔥 Très urgent' }
  if (urgency === 'urgent') {
    if (projectColor && /^#[0-9a-fA-F]{6}$/.test(projectColor)) {
      const r = parseInt(projectColor.slice(1, 3), 16)
      const g = parseInt(projectColor.slice(3, 5), 16)
      const b = parseInt(projectColor.slice(5, 7), 16)
      const nr = Math.min(255, r)
      const ng = Math.round(g * 0.45)
      const nb = Math.round(b * 0.20)
      const text = `rgb(${nr},${ng},${nb})`
      return { bg: `rgba(${nr},${ng},${nb},0.18)`, text, label: '⚡ Urgent' }
    }
    return { bg: 'rgba(245,158,11,0.18)', text: '#B45309', label: '⚡ Urgent' }
  }
  return null
}
