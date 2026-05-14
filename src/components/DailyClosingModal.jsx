import { useState, useEffect } from 'react'
import { X, Star, Moon } from 'lucide-react'
import { useStore } from '@/store/useStore'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DailyClosingModal({ isOpen, onClose }) {
  const { dispatch } = useStore()
  const [rating, setRating] = useState(0)
  const [wins, setWins] = useState(['', '', ''])
  const [priorities, setPriorities] = useState(['', '', ''])

  useEffect(() => {
    if (!isOpen) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function handleSave() {
    dispatch({
      type: 'ADD_DAILY_REVIEW',
      payload: {
        date: todayStr(),
        rating,
        wins: wins.filter(w => w.trim()),
        priorities: priorities.filter(p => p.trim()),
      },
    })
    onClose()
  }

  function handleSkip() {
    dispatch({ type: 'SKIP_DAILY_REVIEW', payload: { date: todayStr() } })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>

      <div className="rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--c-border)' }}
        onClick={e => e.stopPropagation()}>

        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(139,124,255,0.15)' }}>
              <Moon size={18} style={{ color: 'var(--violet-deep)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Fin de journée
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                Une minute pour clore proprement.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Rating */}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold block mb-2"
              style={{ color: 'var(--text-tertiary)' }}>
              Comment était ta journée ?
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setRating(n)}
                  className="transition-transform hover:scale-110">
                  <Star size={28}
                    fill={n <= rating ? 'var(--violet-deep)' : 'transparent'}
                    style={{ color: n <= rating ? 'var(--violet-deep)' : 'var(--text-tertiary)' }} />
                </button>
              ))}
            </div>
          </div>

          {/* Wins */}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold block mb-2"
              style={{ color: 'var(--text-tertiary)' }}>
              3 wins du jour
            </label>
            <div className="flex flex-col gap-2">
              {wins.map((w, i) => (
                <input key={i} type="text" value={w}
                  onChange={e => setWins(arr => arr.map((x, j) => j === i ? e.target.value : x))}
                  placeholder={`Win ${i + 1}…`}
                  className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--c-border)',
                    color: 'var(--text-primary)',
                  }} />
              ))}
            </div>
          </div>

          {/* Priorities */}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold block mb-2"
              style={{ color: 'var(--text-tertiary)' }}>
              3 priorités pour demain
            </label>
            <div className="flex flex-col gap-2">
              {priorities.map((p, i) => (
                <input key={i} type="text" value={p}
                  onChange={e => setPriorities(arr => arr.map((x, j) => j === i ? e.target.value : x))}
                  placeholder={`Priorité ${i + 1}…`}
                  className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--c-border)',
                    color: 'var(--text-primary)',
                  }} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button onClick={handleSkip}
              className="px-4 py-2.5 rounded-xl text-sm transition-colors"
              style={{ color: 'var(--text-tertiary)' }}>
              Passer
            </button>
            <button onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'var(--violet-deep)', color: '#fff' }}>
              Clôturer la journée
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
