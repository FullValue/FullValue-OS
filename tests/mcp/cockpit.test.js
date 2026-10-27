import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COCKPIT_TOOLS } from '../../server/mcp/cockpit.js'

// Faux client Supabase : une seule ligne user_state, mise à jour optimiste sur updated_at.
function fakeDb(state) {
  const row = { state, updated_at: '2026-01-01T00:00:00.000Z' }
  return {
    row,
    from() {
      const filters = {}
      let patch = null
      const q = {
        select() { return q },
        update(p) { patch = p; return q },
        eq(k, v) { filters[k] = v; return q },
        async maybeSingle() { return { data: row } },
        then(resolve) {
          const ok = !filters.updated_at || filters.updated_at === row.updated_at
          if (patch && ok) Object.assign(row, patch)
          resolve({ data: ok ? [{ user_id: 'u' }] : [], error: null })
        },
      }
      return q
    },
  }
}
const tool = name => COCKPIT_TOOLS.find(t => t.name === name)

test('créer puis terminer une tâche écrit dans user_state', async () => {
  const db = fakeDb({ tasks: [], projects: [{ id: 'p1', name: 'Yoovi' }] })
  const ctx = { db, userId: 'u', actorLabel: 'ChatGPT' }
  const t = await tool('creer_tache').run({ title: 'Tester', project_id: 'p1' }, ctx)
  assert.equal(db.row.state.tasks.length, 1)
  assert.equal(db.row.client_id, 'mcp')
  await tool('modifier_tache').run({ id: t.id, status: 'done' }, ctx)
  assert.ok(db.row.state.tasks[0].completedAt)
  await assert.rejects(tool('creer_tache').run({ title: 'x', project_id: 'nope' }, ctx), /Projet introuvable/)
})

test("une analyse ne remplace pas le verdict existant sans « appliquer »", async () => {
  const db = fakeDb({ creatives: [{ id: 'c1', status: 'analysee', verdict: 'adapter', score: 60, analyses: [] }] })
  const ctx = { db, userId: 'u', actorLabel: 'Claude' }
  await tool('enregistrer_analyse_crea').run({ id: 'c1', verdict: 'dupliquer', score: 90, reasoning: 'r' }, ctx)
  const c = db.row.state.creatives[0]
  assert.equal(c.verdict, 'adapter')
  assert.equal(c.analyses[0].model, 'Claude')
  await tool('enregistrer_analyse_crea').run({ id: 'c1', verdict: 'dupliquer', score: 90, reasoning: 'r', appliquer: true }, ctx)
  assert.equal(db.row.state.creatives[0].verdict, 'dupliquer')
})

test('Etsy en démo : données marquées synthétiques', async () => {
  const db = fakeDb({ etsy: { mode: 'demo', shops: [{ id: 900001, source: 'demo' }] } })
  const out = await tool('etsy_donnees').run({}, { db, userId: 'u', actorLabel: 'Claude' })
  assert.equal(out.mode, 'demo')
  assert.equal(out.boutiques.length, 1)
  assert.ok(out.fiches.every(l => l.shopId === 900001))
})
