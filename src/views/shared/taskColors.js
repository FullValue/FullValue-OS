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
