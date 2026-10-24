// Calcule les mises à jour d'un glisser-déposer de tâche entre colonnes de statut.
// La tâche est insérée là où elle est lâchée (et non en bas de colonne), la colonne
// d'arrivée est renumérotée, et passer en « done » renseigne completedAt.

export function computeTaskMove(tasks, draggedId, overId, columnIds) {
  const dragged = tasks.find(t => t.id === draggedId)
  if (!dragged || !overId || overId === draggedId) return []

  const overIsCol = columnIds.includes(overId)
  const overTask = overIsCol ? null : tasks.find(t => t.id === overId)
  const newStatus = overIsCol ? overId : overTask?.status
  if (!newStatus) return []

  const byOrder = (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
  const column = tasks.filter(t => t.status === newStatus).sort(byOrder)
  const without = column.filter(t => t.id !== draggedId)

  let insertAt = without.length
  if (overTask) {
    insertAt = without.findIndex(t => t.id === overTask.id)
    // Même colonne, en descendant : on se place après la carte survolée.
    const oldIdx = column.findIndex(t => t.id === draggedId)
    const overIdx = column.findIndex(t => t.id === overTask.id)
    if (oldIdx !== -1 && oldIdx < overIdx) insertAt += 1
  }
  const ordered = [...without.slice(0, insertAt), dragged, ...without.slice(insertAt)]

  const updates = []
  ordered.forEach((t, i) => {
    const patch = {}
    if (t.orderIndex !== i) patch.orderIndex = i
    if (t.id === draggedId && newStatus !== dragged.status) {
      patch.status = newStatus
      patch.completedAt = newStatus === 'done' ? new Date().toISOString() : null
    }
    if (Object.keys(patch).length) updates.push({ id: t.id, patch })
  })
  return updates
}
