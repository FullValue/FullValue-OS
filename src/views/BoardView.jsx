// Vue « Board » : reprise du kanban de Yoovi Ops (cartes à liseré, checklist cochable sur la carte,
// échéance colorée, boutons ← →, panneau de détail, fenêtre d'édition), branchée sur les tâches du cockpit.
// Correspondances : priorité = task.impact (low / medium / high), statut backlog = 'todo'.
import { useMemo, useState } from 'react'
import { Plus, X, Pencil, Trash2, Clock, Search, ArrowLeft, ArrowRight } from 'lucide-react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'framer-motion'
import { computeTaskMove } from './shared/moveTask'

const COL_IDS = ['todo', 'inprogress', 'done']
const DEFAULT_LABELS = { todo: 'À FAIRE', inprogress: 'EN COURS', done: 'TERMINÉ' }
const COL_DOT = { todo: '#F87171', inprogress: '#F59E0B', done: '#10B981' }
const COL_COLORS = { todo: 'rgba(var(--ink),0.06)', inprogress: '#E5F1FB', done: '#E5F7EC' }
const COL_TEXT = { todo: 'var(--text-tertiary)', inprogress: '#2470B0', done: '#2D9F5C' }

const PRIORITY_STYLE = {
  low:    { bg: '#E5F7EC', color: '#2D9F5C', label: 'Basse' },
  medium: { bg: '#E5F1FB', color: '#2470B0', label: 'Moyenne' },
  high:   { bg: '#FFE5D5', color: '#E8743C', label: 'Haute' },
}
const URGENCY_STYLE = {
  urgent:        { bg: 'rgba(245,158,11,0.10)', color: '#C8930F', border: 'rgba(245,158,11,0.35)', label: '⚡ Urgent' },
  'very-urgent': { bg: 'rgba(249,115,22,0.12)', color: '#E8743C', border: 'rgba(249,115,22,0.40)', label: '🔥 Très urgent' },
  critical:      { bg: 'rgba(220,38,38,0.13)',  color: '#D93025', border: 'rgba(220,38,38,0.45)', label: '🚨 Critique' },
}
const URGENCY_KEYS = ['urgent', 'very-urgent', 'critical']
const LABELS_KEY = 'cockpit:board-labels'

const genId = () => Math.random().toString(36).slice(2, 10)
const priorityOf = task => PRIORITY_STYLE[task.impact] || PRIORITY_STYLE.medium

function loadLabels() {
  try { return { ...DEFAULT_LABELS, ...JSON.parse(localStorage.getItem(LABELS_KEY) || '{}') } } catch { return { ...DEFAULT_LABELS } }
}

function dueProximity(due) {
  if (!due) return null
  const target = new Date(due.slice(0, 10) + 'T12:00:00')
  if (isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const days = Math.round((target - today) / 86400000)
  if (days < 0) return { kind: 'overdue', days, color: '#D93025' }
  if (days <= 2) return { kind: 'soon', days, color: '#C8930F' }
  return { kind: 'ok', days, color: null }
}

// Cocher des sous-tâches fait avancer le statut (comme sur Yoovi).
function nextStatusFromChecklist(status, doneCount, total) {
  if (total === 0) return status
  if (doneCount === total) return 'done'
  if (status === 'todo' && doneCount > 0) return 'inprogress'
  if (status === 'done' && doneCount < total) return 'inprogress'
  return status
}

function statusPatch(task, status) {
  if (status === task.status) return {}
  return { status, completedAt: status === 'done' ? new Date().toISOString() : null }
}

function UrgencyPill({ urgency }) {
  const u = URGENCY_STYLE[urgency]
  if (!u) return null
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: u.bg, color: u.color, border: `0.5px solid ${u.border}` }}>
      {u.label}
    </span>
  )
}

function DueDateMini({ due, isDone }) {
  const prox = dueProximity(due)
  if (!prox) return null
  const muted = isDone || !prox.color
  const d = new Date(due.slice(0, 10) + 'T12:00:00')
  const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  const suffix = !muted ? (prox.kind === 'overdue' ? ` (J${prox.days})` : ` (J+${prox.days})`) : ''
  return (
    <span className="font-mono text-[11px]" style={{ color: muted ? 'var(--text-tertiary)' : prox.color, fontWeight: muted ? 400 : 700 }}
      title={prox.kind === 'overdue' ? `En retard de ${Math.abs(prox.days)} j` : prox.kind === 'soon' ? `Dans ${prox.days} j` : undefined}>
      {label}{suffix}
    </span>
  )
}

function ProgressDots({ value, total }) {
  const N = 16
  const pct = total > 0 ? value / total : 0
  const filled = Math.round(pct * N)
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-[2px]">
        {Array.from({ length: N }).map((_, i) => (
          <div key={i} className="flex-1 rounded-[1px] transition-colors duration-150" style={{ height: 3, background: i < filled ? 'var(--accent)' : 'rgba(var(--ink),0.08)' }} />
        ))}
      </div>
      <span className="text-[9px] font-semibold tabular-nums text-[var(--text-tertiary)]" style={{ minWidth: 24, textAlign: 'right' }}>{Math.round(pct * 100)}%</span>
    </div>
  )
}

function CheckBox({ done, size = 13 }) {
  return (
    <div className="flex flex-shrink-0 items-center justify-center rounded transition-all"
      style={{ width: size, height: size, border: `1.3px solid ${done ? '#2D9F5C' : 'rgba(var(--ink),0.22)'}`, background: done ? '#2D9F5C' : 'transparent' }}>
      {done && <span className="text-[8px] font-bold leading-none text-white">✓</span>}
    </div>
  )
}

function ChecklistInline({ items, onToggle, isDone }) {
  if (!items?.length) return null
  const visible = items.slice(0, 4)
  const extra = items.length - visible.length
  return (
    <div className="flex flex-col gap-1">
      {visible.map(it => (
        <div key={it.id} onClick={e => { e.stopPropagation(); onToggle(it.id) }} onPointerDown={e => e.stopPropagation()} className="flex cursor-pointer items-center gap-2 py-0.5">
          <CheckBox done={it.done} />
          <span className="flex-1 text-[11px] leading-snug" style={{ color: it.done || isDone ? 'var(--text-tertiary)' : 'var(--text-secondary)', textDecoration: it.done ? 'line-through' : 'none' }}>
            {it.label}
          </span>
        </div>
      ))}
      {extra > 0 && <div className="pl-[21px] text-[10px] italic text-[var(--text-tertiary)]">+{extra} de plus</div>}
    </div>
  )
}

function ProjectAvatar({ project }) {
  if (!project) return null
  return (
    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
      style={{ background: `${project.color || '#3B6FF0'}22`, color: project.color || '#3B6FF0' }} title={project.name}>
      {project.emoji || project.name?.slice(0, 2).toUpperCase()}
    </div>
  )
}

// ── Carte ─────────────────────────────────────────────────────────────────────

function CardInner({ task, project, onClick, onEditClick, onToggleItem, onMove, onDelete }) {
  const p = priorityOf(task)
  const checklist = task.checklist || []
  const done = checklist.filter(i => i.done).length
  const isDone = task.status === 'done'
  const leftAccent = isDone ? COL_DOT.done : task.urgency === 'critical' ? '#D93025' : COL_DOT[task.status] || '#9CA3AF'
  const colIdx = COL_IDS.indexOf(task.status)
  const tags = task.tags || []
  return (
    <div className="group relative select-none space-y-2.5 rounded-[18px] bg-[var(--bg-card)] px-4 py-3.5 shadow-[var(--shadow-card)]" onClick={onClick}
      style={{ borderLeft: `3px solid ${leftAccent}`, paddingLeft: 13 }}>
      {onEditClick && (
        <button type="button" onClick={e => { e.stopPropagation(); onEditClick() }} onPointerDown={e => e.stopPropagation()}
          className="absolute right-2.5 top-2.5 rounded-lg p-1 text-[var(--text-tertiary)] opacity-0 transition-all hover:bg-[rgba(var(--ink),0.05)] hover:text-[var(--text-primary)] group-hover:opacity-100" title="Modifier">
          <Pencil size={11} />
        </button>
      )}
      {task.urgency && <div><UrgencyPill urgency={task.urgency} /></div>}
      <div className="flex flex-wrap items-center gap-2 pr-5">
        {tags.slice(0, 1).map(t => (
          <span key={t} className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--violet-bg)', color: 'var(--violet-deep)' }}>{t}</span>
        ))}
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: p.bg, color: p.color }}>{p.label}</span>
        {isDone && <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: '#E5F7EC', color: '#2D9F5C' }}>✓</span>}
      </div>
      <div className="text-[13px] font-semibold leading-snug" style={{ color: isDone ? 'var(--text-tertiary)' : 'var(--text-primary)', textDecoration: isDone ? 'line-through' : 'none' }}>
        {task.title}
      </div>
      {task.inlineNote && (
        <p className="text-[11.5px] italic leading-snug text-[var(--text-tertiary)]">
          <span className="font-semibold not-italic text-[var(--text-secondary)]">Note · </span>{task.inlineNote}
        </p>
      )}
      {task.notes && !task.inlineNote && <p className="line-clamp-2 text-[12px] text-[var(--text-tertiary)]">{task.notes}</p>}
      {checklist.length > 0 && onToggleItem && <ChecklistInline items={checklist} isDone={isDone} onToggle={id => onToggleItem(task, id)} />}
      {checklist.length > 0 && <ProgressDots value={done} total={checklist.length} />}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <ProjectAvatar project={project} />
          <DueDateMini due={task.dueDate} isDone={isDone} />
          {tags.length > 1 && <span className="text-[11px] text-[var(--text-tertiary)]">+{tags.length - 1}</span>}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {onMove && colIdx > 0 && (
            <button type="button" onClick={e => { e.stopPropagation(); onMove(task, -1) }} onPointerDown={e => e.stopPropagation()}
              className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[rgba(var(--ink),0.05)] hover:text-[var(--text-primary)]" title={`← ${DEFAULT_LABELS[COL_IDS[colIdx - 1]]}`}>
              <ArrowLeft size={11} />
            </button>
          )}
          {onMove && colIdx >= 0 && colIdx < COL_IDS.length - 1 && (
            <button type="button" onClick={e => { e.stopPropagation(); onMove(task, 1) }} onPointerDown={e => e.stopPropagation()}
              className="flex items-center rounded px-1.5 py-1 transition-colors" style={{ background: COL_COLORS[COL_IDS[colIdx + 1]], color: COL_TEXT[COL_IDS[colIdx + 1]] }}
              title={`→ ${DEFAULT_LABELS[COL_IDS[colIdx + 1]]}`}>
              <ArrowRight size={11} />
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={e => { e.stopPropagation(); if (window.confirm('Supprimer cette tâche ?')) onDelete(task.id) }} onPointerDown={e => e.stopPropagation()}
              className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[rgba(var(--ink),0.05)] hover:text-[#D93025]" title="Supprimer">
              <X size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SortableCard(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      {...attributes} {...listeners} className="cursor-grab touch-none active:cursor-grabbing">
      <CardInner {...props} />
    </div>
  )
}

// ── Panneau de détail (lecture) ───────────────────────────────────────────────

function TaskDrawer({ task, project, onClose, onEdit }) {
  const p = priorityOf(task)
  const checklist = task.checklist || []
  return (
    <>
      <motion.div className="fixed inset-0 z-40" style={{ background: 'rgba(15,15,18,0.35)', backdropFilter: 'blur(4px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} />
      <motion.aside className="fixed bottom-0 right-0 top-0 z-50 flex flex-col bg-[var(--bg-surface)]"
        style={{ width: 400, maxWidth: '95vw', boxShadow: '-4px 0 48px rgba(0,0,0,0.10)', borderLeft: '1px solid var(--border-soft)' }}
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex flex-shrink-0 items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-soft)' }}>
          <div className="flex flex-wrap items-center gap-2">
            {task.urgency && <UrgencyPill urgency={task.urgency} />}
            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: p.bg, color: p.color }}>{p.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onEdit} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.05)]">
              <Pencil size={12} /> Modifier
            </button>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.05)]"><X size={15} /></button>
          </div>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <h2 className="text-[20px] font-semibold leading-snug text-[var(--text-primary)]">{task.title}</h2>
          {task.inlineNote && (
            <p className="text-[13px] italic leading-relaxed text-[var(--text-secondary)]"><span className="font-semibold not-italic text-[var(--text-primary)]">Note · </span>{task.inlineNote}</p>
          )}
          {task.notes && <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--text-secondary)]">{task.notes}</p>}
          {checklist.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Checklist · {checklist.filter(i => i.done).length}/{checklist.length}</p>
              <div className="mb-2"><ProgressDots value={checklist.filter(i => i.done).length} total={checklist.length} /></div>
              <div className="space-y-1.5">
                {checklist.map(it => (
                  <div key={it.id} className="flex items-center gap-2 rounded-xl bg-[rgba(var(--ink),0.04)] px-2 py-1.5">
                    <CheckBox done={it.done} size={14} />
                    <span className="flex-1 text-[13px]" style={{ color: it.done ? 'var(--text-tertiary)' : 'var(--text-primary)', textDecoration: it.done ? 'line-through' : 'none' }}>{it.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3 rounded-2xl p-4" style={{ background: 'rgba(var(--ink),0.03)', border: '1px solid var(--border-soft)' }}>
            <div className="flex items-center gap-3 text-[13px]">
              <span className="w-20 flex-shrink-0 text-[11px] text-[var(--text-tertiary)]">Statut</span>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: COL_COLORS[task.status], color: COL_TEXT[task.status] }}>{DEFAULT_LABELS[task.status] || task.status}</span>
            </div>
            {project && (
              <div className="flex items-center gap-3 text-[13px]">
                <span className="w-20 flex-shrink-0 text-[11px] text-[var(--text-tertiary)]">Projet</span>
                <span className="flex items-center gap-2 font-medium text-[var(--text-primary)]"><ProjectAvatar project={project} /> {project.name}</span>
              </div>
            )}
            {task.dueDate && (
              <div className="flex items-center gap-3 text-[13px]">
                <span className="w-20 flex-shrink-0 text-[11px] text-[var(--text-tertiary)]">Échéance</span>
                <span className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                  <Clock size={12} className="flex-shrink-0 text-[var(--text-tertiary)]" />
                  {new Date(task.dueDate.slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
            )}
          </div>
          {(task.tags || []).length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map(t => <span key={t} className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: 'var(--violet-bg)', color: 'var(--violet-deep)' }}>{t}</span>)}
              </div>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  )
}

// ── Fenêtre d'édition / création ──────────────────────────────────────────────

const FIELD = 'w-full rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]'
const LABEL = 'mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]'

function CardEditModal({ task, isNew, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    title: task.title || '',
    inlineNote: task.inlineNote || '',
    notes: task.notes || '',
    impact: PRIORITY_STYLE[task.impact] ? task.impact : 'medium',
    urgency: task.urgency || '',
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
    tags: (task.tags || []).join(', '),
  })
  const [items, setItems] = useState((task.checklist || []).map(i => ({ ...i, label: i.label ?? '' })))
  const [newItem, setNewItem] = useState('')
  const set = patch => setForm(f => ({ ...f, ...patch }))

  function addItem() {
    const text = newItem.trim()
    if (!text) return
    setItems(its => [...its, { id: genId(), label: text, done: false }])
    setNewItem('')
  }

  function save() {
    const checklist = items.filter(i => i.label.trim()).map(i => ({ ...i, label: i.label.trim() }))
    const done = checklist.filter(i => i.done).length
    onSave({
      title: form.title.trim() || 'Nouvelle tâche',
      inlineNote: form.inlineNote.trim() || null,
      notes: form.notes,
      impact: form.impact,
      urgency: form.urgency || null,
      dueDate: form.dueDate || null,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      checklist,
      progressPercentage: checklist.length ? Math.round((done / checklist.length) * 100) : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,15,18,0.5)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-3xl bg-[var(--bg-surface)] p-6" style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.14)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">{isNew ? 'Nouvelle carte' : 'Modifier la carte'}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.05)]"><X size={15} /></button>
        </div>
        <div className="space-y-3.5">
          <div>
            <label className={LABEL}>Titre</label>
            <input autoFocus value={form.title} onChange={e => set({ title: e.target.value })} onKeyDown={e => { if (e.key === 'Enter' && isNew) save() }} className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Note courte (carte)</label>
            <input value={form.inlineNote} maxLength={120} onChange={e => set({ inlineNote: e.target.value.slice(0, 120) })} className={FIELD} placeholder="≤120 caractères, italique sur la carte" />
            <p className="mt-1 px-1 text-[10px] text-[var(--text-tertiary)]">{form.inlineNote.length}/120</p>
          </div>
          <div>
            <label className={LABEL}>Description (panneau)</label>
            <textarea value={form.notes} rows={3} onChange={e => set({ notes: e.target.value })} className={`${FIELD} resize-none`} placeholder="Optionnel…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Priorité</label>
              <select value={form.impact} onChange={e => set({ impact: e.target.value })} className={FIELD}>
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Urgence</label>
              <select value={form.urgency} onChange={e => set({ urgency: e.target.value })} className={FIELD}>
                <option value="">· Aucune</option>
                <option value="urgent">⚡ Urgent</option>
                <option value="very-urgent">🔥 Très urgent</option>
                <option value="critical">🚨 Critique</option>
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL}>Échéance</label>
            <input type="date" value={form.dueDate} onChange={e => set({ dueDate: e.target.value })} className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Tags (séparés par virgule)</label>
            <input value={form.tags} onChange={e => set({ tags: e.target.value })} className={FIELD} placeholder="contenu, design, bug…" />
          </div>
          <div>
            <label className={LABEL}>Checklist {items.length > 0 && <span className="ml-1 normal-case tracking-normal">· {items.filter(i => i.done).length}/{items.length}</span>}</label>
            {items.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {items.map(it => (
                  <div key={it.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5" style={{ background: 'rgba(var(--ink),0.03)', border: '1px solid var(--border-soft)' }}>
                    <button type="button" onClick={() => setItems(its => its.map(i => i.id === it.id ? { ...i, done: !i.done } : i))} title={it.done ? 'Marquer non fait' : 'Marquer fait'}>
                      <CheckBox done={it.done} size={16} />
                    </button>
                    <input value={it.label} onChange={e => setItems(its => its.map(i => i.id === it.id ? { ...i, label: e.target.value } : i))}
                      className="flex-1 bg-transparent text-[13px] text-[var(--text-primary)] outline-none" style={{ textDecoration: it.done ? 'line-through' : 'none', color: it.done ? 'var(--text-tertiary)' : undefined }} />
                    <button type="button" onClick={() => setItems(its => its.filter(i => i.id !== it.id))} className="flex-shrink-0 p-1 text-[var(--text-tertiary)] hover:text-[#D93025]" title="Supprimer"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }} placeholder="Ajouter une sous-tâche…" className={`${FIELD} flex-1`} />
              <button type="button" onClick={addItem} className="flex flex-shrink-0 items-center gap-1 rounded-xl px-3 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.05)]"><Plus size={12} /> Ajouter</button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={save} className="flex-1 rounded-full bg-[var(--accent)] py-2.5 text-[13px] font-semibold text-white">{isNew ? 'Créer la tâche' : 'Enregistrer'}</button>
          {!isNew && (
            <button type="button" onClick={() => { if (window.confirm('Supprimer définitivement cette tâche ?')) onDelete() }}
              className="flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-semibold" style={{ background: '#FDECEA', color: '#D93025', border: '1px solid rgba(220,38,38,0.2)' }}>
              <Trash2 size={14} /> Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Colonne ───────────────────────────────────────────────────────────────────

function ColHeader({ colId, label, count, onRename, onAdd }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(label)
  const commit = () => { if (draft.trim()) onRename(draft.trim()); setEditing(false) }
  return (
    <div className="mb-3 flex items-center justify-between px-0.5">
      <div className="flex min-w-0 items-center gap-2">
        <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: COL_DOT[colId] }} />
        {editing ? (
          <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            className="w-28 border-b border-[var(--border-medium)] bg-transparent text-[12px] font-bold uppercase tracking-wider text-[var(--text-secondary)] outline-none" />
        ) : (
          <button type="button" onClick={() => { setDraft(label); setEditing(true) }} title="Cliquer pour renommer"
            className="group flex items-center gap-1 text-[12px] font-bold uppercase tracking-wider text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
            {label}<Pencil size={9} className="opacity-0 transition-opacity group-hover:opacity-40" />
          </button>
        )}
        <span className="inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: COL_COLORS[colId], color: COL_TEXT[colId] }}>{count}</span>
      </div>
      <button type="button" onClick={onAdd} className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] transition-colors hover:bg-[rgba(var(--ink),0.05)] hover:text-[var(--text-primary)]" title="Nouvelle carte">
        <Plus size={14} />
      </button>
    </div>
  )
}

function DroppableColumn({ colId, label, tasks, isOver, onRename, onAdd, cardProps }) {
  const { setNodeRef } = useDroppable({ id: colId })
  return (
    <div className="flex min-w-0 flex-col">
      <ColHeader colId={colId} label={label} count={tasks.length} onRename={onRename} onAdd={onAdd} />
      <div ref={setNodeRef} className="-m-1.5 min-h-[80px] flex-1 space-y-2.5 rounded-2xl p-1.5 transition-colors duration-150" style={{ background: isOver ? 'rgba(var(--ink),0.04)' : 'transparent' }}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(t => <SortableCard key={t.id} task={t} {...cardProps(t)} />)}
        </SortableContext>
      </div>
    </div>
  )
}

// ── Vue principale ────────────────────────────────────────────────────────────

export default function BoardView({ tasks = [], projects = [], onTaskUpdate, onTaskCreate, onTaskDelete, toolbarRight }) {
  const [labels, setLabels] = useState(loadLabels)
  const [activeId, setActiveId] = useState(null)
  const [overCol, setOverCol] = useState(null)
  const [viewId, setViewId] = useState(null)
  const [edit, setEdit] = useState(null) // { task, isNew }
  const [search, setSearch] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState(null)
  const [projectFilter, setProjectFilter] = useState('all')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const projectsById = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects])
  // Filtre par projet seulement si le tableau mélange plusieurs projets.
  const boardProjects = useMemo(() => projects.filter(p => tasks.some(t => t.projectId === p.id)), [projects, tasks])

  const filtered = useMemo(() => {
    let r = tasks
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(t => t.title.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q) || (t.inlineNote || '').toLowerCase().includes(q))
    }
    if (urgencyFilter) r = r.filter(t => t.urgency === urgencyFilter)
    if (projectFilter !== 'all') r = r.filter(t => t.projectId === projectFilter)
    return [...r].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
  }, [tasks, search, urgencyFilter, projectFilter])

  const viewTask = tasks.find(t => t.id === viewId)
  const activeTask = tasks.find(t => t.id === activeId)

  function renameCol(colId, val) {
    const next = { ...labels, [colId]: val }
    setLabels(next)
    try { localStorage.setItem(LABELS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  function handleDragEnd({ active, over }) {
    setActiveId(null)
    setOverCol(null)
    if (!over) return
    computeTaskMove(tasks, active.id, over.id, COL_IDS).forEach(({ id, patch }) => onTaskUpdate(id, patch))
  }

  function handleDragOver({ over }) {
    if (!over) { setOverCol(null); return }
    setOverCol(COL_IDS.includes(over.id) ? over.id : tasks.find(t => t.id === over.id)?.status ?? null)
  }

  function moveTask(task, direction) {
    const next = COL_IDS[COL_IDS.indexOf(task.status) + direction]
    if (next) onTaskUpdate(task.id, statusPatch(task, next))
  }

  function toggleItem(task, itemId) {
    const checklist = (task.checklist || []).map(i => i.id === itemId ? { ...i, done: !i.done } : i)
    const done = checklist.filter(i => i.done).length
    const status = nextStatusFromChecklist(task.status, done, checklist.length)
    onTaskUpdate(task.id, { checklist, progressPercentage: Math.round((done / checklist.length) * 100), ...statusPatch(task, status) })
  }

  function saveEdit(fields) {
    if (edit.isNew) {
      const status = edit.task.status
      onTaskCreate({
        ...fields, status, today: false, ship80: false,
        orderIndex: tasks.filter(t => t.status === status).length,
        completedAt: status === 'done' ? new Date().toISOString() : null,
        ...(projectFilter !== 'all' ? { projectId: projectFilter } : {}),
      })
    } else {
      onTaskUpdate(edit.task.id, fields)
    }
    setEdit(null)
  }

  const cardProps = t => ({
    project: projectsById[t.projectId],
    onClick: () => setViewId(t.id),
    onEditClick: () => setEdit({ task: t, isNew: false }),
    onToggleItem: toggleItem,
    onMove: moveTask,
    onDelete: onTaskDelete,
  })

  return (
    <div>
      {/* Filtres */}
      <div className="mb-5 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-auto" style={{ flex: '1 1 220px', maxWidth: 380 }}>
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher dans titre ou note…"
              className="w-full rounded-full border border-[var(--border-soft)] bg-[rgba(var(--ink),0.04)] py-2 pl-9 pr-8 text-[13px] text-[var(--text-primary)] outline-none transition" />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" title="Effacer"><X size={12} /></button>
            )}
          </div>
          {URGENCY_KEYS.map(uk => {
            const meta = URGENCY_STYLE[uk]
            const on = urgencyFilter === uk
            return (
              <button key={uk} type="button" onClick={() => setUrgencyFilter(on ? null : uk)}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all"
                style={{ background: on ? meta.bg : 'transparent', color: on ? meta.color : 'var(--text-tertiary)', border: `1px solid ${on ? meta.border : 'var(--border-soft)'}` }}
                title={`Filtrer · ${meta.label}`}>
                {meta.label}
              </button>
            )
          })}
          {(search || urgencyFilter || projectFilter !== 'all') && (
            <button type="button" onClick={() => { setSearch(''); setUrgencyFilter(null); setProjectFilter('all') }}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.05)]" title="Réinitialiser les filtres">
              <X size={11} /> Réinitialiser
            </button>
          )}
          <span className="ml-auto text-[11px] text-[var(--text-tertiary)]">{filtered.length} / {tasks.length}</span>
          {toolbarRight}
        </div>
        {boardProjects.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setProjectFilter('all')} className="rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all"
              style={{ background: projectFilter === 'all' ? 'var(--text-primary)' : 'transparent', color: projectFilter === 'all' ? 'var(--bg-surface)' : 'var(--text-tertiary)', border: `1px solid ${projectFilter === 'all' ? 'var(--text-primary)' : 'var(--border-soft)'}` }}>
              Tous
            </button>
            {boardProjects.map(p => {
              const on = projectFilter === p.id
              const c = p.color || '#3B6FF0'
              return (
                <button key={p.id} type="button" onClick={() => setProjectFilter(on ? 'all' : p.id)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all"
                  style={{ background: on ? `${c}1f` : 'transparent', color: on ? c : 'var(--text-tertiary)', border: `1px solid ${on ? `${c}66` : 'var(--border-soft)'}` }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} /> {p.emoji} {p.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Tableau */}
      <DndContext sensors={sensors} onDragStart={({ active }) => setActiveId(active.id)} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={() => { setActiveId(null); setOverCol(null) }}>
        <div className="grid grid-cols-1 gap-4 pb-6 sm:grid-cols-3">
          {COL_IDS.map(colId => (
            <DroppableColumn key={colId} colId={colId} label={labels[colId] || DEFAULT_LABELS[colId]}
              tasks={filtered.filter(t => t.status === colId)} isOver={overCol === colId}
              onRename={v => renameCol(colId, v)}
              onAdd={() => setEdit({ task: { title: '', status: colId, impact: 'medium', tags: [], checklist: [] }, isNew: true })}
              cardProps={cardProps} />
          ))}
        </div>
        <DragOverlay>
          {activeTask && (
            <div style={{ transform: 'rotate(1.5deg)', opacity: 0.95 }}>
              <CardInner task={activeTask} project={projectsById[activeTask.projectId]} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>
        {viewTask && (
          <TaskDrawer task={viewTask} project={projectsById[viewTask.projectId]} onClose={() => setViewId(null)}
            onEdit={() => { setEdit({ task: viewTask, isNew: false }); setViewId(null) }} />
        )}
      </AnimatePresence>

      {edit && (
        <CardEditModal task={edit.task} isNew={edit.isNew} onClose={() => setEdit(null)} onSave={saveEdit}
          onDelete={() => { onTaskDelete(edit.task.id); setEdit(null) }} />
      )}
    </div>
  )
}
