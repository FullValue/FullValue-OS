// Outils MCP du Cockpit. Chaque outil reçoit `ctx` = { db, userId, actorLabel }.
// `db` est un client Supabase service role : il contourne la RLS, donc chaque
// requête filtre explicitement sur ctx.userId et vérifie la propriété des ids reçus.

import { sendText, normalizePhone } from '../whatsapp/core.js'
import { summarizeConversations } from '../../src/lib/whatsapp.js'
import { COCKPIT_TOOLS } from './cockpit.js'

const DATE = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Date AAAA-MM-JJ' }
const UUID = { type: 'string', description: 'Identifiant (UUID)' }

const CLIENT_PROJECT_STATUS = ['brief', 'en_cours', 'en_revue', 'livre', 'en_pause']
const TASK_STATUS = ['todo', 'inprogress', 'done']
const REQUEST_STATUS = ['brouillon', 'envoyee', 'vue', 'acceptee', 'en_cours', 'livree', 'refusee', 'close']

function unwrap({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

async function assertOwned(ctx, table, id, label) {
  if (!id) return null
  const row = unwrap(await ctx.db.from(table).select('*').eq('id', id).eq('user_id', ctx.userId).maybeSingle())
  if (!row) throw new Error(`${label} introuvable : ${id}`)
  return row
}

async function logActivity(ctx, action, entityType, entityId, summary, payload = {}) {
  // Le journal ne doit jamais faire échouer l'action elle-même.
  try {
    await ctx.db.from('activity_log').insert({
      user_id: ctx.userId, actor_label: ctx.actorLabel, source: 'mcp',
      action, entity_type: entityType, entity_id: entityId, summary, payload,
    })
  } catch { /* ignore */ }
}

function pick(obj, keys) {
  return Object.fromEntries(keys.filter(k => obj[k] !== undefined).map(k => [k, obj[k]]))
}

const SQL_TOOLS = [
  {
    name: 'tableau_de_bord',
    description: "Vue d'ensemble de l'open space : pôles, projets clients actifs, tâches en retard, demandes ouvertes.",
    inputSchema: { type: 'object', properties: {} },
    async run(_args, ctx) {
      const today = new Date().toISOString().slice(0, 10)
      const [poles, clientProjects, overdue, requests] = await Promise.all([
        ctx.db.from('projects').select('id, name, emoji, north_star, north_star_progress').eq('user_id', ctx.userId),
        ctx.db.from('client_projects').select('id, name, status, progress, due_date, pole_id, client_id').eq('user_id', ctx.userId).neq('status', 'livre'),
        ctx.db.from('tasks').select('id, title, due_date, project_id, client_project_id').eq('user_id', ctx.userId).neq('status', 'done').lt('due_date', today),
        ctx.db.from('requests').select('id, title, status, recipient_id, recipient_email, due_date').eq('user_id', ctx.userId).not('status', 'in', '(close,refusee,livree)'),
      ].map(p => p.then(unwrap)))
      return { date: today, poles, projets_clients_actifs: clientProjects, taches_en_retard: overdue, demandes_ouvertes: requests }
    },
  },
  {
    name: 'lister_poles',
    description: 'Liste les pôles (Ulycom, Yoovi, E-commerce…) avec leur North Star.',
    inputSchema: { type: 'object', properties: {} },
    async run(_args, ctx) {
      return unwrap(await ctx.db.from('projects').select('id, slug, name, emoji, tier, north_star, north_star_progress').eq('user_id', ctx.userId).order('tier'))
    },
  },
  {
    name: 'lister_clients',
    description: 'Liste les clients, filtrables par pôle ou statut.',
    inputSchema: {
      type: 'object',
      properties: {
        pole_id: UUID,
        status: { type: 'string', enum: ['prospect', 'onboarding', 'active', 'paused', 'completed', 'archived'] },
      },
    },
    async run(args, ctx) {
      let q = ctx.db.from('clients').select('id, name, short_name, city, activity_type, status, project_id').eq('user_id', ctx.userId)
      if (args.pole_id) q = q.eq('project_id', args.pole_id)
      if (args.status) q = q.eq('status', args.status)
      return unwrap(await q.order('name'))
    },
  },
  {
    name: 'lister_projets_clients',
    description: 'Liste les projets clients, filtrables par pôle, client ou statut.',
    inputSchema: {
      type: 'object',
      properties: { pole_id: UUID, client_id: UUID, status: { type: 'string', enum: CLIENT_PROJECT_STATUS } },
    },
    async run(args, ctx) {
      let q = ctx.db.from('client_projects').select('*').eq('user_id', ctx.userId)
      if (args.pole_id) q = q.eq('pole_id', args.pole_id)
      if (args.client_id) q = q.eq('client_id', args.client_id)
      if (args.status) q = q.eq('status', args.status)
      return unwrap(await q.order('due_date', { ascending: true, nullsFirst: false }))
    },
  },
  {
    name: 'creer_projet_client',
    description: 'Crée un projet client rattaché à un client et/ou un pôle.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' }, description: { type: 'string' },
        client_id: UUID, pole_id: UUID,
        status: { type: 'string', enum: CLIENT_PROJECT_STATUS },
        budget: { type: 'number' }, start_date: DATE, due_date: DATE,
      },
    },
    async run(args, ctx) {
      const client = await assertOwned(ctx, 'clients', args.client_id, 'Client')
      await assertOwned(ctx, 'projects', args.pole_id, 'Pôle')
      const row = unwrap(await ctx.db.from('client_projects').insert({
        user_id: ctx.userId,
        pole_id: args.pole_id ?? client?.project_id ?? null,
        ...pick(args, ['name', 'description', 'client_id', 'status', 'budget', 'start_date', 'due_date']),
      }).select().single())
      await logActivity(ctx, 'creer_projet_client', 'client_project', row.id, `Projet client « ${row.name} » créé`)
      return row
    },
  },
  {
    name: 'modifier_projet_client',
    description: "Met à jour un projet client (statut, avancement, échéance…).",
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: UUID, name: { type: 'string' }, description: { type: 'string' },
        status: { type: 'string', enum: CLIENT_PROJECT_STATUS },
        progress: { type: 'integer', minimum: 0, maximum: 100 },
        budget: { type: 'number' }, due_date: DATE,
      },
    },
    async run(args, ctx) {
      await assertOwned(ctx, 'client_projects', args.id, 'Projet client')
      const patch = pick(args, ['name', 'description', 'status', 'progress', 'budget', 'due_date'])
      const row = unwrap(await ctx.db.from('client_projects').update(patch).eq('id', args.id).eq('user_id', ctx.userId).select().single())
      await logActivity(ctx, 'modifier_projet_client', 'client_project', row.id, `Projet client « ${row.name} » modifié`, patch)
      return row
    },
  },
  {
    name: 'lister_taches',
    description: 'Liste les tâches, filtrables par pôle, projet client ou statut (todo, inprogress, done).',
    inputSchema: {
      type: 'object',
      properties: {
        pole_id: UUID, client_project_id: UUID,
        status: { type: 'string', enum: TASK_STATUS },
        limit: { type: 'integer', minimum: 1, maximum: 200 },
      },
    },
    async run(args, ctx) {
      let q = ctx.db.from('tasks')
        .select('id, title, description, status, impact, due_date, project_id, client_project_id, assignee_id, completed_at')
        .eq('user_id', ctx.userId)
      if (args.pole_id) q = q.eq('project_id', args.pole_id)
      if (args.client_project_id) q = q.eq('client_project_id', args.client_project_id)
      if (args.status) q = q.eq('status', args.status)
      return unwrap(await q.order('due_date', { ascending: true, nullsFirst: false }).limit(args.limit ?? 50))
    },
  },
  {
    name: 'creer_tache',
    description: "Crée une tâche dans un pôle et/ou un projet client, éventuellement assignée à un prestataire.",
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' }, description: { type: 'string' },
        pole_id: UUID, client_project_id: UUID, assignee_id: UUID,
        impact: { type: 'string', enum: ['high', 'low'] },
        due_date: DATE,
      },
    },
    async run(args, ctx) {
      const cp = await assertOwned(ctx, 'client_projects', args.client_project_id, 'Projet client')
      await assertOwned(ctx, 'projects', args.pole_id, 'Pôle')
      const row = unwrap(await ctx.db.from('tasks').insert({
        user_id: ctx.userId,
        project_id: args.pole_id ?? cp?.pole_id ?? null,
        client_id: cp?.client_id ?? null,
        status: 'todo',
        ...pick(args, ['title', 'description', 'client_project_id', 'assignee_id', 'impact', 'due_date']),
      }).select().single())
      await logActivity(ctx, 'creer_tache', 'task', row.id, `Tâche « ${row.title} » créée`)
      return row
    },
  },
  {
    name: 'modifier_tache',
    description: 'Met à jour une tâche (statut todo/inprogress/done, titre, échéance, assignation…).',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: UUID, title: { type: 'string' }, description: { type: 'string' },
        status: { type: 'string', enum: TASK_STATUS },
        impact: { type: 'string', enum: ['high', 'low'] },
        due_date: DATE, assignee_id: UUID,
      },
    },
    async run(args, ctx) {
      const before = await assertOwned(ctx, 'tasks', args.id, 'Tâche')
      const patch = pick(args, ['title', 'description', 'status', 'impact', 'due_date', 'assignee_id'])
      if (patch.status && patch.status !== before.status) {
        patch.completed_at = patch.status === 'done' ? new Date().toISOString() : null
      }
      const row = unwrap(await ctx.db.from('tasks').update(patch).eq('id', args.id).eq('user_id', ctx.userId).select().single())
      await logActivity(ctx, 'modifier_tache', 'task', row.id, `Tâche « ${row.title} » modifiée`, patch)
      return row
    },
  },
  {
    name: 'lister_prestataires',
    description: 'Liste les prestataires : membres de tes projets clients et destinataires de tes demandes.',
    inputSchema: { type: 'object', properties: {} },
    async run(_args, ctx) {
      const cps = unwrap(await ctx.db.from('client_projects').select('id').eq('user_id', ctx.userId))
      const members = cps.length
        ? unwrap(await ctx.db.from('project_members').select('member_id, client_project_id, role').in('client_project_id', cps.map(c => c.id)))
        : []
      const recipients = unwrap(await ctx.db.from('requests').select('recipient_id').eq('user_id', ctx.userId).not('recipient_id', 'is', null))
      const ids = [...new Set([...members.map(m => m.member_id), ...recipients.map(r => r.recipient_id)])]
      if (!ids.length) return []
      const profiles = unwrap(await ctx.db.from('profiles').select('id, full_name, company, skills').in('id', ids))
      return profiles.map(p => ({ ...p, projets_clients: members.filter(m => m.member_id === p.id).map(m => m.client_project_id) }))
    },
  },
  {
    name: 'envoyer_demande',
    description: "Envoie une demande à un prestataire (par son id de profil, ou par email s'il n'a pas encore de compte).",
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' }, body: { type: 'string' },
        recipient_id: UUID, recipient_email: { type: 'string', format: 'email' },
        client_project_id: UUID, pole_id: UUID,
        budget: { type: 'number' }, due_date: DATE,
      },
    },
    async run(args, ctx) {
      if (!args.recipient_id && !args.recipient_email) throw new Error('Indique recipient_id ou recipient_email.')
      const cp = await assertOwned(ctx, 'client_projects', args.client_project_id, 'Projet client')
      await assertOwned(ctx, 'projects', args.pole_id, 'Pôle')
      const row = unwrap(await ctx.db.from('requests').insert({
        user_id: ctx.userId,
        pole_id: args.pole_id ?? cp?.pole_id ?? null,
        status: 'envoyee',
        created_via: `mcp:${ctx.actorLabel}`,
        ...pick(args, ['title', 'body', 'recipient_id', 'recipient_email', 'client_project_id', 'budget', 'due_date']),
      }).select().single())
      await logActivity(ctx, 'envoyer_demande', 'request', row.id, `Demande « ${row.title} » envoyée`)
      return row
    },
  },
  {
    name: 'lister_demandes',
    description: 'Liste les demandes envoyées aux prestataires, filtrables par statut ou projet client.',
    inputSchema: {
      type: 'object',
      properties: { status: { type: 'string', enum: REQUEST_STATUS }, client_project_id: UUID },
    },
    async run(args, ctx) {
      let q = ctx.db.from('requests').select('*').eq('user_id', ctx.userId)
      if (args.status) q = q.eq('status', args.status)
      if (args.client_project_id) q = q.eq('client_project_id', args.client_project_id)
      return unwrap(await q.order('created_at', { ascending: false }))
    },
  },
  {
    name: 'lire_demande',
    description: 'Lit une demande et tout son fil de messages.',
    inputSchema: { type: 'object', required: ['id'], properties: { id: UUID } },
    async run(args, ctx) {
      const request = await assertOwned(ctx, 'requests', args.id, 'Demande')
      const messages = unwrap(await ctx.db.from('request_messages').select('*').eq('request_id', args.id).order('created_at'))
      return { ...request, messages }
    },
  },
  {
    name: 'repondre_demande',
    description: "Ajoute un message dans le fil d'une demande, et change son statut si besoin.",
    inputSchema: {
      type: 'object',
      required: ['id', 'body'],
      properties: { id: UUID, body: { type: 'string' }, status: { type: 'string', enum: REQUEST_STATUS } },
    },
    async run(args, ctx) {
      const request = await assertOwned(ctx, 'requests', args.id, 'Demande')
      const message = unwrap(await ctx.db.from('request_messages').insert({
        request_id: args.id, author_id: ctx.userId, author_label: ctx.actorLabel, body: args.body,
      }).select().single())
      if (args.status) unwrap(await ctx.db.from('requests').update({ status: args.status }).eq('id', args.id).eq('user_id', ctx.userId))
      await logActivity(ctx, 'repondre_demande', 'request', args.id, `Réponse sur « ${request.title} »`)
      return message
    },
  },
  {
    name: 'lister_conversations_whatsapp',
    description: "Conversations WhatsApp Business : dernier message, non lus, et si la fenêtre de 24 h pour répondre librement est ouverte.",
    inputSchema: { type: 'object', properties: { non_lues_seulement: { type: 'boolean' } } },
    async run(args, ctx) {
      const since = new Date(Date.now() - 30 * 86400000).toISOString()
      const rows = unwrap(await ctx.db.from('wa_messages').select('*').eq('user_id', ctx.userId).gte('created_at', since).order('created_at', { ascending: false }).limit(1000))
      const conv = summarizeConversations(rows).map(c => ({
        telephone: c.contact_phone, nom: c.contact_name, non_lus: c.unread, fenetre_ouverte: c.windowOpen,
        dernier_message: { sens: c.last.direction === 'in' ? 'reçu' : 'envoyé', texte: c.last.body, date: c.last.created_at },
      }))
      return args.non_lues_seulement ? conv.filter(c => c.non_lus > 0) : conv
    },
  },
  {
    name: 'lire_conversation_whatsapp',
    description: 'Lit les derniers messages échangés avec un contact WhatsApp (numéro international).',
    inputSchema: { type: 'object', required: ['telephone'], properties: { telephone: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 200 } } },
    async run(args, ctx) {
      const rows = unwrap(await ctx.db.from('wa_messages').select('direction, body, type, status, created_at, contact_name')
        .eq('user_id', ctx.userId).eq('contact_phone', normalizePhone(args.telephone))
        .order('created_at', { ascending: false }).limit(args.limit ?? 30))
      return rows.reverse().map(m => ({ sens: m.direction === 'in' ? 'reçu' : 'envoyé', texte: m.body, type: m.type, statut: m.status, date: m.created_at }))
    },
  },
  {
    name: 'repondre_whatsapp',
    description: "Envoie un message WhatsApp à un client depuis le numéro Business. Possible seulement si le client a écrit dans les dernières 24 h.",
    inputSchema: { type: 'object', required: ['telephone', 'texte'], properties: { telephone: { type: 'string' }, texte: { type: 'string' } } },
    async run(args, ctx) {
      const msg = await sendText({ db: ctx.db, userId: ctx.userId, to: args.telephone, text: args.texte, via: `mcp:${ctx.actorLabel}` })
      await logActivity(ctx, 'repondre_whatsapp', 'wa_message', msg.id, `Réponse WhatsApp à ${msg.contact_phone}`)
      return { envoye: true, id: msg.wa_message_id, telephone: msg.contact_phone }
    },
  },
  {
    name: 'journal_activite',
    description: "Dernières actions dans l'open space (toi, Claude, Codex…).",
    inputSchema: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 100 } } },
    async run(args, ctx) {
      return unwrap(await ctx.db.from('activity_log').select('*').eq('user_id', ctx.userId).order('created_at', { ascending: false }).limit(args.limit ?? 20))
    },
  },
]

// Les outils branchés sur le store de l'app (cockpit.js) remplacent leurs anciens équivalents SQL.
const cockpitNames = new Set(COCKPIT_TOOLS.map(t => t.name))
export const TOOLS = [...COCKPIT_TOOLS, ...SQL_TOOLS.filter(t => !cockpitNames.has(t.name))]
