import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Drawer({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-end animate-fadeIn">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative w-full md:w-[480px] md:h-full bg-surface border-t md:border-t-0 md:border-l border-white/5 flex flex-col animate-slideUp md:animate-slideRight shadow-2xl max-h-[90vh] md:max-h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
          <h3 className="font-heading font-semibold text-white text-base">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/80 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <X size={16} />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  )
}
