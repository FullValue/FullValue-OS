// Transforme une dictée en tâche (date ou projet reconnus) ou en élément d'Inbox.
import { useStore } from '@/store/useStore'
import { useVoiceCapture, spokenToQuickAdd } from '@/hooks/useVoiceCapture'
import { parseQuickAdd } from '@/lib/quickadd'
import { toast } from '@/lib/toast'

export function useVoiceToCockpit() {
  const { state, dispatch } = useStore()
  return useVoiceCapture((text, error) => {
    if (error) { toast.error(error === 'not-allowed' ? 'Autorise le micro pour la dictée.' : `Dictée interrompue (${error}).`); return }
    const parsed = parseQuickAdd(spokenToQuickAdd(text), state.projects)
    if (parsed.title && (parsed.projectId || parsed.dueDate)) {
      dispatch({ type: 'ADD_TASK', payload: { title: parsed.title, projectId: parsed.projectId || state.projects[0]?.id, dueDate: parsed.dueDate || null, impact: parsed.impact || 'low', ship80: !!parsed.ship80, today: !!parsed.today, status: 'todo', notes: '' } })
      toast.success(`Tâche créée : ${parsed.title}`, { description: [parsed.projectName, parsed.dueLabel].filter(Boolean).join(' · ') })
    } else {
      dispatch({ type: 'ADD_INBOX', payload: { text, type: 'task' } })
      toast.success("Capturé dans l'Inbox", { description: text })
    }
  })
}
