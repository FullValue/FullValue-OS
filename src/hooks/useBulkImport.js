import { useState } from 'react'
import { useStore } from '@/store/useStore'

const nanoid = () => Math.random().toString(36).slice(2, 10)

const CARD_COLOR_MAP = {
  violet: 'rgba(139,124,255,0.1)',
  rose: 'rgba(255,193,224,0.1)',
  pink: 'rgba(255,193,224,0.1)',
  orange: 'rgba(255,176,136,0.1)',
  yellow: 'rgba(255,214,107,0.1)',
  green: 'rgba(168,230,189,0.1)',
  blue: 'rgba(168,212,240,0.1)',
  red: 'rgba(248,113,113,0.1)',
}

function normalizeCardColor(color) {
  if (!color) return null
  if (/^rgba?\(/.test(color)) return color
  if (/^#[0-9A-Fa-f]{3,8}$/.test(color)) return color
  return CARD_COLOR_MAP[color.toLowerCase().trim()] ?? null
}

export const SLUG_TO_ID = {
  ulycom: 'p1',
  ulycom_agency: 'p1',
  'ulycom-agency': 'p1',
  yoovi: 'p2',
  'e-com': 'p3',
  ecom: 'p3',
  'e-commerce': 'p3',
  ecommerce: 'p3',
  e_com: 'p3',
  saas: 'p4',
  // ulycom_clients intentionally absent — resolves to null (client-only, no project)
}

export const ID_TO_SLUG = { p1: 'ulycom_agency', p2: 'yoovi', p3: 'e-com', p4: 'saas' }

export function normalizeSlug(slug) {
  if (!slug) return null
  return SLUG_TO_ID[slug.toLowerCase().trim()] ?? null
}

export function countEntities(data, excluded = new Set()) {
  let count = 0
  count += data.tasks?.filter(t => !excluded.has(`task:${t.title}`)).length ?? 0
  count += data.notes?.filter(n => !excluded.has(`note:${n.title}`)).length ?? 0
  count += data.appointments?.filter(a => !excluded.has(`appointment:${a.title}`)).length ?? 0
  count += data.resources?.filter(r => !excluded.has(`resource:${r.name}`)).length ?? 0
  count += data.inbox_items?.filter(i => !excluded.has(`inbox:${i.content.substring(0, 30)}`)).length ?? 0
  count += data.calendar_events?.filter(e => !excluded.has(`event:${e.title}`)).length ?? 0
  return count
}

export function useBulkImport() {
  const { state, dispatch } = useStore()
  const [importing, setImporting] = useState(false)

  function importBulk(data, options = {}) {
    const { dryRun = false, excluded = new Set(), fallbackSlug = null, fallbackClientId = null } = options
    setImporting(true)

    const errors = []
    let created = 0

    function resolveProjectId(entitySlug) {
      // When a fallback context is set, it always wins — ignore whatever the JSON says
      if (fallbackSlug != null) return normalizeSlug(fallbackSlug)
      return normalizeSlug(entitySlug) || normalizeSlug(data.project_slug) || null
    }

    function resolveClientId(clientId) {
      const id = clientId || fallbackClientId
      if (!id) return null
      const client = state.clients.find(c => c.id === id)
      return client ? client.id : null
    }

    if (dryRun) {
      setImporting(false)
      return { success: true, created: countEntities(data, excluded), errors: [] }
    }

    // ── Tasks ──────────────────────────────────────────────────────────────
    for (const task of data.tasks ?? []) {
      const key = `task:${task.title}`
      if (excluded.has(key)) continue
      try {
        const preparedChecklist = task.checklist?.map((item, idx) => ({
          id: nanoid(),
          label: item.label,
          done: item.done ?? false,
          order: idx,
        }))
        const computedProgress = preparedChecklist?.length > 0
          ? Math.round((preparedChecklist.filter(i => i.done).length / preparedChecklist.length) * 100)
          : (task.progress_percentage ?? null)
        dispatch({
          type: 'ADD_TASK',
          payload: {
            title: task.title,
            notes: task.description || '',
            projectId: resolveProjectId(task.project_slug),
            clientId: resolveClientId(task.client_id),
            impact: task.impact || 'low',
            status: task.status === 'in_progress' ? 'inprogress' : (task.status || 'todo'),
            dueDate: task.due_date || null,
            startDate: task.start_date || null,
            estimatedMinutes: task.estimated_minutes || null,
            ship80: task.ship_at_80 || false,
            tags: task.tags || [],
            today: task.is_priority_today || false,
            cardColor: normalizeCardColor(task.card_color),
            cardImageUrl: task.card_image_url || null,
            inlineNote: task.inline_note || null,
            checklist: preparedChecklist ?? [],
            progressPercentage: computedProgress,
          },
        })
        created++
      } catch (e) {
        errors.push({ entity: key, reason: e.message })
      }
    }

    // ── Notes ──────────────────────────────────────────────────────────────
    // Collect project notes grouped by project to avoid overwriting issues
    const notesByProject = {}
    const clientNotesList = []
    const inboxNotesList = []

    for (const note of data.notes ?? []) {
      const key = `note:${note.title}`
      if (excluded.has(key)) continue
      const clientId = resolveClientId(note.client_id)
      const projectId = resolveProjectId(note.project_slug)
      if (clientId) {
        clientNotesList.push({ ...note, _clientId: clientId })
      } else if (projectId) {
        if (!notesByProject[projectId]) notesByProject[projectId] = []
        notesByProject[projectId].push(note)
      } else {
        inboxNotesList.push(note)
      }
    }

    for (const [projectId, notes] of Object.entries(notesByProject)) {
      const project = state.projects.find(p => p.id === projectId)
      if (project) {
        const newNotes = notes.map(n => ({ id: nanoid(), title: n.title, content: n.content, createdAt: new Date().toISOString() }))
        try {
          dispatch({ type: 'UPDATE_PROJECT', payload: { id: projectId, notes: [...(project.notes || []), ...newNotes] } })
          created += notes.length
        } catch (e) {
          notes.forEach(n => errors.push({ entity: `note:${n.title}`, reason: e.message }))
        }
      }
    }

    for (const note of clientNotesList) {
      try {
        dispatch({ type: 'ADD_CLIENT_NOTE', payload: { clientId: note._clientId, title: note.title, content: note.content } })
        created++
      } catch (e) {
        errors.push({ entity: `note:${note.title}`, reason: e.message })
      }
    }

    for (const note of inboxNotesList) {
      try {
        dispatch({ type: 'ADD_INBOX', payload: { text: note.title, type: 'note' } })
        created++
      } catch (e) {
        errors.push({ entity: `note:${note.title}`, reason: e.message })
      }
    }

    // ── Appointments ───────────────────────────────────────────────────────
    for (const apt of data.appointments ?? []) {
      const key = `appointment:${apt.title}`
      if (excluded.has(key)) continue
      try {
        const date = apt.starts_at.slice(0, 10)
        const time = apt.starts_at.length >= 16 ? apt.starts_at.slice(11, 16) : ''
        dispatch({
          type: 'ADD_APPOINTMENT',
          payload: {
            title: apt.title,
            date,
            time,
            duration: apt.duration_minutes ? apt.duration_minutes * 60 : null,
            note: apt.description || '',
            projectId: resolveProjectId(apt.project_slug),
            clientId: resolveClientId(apt.client_id),
            location: apt.location || '',
          },
        })
        created++
      } catch (e) {
        errors.push({ entity: key, reason: e.message })
      }
    }

    // ── Resources ──────────────────────────────────────────────────────────
    for (const res of data.resources ?? []) {
      const key = `resource:${res.name}`
      if (excluded.has(key)) continue
      try {
        dispatch({
          type: 'ADD_RESOURCE',
          payload: {
            title: res.name,
            type: res.type === 'link' ? 'lien' : res.type,
            content: res.content || '',
            url: res.url || '',
            projectId: resolveProjectId(res.project_slug),
            category: res.category || 'Autre',
            description: res.description || '',
            tag: res.category || 'Général',
          },
        })
        created++
      } catch (e) {
        errors.push({ entity: key, reason: e.message })
      }
    }

    // ── Calendar events ────────────────────────────────────────────────────
    const EVENT_TYPE_EMOJI = { meeting: '🤝', focus: '🎯', admin: '📋', personnel: '🌿', client_meeting: '👤' }
    for (const ev of data.calendar_events ?? []) {
      const key = `event:${ev.title}`
      if (excluded.has(key)) continue
      try {
        const clientId = resolveClientId(ev.client_id)
        const eventType = clientId ? (ev.event_type || 'client_meeting') : (ev.event_type || 'meeting')
        if (clientId && eventType === 'client_meeting') {
          // Route to appointment for client meetings
          const [sh, sm] = ev.start_time.split(':').map(Number)
          const [eh, em] = ev.end_time.split(':').map(Number)
          const durationSec = ((eh * 60 + em) - (sh * 60 + sm)) * 60
          dispatch({
            type: 'ADD_APPOINTMENT',
            payload: {
              title: ev.title,
              date: ev.date,
              time: ev.start_time,
              duration: durationSec,
              projectId: resolveProjectId(ev.project_slug),
              clientId,
              note: ev.notes || '',
            },
          })
        } else {
          dispatch({
            type: 'ADD_CALENDAR_EVENT',
            payload: {
              title: ev.title,
              date: ev.date,
              startTime: ev.start_time,
              endTime: ev.end_time,
              eventType,
              emoji: ev.emoji || EVENT_TYPE_EMOJI[eventType] || '🤝',
              notes: ev.notes || '',
              imageUrl: ev.image_url || null,
              projectId: resolveProjectId(ev.project_slug),
              clientId: clientId || null,
            },
          })
        }
        created++
      } catch (e) {
        errors.push({ entity: key, reason: e.message })
      }
    }

    // ── Inbox ──────────────────────────────────────────────────────────────
    for (const item of data.inbox_items ?? []) {
      const key = `inbox:${item.content.substring(0, 30)}`
      if (excluded.has(key)) continue
      try {
        dispatch({ type: 'ADD_INBOX', payload: { text: item.content, type: 'task' } })
        created++
      } catch (e) {
        errors.push({ entity: key, reason: e.message })
      }
    }

    setImporting(false)
    return { success: errors.length === 0, created, errors }
  }

  return { importBulk, importing }
}
