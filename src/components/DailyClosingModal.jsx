import { useState } from 'react'
import { Star, Moon } from 'lucide-react'
import { useStore } from '@/store/useStore'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/lib/toast'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const SECTION_LABEL = 'mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]'

export default function DailyClosingModal({ isOpen, onClose }) {
  const { dispatch } = useStore()
  const [rating, setRating] = useState(0)
  const [wins, setWins] = useState(['', '', ''])
  const [priorities, setPriorities] = useState(['', '', ''])

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
    toast.success('Journée clôturée')
    onClose()
  }

  function handleSkip() {
    dispatch({ type: 'SKIP_DAILY_REVIEW', payload: { date: todayStr() } })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(139,124,255,0.15)' }}>
              <Moon size={18} style={{ color: 'var(--violet-deep)' }} />
            </div>
            <div>
              <DialogTitle>Fin de journée</DialogTitle>
              <DialogDescription>Une minute pour clore proprement.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {/* Rating */}
          <div>
            <span className={SECTION_LABEL}>Comment était ta journée ?</span>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setRating(n)}
                  className="transition-transform hover:scale-110 active:scale-95">
                  <Star size={28}
                    fill={n <= rating ? 'var(--violet-deep)' : 'transparent'}
                    style={{ color: n <= rating ? 'var(--violet-deep)' : 'var(--text-tertiary)' }} />
                </button>
              ))}
            </div>
          </div>

          {/* Wins */}
          <div>
            <span className={SECTION_LABEL}>3 wins du jour</span>
            <div className="flex flex-col gap-2">
              {wins.map((w, i) => (
                <Input key={i} type="text" value={w}
                  onChange={e => setWins(arr => arr.map((x, j) => j === i ? e.target.value : x))}
                  placeholder={`Win ${i + 1}…`} />
              ))}
            </div>
          </div>

          {/* Priorities */}
          <div>
            <span className={SECTION_LABEL}>3 priorités pour demain</span>
            <div className="flex flex-col gap-2">
              {priorities.map((p, i) => (
                <Input key={i} type="text" value={p}
                  onChange={e => setPriorities(arr => arr.map((x, j) => j === i ? e.target.value : x))}
                  placeholder={`Priorité ${i + 1}…`} />
              ))}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={handleSkip}>Passer</Button>
          <Button className="flex-1" onClick={handleSave}>Clôturer la journée</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
