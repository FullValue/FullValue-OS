import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

// ── Field mappers ────────────────────────────────────────────────────────────

function mapProject(p, userId) {
  return {
    user_id: userId,
    slug: p.id,
    name: p.name,
    tier: `T${p.tier}`,
    emoji: p.emoji || null,
    north_star: p.northStar || null,
    north_star_progress: p.northStarProgress ?? 0,
    accent_color: p.color || null,
  }
}

function mapTask(t, userId, projectUuidBySlug) {
  return {
    user_id: userId,
    project_id: projectUuidBySlug[t.projectId] || null,
    client_id: null,
    title: t.title,
    description: t.notes || null,
    status: t.status,
    impact: t.impact || null,
    ship_at_80: t.ship80 ?? false,
    ship_at_80_delivered: t.ship80Delivered ?? false,
    is_priority_today: t.today ?? false,
    start_date: t.startDate || null,
    due_date: t.dueDate || null,
    tags: t.tags || [],
    order_index: t.orderIndex ?? 0,
    cover_url: t.coverUrl || null,
    created_at: t.createdAt || new Date().toISOString(),
    completed_at: t.completedAt || null,
  }
}

function mapSession(s, userId, projectUuidBySlug) {
  const startedAt = new Date(s.date)
  const endedAt   = new Date(startedAt.getTime() + (s.duration || 0) * 1000)
  return {
    user_id: userId,
    project_id: projectUuidBySlug[s.projectId] || null,
    client_id: null,
    task_id: null,
    duration_seconds: s.duration || 0,
    log_message: s.note || null,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
  }
}

function mapResource(r, userId, projectUuidBySlug) {
  return {
    user_id: userId,
    project_id: r.projectId ? (projectUuidBySlug[r.projectId] || null) : null,
    name: r.title,
    type: r.type,
    category: r.category || r.tag || null,
    description: r.description || null,
    content: r.content || null,
    url: r.url || null,
  }
}

const LEARNING_TYPE_MAP = { livre: 'book', video: 'video', article: 'article', podcast: 'podcast', framework: 'framework', link: 'link' }
const LEARNING_STATUS_MAP = { done: 'done', en_cours: 'in_progress', à_voir: 'to_watch' }

function mapLearning(l, userId) {
  return {
    user_id: userId,
    title: l.title,
    type: LEARNING_TYPE_MAP[l.type] || 'article',
    author: l.author || null,
    category: l.category || null,
    status: LEARNING_STATUS_MAP[l.status] || 'to_watch',
    url: l.url || null,
    notes: l.notes || null,
    takeaways: l.takeaways || [],
    citations: l.citations || [],
  }
}

function mapInboxItem(i, userId) {
  return {
    user_id: userId,
    content: i.text,
    type: i.type || 'task',
    captured_at: i.createdAt || new Date().toISOString(),
    processed: false,
  }
}

function mapClient(c, userId, projectUuidBySlug) {
  return {
    user_id: userId,
    project_id: c.projectId ? (projectUuidBySlug[c.projectId] || null) : null,
    name: c.name,
    short_name: c.shortName || null,
    city: c.city || null,
    activity_type: c.activityType || null,
    status: c.status || 'onboarding',
    start_date: c.startDate || null,
    accent_color: c.accentColor || null,
  }
}

function mapCalendarEvent(e, userId, projectUuidBySlug) {
  return {
    user_id: userId,
    project_id: e.projectId ? (projectUuidBySlug[e.projectId] || null) : null,
    title: e.title,
    date: e.date || null,
    start_time: e.startTime || null,
    end_time: e.endTime || null,
    accent_color: e.color || null,
  }
}

// ── Main component ───────────────────────────────────────────────────────────

export default function MigratePage() {
  const { user } = useAuth()
  const [status, setStatus] = useState('idle') // idle | running | done | error
  const [log, setLog] = useState([])
  const [errorMsg, setErrorMsg] = useState('')

  function addLog(msg) {
    setLog(prev => [...prev, msg])
  }

  async function runMigration() {
    setStatus('running')
    setLog([])
    setErrorMsg('')

    try {
      const raw = localStorage.getItem('cockpit_state')
      if (!raw) { setErrorMsg('Aucune donnée trouvée dans localStorage (cockpit_state).'); setStatus('error'); return }
      const data = JSON.parse(raw)
      const userId = user.id

      // ── 1. Projects ──────────────────────────────────────────
      addLog('Migration des projets…')
      const projectRows = (data.projects || []).map(p => mapProject(p, userId))
      const { data: insertedProjects, error: projErr } = await supabase
        .from('projects')
        .upsert(projectRows, { onConflict: 'user_id,slug' })
        .select('id, slug')
      if (projErr) throw new Error(`projects: ${projErr.message}`)

      // Map old slug ('p1' etc.) → new UUID
      const projectUuidBySlug = {}
      ;(insertedProjects || []).forEach(p => { projectUuidBySlug[p.slug] = p.id })
      addLog(`  ✓ ${projectRows.length} projets`)

      // ── 2. Tasks ─────────────────────────────────────────────
      addLog('Migration des tâches…')
      const taskRows = (data.tasks || []).map(t => mapTask(t, userId, projectUuidBySlug))
      if (taskRows.length) {
        const { error: taskErr } = await supabase.from('tasks').insert(taskRows)
        if (taskErr) throw new Error(`tasks: ${taskErr.message}`)
      }
      addLog(`  ✓ ${taskRows.length} tâches`)

      // ── 3. Sessions ──────────────────────────────────────────
      addLog('Migration des sessions…')
      const sessionRows = (data.sessions || []).map(s => mapSession(s, userId, projectUuidBySlug))
      if (sessionRows.length) {
        const { error: sessErr } = await supabase.from('sessions').insert(sessionRows)
        if (sessErr) throw new Error(`sessions: ${sessErr.message}`)
      }
      addLog(`  ✓ ${sessionRows.length} sessions`)

      // ── 4. Resources ─────────────────────────────────────────
      addLog('Migration des ressources…')
      const resourceRows = (data.resources || []).map(r => mapResource(r, userId, projectUuidBySlug))
      if (resourceRows.length) {
        const { error: resErr } = await supabase.from('resources').insert(resourceRows)
        if (resErr) throw new Error(`resources: ${resErr.message}`)
      }
      addLog(`  ✓ ${resourceRows.length} ressources`)

      // ── 5. Learning Resources ────────────────────────────────
      addLog('Migration des formations…')
      const learningRows = (data.learningResources || []).map(l => mapLearning(l, userId))
      if (learningRows.length) {
        const { error: learnErr } = await supabase.from('trainings').insert(learningRows)
        if (learnErr) throw new Error(`trainings: ${learnErr.message}`)
      }
      addLog(`  ✓ ${learningRows.length} formations`)

      // ── 6. Inbox ─────────────────────────────────────────────
      addLog('Migration de l\'inbox…')
      const inboxRows = (data.inbox || []).map(i => mapInboxItem(i, userId))
      if (inboxRows.length) {
        const { error: inboxErr } = await supabase.from('inbox_items').insert(inboxRows)
        if (inboxErr) throw new Error(`inbox_items: ${inboxErr.message}`)
      }
      addLog(`  ✓ ${inboxRows.length} items inbox`)

      // ── 7. Clients ───────────────────────────────────────────
      addLog('Migration des clients…')
      const clientRows = (data.clients || []).map(c => mapClient(c, userId, projectUuidBySlug))
      const clientUuidByLegacyId = {}
      if (clientRows.length) {
        const { data: insertedClients, error: clientErr } = await supabase
          .from('clients')
          .insert(clientRows)
          .select('id, name')
        if (clientErr) throw new Error(`clients: ${clientErr.message}`)
        // Build legacy id → UUID map by position
        ;(data.clients || []).forEach((c, i) => {
          if (insertedClients?.[i]) clientUuidByLegacyId[c.id] = insertedClients[i].id
        })
      }
      addLog(`  ✓ ${clientRows.length} clients`)

      // ── 8. Client Notes ──────────────────────────────────────
      addLog('Migration des notes clients…')
      const noteRows = (data.clientNotes || []).map(n => ({
        user_id: userId,
        client_id: clientUuidByLegacyId[n.clientId] || null,
        title: n.title || 'Note',
        content: n.content || null,
        created_at: n.createdAt || new Date().toISOString(),
        updated_at: n.updatedAt || new Date().toISOString(),
      })).filter(n => n.client_id)
      if (noteRows.length) {
        const { error: noteErr } = await supabase.from('notes').insert(noteRows)
        if (noteErr) throw new Error(`notes: ${noteErr.message}`)
      }
      addLog(`  ✓ ${noteRows.length} notes clients`)

      // ── 9. Client Documents ──────────────────────────────────
      addLog('Migration des documents clients…')
      const docRows = (data.clientDocuments || []).map(d => ({
        user_id: userId,
        client_id: clientUuidByLegacyId[d.clientId] || null,
        name: d.name,
        type: d.type || null,
        description: d.description || null,
        url: d.url || null,
        created_at: d.createdAt || new Date().toISOString(),
      })).filter(d => d.client_id)
      if (docRows.length) {
        const { error: docErr } = await supabase.from('client_documents').insert(docRows)
        if (docErr) throw new Error(`client_documents: ${docErr.message}`)
      }
      addLog(`  ✓ ${docRows.length} documents clients`)

      // ── 10. Client Invoices ──────────────────────────────────
      addLog('Migration des factures…')
      const invoiceRows = (data.clientInvoices || []).map(inv => ({
        user_id: userId,
        client_id: clientUuidByLegacyId[inv.clientId] || null,
        invoice_number: inv.invoiceNumber || `INV-${Date.now()}`,
        date: inv.date || new Date().toISOString().slice(0, 10),
        amount_ht: inv.amountHT ?? null,
        vat_rate: inv.vatRate ?? 20,
        amount_ttc: inv.amountTTC ?? null,
        description: inv.description || null,
        status: inv.status || 'to_emit',
        paid_at: inv.paidAt || null,
      })).filter(i => i.client_id)
      if (invoiceRows.length) {
        const { error: invErr } = await supabase.from('invoices').insert(invoiceRows)
        if (invErr) throw new Error(`invoices: ${invErr.message}`)
      }
      addLog(`  ✓ ${invoiceRows.length} factures`)

      // ── 11. Appointments ─────────────────────────────────────
      addLog('Migration des rendez-vous…')
      const apptRows = (data.appointments || []).map(a => {
        const startsAt = a.time ? `${a.date}T${a.time}:00` : `${a.date}T09:00:00`
        return {
          user_id: userId,
          project_id: a.projectId ? (projectUuidBySlug[a.projectId] || null) : null,
          client_id: clientUuidByLegacyId[a.clientId] || null,
          title: a.title,
          description: a.description || null,
          starts_at: new Date(startsAt).toISOString(),
          duration_minutes: a.duration || null,
          location: a.location || null,
        }
      })
      if (apptRows.length) {
        const { error: apptErr } = await supabase.from('appointments').insert(apptRows)
        if (apptErr) throw new Error(`appointments: ${apptErr.message}`)
      }
      addLog(`  ✓ ${apptRows.length} rendez-vous`)

      // ── 12. Calendar Events ──────────────────────────────────
      addLog('Migration des événements calendrier…')
      const calRows = (data.calendarEvents || []).map(e => mapCalendarEvent(e, userId, projectUuidBySlug))
      if (calRows.length) {
        const { error: calErr } = await supabase.from('calendar_events').insert(calRows)
        if (calErr) throw new Error(`calendar_events: ${calErr.message}`)
      }
      addLog(`  ✓ ${calRows.length} événements calendrier`)

      // ── 13. Energy + Settings ────────────────────────────────
      addLog('Migration énergie et paramètres…')
      if (data.energy) {
        await supabase.from('energy_logs').upsert({ user_id: userId, date: new Date().toISOString().slice(0, 10), level: data.energy }, { onConflict: 'user_id,date' })
      }
      if (data.settings?.endOfWorkday) {
        await supabase.from('user_settings').upsert({ user_id: userId, end_of_workday: data.settings.endOfWorkday }, { onConflict: 'user_id' })
      }
      addLog('  ✓ Énergie et paramètres')

      addLog('')
      addLog('✅ Migration terminée avec succès !')
      setStatus('done')
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        Migration localStorage → Supabase
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Cette opération est <strong>one-shot</strong>. Elle copie toutes tes données locales vers la base Supabase.
        Une fois terminée, tes données sont sauvegardées dans le cloud.
      </p>

      {status === 'idle' && (
        <div
          className="rounded-2xl p-6 mb-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}
        >
          <h2 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Ce qui sera migré</h2>
          <ul className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {['Projets (slugs → UUIDs)', 'Tâches', 'Sessions chronométrées', 'Ressources', 'Formations', 'Inbox', 'Clients + notes + documents + factures', 'Rendez-vous', 'Événements calendrier', 'Énergie du jour + paramètres'].map(item => (
              <li key={item} className="flex items-center gap-2">
                <span style={{ color: 'var(--green-deep)' }}>→</span> {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {log.length > 0 && (
        <div
          className="rounded-2xl p-4 mb-6 font-mono text-xs space-y-0.5 overflow-auto max-h-64"
          style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
        >
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg px-4 py-3 mb-4 text-sm" style={{ background: 'var(--red-bg)', color: 'var(--red-deep)' }}>
          Erreur : {errorMsg}
        </div>
      )}

      {status === 'done' ? (
        <div className="rounded-lg px-4 py-3 text-sm text-center" style={{ background: 'var(--green-bg)', color: 'var(--green-deep)' }}>
          Migration réussie ! Tes données sont maintenant dans Supabase.
        </div>
      ) : (
        <Button
          variant="secondary"
          size="lg"
          onClick={runMigration}
          disabled={status === 'running'}
        >
          {status === 'running' ? 'Migration en cours…' : status === 'error' ? 'Réessayer' : 'Lancer la migration'}
        </Button>
      )}
    </div>
  )
}
