import { useState, useEffect } from 'react'
import { Zap } from 'lucide-react'
import { useStore } from '@/store/useStore'

export default function CommandModal({ isOpen, onClose }) {
  const { state, dispatch } = useStore()
  const [text, setText] = useState('')
  const [type, setType] = useState('task')
  const [projectId, setProjectId] = useState('')

  useEffect(() => {
    if (isOpen) setText('')
  }, [isOpen])

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    if (projectId) {
      dispatch({ type: 'ADD_TASK', payload: { title: text.trim(), projectId, status: 'todo', impact: 'low', ship80: false, today: false, dueDate: null, notes: '' } })
    } else {
      dispatch({ type: 'ADD_INBOX', payload: { text: text.trim(), type } })
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface border rounded-2xl shadow-2xl" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-violet" />
            <span className="text-white/60 text-sm">Capture rapide</span>
            <kbd className="ml-auto text-[10px] bg-white/5 text-white/30 px-2 py-0.5 rounded border border-white/10">⌘K</kbd>
          </div>

          <form onSubmit={handleSubmit}>
            <input
              autoFocus
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Que veux-tu capturer ?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-violet/40 mb-4"
            />

            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="text-white/40 text-xs mb-1 block">Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet/40"
                >
                  <option value="task" style={{ background: '#1A1A20' }}>📋 Tâche</option>
                  <option value="idea" style={{ background: '#1A1A20' }}>💡 Idée</option>
                  <option value="note" style={{ background: '#1A1A20' }}>📝 Note</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-white/40 text-xs mb-1 block">Projet (optionnel)</label>
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet/40"
                >
                  <option value="" style={{ background: '#1A1A20' }}>→ Inbox</option>
                  {state.projects.map(p => (
                    <option key={p.id} value={p.id} style={{ background: '#1A1A20' }}>{p.emoji} {p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!text.trim()}
              className="w-full bg-violet hover:bg-violet/90 disabled:opacity-40 text-white py-2.5 rounded-xl font-medium transition-colors"
            >
              Capturer
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
