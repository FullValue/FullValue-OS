// Capture vocale globale : touche V (ou le micro du tableau de bord), on parle, ça devient
// une tâche (si une date ou un projet est reconnu) ou un élément de l'Inbox.
import { useEffect } from 'react'
import { Mic } from 'lucide-react'
import { useVoiceToCockpit } from '@/hooks/useVoiceToCockpit'
import { toast } from '@/lib/toast'

export default function VoiceCapture() {
  const voice = useVoiceToCockpit()
  const { supported, listening, start, stop } = voice

  useEffect(() => {
    // Le micro du tableau de bord passe par cet événement : une seule dictée à la fois.
    function onToggle() {
      if (!supported) { toast.error('La dictée n’est pas disponible dans ce navigateur (essaie Chrome ou Safari).'); return }
      if (listening) stop()
      else start()
    }
    function onKey(e) {
      const t = e.target
      if (e.key.toLowerCase() !== 'v' || e.metaKey || e.ctrlKey || e.altKey) return
      if (t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)) return
      if (document.querySelector('[role="dialog"][data-state="open"]')) return
      e.preventDefault()
      if (!supported) { toast.error('La dictée n’est pas disponible dans ce navigateur (essaie Chrome ou Safari).'); return }
      if (listening) stop()
      else start()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('cockpit:voice-toggle', onToggle)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('cockpit:voice-toggle', onToggle)
    }
  }, [supported, listening, start, stop])

  if (!listening) return null
  return (
    <button
      type="button"
      onClick={stop}
      className="fixed bottom-6 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-3 rounded-full px-5 py-3 text-sm font-medium text-white shadow-[var(--shadow-float)]"
      style={{ background: 'var(--hero-dark)' }}
    >
      <span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" /></span>
      <Mic size={15} />
      <span className="max-w-[60vw] truncate">{voice.interim || 'Je t’écoute… (« Relancer Martin demain projet Ulycom »)'}</span>
    </button>
  )
}
