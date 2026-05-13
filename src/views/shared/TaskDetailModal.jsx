import { useState, useEffect, useRef } from 'react'
import { X, Trash2, Plus, Check, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { ImpactBadge, StatusBadge } from './TaskBadge'
import { TAG_PALETTE, getTagColor, URGENCY_OPTIONS, getUrgencyStyle } from './taskColors'
import ImageOrFileInput from '@/components/inputs/ImageOrFileInput'

const nanoid = () => Math.random().toString(36).slice(2, 10)

const STATUS_OPTIONS = [
  { value: 'todo', label: 'À faire' },
  { value: 'inprogress', label: 'En cours' },
  { value: 'done', label: 'Livré' },
]

const CARD_BG_OPTIONS = [
  { name: 'default', color: null, label: 'Défaut' },
  { name: 'violet',  color: 'rgba(139,124,255,0.1)', label: 'Violet' },
  { name: 'green',   color: 'rgba(168,230,189,0.1)', label: 'Vert' },
  { name: 'yellow',  color: 'rgba(255,214,107,0.1)', label: 'Jaune' },
  { name: 'orange',  color: 'rgba(255,176,136,0.1)', label: 'Orange' },
  { name: 'rose',    color: 'rgba(255,193,224,0.1)', label: 'Rose' },
  { name: 'blue',    color: 'rgba(168,212,240,0.1)', label: 'Bleu' },
  { name: 'red',     color: 'rgba(248,113,113,0.1)', label: 'Rouge' },
]

// ─── Checklist editor ─────────────────────────────────────────────────────────

function ChecklistEditor({ items, onChange }) {
  const [newLabel, setNewLabel] = useState('')

  function addItem() {
    if (!newLabel.trim()) return
    onChange([...items, { id: nanoid(), label: newLabel.trim(), done: false, order: items.length }])
    setNewLabel('')
  }

  function toggleItem(id) {
    onChange(items.map(i => i.id === id ? { ...i, done: !i.done } : i))
  }

  function deleteItem(id) {
    onChange(items.filter(i => i.id !== id))
  }

  return (
    <div className="space-y-1.5">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-2 group/item">
          <button
            onClick={() => toggleItem(item.id)}
            className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
            style={item.done
              ? { background: '#5DAA7C', borderColor: '#5DAA7C' }
              : { background: 'transparent', borderColor: 'var(--text-tertiary)' }
            }
          >
            {item.done && <Check size={8} strokeWidth={3} color="white" />}
          </button>
          <span className="flex-1 text-xs leading-tight"
            style={{
              color: item.done ? 'var(--text-tertiary)' : 'var(--text-secondary)',
              textDecoration: item.done ? 'line-through' : 'none',
            }}>
            {item.label}
          </span>
          <button onClick={() => deleteItem(item.id)}
            className="opacity-0 group-hover/item:opacity-100 p-0.5 transition-opacity"
            style={{ color: 'var(--text-tertiary)' }}>
            <X size={11} />
          </button>
        </div>
      ))}

      <div className="flex gap-1.5 mt-2">
        <input
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="Nouvel item..."
          className="flex-1 rounded-lg px-2 py-1 text-xs focus:outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--c-border)', color: 'var(--text-secondary)' }}
        />
        <button onClick={addItem}
          className="p-1.5 rounded-lg transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-tertiary)' }}>
          <Plus size={12} />
        </button>
      </div>
    </div>
  )
}

// ─── Tag input with color picker ──────────────────────────────────────────────

function TagInput({ tags, tagStyles, onTagsChange, onSetTagStyle }) {
  const [input, setInput] = useState('')
  const [pendingTag, setPendingTag] = useState(null)

  function addTag() {
    const t = input.trim().toLowerCase()
    if (!t || tags.includes(t)) { setInput(''); return }
    if (!tagStyles[t]) {
      setPendingTag(t)
    } else {
      onTagsChange([...tags, t])
    }
    setInput('')
  }

  function confirmTagColor(colorName) {
    onSetTagStyle(pendingTag, colorName)
    onTagsChange([...tags, pendingTag])
    setPendingTag(null)
  }

  function removeTag(t) {
    onTagsChange(tags.filter(x => x !== t))
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.map(t => {
          const c = getTagColor(tagStyles, t)
          return (
            <span key={t} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: c.bg, color: c.text }}>
              #{t}
              <button onClick={() => removeTag(t)} className="opacity-60 hover:opacity-100">
                <X size={9} />
              </button>
            </span>
          )
        })}
      </div>

      <div className="flex gap-1">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTag()}
          placeholder="+ Ajouter un tag"
          className="flex-1 rounded-lg px-2 py-1 text-[11px] focus:outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--c-border)', color: 'var(--text-secondary)' }}
        />
        <button onClick={addTag} className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-tertiary)' }}>
          <Plus size={12} />
        </button>
      </div>

      {pendingTag && (
        <div className="mt-2 p-3 rounded-xl" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
          <p className="text-[10px] mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Choisir la couleur pour <span className="font-semibold">#{pendingTag}</span>
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {TAG_PALETTE.map(p => (
              <button key={p.name} onClick={() => confirmTagColor(p.name)}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium transition-all hover:scale-105"
                style={{ background: p.bg, color: p.text }}>
                {p.name}
              </button>
            ))}
          </div>
          <button onClick={() => { onTagsChange([...tags, pendingTag]); setPendingTag(null) }}
            className="mt-2 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            Sans couleur
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function TaskDetailModal({ task, onClose, onUpdate, onDelete }) {
  const { state, dispatch } = useStore()

  // Editable fields
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes || '')
  const [status, setStatus] = useState(task.status)
  const [urgency, setUrgency] = useState(task.urgency ?? null)
  const [dueDate, setDueDate] = useState(task.dueDate || '')
  const [startDate, setStartDate] = useState(task.startDate || '')
  const [tags, setTags] = useState(task.tags || [])

  // Card appearance
  const [cardColor, setCardColor] = useState(task.cardColor || null)
  const [cardImageUrl, setCardImageUrl] = useState(task.cardImageUrl || '')
  const [cardImagePath, setCardImagePath] = useState(task.cardImagePath || null)
  const [cardImageName, setCardImageName] = useState(task.cardImageName || null)
  const [inlineNote, setInlineNote] = useState(task.inlineNote || '')
  const [checklist, setChecklist] = useState(task.checklist || [])
  const [showAppearance, setShowAppearance] = useState(false)

  // Save state feedback
  const [saveState, setSaveState] = useState('idle') // 'idle' | 'saving' | 'saved'
  const saveTimerRef = useRef(null)

  // Unsaved tracking for blur-only fields (title, notes)
  const [titleDirty, setTitleDirty] = useState(false)
  const [notesDirty, setNotesDirty] = useState(false)
  const hasUnsaved = titleDirty || notesDirty

  // Close guard
  const [confirmClose, setConfirmClose] = useState(false)

  const tagStyles = state.tagStyles || {}
  const project = state.projects.find(p => p.id === task.projectId)

  // ── Save helper (fixes signature: calls onUpdate(id, updates)) ────────────
  function save(updates) {
    onUpdate?.(task.id, updates)
    clearTimeout(saveTimerRef.current)
    setSaveState('saved')
    saveTimerRef.current = setTimeout(() => setSaveState('idle'), 1500)
  }

  useEffect(() => () => clearTimeout(saveTimerRef.current), [])

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    function handler(e) {
      if (e.key === 'Escape') {
        if (confirmClose) { setConfirmClose(false); return }
        handleClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [hasUnsaved, confirmClose])

  // ── Close logic ───────────────────────────────────────────────────────────
  function handleClose() {
    if (hasUnsaved) { setConfirmClose(true); return }
    onClose()
  }

  function handleSaveAndClose() {
    save({ title, notes })
    setTitleDirty(false)
    setNotesDirty(false)
    setTimeout(onClose, 200)
  }

  function handleDiscardAndClose() {
    setTitleDirty(false)
    setNotesDirty(false)
    onClose()
  }

  // ── Field handlers ────────────────────────────────────────────────────────
  function handleSetTagStyle(tag, color) {
    dispatch({ type: 'SET_TAG_STYLE', payload: { tag, color } })
  }

  function handleChecklistChange(newChecklist) {
    setChecklist(newChecklist)
    const done = newChecklist.filter(i => i.done).length
    const pct = newChecklist.length > 0 ? Math.round((done / newChecklist.length) * 100) : null
    save({ checklist: newChecklist, progressPercentage: pct })
  }

  function handleCardColor(color) {
    setCardColor(color)
    save({ cardColor: color })
  }

  function handleImageChange(val) {
    if (!val) {
      setCardImageUrl('')
      setCardImagePath(null)
      setCardImageName(null)
      save({ cardImageUrl: null, cardImagePath: null, cardImageName: null })
    } else if (val.type === 'upload') {
      setCardImageUrl(val.signedUrl || '')
      setCardImagePath(val.filePath)
      setCardImageName(val.fileName)
      save({ cardImageUrl: val.signedUrl || null, cardImagePath: val.filePath, cardImageName: val.fileName })
    } else {
      setCardImageUrl(val.url || '')
      setCardImagePath(null)
      setCardImageName(null)
      save({ cardImageUrl: val.url || null, cardImagePath: null, cardImageName: null })
    }
  }

  // ── Backdrop click ────────────────────────────────────────────────────────
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) handleClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdrop}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--c-border)' }}>
          {project && (
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: project.color }} />
          )}
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); setTitleDirty(true) }}
            onBlur={() => {
              if (titleDirty) { save({ title }); setTitleDirty(false) }
            }}
            className="flex-1 text-base font-semibold bg-transparent focus:outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          {/* Save state indicator */}
          <span className="text-[10px] flex-shrink-0 mt-1.5 transition-opacity" style={{
            color: saveState === 'saved' ? '#5DAA7C' : 'transparent',
          }}>
            ✓ Enregistré
          </span>
          <button onClick={handleClose} className="p-1 transition-colors flex-shrink-0"
            style={{ color: 'var(--text-tertiary)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 grid grid-cols-2 gap-5">
            {/* Left column: metadata */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-tertiary)' }}>Statut</label>
                <select value={status} onChange={e => { setStatus(e.target.value); save({ status: e.target.value }) }}
                  className="w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--c-border)', color: 'var(--text-secondary)' }}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: '#1A1A20' }}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-tertiary)' }}>Urgence</label>
                <div className="flex flex-col gap-1">
                  {URGENCY_OPTIONS.map(opt => {
                    const s = opt.value ? getUrgencyStyle(opt.value, project?.color) : null
                    const isActive = urgency === opt.value
                    return (
                      <button
                        key={opt.value ?? 'none'}
                        onClick={() => { setUrgency(opt.value); save({ urgency: opt.value }) }}
                        className="py-1.5 rounded-lg text-xs font-medium transition-colors text-left px-2.5"
                        style={isActive && s
                          ? { background: s.bg, color: s.text, border: `1px solid ${s.text}40` }
                          : isActive
                          ? { background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }
                          : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-tertiary)' }}>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-tertiary)' }}>Début</label>
                <input type="date" value={startDate}
                  onChange={e => { setStartDate(e.target.value); save({ startDate: e.target.value || null }) }}
                  className="w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--c-border)', color: 'var(--text-secondary)' }} />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-tertiary)' }}>Échéance</label>
                <input type="date" value={dueDate}
                  onChange={e => { setDueDate(e.target.value); save({ dueDate: e.target.value || null }) }}
                  className="w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--c-border)', color: 'var(--text-secondary)' }} />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>Tags</label>
                <TagInput
                  tags={tags}
                  tagStyles={tagStyles}
                  onTagsChange={next => { setTags(next); save({ tags: next }) }}
                  onSetTagStyle={handleSetTagStyle}
                />
              </div>
            </div>

            {/* Right column: notes */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col flex-1">
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-tertiary)' }}>Notes</label>
                <textarea
                  value={notes}
                  onChange={e => { setNotes(e.target.value); setNotesDirty(true) }}
                  onBlur={() => {
                    if (notesDirty) { save({ notes }); setNotesDirty(false) }
                  }}
                  rows={8}
                  placeholder="Notes, contexte, liens..."
                  className="flex-1 w-full rounded-xl px-3 py-2.5 text-xs placeholder-white/25 focus:outline-none resize-none leading-relaxed"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--c-border)', color: 'var(--text-secondary)' }}
                />
              </div>
            </div>
          </div>

          {/* ─── Apparence de la carte ─────────────────────────────────────────── */}
          <div style={{ borderTop: '1px solid var(--c-border)' }}>
            <button
              onClick={() => setShowAppearance(!showAppearance)}
              className="w-full flex items-center justify-between px-5 py-3 text-xs font-medium transition-colors hover:bg-white/3"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span>Apparence de la carte</span>
              {showAppearance ? <ChevronUp size={14} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />}
            </button>

            {showAppearance && (
              <div className="px-5 pb-5 space-y-4">
                {/* Color picker */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    Couleur de fond
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {CARD_BG_OPTIONS.map(opt => (
                      <button
                        key={opt.name}
                        onClick={() => handleCardColor(opt.color)}
                        className="relative w-7 h-7 rounded-full transition-all hover:scale-110 flex items-center justify-center"
                        style={{
                          background: opt.color || 'var(--c-card)',
                          border: `2px solid ${cardColor === opt.color ? 'var(--violet-deep, #8B7CFF)' : 'var(--c-border)'}`,
                          outline: cardColor === opt.color ? '2px solid rgba(139,124,255,0.4)' : 'none',
                          outlineOffset: 2,
                        }}
                        title={opt.label}
                      >
                        {((opt.color === null && cardColor === null) || (opt.color !== null && cardColor === opt.color)) && (
                          <Check size={11} color={opt.color ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)'} strokeWidth={3} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image cover — upload + URL */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    Image cover
                  </label>
                  <ImageOrFileInput
                    bucket="task-attachments"
                    pathPrefix={task.id}
                    acceptedTypes="images"
                    value={
                      cardImagePath
                        ? { type: 'upload', filePath: cardImagePath, fileName: cardImageName, signedUrl: cardImageUrl }
                        : cardImageUrl
                        ? { type: 'url', url: cardImageUrl }
                        : null
                    }
                    onChange={handleImageChange}
                  />
                </div>

                {/* Inline note */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    Note inline (affichée sur la carte)
                  </label>
                  <input
                    value={inlineNote}
                    onChange={e => setInlineNote(e.target.value.slice(0, 120))}
                    onBlur={() => save({ inlineNote: inlineNote.trim() || null })}
                    placeholder="Note contextuelle courte…"
                    maxLength={120}
                    className="w-full rounded-lg px-3 py-2 text-xs focus:outline-none italic"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--c-border)', color: 'var(--text-secondary)' }}
                  />
                  <p className="text-[9px] mt-0.5 text-right" style={{ color: 'var(--text-tertiary)' }}>
                    {inlineNote.length}/120
                  </p>
                </div>

                {/* Checklist */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    Checklist ({checklist.filter(i => i.done).length}/{checklist.length})
                  </label>
                  <ChecklistEditor items={checklist} onChange={handleChecklistChange} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Confirm close overlay ────────────────────────────────────────────── */}
        {confirmClose && (
          <div className="absolute inset-x-0 bottom-0 z-10 p-4 rounded-b-2xl"
            style={{ background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)' }}>
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#FFD66B' }} />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Tu as des modifications non enregistrées (titre ou notes). Que faire ?
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmClose(false)}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                Annuler
              </button>
              <button onClick={handleDiscardAndClose}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171' }}>
                Fermer sans enregistrer
              </button>
              <button onClick={handleSaveAndClose}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={{ background: 'var(--violet-deep, #8B7CFF)', color: '#fff' }}>
                Enregistrer et fermer
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-3 flex-shrink-0"
          style={{ borderTop: '1px solid var(--c-border)' }}>
          <button onClick={() => { onDelete?.(task.id); onClose() }}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: '#F87171' }}>
            <Trash2 size={12} /> Supprimer
          </button>
          <div className="flex-1" />
          <button onClick={handleClose}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
            Fermer
          </button>
          <button
            onClick={handleSaveAndClose}
            className="text-xs px-4 py-1.5 rounded-lg font-medium transition-all"
            style={{
              background: hasUnsaved ? 'var(--violet-deep, #8B7CFF)' : 'rgba(255,255,255,0.06)',
              color: hasUnsaved ? '#fff' : 'var(--text-tertiary)',
            }}
          >
            {hasUnsaved ? 'Enregistrer' : '✓ À jour'}
          </button>
        </div>
      </div>
    </div>
  )
}
