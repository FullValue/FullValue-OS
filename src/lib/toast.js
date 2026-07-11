import { toast } from 'sonner'

export { toast }

/**
 * Toast avec action « Annuler » — pour toutes les suppressions.
 *
 *   const snapshot = state.tasks.find(t => t.id === id)
 *   dispatch({ type: 'DELETE_TASK', payload: id })
 *   toastUndo('Tâche supprimée', () =>
 *     dispatch({ type: 'RESTORE_ITEMS', payload: { tasks: [snapshot] } })
 *   )
 */
export function toastUndo(message, onUndo, options = {}) {
  return toast(message, {
    duration: 5500,
    action: {
      label: 'Annuler',
      onClick: onUndo,
    },
    ...options,
  })
}
