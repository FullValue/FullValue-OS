import { useState, useEffect, useRef } from 'react'
import { X, Trash2, Plus, Check, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { TAG_PALETTE, getTagColor, URGENCY_OPTIONS, getUrgencyStyle } from './taskColors'
import ImageOrFileInput from '@/components/inputs/ImageOrFileInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { toast, toastUndo } from '@/lib/toast'

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
          <Checkbox
            checked={item.done}
            onCheckedChange={() => toggleItem(item.id)}
            className="h-4 w-4 flex-shrink-0"
            aria-label={item.label}
          />
          <span className="flex-1 text-xs leading-tight"
            style={{
              color: item.done ? 'var(--text-tertiary)' : 'var(--text-secondary)',
              textDecoration: item.done ? 'line-through' : 'none',
            }}>
            {item.label}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => deleteItem(item.id)}
            aria-label="Supprimer l'item"
            className="opacity-0 group-hover/item:opacity-100 h-5 w-5 flex-shrink-0 transition-opacity text-[var(--text-tertiary)] hover:bg-transparent">
            <X size={11} />
          </Button>
        </div>
      ))}

      <div className="flex gap-1.5 mt-2">
        <Input
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="Nouvel item..."
          className="h-8 flex-1 text-xs"
        />
        <Button variant="subtle" size="icon-sm" onClick={addItem} aria-label="Ajouter un item">
          <Plus size={12} />
        </Button>
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
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeTag(t)}
                aria-label={`Supprimer le tag ${t}`}
                className="h-4 w-4 rounded-full p-0 opacity-60 hover:bg-transparent hover:opacity-100"
              >
                <X size={9} />
              </Button>
            </span>
          )
        })}
      </div>

      <div className="flex gap-1">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTag()}
          placeholder="+ Ajouter un tag"
          className="h-8 flex-1 text-[11px]"
        />
        <Button variant="subtle" size="icon-sm" onClick={addTag} aria-label="Ajouter un tag">
          <Plus size={12} />
        </Button>
      </div>

      {pendingTag && (
        <div className="mt-2 p-3 rounded-xl" style={{ background: 'var(--bg-card-soft)', border: '1px solid var(--border-soft)' }}>
          <p className="text-[10px] mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Choisir la couleur pour <span className="font-semibold">#{pendingTag}</span>
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {TAG_PALETTE.map(p => (
              <Button key={p.name} type="button" variant="ghost" onClick={() => confirmTagColor(p.name)}
                className="h-auto rounded-full px-2 py-0.5 text-[10px] font-medium transition-all hover:scale-105"
                style={{ background: p.bg, color: p.text }}>
                {p.name}
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="xs" onClick={() => { onTagsChange([...tags, pendingTag]); setPendingTag(null) }}
            className="mt-2 h-auto p-0 text-[10px] hover:bg-transparent" style={{ color: 'var(--text-tertiary)' }}>
            Sans couleur
          </Button>
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
    toast.success('Tâche enregistrée')
    setTimeout(onClose, 200)
  }

  function handleDiscardAndClose() {
    setTitleDirty(false)
    setNotesDirty(false)
    onClose()
  }

  // ── Delete with undo ──────────────────────────────────────────────────────
  function handleDelete() {
    const snapshot = state.tasks.find(t => t.id === task.id) || task
    onDelete?.(task.id)
    toastUndo('Tâche supprimée', () =>
      dispatch({ type: 'RESTORE_ITEMS', payload: { tasks: [snapshot] } })
    )
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

  return (
    <Dialog open onOpenChange={open => { if (!open) handleClose() }}>
      <DialogContent hideClose className="max-w-2xl overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-soft)' }}>
          {project && (
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: project.color }} />
          )}
          <Input
            value={title}
            onChange={e => { setTitle(e.target.value); setTitleDirty(true) }}
            onBlur={() => {
              if (titleDirty) { save({ title }); setTitleDirty(false) }
            }}
            className="h-auto flex-1 rounded-none border-0 bg-transparent px-0 text-lg font-semibold tracking-tight shadow-none focus:bg-transparent focus:ring-0"
            style={{ color: 'var(--text-primary)' }}
          />
          {/* Save state indicator */}
          <span className="text-[10px] flex-shrink-0 mt-1.5 transition-opacity" style={{
            color: saveState === 'saved' ? 'var(--green-deep)' : 'transparent',
          }}>
            ✓ Enregistré
          </span>
          <Button variant="ghost" size="icon-sm" onClick={handleClose} className="flex-shrink-0" aria-label="Fermer">
            <X size={16} />
          </Button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 grid grid-cols-2 gap-5">
            {/* Left column: metadata */}
            <div className="flex flex-col gap-3">
              <div>
                <Label className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Statut</Label>
                <NativeSelect
                  value={status}
                  onChange={e => { setStatus(e.target.value); save({ status: e.target.value }) }}
                  className="h-8 text-xs"
                >
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </NativeSelect>
              </div>

              <div>
                <Label className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Urgence</Label>
                <div className="flex flex-col gap-1">
                  {URGENCY_OPTIONS.map(opt => {
                    const s = opt.value ? getUrgencyStyle(opt.value, project?.color) : null
                    const isActive = urgency === opt.value
                    return (
                      <Button
                        key={opt.value ?? 'none'}
                        variant="ghost"
                        onClick={() => { setUrgency(opt.value); save({ urgency: opt.value }) }}
                        className="w-full justify-start h-auto py-1.5 rounded-lg text-xs font-medium text-left px-2.5 hover:bg-transparent"
                        style={isActive && s
                          ? { background: s.bg, color: s.text, border: `1px solid ${s.text}40` }
                          : isActive
                          ? { background: 'rgba(var(--ink),0.09)', color: 'var(--text-secondary)' }
                          : { background: 'rgba(var(--ink),0.05)', color: 'var(--text-tertiary)' }}>
                        {opt.label}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <div>
                <Label className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Début</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); save({ startDate: e.target.value || null }) }}
                  className="h-8 text-xs tabular"
                />
              </div>

              <div>
                <Label className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Échéance</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={e => { setDueDate(e.target.value); save({ dueDate: e.target.value || null }) }}
                  className="h-8 text-xs tabular"
                />
              </div>

              <div>
                <Label className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Tags</Label>
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
                <Label className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={e => { setNotes(e.target.value); setNotesDirty(true) }}
                  onBlur={() => {
                    if (notesDirty) { save({ notes }); setNotesDirty(false) }
                  }}
                  rows={8}
                  placeholder="Notes, contexte, liens..."
                  className="flex-1 text-xs leading-relaxed resize-none"
                />
              </div>
            </div>
          </div>

          {/* ─── Apparence de la carte ─────────────────────────────────────────── */}
          <div style={{ borderTop: '1px solid var(--border-soft)' }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAppearance(!showAppearance)}
              className="h-auto w-full justify-between rounded-none px-5 py-3 text-xs font-medium hover:bg-[rgba(var(--ink),0.03)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span>Apparence de la carte</span>
              {showAppearance ? <ChevronUp size={14} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />}
            </Button>

            {showAppearance && (
              <div className="px-5 pb-5 space-y-4">
                {/* Color picker */}
                <div>
                  <Label className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                    Couleur de fond
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {CARD_BG_OPTIONS.map(opt => (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        key={opt.name}
                        onClick={() => handleCardColor(opt.color)}
                        className="relative h-7 w-7 rounded-full p-0 transition-all hover:scale-110"
                        style={{
                          background: opt.color || 'var(--bg-card)',
                          border: `2px solid ${cardColor === opt.color ? 'var(--violet-deep)' : 'var(--border-medium)'}`,
                          outline: cardColor === opt.color ? '2px solid var(--ring)' : 'none',
                          outlineOffset: 2,
                        }}
                        title={opt.label}
                      >
                        {((opt.color === null && cardColor === null) || (opt.color !== null && cardColor === opt.color)) && (
                          <Check size={11} color={opt.color ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)'} strokeWidth={3} />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Image cover — upload + URL */}
                <div>
                  <Label className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                    Image cover
                  </Label>
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
                  <Label className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                    Note inline (affichée sur la carte)
                  </Label>
                  <Input
                    value={inlineNote}
                    onChange={e => setInlineNote(e.target.value.slice(0, 120))}
                    onBlur={() => save({ inlineNote: inlineNote.trim() || null })}
                    placeholder="Note contextuelle courte…"
                    maxLength={120}
                    className="h-8 text-xs italic"
                  />
                  <p className="tabular text-[9px] mt-0.5 text-right" style={{ color: 'var(--text-tertiary)' }}>
                    {inlineNote.length}/120
                  </p>
                </div>

                {/* Checklist */}
                <div>
                  <Label className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                    Checklist (<span className="tabular">{checklist.filter(i => i.done).length}/{checklist.length}</span>)
                  </Label>
                  {checklist.length > 0 && (
                    <Progress
                      value={Math.round((checklist.filter(i => i.done).length / checklist.length) * 100)}
                      color="var(--green-deep)"
                      className="mb-2.5"
                    />
                  )}
                  <ChecklistEditor items={checklist} onChange={handleChecklistChange} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Confirm close overlay ────────────────────────────────────────────── */}
        {confirmClose && (
          <div className="absolute inset-x-0 bottom-0 z-10 p-4 rounded-b-2xl"
            style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-float)' }}>
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--yellow-deep)' }} />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Tu as des modifications non enregistrées (titre ou notes). Que faire ?
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmClose(false)}>
                Annuler
              </Button>
              <Button variant="danger" size="sm" onClick={handleDiscardAndClose}>
                Fermer sans enregistrer
              </Button>
              <Button size="sm" onClick={handleSaveAndClose}>
                Enregistrer et fermer
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-3 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border-soft)' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-[var(--red-deep)] hover:bg-[var(--red-bg)] hover:text-[var(--red-deep)]"
          >
            <Trash2 size={12} /> Supprimer
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Fermer
          </Button>
          <Button
            variant={hasUnsaved ? 'default' : 'subtle'}
            size="sm"
            onClick={handleSaveAndClose}
          >
            {hasUnsaved ? 'Enregistrer' : '✓ À jour'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
